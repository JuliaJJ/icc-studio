import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'

function KeywordItem({ keyword, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(keyword.keyword)
  const inputRef = useRef(null)

  function startEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function commitEdit() {
    const trimmed = value.trim()
    if (!trimmed) { cancelEdit(); return }
    if (trimmed !== keyword.keyword) {
      await onUpdate(keyword.id, trimmed)
    }
    setEditing(false)
  }

  function cancelEdit() {
    setValue(keyword.keyword)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className="keyword-item">
      {editing ? (
        <input
          ref={inputRef}
          className="keyword-edit-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className="keyword-text" onClick={startEdit}>{keyword.keyword}</span>
      )}
      <button className="keyword-delete" onClick={() => onDelete(keyword.id)} title="Remove">×</button>
    </div>
  )
}

function NicheCard({ niche, keywords, onUpdate, onDelete, onAdd }) {
  const [expanded, setExpanded] = useState(false)
  const [addInput, setAddInput] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  const addRef = useRef(null)

  const visible = expanded ? keywords : keywords.slice(0, 8)
  const overflow = keywords.length - 8

  async function handleAdd(e) {
    if (e.key === 'Enter' && addInput.trim()) {
      await onAdd(niche, addInput.trim())
      setAddInput('')
    }
    if (e.key === 'Escape') {
      setShowAddInput(false)
      setAddInput('')
    }
  }

  function openAdd() {
    setShowAddInput(true)
    setTimeout(() => addRef.current?.focus(), 0)
  }

  return (
    <div className="keyword-niche-card">
      <div className="keyword-niche-header">
        <span className="keyword-niche-title">{niche}</span>
        <button className="keyword-niche-add" onClick={openAdd} title="Add keyword">+</button>
      </div>
      <div className="keyword-list">
        {visible.map(kw => (
          <KeywordItem key={kw.id} keyword={kw} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
        {!expanded && overflow > 0 && (
          <button className="keyword-show-more" onClick={() => setExpanded(true)}>
            + {overflow} more
          </button>
        )}
        {expanded && overflow > 0 && (
          <button className="keyword-show-more" onClick={() => setExpanded(false)}>
            Show less
          </button>
        )}
        {showAddInput && (
          <input
            ref={addRef}
            className="keyword-add-input"
            type="text"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={handleAdd}
            onBlur={() => { setShowAddInput(false); setAddInput('') }}
            placeholder="Type + Enter to add"
          />
        )}
      </div>
    </div>
  )
}

function AddKeywordPanel({ brandId, existingNiches, onSave, onClose }) {
  const [keyword, setKeyword] = useState('')
  const [niche, setNiche] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase
      .from('keywords')
      .insert({ keyword: keyword.trim(), niche: niche.trim(), brand_id: brandId })
      .select()
      .single()
    if (data) onSave(data)
    setSaving(false)
    onClose()
  }

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Add keyword</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Keyword</label>
            <input className="form-input" type="text" value={keyword} onChange={e => setKeyword(e.target.value)} required autoFocus />
          </div>
          <div className="form-field">
            <label className="form-label">Niche</label>
            <input
              className="form-input"
              type="text"
              list="niche-suggestions"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              required
              placeholder="e.g. Nurses"
            />
            <datalist id="niche-suggestions">
              {existingNiches.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div className="panel-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add keyword'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Keywords() {
  const { activeBrand } = useBrand()
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('keywords')
      .select('*')
      .eq('brand_id', activeBrand.id)
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => {
        setKeywords(data ?? [])
        setLoading(false)
      })
  }, [activeBrand.id])

  async function handleAdd(niche, keyword) {
    const { data } = await supabase
      .from('keywords')
      .insert({ keyword, niche, brand_id: activeBrand.id })
      .select()
      .single()
    if (data) setKeywords(prev => [...prev, data])
  }

  async function handleUpdate(id, newKeyword) {
    await supabase.from('keywords').update({ keyword: newKeyword }).eq('id', id)
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, keyword: newKeyword } : k))
  }

  async function handleDelete(id) {
    await supabase.from('keywords').delete().eq('id', id)
    setKeywords(prev => prev.filter(k => k.id !== id))
  }

  function handlePanelSave(newKeyword) {
    setKeywords(prev => [...prev, newKeyword])
  }

  const niches = [...new Set(keywords.map(k => k.niche).filter(Boolean))]
  const grouped = niches.reduce((acc, niche) => {
    acc[niche] = keywords.filter(k => k.niche === niche)
    return acc
  }, {})

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="keywords-page">
      <div className="page-header">
        <h1 className="page-title">Keywords</h1>
        <button className="btn-add" onClick={() => setPanelOpen(true)}>+ Add keyword</button>
      </div>

      {keywords.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">#</span>
          <span className="empty-text">No keywords yet</span>
          <button className="btn-add" onClick={() => setPanelOpen(true)}>+ Add keyword</button>
        </div>
      ) : (
        <div className="keywords-grid">
          {Object.entries(grouped).map(([niche, nicheKeywords]) => (
            <NicheCard
              key={niche}
              niche={niche}
              keywords={nicheKeywords}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          ))}
        </div>
      )}

      {panelOpen && (
        <AddKeywordPanel
          brandId={activeBrand.id}
          existingNiches={niches}
          onSave={handlePanelSave}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
