import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'
import TaskPanel from '../components/TaskPanel'

const TODAY = new Date().toISOString().split('T')[0]
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const PRIORITY_FILTERS = [
  { value: 'all',   label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'high',  label: 'High priority' },
]

function formatDueDate(date) {
  if (!date) return null
  if (date === TODAY) return 'Today'
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function PriorityDot({ priority }) {
  return <span className={`priority-dot priority-dot--${priority}`} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { activeBrand } = useBrand()
  const [tasks, setTasks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase.from('tasks').select('*').eq('brand_id', activeBrand.id).order('created_at')
      .then(({ data }) => { setTasks(data ?? []); setLoading(false) })
  }, [activeBrand.id])

  async function toggleTask(task) {
    const newStatus = task.status === 'done' ? 'open' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  function handleSave(saved, mode) {
    setTasks(prev =>
      mode === 'insert' ? [...prev, saved] : prev.map(t => t.id === saved.id ? saved : t)
    )
  }

  function handleDelete(id) { setTasks(prev => prev.filter(t => t.id !== id)) }
  function openAdd()         { setEditingTask(null); setPanelOpen(true) }
  function openEdit(task)    { setEditingTask(task); setPanelOpen(true) }

  // Unique labels across all tasks for this brand
  const allLabels = [...new Set(tasks.flatMap(t => t.labels ?? []))].sort()

  const activeLabel = filter.startsWith('label:') ? filter.slice(6) : null

  // Reset label filter if that label no longer exists in any task
  useEffect(() => {
    if (activeLabel && !allLabels.includes(activeLabel)) setFilter('all')
  }, [allLabels.join(',')])

  const filtered = tasks
    .filter(task => {
      if (filter === 'today')  return task.due_date === TODAY && task.status === 'open'
      if (filter === 'high')   return task.priority === 'high' && task.status === 'open'
      if (activeLabel)         return (task.labels ?? []).includes(activeLabel)
      return true
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    })

  return (
    <div className="tasks-page">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <button className="btn-add" onClick={openAdd}>+ Add task</button>
      </div>

      <FilterPills options={PRIORITY_FILTERS} active={filter} onChange={setFilter} />

      {allLabels.length > 0 && (
        <div className="task-label-filters">
          {allLabels.map(l => (
            <button
              key={l}
              className={`task-label-filter-pill ${activeLabel === l ? 'task-label-filter-pill--active' : ''}`}
              onClick={() => setFilter(activeLabel === l ? 'all' : `label:${l}`)}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✓</span>
          <span className="empty-text">
            {filter === 'all' ? 'No tasks yet' : 'No tasks match this filter'}
          </span>
          {filter === 'all' && <button className="btn-add" onClick={openAdd}>+ Add task</button>}
        </div>
      ) : (
        <div className="task-list">
          {filtered.map(task => (
            <div key={task.id} className="task-card-row">
              <TaskCheckbox checked={task.status === 'done'} onChange={() => toggleTask(task)} />
              <div className="task-card-content" onClick={() => openEdit(task)}>
                <div className={`task-title ${task.status === 'done' ? 'task-title--done' : ''}`}>
                  {task.title}
                </div>
                <div className="task-meta">
                  {(task.labels ?? []).map(l => (
                    <span key={l} className="task-label-tag">{l}</span>
                  ))}
                  <PriorityDot priority={task.priority} />
                  {task.due_date && (
                    <span className="task-due">{formatDueDate(task.due_date)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {panelOpen && (
        <TaskPanel
          task={editingTask}
          brandId={activeBrand.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
