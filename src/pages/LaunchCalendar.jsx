import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { LAUNCH_STATUS_OPTIONS } from '../lib/constants'

const TODAY = new Date().toISOString().split('T')[0]

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getStatusBadge(event) {
  if (event.status === 'live') return { label: 'Live', cls: 'badge--live' }
  if (event.status === 'ready') return { label: 'Ready', cls: 'badge--ready' }
  if (event.status === 'ended') return { label: 'Ended', cls: 'badge--planned' }
  const daysUntil = Math.ceil((new Date(event.launch_date) - new Date()) / 86400000)
  if (daysUntil <= 30 && daysUntil >= 0) return { label: 'Soon', cls: 'badge--soon' }
  return { label: 'Planned', cls: 'badge--planned' }
}

function EventPanel({ event, brandId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    name: event?.name ?? '',
    launch_date: event?.launch_date ?? '',
    end_date: event?.end_date ?? '',
    status: event?.status ?? 'planned',
    notes: event?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  function setField(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      end_date: form.end_date || null,
      notes: form.notes || null,
      brand_id: brandId,
    }
    if (event) {
      const { data } = await supabase.from('launch_events').update(payload).eq('id', event.id).select().single()
      onSave(data, 'update')
    } else {
      const { data } = await supabase.from('launch_events').insert(payload).select().single()
      onSave(data, 'insert')
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!event) return
    await supabase.from('launch_events').delete().eq('id', event.id)
    onDelete(event.id)
    onClose()
  }

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{event ? 'Edit event' : 'New event'}</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Event name</label>
            <input className="form-input" type="text" value={form.name} onChange={setField('name')} required autoFocus placeholder="e.g. Nurse Appreciation Week" />
          </div>
          <div className="form-field">
            <label className="form-label">Launch date</label>
            <input className="form-input" type="date" value={form.launch_date} onChange={setField('launch_date')} required />
          </div>
          <div className="form-field">
            <label className="form-label">End date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input className="form-input" type="date" value={form.end_date} onChange={setField('end_date')} />
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={setField('status')}>
              {LAUNCH_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={setField('notes')} placeholder="Platform strategy, linked products, etc." />
          </div>
          <div className="panel-actions">
            {event && <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LaunchCalendar() {
  const { activeBrand } = useBrand()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('launch_events')
      .select('*')
      .eq('brand_id', activeBrand.id)
      .order('launch_date')
      .then(({ data }) => {
        setEvents(data ?? [])
        setLoading(false)
      })
  }, [activeBrand.id])

  function handleSave(saved, mode) {
    setEvents(prev =>
      mode === 'insert'
        ? [...prev, saved].sort((a, b) => a.launch_date.localeCompare(b.launch_date))
        : prev.map(e => e.id === saved.id ? saved : e)
    )
  }

  function handleDelete(id) {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  function openAdd() { setEditingEvent(null); setPanelOpen(true) }
  function openEdit(event) { setEditingEvent(event); setPanelOpen(true) }

  // Group by month
  const grouped = events.reduce((acc, event) => {
    const key = monthLabel(event.launch_date)
    if (!acc[key]) acc[key] = []
    acc[key].push(event)
    return acc
  }, {})

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="launch-calendar-page">
      <div className="page-header">
        <h1 className="page-title">Launch Calendar</h1>
        <button className="btn-add" onClick={openAdd}>+ Add event</button>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">◻</span>
          <span className="empty-text">No events yet</span>
          <button className="btn-add" onClick={openAdd}>+ Add event</button>
        </div>
      ) : (
        <div className="card">
          {Object.entries(grouped).map(([month, monthEvents], gi) => (
            <div key={month}>
              <div className={`launch-month-divider ${gi === 0 ? 'launch-month-divider--first' : ''}`}>
                {month}
              </div>
              {monthEvents.map(event => {
                const badge = getStatusBadge(event)
                const dateRange = event.end_date
                  ? `${formatDateShort(event.launch_date)} – ${formatDateShort(event.end_date)}`
                  : formatDateShort(event.launch_date)
                return (
                  <div key={event.id} className="launch-event-row" onClick={() => openEdit(event)}>
                    <div className="launch-event-main">
                      <span className="launch-event-name">{event.name}</span>
                      {event.notes && <span className="launch-event-notes">{event.notes}</span>}
                    </div>
                    <div className="launch-event-right">
                      <span className="launch-event-date">{dateRange}</span>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {panelOpen && (
        <EventPanel
          event={editingEvent}
          brandId={activeBrand.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
