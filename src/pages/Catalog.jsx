import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'
import { PRODUCT_STATUS, productEmoji, NICHES } from '../lib/constants'

async function generateTasksFromTemplate(templateId, productId, brandId) {
  const { data: items } = await supabase.from('task_template_items').select('*')
    .eq('template_id', templateId).order('sort_order').order('created_at')
  if (!items?.length) return
  await supabase.from('tasks').insert(
    items.map(item => ({
      brand_id:         brandId,
      product_id:       productId,
      template_item_id: item.id,
      title:            item.title,
      priority:         item.priority,
      labels:           item.labels ?? [],
      sort_order:       item.sort_order,
      status:           'open',
    }))
  )
}

function StatusBadge({ status }) {
  const cfg = PRODUCT_STATUS[status]
  if (!cfg) return null
  return (
    <span className="product-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function AddProductPanel({ brandId, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', niche: '', status: 'idea', is_bundle: false })
  const [saving, setSaving] = useState(false)
  const [includeChecklist, setIncludeChecklist] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    supabase.from('task_templates').select('id, name').eq('brand_id', brandId).order('name')
      .then(({ data }) => setTemplates(data ?? []))
  }, [brandId])

  function setField(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const templateId = includeChecklist && selectedTemplate ? selectedTemplate : null
    const { data } = await supabase
      .from('products')
      .insert({ ...form, brand_id: brandId, template_id: templateId || null })
      .select().single()
    if (data && templateId) await generateTasksFromTemplate(templateId, data.id, brandId)
    setSaving(false)
    if (data) { onSave(data); onClose() }
  }

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">New product</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Product name</label>
            <input className="form-input" type="text" value={form.name} onChange={setField('name')} required autoFocus />
          </div>
          <div className="form-field">
            <label className="form-label">Niche</label>
            <select className="form-select" value={form.niche} onChange={setField('niche')}>
              <option value="">— select —</option>
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={setField('status')}>
              <option value="idea">Idea</option>
              <option value="in_progress">In Progress</option>
              <option value="ready">Ready</option>
              <option value="live">Live</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="is_bundle" checked={form.is_bundle}
              onChange={e => setForm(p => ({ ...p, is_bundle: e.target.checked }))} />
            <label htmlFor="is_bundle" className="form-label" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 13 }}>
              This is a bundle product
            </label>
          </div>
          <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="include_checklist" checked={includeChecklist}
              onChange={e => setIncludeChecklist(e.target.checked)} />
            <label htmlFor="include_checklist" className="form-label" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: 13 }}>
              Include checklist
            </label>
          </div>
          {includeChecklist && (
            <div className="form-field">
              <select className="form-select" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                <option value="">— select template —</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div className="panel-actions">
            <button type="submit" className="btn-primary" disabled={saving || (includeChecklist && !selectedTemplate)}>
              {saving ? 'Creating…' : 'Create & edit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Catalog() {
  const { activeBrand } = useBrand()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('products')
      .select('id, name, niche, status, image_urls, is_bundle, is_archived')
      .eq('brand_id', activeBrand.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [activeBrand.id])

  const visible = products.filter(p => showArchived ? p.is_archived : !p.is_archived)
  const niches = [...new Set(visible.map(p => p.niche).filter(Boolean))]
  const filterOptions = [
    { value: 'all', label: 'All' },
    ...niches.map(n => ({ value: n, label: n })),
  ]

  const filtered = filter === 'all' ? visible : visible.filter(p => p.niche === filter)

  function handleProductCreated(product) {
    navigate(`/catalog/${product.id}`)
  }

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="catalog-page">
      <div className="page-header">
        <h1 className="page-title">Catalog</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setShowArchived(x => !x)}>
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
          {!showArchived && <button className="btn-add" onClick={() => setPanelOpen(true)}>+ Add product</button>}
        </div>
      </div>

      <FilterPills options={filterOptions} active={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⊞</span>
          <span className="empty-text">{filter === 'all' ? 'No products yet' : `No products in ${filter}`}</span>
          {filter === 'all' && <button className="btn-add" onClick={() => setPanelOpen(true)}>+ Add product</button>}
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map(product => (
            <Link key={product.id} to={`/catalog/${product.id}`} className="product-card">
              <div className="product-card-image">
                {product.image_urls?.[0]
                  ? <img src={product.image_urls[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{productEmoji(product.product_type)}</span>
                }
              </div>
              <div className="product-card-info">
                <div className="product-card-name">{product.name}</div>
                <div className="product-card-meta">
                  {product.niche && <span className="niche-tag">{product.niche}</span>}
                  {product.is_bundle && <span className="bundle-badge">Bundle</span>}
                  <StatusBadge status={product.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {panelOpen && (
        <AddProductPanel
          brandId={activeBrand.id}
          onSave={handleProductCreated}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
