import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'
import { PRODUCT_STATUS, productEmoji, NICHES } from '../lib/constants'

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
  const [form, setForm] = useState({ name: '', niche: '', product_type: '', status: 'idea' })
  const [saving, setSaving] = useState(false)

  function setField(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase
      .from('products')
      .insert({ ...form, brand_id: brandId })
      .select()
      .single()
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
            <label className="form-label">Product type</label>
            <input className="form-input" type="text" value={form.product_type} onChange={setField('product_type')} placeholder="e.g. Apparel, Wall art, Journal" />
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
          <div className="panel-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
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
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('products')
      .select('id, name, niche, product_type, status, image_urls')
      .eq('brand_id', activeBrand.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts(data ?? [])
        setLoading(false)
      })
  }, [activeBrand.id])

  const niches = [...new Set(products.map(p => p.niche).filter(Boolean))]
  const filterOptions = [
    { value: 'all', label: 'All' },
    ...niches.map(n => ({ value: n, label: n })),
  ]

  const filtered = filter === 'all' ? products : products.filter(p => p.niche === filter)

  function handleProductCreated(product) {
    navigate(`/catalog/${product.id}`)
  }

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="catalog-page">
      <div className="page-header">
        <h1 className="page-title">Catalog</h1>
        <button className="btn-add" onClick={() => setPanelOpen(true)}>+ Add product</button>
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
