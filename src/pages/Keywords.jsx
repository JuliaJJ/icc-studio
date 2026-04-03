import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'

// ─── Harvest Panel ────────────────────────────────────────────────────────────

function HarvestPanel({ brandId, existingKeywords, onImport, onClose }) {
  const [candidates, setCandidates] = useState([]) // { keyword, niche, productName }
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: products }, ] = await Promise.all([
        supabase.from('products').select('name, niche, keywords').eq('brand_id', brandId),
      ])
      const existingSet = new Set(existingKeywords.map(k => k.keyword.toLowerCase()))
      const seen = new Set()
      const found = []
      ;(products ?? []).forEach(p => {
        ;(p.keywords ?? []).forEach(kw => {
          const lower = kw.toLowerCase()
          if (!existingSet.has(lower) && !seen.has(lower)) {
            seen.add(lower)
            found.push({ keyword: kw, niche: p.niche ?? '', productName: p.name })
          }
        })
      })
      found.sort((a, b) => (a.niche ?? '').localeCompare(b.niche ?? '') || a.keyword.localeCompare(b.keyword))
      setCandidates(found)
      setSelected(new Set(found.map((_, i) => i)))
      setLoading(false)
    }
    load()
  }, [brandId])

  function toggleAll() {
    setSelected(selected.size === candidates.length ? new Set() : new Set(candidates.map((_, i) => i)))
  }

  function toggle(i) {
    const next = new Set(selected)
    next.has(i) ? next.delete(i) : next.add(i)
    setSelected(next)
  }

  async function handleImport() {
    setSaving(true)
    const toInsert = [...selected].map(i => ({
      brand_id: brandId,
      keyword: candidates[i].keyword,
      niche: candidates[i].niche,
    }))
    const { data } = await supabase.from('keywords').insert(toInsert).select()
    onImport(data ?? [])
    setSaving(false)
    onClose()
  }

  const grouped = {}
  candidates.forEach((c, i) => {
    const n = c.niche || '(no niche)'
    if (!grouped[n]) grouped[n] = []
    grouped[n].push({ ...c, index: i })
  })

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel" style={{ width: 380 }}>
        <div className="panel-header">
          <span className="panel-title">Harvest from products</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <div className="panel-form" style={{ gap: 0, padding: 0 }}>
          {loading ? (
            <div className="loading-state">Scanning products…</div>
          ) : candidates.length === 0 ? (
            <div className="harvest-empty">All product keywords are already in the library.</div>
          ) : (
            <>
              <div className="harvest-toolbar">
                <span className="harvest-count">{selected.size} of {candidates.length} selected</span>
                <button type="button" className="kw-library-btn" onClick={toggleAll}>
                  {selected.size === candidates.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="harvest-list">
                {Object.entries(grouped).map(([niche, items]) => (
                  <div key={niche} className="harvest-group">
                    <div className="harvest-group-label">{niche}</div>
                    {items.map(({ keyword, productName, index }) => (
                      <label key={index} className="harvest-item">
                        <input
                          type="checkbox"
                          className="harvest-checkbox"
                          checked={selected.has(index)}
                          onChange={() => toggle(index)}
                        />
                        <span className="harvest-keyword">{keyword}</span>
                        <span className="harvest-source">{productName}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="panel-actions" style={{ padding: '12px 20px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                <button type="button" className="btn-primary" disabled={saving || selected.size === 0} onClick={handleImport}>
                  {saving ? 'Importing…' : `Import ${selected.size} keyword${selected.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

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
  const [harvestOpen, setHarvestOpen] = useState(false)

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setHarvestOpen(true)}>Harvest from products</button>
          <button className="btn-add" onClick={() => setPanelOpen(true)}>+ Add keyword</button>
        </div>
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

      {harvestOpen && (
        <HarvestPanel
          brandId={activeBrand.id}
          existingKeywords={keywords}
          onImport={newKeywords => setKeywords(prev => [...prev, ...newKeywords])}
          onClose={() => setHarvestOpen(false)}
        />
      )}
    </div>
  )
}
