import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'

// ─── Constants ────────────────────────────────────────────────────────────────

const REVENUE_PLATFORMS = ['Etsy', 'Printify', 'KDP', 'Gumroad', 'Stan Store']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  ...REVENUE_PLATFORMS.map(p => ({ value: p, label: p })),
]

const NOW = new Date()
const THIS_YEAR = NOW.getFullYear()

function fmtUSD(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthKey(year, month) {
  return year * 100 + month
}

// ─── Add / Edit Panel ─────────────────────────────────────────────────────────

function RevenuePanel({ entry, brandId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    platform: entry?.platform ?? REVENUE_PLATFORMS[0],
    month:    entry?.month    ?? NOW.getMonth() + 1,
    year:     entry?.year     ?? THIS_YEAR,
    amount:   entry?.amount   ?? '',
    notes:    entry?.notes    ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      month:  Number(form.month),
      year:   Number(form.year),
      amount: Number(form.amount),
      brand_id: brandId,
    }
    if (entry) {
      const { data } = await supabase.from('revenue_entries').update(payload).eq('id', entry.id).select().single()
      onSave(data, 'update')
    } else {
      const { data } = await supabase.from('revenue_entries').insert(payload).select().single()
      onSave(data, 'insert')
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!entry || !window.confirm('Delete this entry?')) return
    await supabase.from('revenue_entries').delete().eq('id', entry.id)
    onDelete(entry.id)
    onClose()
  }

  const years = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1]

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{entry ? 'Edit entry' : 'Add revenue'}</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Platform</label>
            <select className="form-select" value={form.platform} onChange={set('platform')}>
              {REVENUE_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label">Month</label>
              <select className="form-select" value={form.month} onChange={set('month')}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Year</label>
              <select className="form-select" value={form.year} onChange={set('year')}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Amount ($)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={set('amount')}
              required
              autoFocus
              placeholder="0.00"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          <div className="panel-actions">
            {entry && <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>}
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Revenue() {
  const { activeBrand } = useBrand()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('revenue_entries')
      .select('*')
      .eq('brand_id', activeBrand.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .then(({ data }) => {
        setEntries(data ?? [])
        setLoading(false)
      })
  }, [activeBrand.id])

  function handleSave(saved, mode) {
    if (mode === 'insert') setEntries(prev => [saved, ...prev])
    else setEntries(prev => prev.map(e => e.id === saved.id ? saved : e))
  }

  function handleDelete(id) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function openEdit(entry) { setEditingEntry(entry); setPanelOpen(true) }
  function openAdd()       { setEditingEntry(null);  setPanelOpen(true) }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.platform === filter)

  // ── Metrics ──────────────────────────────────────────────────────────────
  const thisYearTotal = entries
    .filter(e => e.year === THIS_YEAR)
    .reduce((s, e) => s + Number(e.amount), 0)

  const lastMonth = NOW.getMonth() === 0 ? 12 : NOW.getMonth()
  const lastMonthYear = NOW.getMonth() === 0 ? THIS_YEAR - 1 : THIS_YEAR
  const lastMonthTotal = entries
    .filter(e => e.month === lastMonth && e.year === lastMonthYear)
    .reduce((s, e) => s + Number(e.amount), 0)

  // Best single month
  const monthTotals = {}
  entries.forEach(e => {
    const k = monthKey(e.year, e.month)
    monthTotals[k] = (monthTotals[k] ?? 0) + Number(e.amount)
  })
  const bestMonthTotal = Object.values(monthTotals).length > 0 ? Math.max(...Object.values(monthTotals)) : 0
  const bestMonthKey = Object.entries(monthTotals).find(([, v]) => v === bestMonthTotal)?.[0]
  const bestMonthLabel = bestMonthKey
    ? `${MONTHS[Number(bestMonthKey) % 100 - 1]} ${Math.floor(Number(bestMonthKey) / 100)}`
    : null

  // ── Group filtered entries by year+month ──────────────────────────────────
  const groups = []
  const seen = new Set()
  filtered.forEach(e => {
    const k = monthKey(e.year, e.month)
    if (!seen.has(k)) {
      seen.add(k)
      groups.push({ key: k, year: e.year, month: e.month })
    }
  })
  groups.sort((a, b) => b.key - a.key)

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="revenue-page">
      <div className="page-header">
        <h1 className="page-title">Revenue</h1>
        <button className="btn-add" onClick={openAdd}>+ Add entry</button>
      </div>

      {/* Metrics */}
      <div className="revenue-metrics">
        <div className="revenue-metric-card">
          <span className="revenue-metric-label">This year</span>
          <span className="revenue-metric-value">{fmtUSD(thisYearTotal)}</span>
        </div>
        <div className="revenue-metric-card">
          <span className="revenue-metric-label">Last month</span>
          <span className="revenue-metric-value">{fmtUSD(lastMonthTotal)}</span>
          <span className="revenue-metric-sub">{MONTHS[lastMonth - 1]} {lastMonthYear}</span>
        </div>
        <div className="revenue-metric-card">
          <span className="revenue-metric-label">Best month</span>
          <span className="revenue-metric-value">{bestMonthTotal > 0 ? fmtUSD(bestMonthTotal) : '—'}</span>
          {bestMonthLabel && <span className="revenue-metric-sub">{bestMonthLabel}</span>}
        </div>
        <div className="revenue-metric-card">
          <span className="revenue-metric-label">Months tracked</span>
          <span className="revenue-metric-value">{Object.keys(monthTotals).length}</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">$</span>
          <span className="empty-text">No revenue entries yet</span>
          <button className="btn-add" onClick={openAdd}>+ Add entry</button>
        </div>
      ) : (
        <>
          <FilterPills options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
          <div className="revenue-list">
            {groups.map(({ key, year, month }) => {
              const monthEntries = filtered.filter(e => e.year === year && e.month === month)
              const monthTotal = monthEntries.reduce((s, e) => s + Number(e.amount), 0)
              return (
                <div key={key} className="revenue-month-group">
                  <div className="revenue-month-header">
                    <span className="revenue-month-label">{MONTHS[month - 1]} {year}</span>
                    <span className="revenue-month-total">{fmtUSD(monthTotal)}</span>
                  </div>
                  {monthEntries.map(entry => (
                    <div key={entry.id} className="revenue-entry-row" onClick={() => openEdit(entry)}>
                      <span className="revenue-entry-platform">{entry.platform}</span>
                      {entry.notes && <span className="revenue-entry-notes">{entry.notes}</span>}
                      <span className="revenue-entry-amount">{fmtUSD(entry.amount)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

      {panelOpen && (
        <RevenuePanel
          entry={editingEntry}
          brandId={activeBrand.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
