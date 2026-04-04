import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
    const t = val.trim()
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

export default function TaskPanel({ task, brandId, onSave, onDelete, onClose }) {
  const initialForm = {
    title:    task?.title    ?? '',
    priority: task?.priority ?? 'medium',
    due_date: task?.due_date ?? '',
    labels:   task?.labels   ?? [],
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
      labels:   form.labels,
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
            <input className="form-input" type="text" value={form.title}
              onChange={setField('title')} required autoFocus />
          </div>
          <div className="form-field">
            <label className="form-label">Labels</label>
            <LabelTagInput
              values={form.labels}
              onChange={v => setForm(p => ({ ...p, labels: v }))}
              brandId={brandId}
            />
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
            <input className="form-input" type="date" value={form.due_date}
              onChange={setField('due_date')} />
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes}
              onChange={setField('notes')} />
          </div>
          <div className="panel-actions">
            {task && (
              <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>
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
