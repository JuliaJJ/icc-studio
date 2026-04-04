import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'

const TODAY = new Date().toISOString().split('T')[0]
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

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

// ─── Label input with datalist autocomplete from value_library ────────────────

function LabelInput({ value, onChange, brandId }) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!brandId) return
    supabase.from('value_library').select('value')
      .eq('brand_id', brandId).eq('type', 'task_label').order('value')
      .then(({ data }) => setSuggestions((data ?? []).map(r => r.value)))
  }, [brandId])

  async function handleBlur() {
    const t = value.trim()
    if (!t) return
    await supabase.from('value_library')
      .upsert({ brand_id: brandId, type: 'task_label', value: t }, { onConflict: 'brand_id,type,value' })
    setSuggestions(prev => [...new Set([...prev, t])].sort())
  }

  return (
    <>
      <input
        className="form-input"
        type="text"
        list="task-label-suggestions"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. Content, Design, Admin"
      />
      <datalist id="task-label-suggestions">
        {suggestions.map(s => <option key={s} value={s} />)}
      </datalist>
    </>
  )
}

// ─── Task panel ───────────────────────────────────────────────────────────────

function TaskPanel({ task, brandId, onSave, onDelete, onClose }) {
  const initialForm = {
    title:    task?.title    ?? '',
    priority: task?.priority ?? 'medium',
    due_date: task?.due_date ?? '',
    label:    task?.label    ?? '',
    notes:    task?.notes    ?? '',
  }
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  function setField(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function confirmClose() {
    if (JSON.stringify(form) !== JSON.stringify(initialForm)) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      title:    form.title,
      priority: form.priority,
      due_date: form.due_date || null,
      label:    form.label.trim() || null,
      notes:    form.notes || null,
      brand_id: brandId,
    }
    if (task) {
      const { data } = await supabase.from('tasks').update(payload).eq('id', task.id).select().single()
      onSave(data, 'update')
    } else {
      const { data } = await supabase.from('tasks').insert(payload).select().single()
      onSave(data, 'insert')
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!task) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onDelete(task.id)
    onClose()
  }

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={confirmClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{task ? 'Edit task' : 'New task'}</span>
          <button className="panel-close" onClick={confirmClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              type="text"
              value={form.title}
              onChange={setField('title')}
              required
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Label</label>
            <LabelInput value={form.label} onChange={v => setForm(p => ({ ...p, label: v }))} brandId={brandId} />
          </div>
          <div className="form-field">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={setField('priority')}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Due date</label>
            <input
              className="form-input"
              type="date"
              value={form.due_date}
              onChange={setField('due_date')}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={form.notes}
              onChange={setField('notes')}
            />
          </div>
          <div className="panel-actions">
            {task && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { activeBrand } = useBrand()
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('tasks')
      .select('*')
      .eq('brand_id', activeBrand.id)
      .order('created_at')
      .then(({ data }) => {
        setTasks(data ?? [])
        setLoading(false)
      })
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

  function handleDelete(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function openAdd()       { setEditingTask(null);  setPanelOpen(true) }
  function openEdit(task)  { setEditingTask(task);  setPanelOpen(true) }

  // Build filter options dynamically from labels present in loaded tasks
  const activeLabels = [...new Set(tasks.map(t => t.label).filter(Boolean))].sort()
  const filterOptions = [
    { value: 'all',   label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'high',  label: 'High priority' },
    ...activeLabels.map(l => ({ value: `label:${l}`, label: l })),
  ]

  const filtered = tasks
    .filter(task => {
      if (filter === 'today')          return task.due_date === TODAY && task.status === 'open'
      if (filter === 'high')           return task.priority === 'high' && task.status === 'open'
      if (filter.startsWith('label:')) return task.label === filter.slice(6)
      return true
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    })

  // Reset filter if the active label disappears (e.g. after editing all tasks with that label)
  useEffect(() => {
    if (filter.startsWith('label:') && !activeLabels.includes(filter.slice(6))) {
      setFilter('all')
    }
  }, [activeLabels.join(',')])

  return (
    <div className="tasks-page">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <button className="btn-add" onClick={openAdd}>+ Add task</button>
      </div>

      <FilterPills options={filterOptions} active={filter} onChange={setFilter} />

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✓</span>
          <span className="empty-text">
            {filter === 'all' ? 'No tasks yet' : 'No tasks match this filter'}
          </span>
          {filter === 'all' && (
            <button className="btn-add" onClick={openAdd}>+ Add task</button>
          )}
        </div>
      ) : (
        <div className="task-list">
          {filtered.map(task => (
            <div key={task.id} className="task-card-row">
              <TaskCheckbox
                checked={task.status === 'done'}
                onChange={() => toggleTask(task)}
              />
              <div className="task-card-content" onClick={() => openEdit(task)}>
                <div className={`task-title ${task.status === 'done' ? 'task-title--done' : ''}`}>
                  {task.title}
                </div>
                <div className="task-meta">
                  <span className="brand-tag">{activeBrand.short_code}</span>
                  {task.label && <span className="task-label-tag">{task.label}</span>}
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
