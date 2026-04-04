import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { EVENT_TYPES, NICHE_COLORS } from '../lib/constants'

const TODAY = new Date().toISOString().split('T')[0]
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function getLastTwoMonths() {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prev = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  return {
    lastMonth: last.getMonth() + 1,
    lastYear: last.getFullYear(),
    prevMonth: prev.getMonth() + 1,
    prevYear: prev.getFullYear(),
  }
}

function formatLaunchDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getLaunchBadge(event) {
  const cfg = EVENT_TYPES[event.event_type] ?? EVENT_TYPES.other
  return { label: cfg.label, style: { background: cfg.bg, color: cfg.color, borderColor: 'transparent' } }
}

function ProductPill({ name, niche }) {
  const c = NICHE_COLORS[niche] ?? { bg: '#F1EFE8', color: '#444441' }
  return (
    <span className="product-pill" style={{ background: c.bg, color: c.color }}>
      {name}
    </span>
  )
}

function TaskCheckbox({ checked, onChange }) {
  return (
    <button
      className={`task-checkbox ${checked ? 'task-checkbox--checked' : ''}`}
      onClick={onChange}
      type="button"
      aria-label={checked ? 'Mark open' : 'Mark done'}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

export default function Today() {
  const { activeBrand } = useBrand()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    liveCount: 0, livePlatforms: [], draftCount: 0,
    openTasks: 0, todayTasks: 0, revenue: 0, revenueChange: null,
  })
  const [tasks, setTasks] = useState([])
  const [launches, setLaunches] = useState([])

  useEffect(() => {
    if (!activeBrand.id) return
    fetchAll()
  }, [activeBrand.id])

  async function fetchAll() {
    setLoading(true)
    const [
      { data: products },
      { data: allTasks },
      { data: revenue },
      { data: upcomingLaunches },
    ] = await Promise.all([
      supabase.from('products').select('id, status, platform').eq('brand_id', activeBrand.id),
      supabase.from('tasks').select('*, products(id, name, niche, is_archived)').eq('brand_id', activeBrand.id).eq('status', 'open'),
      supabase.from('revenue_entries').select('month, year, amount').eq('brand_id', activeBrand.id),
      supabase.from('launch_events').select('*').eq('brand_id', activeBrand.id)
        .gte('start_date', TODAY).order('start_date').limit(5),
    ])

    const live = (products ?? []).filter(p => p.status === 'live' && !p.is_archived)
    const livePlatforms = [...new Set(live.flatMap(p => p.platform ?? []))]
    const draftCount = (products ?? []).filter(p => ['in_progress', 'idea'].includes(p.status)).length
    const openList = (allTasks ?? []).filter(t => !t.products?.is_archived)
    const todayCount = openList.filter(t => t.due_date === TODAY).length

    const { lastMonth, lastYear, prevMonth, prevYear } = getLastTwoMonths()
    const sumRev = (entries, m, y) =>
      (entries ?? []).filter(r => r.month === m && r.year === y).reduce((s, r) => s + Number(r.amount), 0)
    const lastRev = sumRev(revenue, lastMonth, lastYear)
    const prevRev = sumRev(revenue, prevMonth, prevYear)
    const revenueChange = prevRev > 0 ? Math.round(((lastRev - prevRev) / prevRev) * 100) : null

    // Today tasks: due today + up to 3 open with no due date, deduplicated, sorted by priority
    const dueTodayTasks = openList.filter(t => t.due_date === TODAY)
    const noDateTasks = openList.filter(t => !t.due_date).slice(0, 3)
    const todayDisplay = [...dueTodayTasks, ...noDateTasks]
      .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))

    setMetrics({ liveCount: live.length, livePlatforms, draftCount, openTasks: openList.length, todayTasks: todayCount, revenue: lastRev, revenueChange })
    setTasks(todayDisplay)
    setLaunches(upcomingLaunches ?? [])
    setLoading(false)
  }

  async function toggleTask(task) {
    const newStatus = task.status === 'done' ? 'open' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const quickLinks = activeBrand.quick_links ?? []

  const revenueSubLine = metrics.revenueChange !== null
    ? `${metrics.revenueChange >= 0 ? '+' : ''}${metrics.revenueChange}% vs prev month`
    : 'No prior month data'

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="today-page">
      {/* Row 1 — Metric cards */}
      <div className="today-metrics">
        <MetricCard
          label="Active listings"
          value={metrics.liveCount}
          sub={metrics.livePlatforms.length ? metrics.livePlatforms.join(' · ') : 'No platforms yet'}
        />
        <MetricCard
          label="Drafts in progress"
          value={metrics.draftCount}
          sub="ideas + in progress"
        />
        <MetricCard
          label="Open tasks"
          value={metrics.openTasks}
          sub={metrics.todayTasks > 0 ? `${metrics.todayTasks} due today` : 'None due today'}
        />
        <MetricCard
          label="Revenue (last month)"
          value={metrics.revenue > 0
            ? `$${metrics.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : '—'}
          sub={revenueSubLine}
        />
      </div>

      {/* Row 2 — Tasks left, launches + quick access right */}
      <div className="today-row2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Today's tasks</span>
          </div>
          <div className="card-body">
            {tasks.length === 0 ? (
              <div className="card-empty">No tasks for today</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="task-row">
                  <TaskCheckbox checked={task.status === 'done'} onChange={() => toggleTask(task)} />
                  <div className="task-row-content" style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tasks/${task.id}`)}>
                    <span className={`task-title ${task.status === 'done' ? 'task-title--done' : ''}`}>
                      {task.title}
                    </span>
                    <div className="task-meta" style={{ marginTop: 2 }}>
                      {task.products && <ProductPill name={task.products.name} niche={task.products.niche} />}
                      {task.template_item_id && <span className="task-template-icon" title="Generated from template">⊞</span>}
                      {(task.labels ?? []).map(l => (
                        <span key={l} className="task-label-tag">{l}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="today-side">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Upcoming launches</span>
            </div>
            <div className="card-body">
              {launches.length === 0 ? (
                <div className="card-empty">No upcoming launches</div>
              ) : (
                launches.map(event => {
                  const badge = getLaunchBadge(event)
                  return (
                    <div key={event.id} className="launch-row">
                      <div className="launch-row-main">
                        <span className="launch-name">{event.name}</span>
                        <span className="launch-date">{formatLaunchDate(event.start_date)}</span>
                      </div>
                      <span className="badge" style={badge.style}>{badge.label}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Quick access</span>
            </div>
            <div className="card-body">
              {quickLinks.length === 0 ? (
                <div className="card-empty">No links yet — add them in Quick Access</div>
              ) : (
                <div className="quick-links-grid">
                  {quickLinks.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="link-pill">
                      <span className="link-pill-dot" />
                      <span className="link-pill-label">{link.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
