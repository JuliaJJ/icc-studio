import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { normalizeLabel } from '../lib/taskNlp'

function LabelTagInput({ values, onChange, brandId }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!brandId) return
    supabase.from('value_library').select('value')
      .eq('brand_id', brandId).eq('type', 'task_label').order('value')
      .then(({ data }) => setSuggestions((data ?? []).map(r => r.value)))
  }, [brandId])

  async function add(val) {
    const t = normalizeLabel(val)
    if (!t || values.includes(t)) { setInput(''); return }
    onChange([...values, t])
    setInput('')
    await supabase.from('value_library')
      .upsert({ brand_id: brandId, type: 'task_label', value: t }, { onConflict: 'brand_id,type,value' })
    setSuggestions(prev => [...new Set([...prev, t])].sort())
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && values.length > 0) onChange(values.slice(0, -1))
    if (e.key === 'Escape') setOpen(false)
  }

  const filtered = suggestions.filter(s => !values.includes(s) && s.toLowerCase().includes(input.toLowerCase()))

  return (
    <div className="library-input-wrap">
      <div className="tag-input-wrapper">
        {values.map((v, i) => (
          <span key={i} className="keyword-tag">
            {v}
            <button type="button" className="keyword-tag-remove"
              onClick={() => onChange(values.filter((_, j) => j !== i))}>×</button>
          </span>
        ))}
        <input
          className="tag-input"
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={values.length === 0 ? 'Type label + Enter' : ''}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="library-suggestions">
          {filtered.map(s => (
            <button key={s} type="button" className="library-suggestion-item"
              onMouseDown={() => add(s)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeBrand } = useBrand()
  const [form, setForm] = useState(null)
  const [initialForm, setInitialForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('tasks').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (!data) { navigate('/tasks'); return }
        const f = {
          title:    data.title,
          priority: data.priority,
          due_date: data.due_date ?? '',
          labels:   data.labels ?? [],
          notes:    data.notes ?? '',
          status:   data.status,
        }
        setForm(f)
        setInitialForm(f)
        setLoading(false)
      })
  }, [id])

  function setField(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function confirmBack() {
    if (JSON.stringify(form) !== JSON.stringify(initialForm)) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    navigate('/tasks')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('tasks').update({
      title:    form.title,
      priority: form.priority,
      due_date: form.due_date || null,
      labels:   form.labels,
      notes:    form.notes || null,
      status:   form.status,
    }).eq('id', id)
    setSaving(false)
    setInitialForm(form)
    navigate('/tasks')
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    navigate('/tasks')
  }

  async function toggleStatus() {
    const newStatus = form.status === 'done' ? 'open' : 'done'
    setForm(prev => ({ ...prev, status: newStatus }))
  }

  if (loading || !form) return <div className="loading-state">Loading…</div>

  return (
    <div className="task-detail-page">
      <div className="product-detail-back">
        <button type="button" className="back-link" onClick={confirmBack}>← Tasks</button>
      </div>

      <form onSubmit={handleSave} className="task-detail-form">
        <div className="task-detail-header">
          <button
            type="button"
            className={`task-checkbox task-detail-checkbox ${form.status === 'done' ? 'task-checkbox--checked' : ''}`}
            onClick={toggleStatus}
            aria-label={form.status === 'done' ? 'Mark open' : 'Mark done'}
          >
            {form.status === 'done' && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <input
            className={`task-detail-title-input ${form.status === 'done' ? 'task-title--done' : ''}`}
            type="text"
            value={form.title}
            onChange={setField('title')}
            placeholder="Task title"
            required
            autoFocus
          />
        </div>

        <div className="task-detail-fields">
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
            <input className="form-input" type="date" value={form.due_date} onChange={setField('due_date')} />
          </div>

          <div className="form-field">
            <label className="form-label">Labels</label>
            <LabelTagInput
              values={form.labels}
              onChange={v => setForm(p => ({ ...p, labels: v }))}
              brandId={activeBrand.id}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={4} value={form.notes} onChange={setField('notes')} />
          </div>
        </div>

        <div className="task-detail-actions">
          <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
