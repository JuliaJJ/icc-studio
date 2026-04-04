import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { EVENT_TYPES } from '../lib/constants'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const RECURRENCE_OPTIONS = [
  { value: '',        label: 'Does not repeat' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly',  label: 'Yearly' },
]

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const TODAY = toDateStr(new Date())

function buildWeeks(year, month) {
  const startDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []

  for (let i = startDow; i > 0; i--) {
    days.push({ date: new Date(year, month, 1 - i), currentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true })
  }
  let next = 1
  while (days.length % 7 !== 0) {
    days.push({ date: new Date(year, month + 1, next++), currentMonth: false })
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

// Expand recurring events into individual instances within [rangeStart, rangeEnd] (inclusive, YYYY-MM-DD strings)
function expandRecurring(events, rangeStart, rangeEnd) {
  const result = []
  for (const ev of events) {
    if (!ev.recurrence_type) {
      result.push(ev)
      continue
    }
    const baseStart = new Date(ev.start_date + 'T00:00:00')
    const duration = ev.end_date
      ? new Date(ev.end_date + 'T00:00:00') - baseStart
      : 0
    const hardStop = ev.recurrence_end_date
      ? (ev.recurrence_end_date < rangeEnd ? ev.recurrence_end_date : rangeEnd)
      : rangeEnd

    let cur = new Date(baseStart)
    let safety = 0
    while (toDateStr(cur) <= hardStop && safety < 600) {
      safety++
      const startStr = toDateStr(cur)
      const endStr = duration > 0 ? toDateStr(new Date(cur.getTime() + duration)) : null
      // include if instance overlaps the range
      if ((endStr ?? startStr) >= rangeStart && startStr <= rangeEnd) {
        result.push({
          ...ev,
          start_date: startStr,
          end_date: endStr,
          _instanceKey: `${ev.id}-${startStr}`,
          _isRecurring: true,
        })
      }
      // advance
      const next = new Date(cur)
      if (ev.recurrence_type === 'daily')   next.setDate(next.getDate() + 1)
      if (ev.recurrence_type === 'weekly')  next.setDate(next.getDate() + 7)
      if (ev.recurrence_type === 'monthly') next.setMonth(next.getMonth() + 1)
      if (ev.recurrence_type === 'yearly')  next.setFullYear(next.getFullYear() + 1)
      if (toDateStr(next) === startStr) break // safety: no advance
      cur = next
    }
  }
  return result
}

function assignRows(weekEvents) {
  const rowEnds = []
  return weekEvents.map(event => {
    let row = rowEnds.findIndex(end => end < event.startCol)
    if (row === -1) { row = rowEnds.length; rowEnds.push(event.endCol) }
    else { rowEnds[row] = event.endCol }
    return { ...event, row }
  })
}

function eventStyle(event) {
  return EVENT_TYPES[event.event_type] ?? EVENT_TYPES.other
}

// ─── Week row ─────────────────────────────────────────────────────────────────

function WeekRow({ weekDays, events, onDayClick, onEventClick }) {
  const weekStart = toDateStr(weekDays[0].date)
  const weekEnd   = toDateStr(weekDays[6].date)

  const rawEvents = events
    .filter(e => {
      const end = e.end_date || e.start_date
      return e.start_date <= weekEnd && end >= weekStart
    })
    .map(e => {
      const end = e.end_date || e.start_date
      let startCol = weekDays.findIndex(d => toDateStr(d.date) === e.start_date)
      if (startCol === -1) startCol = 0
      let endCol = weekDays.findIndex(d => toDateStr(d.date) === end)
      if (endCol === -1) endCol = 6
      return { ...e, startCol, endCol }
    })
    .sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol))

  const placed = assignRows(rawEvents)
  const rowCount = placed.length ? Math.max(...placed.map(e => e.row)) + 1 : 0

  return (
    <div className="cal-week">
      <div className="cal-day-row">
        {weekDays.map((day, i) => {
          const ds = toDateStr(day.date)
          return (
            <div
              key={i}
              className={`cal-day-cell${day.currentMonth ? '' : ' cal-day-cell--outside'}`}
              onClick={() => onDayClick(ds)}
            >
              <span className={`cal-day-number${ds === TODAY ? ' cal-day-number--today' : ''}`}>
                {day.date.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      <div className="cal-event-layer" style={{ gridTemplateRows: rowCount > 0 ? `repeat(${rowCount}, auto)` : undefined }}>
        {placed.map(event => {
          const st = eventStyle(event)
          const startsHere = event.start_date >= weekStart
          const endsHere   = (event.end_date ?? event.start_date) <= weekEnd
          const cls = [
            'cal-event-bar',
            startsHere ? 'cal-event-bar--start' : '',
            endsHere   ? 'cal-event-bar--end'   : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={(event._instanceKey ?? event.id) + weekStart}
              className={cls}
              style={{
                gridColumn: `${event.startCol + 1} / ${event.endCol + 2}`,
                gridRow: event.row + 1,
                background: st.bg,
                color: st.color,
              }}
              onClick={e => { e.stopPropagation(); onEventClick(event) }}
              title={event.name}
            >
              {event._isRecurring && <span className="cal-recur-icon">↻</span>}
              {event.name}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Event panel ──────────────────────────────────────────────────────────────

function EventPanel({ event, defaultDate, brandId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    name:                 event?.name                 ?? '',
    start_date:           event?.start_date           ?? defaultDate ?? '',
    end_date:             event?.end_date             ?? '',
    event_type:           event?.event_type           ?? 'other',
    notes:                event?.notes                ?? '',
    recurrence_type:      event?.recurrence_type      ?? '',
    recurrence_end_date:  event?.recurrence_end_date  ?? '',
  })
  const [saving, setSaving] = useState(false)

  function setField(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name:                form.name,
      start_date:          form.start_date,
      launch_date:         form.start_date, // legacy NOT NULL column
      end_date:            form.end_date || null,
      event_type:          form.event_type,
      notes:               form.notes || null,
      brand_id:            brandId,
      recurrence_type:     form.recurrence_type || null,
      recurrence_end_date: form.recurrence_type && form.recurrence_end_date ? form.recurrence_end_date : null,
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
            <input className="form-input" type="text" value={form.name}
              onChange={setField('name')} required autoFocus placeholder="e.g. Spring Collection Drop" />
          </div>
          <div className="form-field">
            <label className="form-label">Event type</label>
            <select className="form-select" value={form.event_type} onChange={setField('event_type')}>
              {Object.entries(EVENT_TYPES).map(([value, cfg]) => (
                <option key={value} value={value}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Start date</label>
            <input className="form-input" type="date" value={form.start_date}
              onChange={setField('start_date')} required />
          </div>
          <div className="form-field">
            <label className="form-label">
              End date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input className="form-input" type="date" value={form.end_date}
              onChange={setField('end_date')} />
          </div>
          <div className="form-field">
            <label className="form-label">Repeats</label>
            <select className="form-select" value={form.recurrence_type} onChange={setField('recurrence_type')}>
              {RECURRENCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {form.recurrence_type && (
            <div className="form-field">
              <label className="form-label">
                Repeat until <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input className="form-input" type="date" value={form.recurrence_end_date}
                onChange={setField('recurrence_end_date')} />
            </div>
          )}
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes}
              onChange={setField('notes')} placeholder="Details, linked products, strategy…" />
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

// ─── List view ────────────────────────────────────────────────────────────────

function formatListDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatListMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function CalendarListView({ events, onEventClick }) {
  if (events.length === 0) {
    return <div className="cal-list-empty">No events yet — click + Add event to create one.</div>
  }

  // Group by month of start_date
  const groups = []
  let currentMonth = null
  for (const event of [...events].sort((a, b) => a.start_date.localeCompare(b.start_date))) {
    const month = event.start_date.slice(0, 7) // YYYY-MM
    if (month !== currentMonth) {
      currentMonth = month
      groups.push({ month, label: formatListMonth(event.start_date), events: [] })
    }
    groups[groups.length - 1].events.push(event)
  }

  return (
    <div className="cal-list">
      {groups.map(group => (
        <div key={group.month} className="cal-list-group">
          <div className="cal-list-month-header">{group.label}</div>
          {group.events.map(event => {
            const cfg = EVENT_TYPES[event.event_type] ?? EVENT_TYPES.other
            const isPast = event.start_date < TODAY
            const isToday = event.start_date === TODAY
            const isMultiDay = event.end_date && event.end_date !== event.start_date
            return (
              <div
                key={event._instanceKey ?? event.id}
                className={`cal-list-row${isPast ? ' cal-list-row--past' : ''}${isToday ? ' cal-list-row--today' : ''}`}
                onClick={() => onEventClick(event)}
              >
                <div className="cal-list-date">
                  {isToday
                    ? <span className="cal-list-date-today">Today</span>
                    : formatListDate(event.start_date)
                  }
                  {isMultiDay && (
                    <span className="cal-list-date-end">→ {formatListDate(event.end_date)}</span>
                  )}
                </div>
                <span className="cal-list-type-pill" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="cal-list-name">
                  {event._isRecurring && <span className="cal-recur-icon">↻ </span>}
                  {event.name}
                </span>
                {event.notes && (
                  <span className="cal-list-notes">{event.notes.split('\n')[0]}</span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LaunchCalendar() {
  const { activeBrand } = useBrand()
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [defaultDate, setDefaultDate] = useState('')
  const [view, setView]           = useState('grid')

  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase.from('launch_events').select('*').eq('brand_id', activeBrand.id).order('start_date')
      .then(({ data }) => { setEvents(data ?? []); setLoading(false) })
  }, [activeBrand.id])

  function handleSave(saved, mode) {
    setEvents(prev =>
      mode === 'insert'
        ? [...prev, saved].sort((a, b) => a.start_date.localeCompare(b.start_date))
        : prev.map(e => e.id === saved.id ? saved : e)
    )
  }
  function handleDelete(id) { setEvents(prev => prev.filter(e => e.id !== id)) }

  function openAdd(date = '') { setEditing(null); setDefaultDate(date); setPanelOpen(true) }
  function openEdit(event) {
    // For recurring instances, always edit the base event (all occurrences)
    const base = events.find(e => e.id === event.id) ?? event
    setEditing(base)
    setDefaultDate('')
    setPanelOpen(true)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  function goToday() { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()) }

  const weeks = buildWeeks(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Expand recurring events for current grid range
  const gridStart = toDateStr(weeks[0][0].date)
  const gridEnd   = toDateStr(weeks[weeks.length - 1][6].date)
  const gridEvents = expandRecurring(events, gridStart, gridEnd)

  // Expand recurring events for list view: from earliest event up to 2 years ahead
  const listEnd = toDateStr(new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()))
  const listStart = events.length ? events[0].start_date : TODAY
  const listEvents = expandRecurring(events, listStart, listEnd)

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="launch-calendar-page">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <button className="btn-add" onClick={() => openAdd()}>+ Add event</button>
      </div>

      <div className="cal-nav">
        {view === 'grid' ? (
          <>
            <button className="cal-nav-btn" onClick={prevMonth}>←</button>
            <span className="cal-nav-title">{monthLabel}</span>
            <button className="cal-nav-btn" onClick={nextMonth}>→</button>
            <button className="cal-today-btn" onClick={goToday}>Today</button>
          </>
        ) : (
          <span className="cal-nav-title">All events</span>
        )}
        <div className="cal-view-toggle">
          <button
            className={`cal-view-btn ${view === 'grid' ? 'cal-view-btn--active' : ''}`}
            onClick={() => setView('grid')}
            title="Grid view"
          >⊞</button>
          <button
            className={`cal-view-btn ${view === 'list' ? 'cal-view-btn--active' : ''}`}
            onClick={() => setView('list')}
            title="List view"
          >≡</button>
        </div>
      </div>

      {view === 'grid' ? (
        <>
          <div className="cal-grid">
            <div className="cal-dow-row">
              {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
            </div>
            {weeks.map((week, wi) => (
              <WeekRow
                key={wi}
                weekDays={week}
                events={gridEvents}
                onDayClick={openAdd}
                onEventClick={openEdit}
              />
            ))}
          </div>
          <div className="cal-legend">
            {Object.entries(EVENT_TYPES).map(([type, cfg]) => (
              <span key={type} className="cal-legend-item">
                <span className="cal-legend-dot" style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }} />
                <span style={{ color: cfg.color }}>{cfg.label}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <CalendarListView events={listEvents} onEventClick={openEdit} />
      )}

      {panelOpen && (
        <EventPanel
          event={editing}
          defaultDate={defaultDate}
          brandId={activeBrand.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
