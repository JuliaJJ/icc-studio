import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMPT_PLATFORMS = ['Midjourney', 'Kittl', 'Claude', 'ChatGPT', 'Other']

const PLATFORM_CFG = {
  Midjourney: { bg: '#EEEDFB', color: '#4A42A8' },
  Kittl:      { bg: '#E6F1FB', color: '#0C447C' },
  Claude:     { bg: '#FAEEE8', color: '#943D21' },
  ChatGPT:    { bg: '#EAF3DE', color: '#27500A' },
  Other:      { bg: '#F1EFE8', color: '#444441' },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  ...PROMPT_PLATFORMS.map(p => ({ value: p, label: p })),
]

function platformCfg(platform) {
  return PLATFORM_CFG[platform] ?? PLATFORM_CFG.Other
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  function addTag(val) {
    const t = val.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setInput('')
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="tag-input-wrapper" onClick={() => inputRef.current?.focus()}>
      {tags.map(tag => (
        <span key={tag} className="keyword-tag">
          {tag}
          <button type="button" className="keyword-tag-remove" onClick={() => onChange(tags.filter(t => t !== tag))}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="tag-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={tags.length === 0 ? 'Add tags…' : ''}
      />
    </div>
  )
}

// ─── Prompt Panel (Add / Edit) ────────────────────────────────────────────────

function PromptPanel({ prompt, brandId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    title:             prompt?.title             ?? '',
    platform:          prompt?.platform          ?? 'Midjourney',
    tags:              prompt?.tags              ?? [],
    content:           prompt?.content           ?? '',
    example_output_url: prompt?.example_output_url ?? '',
    notes:             prompt?.notes             ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, brand_id: brandId }
    if (prompt) {
      const { data } = await supabase.from('prompts').update(payload).eq('id', prompt.id).select().single()
      onSave(data, 'update')
    } else {
      const { data } = await supabase.from('prompts').insert(payload).select().single()
      onSave(data, 'insert')
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!prompt || !window.confirm('Delete this prompt?')) return
    await supabase.from('prompts').delete().eq('id', prompt.id)
    onDelete(prompt.id)
    onClose()
  }

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{prompt ? 'Edit prompt' : 'New prompt'}</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Title</label>
            <input className="form-input" type="text" value={form.title} onChange={set('title')} required autoFocus placeholder="e.g. Nurse mug mockup style" />
          </div>
          <div className="form-field">
            <label className="form-label">Platform</label>
            <select className="form-select" value={form.platform} onChange={set('platform')}>
              {PROMPT_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Tags</label>
            <TagInput tags={form.tags} onChange={tags => setForm(p => ({ ...p, tags }))} />
          </div>
          <div className="form-field">
            <label className="form-label">Prompt content</label>
            <textarea className="form-textarea" rows={7} value={form.content} onChange={set('content')} required placeholder="Paste your full prompt here…" style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          <div className="form-field">
            <label className="form-label">Example output URL</label>
            <input className="form-input" type="url" value={form.example_output_url} onChange={set('example_output_url')} placeholder="Link to an example output image" />
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          <div className="panel-actions">
            {prompt && <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>}
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save prompt'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Full View Modal ──────────────────────────────────────────────────────────

function PromptModal({ prompt, onEdit, onClose }) {
  const cfg = platformCfg(prompt.platform)
  const [copied, setCopied] = useState(false)

  function copyContent() {
    navigator.clipboard.writeText(prompt.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  // Close on Escape
  useEffect(() => {
    function handle(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  return (
    <div className="prompt-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="prompt-modal">
        <div className="prompt-modal-header">
          <div className="prompt-modal-title-row">
            <span className="prompt-modal-title">{prompt.title}</span>
            <span className="prompt-platform-tag" style={{ background: cfg.bg, color: cfg.color }}>{prompt.platform}</span>
          </div>
          {(prompt.tags ?? []).length > 0 && (
            <div className="prompt-modal-tags">
              {prompt.tags.map(t => <span key={t} className="keyword-tag">{t}</span>)}
            </div>
          )}
          <div className="prompt-modal-header-actions">
            <button className="btn-secondary" onClick={onEdit}>Edit</button>
            <button className="panel-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="prompt-modal-body">
          <div className="prompt-content-block">
            <div className="prompt-content-toolbar">
              <span className="prompt-content-label">Prompt</span>
              <button className="prompt-copy-btn" onClick={copyContent}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="prompt-content-pre">{prompt.content}</pre>
          </div>

          {prompt.example_output_url && (
            <div className="prompt-modal-section">
              <span className="prompt-modal-section-label">Example output</span>
              <a href={prompt.example_output_url} target="_blank" rel="noopener noreferrer" className="asset-external-link">
                View example ↗
              </a>
            </div>
          )}

          {prompt.notes && (
            <div className="prompt-modal-section">
              <span className="prompt-modal-section-label">Notes</span>
              <p className="prompt-modal-notes">{prompt.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Prompt Card ──────────────────────────────────────────────────────────────

function PromptCard({ prompt, onClick }) {
  const cfg = platformCfg(prompt.platform)
  return (
    <div className="prompt-card" onClick={onClick}>
      <div className="prompt-card-header">
        <span className="prompt-platform-tag" style={{ background: cfg.bg, color: cfg.color }}>{prompt.platform}</span>
      </div>
      <div className="prompt-card-title">{prompt.title}</div>
      {(prompt.tags ?? []).length > 0 && (
        <div className="prompt-card-tags">
          {prompt.tags.slice(0, 4).map(t => <span key={t} className="keyword-tag">{t}</span>)}
          {prompt.tags.length > 4 && <span className="prompt-tag-overflow">+{prompt.tags.length - 4}</span>}
        </div>
      )}
      <p className="prompt-card-preview">{prompt.content}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PromptLibrary() {
  const { activeBrand } = useBrand()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [viewingPrompt, setViewingPrompt] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(null)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('prompts')
      .select('*')
      .eq('brand_id', activeBrand.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPrompts(data ?? [])
        setLoading(false)
      })
  }, [activeBrand.id])

  function handleSave(saved, mode) {
    if (mode === 'insert') setPrompts(prev => [saved, ...prev])
    else setPrompts(prev => prev.map(p => p.id === saved.id ? saved : p))
    // If we were viewing this prompt, update it
    if (viewingPrompt?.id === saved.id) setViewingPrompt(saved)
  }

  function handleDelete(id) {
    setPrompts(prev => prev.filter(p => p.id !== id))
    if (viewingPrompt?.id === id) setViewingPrompt(null)
  }

  function openAdd() { setEditingPrompt(null); setPanelOpen(true) }
  function openEdit(prompt) {
    setEditingPrompt(prompt)
    setViewingPrompt(null)
    setPanelOpen(true)
  }

  const filtered = filter === 'all' ? prompts : prompts.filter(p => p.platform === filter)

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="prompts-page">
      <div className="page-header">
        <h1 className="page-title">Prompt Library</h1>
        <button className="btn-add" onClick={openAdd}>+ New prompt</button>
      </div>

      {prompts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⌥</span>
          <span className="empty-text">No prompts yet</span>
          <button className="btn-add" onClick={openAdd}>+ New prompt</button>
        </div>
      ) : (
        <>
          <FilterPills options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
          <div className="prompts-grid">
            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '20px 0', gridColumn: '1/-1' }}>
                No prompts for this platform
              </div>
            ) : (
              filtered.map(p => (
                <PromptCard key={p.id} prompt={p} onClick={() => setViewingPrompt(p)} />
              ))
            )}
          </div>
        </>
      )}

      {viewingPrompt && (
        <PromptModal
          prompt={viewingPrompt}
          onEdit={() => openEdit(viewingPrompt)}
          onClose={() => setViewingPrompt(null)}
        />
      )}

      {panelOpen && (
        <PromptPanel
          prompt={editingPrompt}
          brandId={activeBrand.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
