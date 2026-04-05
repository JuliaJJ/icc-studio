import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'
import { parseTaskInput } from '../lib/taskNlp'
import { NICHE_COLORS } from '../lib/constants'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const _now = new Date()
const TODAY = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

const PRIORITY_FILTERS = [
  { value: 'all',   label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'high',  label: 'High priority' },
]

function firstNoteLine(notes) {
  if (!notes) return null
  return notes.split('\n')[0].trim() || null
}

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

function ProductPill({ name, niche }) {
  const c = NICHE_COLORS[niche] ?? { bg: '#F1EFE8', color: '#444441' }
  return (
    <span className="product-pill" style={{ background: c.bg, color: c.color }}>
      {name}
    </span>
  )
}

// ─── Sortable task row ────────────────────────────────────────────────────────

function SortableTaskRow({ task, canDrag, onToggle, onNavigate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !canDrag })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="task-card-row">
      {canDrag && (
        <div className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
          ⠿
        </div>
      )}
      <TaskCheckbox checked={task.status === 'done'} onChange={() => onToggle(task)} />
      <div className="task-card-content" onClick={() => onNavigate(task.id)}>
        <div className={`task-title ${task.status === 'done' ? 'task-title--done' : ''}`}>
          {task.title}
        </div>
        {firstNoteLine(task.notes) && (
          <div className="task-note-preview">{firstNoteLine(task.notes)}</div>
        )}
        <div className="task-meta">
          {task.products && (
            <ProductPill name={task.products.name} niche={task.products.niche} />
          )}
          {task.template_item_id && (
            <span className="task-template-icon" title="Generated from template">⊞</span>
          )}
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
  )
}

// ─── Quick-add bar ────────────────────────────────────────────────────────────

function QuickAddBar({ brandId, onAdded }) {
  const [value, setValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  function handleChange(e) {
    const raw = e.target.value
    setValue(raw)
    setPreview(raw.trim() ? parseTaskInput(raw) : null)
  }

  async function handleKeyDown(e) {
    if (e.key !== 'Enter' || !value.trim() || adding) return
    e.preventDefault()
    setAdding(true)
    const { title, priority, labels, due_date } = parseTaskInput(value)
    if (!title) { setAdding(false); return }

    if (labels.length > 0) {
      await Promise.all(labels.map(l =>
        supabase.from('value_library')
          .upsert({ brand_id: brandId, type: 'task_label', value: l }, { onConflict: 'brand_id,type,value' })
      ))
    }

    const { data } = await supabase.from('tasks')
      .insert({ brand_id: brandId, title, priority, labels, due_date, status: 'open' })
      .select().single()

    setValue('')
    setPreview(null)
    setAdding(false)
    inputRef.current?.focus()
    if (data) onAdded(data)
  }

  return (
    <div className="quick-add-bar">
      <input
        ref={inputRef}
        className="quick-add-input"
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Add a task… use #label, p1/p2/p3, and dates like 'tomorrow' or 'next Monday'"
        disabled={adding}
        autoComplete="off"
      />
      {preview?.title && (
        <div className="quick-add-preview">
          <span className="quick-add-preview-title">{preview.title}</span>
          {preview.priority !== 'medium' && (
            <span className={`quick-add-preview-chip quick-add-preview-chip--${preview.priority}`}>
              {preview.priority}
            </span>
          )}
          {preview.due_date && (
            <span className="quick-add-preview-chip">{formatDueDate(preview.due_date)}</span>
          )}
          {preview.labels.map(l => (
            <span key={l} className="quick-add-preview-chip">{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { activeBrand } = useBrand()
  const navigate = useNavigate()
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase.from('tasks').select('*, products(id, name, niche, is_archived)')
      .eq('brand_id', activeBrand.id)
      .order('sort_order').order('created_at')
      .then(({ data }) => {
        setTasks((data ?? []).filter(t => !t.products?.is_archived))
        setLoading(false)
      })
  }, [activeBrand.id])

  async function toggleTask(task) {
    const newStatus = task.status === 'done' ? 'open' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  function handleAdded(task) {
    setTasks(prev => [task, ...prev])
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setTasks(prev => {
      const oldIndex = prev.findIndex(t => t.id === active.id)
      const newIndex = prev.findIndex(t => t.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex).map((t, i) => ({ ...t, sort_order: i }))
      // Persist new order
      reordered.forEach((t, i) => {
        supabase.from('tasks').update({ sort_order: i }).eq('id', t.id)
      })
      return reordered
    })
  }

  const allLabels = [...new Set(tasks.flatMap(t => t.labels ?? []))].sort()
  const activeLabel = filter.startsWith('label:') ? filter.slice(6) : null

  useEffect(() => {
    if (activeLabel && !allLabels.includes(activeLabel)) setFilter('all')
  }, [allLabels.join(',')])

  const isUnfiltered = filter === 'all' && !activeLabel

  const filtered = isUnfiltered
    ? tasks
    : tasks
        .filter(task => {
          if (filter === 'today') return task.due_date === TODAY && task.status === 'open'
          if (filter === 'high')  return task.priority === 'high' && task.status === 'open'
          if (activeLabel)        return (task.labels ?? []).includes(activeLabel)
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
      </div>

      <QuickAddBar brandId={activeBrand.id} onAdded={handleAdded} />

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
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="task-list">
              {filtered.map(task => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  canDrag={isUnfiltered}
                  onToggle={toggleTask}
                  onNavigate={id => navigate(`/tasks/${id}`)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
