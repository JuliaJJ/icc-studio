import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'
import { PRODUCT_STATUS, productEmoji } from '../lib/constants'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  source_file:    'Source file',
  mockup:         'Mockup',
  listing_image:  'Listing image',
  ad_creative:    'Ad creative',
}

const ROLE_EMOJI = {
  source_file:   '📁',
  mockup:        '🖼️',
  listing_image: '🏞️',
  ad_creative:   '🎨',
}

const SOURCE_TOOLS = ['Midjourney', 'Kittl', 'Printify', 'KDP', 'Etsy', 'Canva', 'Photoshop', 'Other']

const FILTER_OPTIONS = [
  { value: 'all',         label: 'All' },
  { value: 'source_file', label: 'Source files' },
  { value: 'mockup',      label: 'Mockups' },
  { value: 'ad_creative', label: 'Ad creative' },
]

function assetEmoji(role) { return ROLE_EMOJI[role] ?? '📄' }
function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Quick View Card (spec 5.2) ───────────────────────────────────────────────

function QuickViewCard({ product, onClose }) {
  const navigate = useNavigate()
  const [linkedAssets, setLinkedAssets] = useState([])

  useEffect(() => {
    supabase
      .from('asset_product_links')
      .select('assets(id, filename)')
      .eq('product_id', product.id)
      .then(({ data }) => setLinkedAssets((data ?? []).map(r => r.assets).filter(Boolean)))
  }, [product.id])

  const statusCfg = PRODUCT_STATUS[product.status]
  const platforms = (product.platform ?? []).join(', ')
  const isLive = product.status === 'live'

  return (
    <>
      <div className="quick-view-backdrop" onClick={onClose} />
      <div className="quick-view-card">
        <div className="quick-view-header">
          <span className="quick-view-label">Quick view</span>
          <button className="quick-view-close" onClick={onClose}>×</button>
        </div>

        {/* Product preview */}
        <div className="quick-view-preview">{productEmoji(product.product_type)}</div>
        <div className="quick-view-body">
          <div className="quick-view-name">{product.name}</div>
          <div className="quick-view-tags">
            {product.niche && <span className="niche-tag">{product.niche}</span>}
            {product.product_type && <span className="type-tag">{product.product_type}</span>}
            {statusCfg && (
              <span className="product-status-badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            )}
          </div>

          {/* Details table */}
          <div className="quick-view-table">
            {platforms && (
              <div className="quick-view-row">
                <span className="quick-view-row-label">Platform</span>
                <span className="quick-view-row-value">{platforms}</span>
              </div>
            )}
            {product.price != null && (
              <div className="quick-view-row">
                <span className="quick-view-row-label">Price</span>
                <span className="quick-view-row-value">${Number(product.price).toFixed(2)}</span>
              </div>
            )}
            {product.sku && (
              <div className="quick-view-row">
                <span className="quick-view-row-label">SKU</span>
                <span className="quick-view-row-value">{product.sku}</span>
              </div>
            )}
            {product.listed_at && (
              <div className="quick-view-row">
                <span className="quick-view-row-label">Listed</span>
                <span className="quick-view-row-value quick-view-date--green">{formatDate(product.listed_at)}</span>
              </div>
            )}
            {product.target_launch_date && !isLive && (
              <div className="quick-view-row">
                <span className="quick-view-row-label">Target launch</span>
                <span className="quick-view-row-value quick-view-date--amber">{formatDate(product.target_launch_date)}</span>
              </div>
            )}
            {product.last_updated_at && (
              <div className="quick-view-row">
                <span className="quick-view-row-label">Last updated</span>
                <span className="quick-view-row-value quick-view-date--blue">{formatDate(product.last_updated_at)}</span>
              </div>
            )}
          </div>

          {/* Linked assets */}
          {linkedAssets.length > 0 && (
            <div className="quick-view-linked-assets">
              <div className="quick-view-linked-label">Linked assets</div>
              <div className="quick-view-asset-chips">
                {linkedAssets.map(a => (
                  <span key={a.id} className="asset-chip">{a.filename}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="quick-view-footer">
          <button
            className="quick-view-goto"
            style={{ background: 'var(--brand-accent)' }}
            onClick={() => navigate(`/catalog/${product.id}`)}
          >
            Go to product →
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Add / Edit Asset Panel ───────────────────────────────────────────────────

function AssetPanel({ asset, brandId, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    filename:     asset?.filename     ?? '',
    role:         asset?.role         ?? 'source_file',
    source_tool:  asset?.source_tool  ?? '',
    source_ref:   asset?.source_ref   ?? '',
    external_url: asset?.external_url ?? '',
    niche:        asset?.niche        ?? '',
    specs:        asset?.specs        ?? '',
    notes:        asset?.notes        ?? '',
  })
  const [saving, setSaving] = useState(false)

  function setField(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, brand_id: brandId }
    if (asset) {
      const { data } = await supabase.from('assets').update(payload).eq('id', asset.id).select().single()
      onSave(data, 'update')
    } else {
      const { data } = await supabase.from('assets').insert(payload).select().single()
      onSave(data, 'insert')
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!asset) return
    await supabase.from('assets').delete().eq('id', asset.id)
    onDelete(asset.id)
    onClose()
  }

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{asset ? 'Edit asset' : 'New asset'}</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Filename</label>
            <input className="form-input" type="text" value={form.filename} onChange={setField('filename')} required autoFocus placeholder="e.g. nurse-mug-mockup-01.png" />
          </div>
          <div className="form-field">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={setField('role')}>
              {Object.entries(ROLE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Source tool</label>
            <input className="form-input" type="text" list="source-tool-list" value={form.source_tool} onChange={setField('source_tool')} placeholder="e.g. Midjourney" />
            <datalist id="source-tool-list">
              {SOURCE_TOOLS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="form-field">
            <label className="form-label">Source ref</label>
            <input className="form-input" type="text" value={form.source_ref} onChange={setField('source_ref')} placeholder="Job ID, project URL, etc." />
          </div>
          <div className="form-field">
            <label className="form-label">External URL</label>
            <input className="form-input" type="url" value={form.external_url} onChange={setField('external_url')} placeholder="Deep link to open in source tool" />
          </div>
          <div className="form-field">
            <label className="form-label">Niche</label>
            <input className="form-input" type="text" value={form.niche} onChange={setField('niche')} placeholder="e.g. Nurses" />
          </div>
          {(form.role === 'ad_creative' || form.role === 'listing_image') && (
            <div className="form-field">
              <label className="form-label">Specs</label>
              <input className="form-input" type="text" value={form.specs} onChange={setField('specs')} placeholder="e.g. 1000×1500px · Pinterest pin" />
            </div>
          )}
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={setField('notes')} />
          </div>
          <div className="panel-actions">
            {asset && <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>}
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save asset'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Link Product Dropdown ────────────────────────────────────────────────────

function LinkProductDropdown({ brandId, excludeIds, onLink, onClose }) {
  const [products, setProducts] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    supabase.from('products').select('id, name, niche, status').eq('brand_id', brandId).order('name')
      .then(({ data }) => setProducts((data ?? []).filter(p => !excludeIds.includes(p.id))))
  }, [])

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <div className="link-dropdown" ref={ref}>
      {products.length === 0 ? (
        <div className="link-dropdown-empty">No products to link</div>
      ) : (
        products.map(p => (
          <button key={p.id} className="link-dropdown-item" onClick={() => { onLink(p); onClose() }}>
            <span>{productEmoji(p.product_type)}</span>
            <span className="link-dropdown-name">{p.name}</span>
            {p.niche && <span className="niche-tag" style={{ fontSize: 10 }}>{p.niche}</span>}
          </button>
        ))
      )}
    </div>
  )
}

// ─── Asset Detail Panel ───────────────────────────────────────────────────────

function AssetDetail({ asset, onEdit, onLinkedProductClick }) {
  const { activeBrand } = useBrand()
  const [linkedProducts, setLinkedProducts] = useState([])
  const [linkedCampaigns, setLinkedCampaigns] = useState([])
  const [notes, setNotes] = useState(asset.notes ?? '')
  const [linkProductOpen, setLinkProductOpen] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    setNotes(asset.notes ?? '')
    // Fetch linked products
    supabase
      .from('asset_product_links')
      .select('id, products(id, name, niche, product_type, status)')
      .eq('asset_id', asset.id)
      .then(({ data }) => setLinkedProducts((data ?? []).map(r => ({ linkId: r.id, product: r.products })).filter(r => r.product)))

    // Fetch linked campaigns
    supabase
      .from('asset_campaign_links')
      .select('id, campaigns(id, name)')
      .eq('asset_id', asset.id)
      .then(({ data }) => setLinkedCampaigns((data ?? []).map(r => ({ linkId: r.id, campaign: r.campaigns })).filter(r => r.campaign)))
  }, [asset.id])

  async function saveNotes() {
    if (notes === asset.notes) return
    setSavingNotes(true)
    await supabase.from('assets').update({ notes }).eq('id', asset.id)
    setSavingNotes(false)
  }

  async function linkProduct(product) {
    const { data } = await supabase
      .from('asset_product_links')
      .insert({ asset_id: asset.id, product_id: product.id })
      .select('id, products(id, name, niche, product_type, status)')
      .single()
    if (data) setLinkedProducts(prev => [...prev, { linkId: data.id, product: data.products }])
  }

  async function unlinkProduct(linkId) {
    await supabase.from('asset_product_links').delete().eq('id', linkId)
    setLinkedProducts(prev => prev.filter(r => r.linkId !== linkId))
  }

  const showSpecs = asset.role === 'ad_creative' || asset.role === 'listing_image'
  const linkedProductIds = linkedProducts.map(r => r.product?.id).filter(Boolean)

  return (
    <div className="asset-detail-panel">
      {/* Preview area */}
      <div className="asset-detail-preview">
        <span className="asset-detail-preview-icon">{assetEmoji(asset.role)}</span>
      </div>

      {/* Header */}
      <div className="asset-detail-header">
        <div className="asset-detail-filename">{asset.filename}</div>
        <div className="asset-detail-tags">
          {asset.source_tool && <span className="type-tag">{asset.source_tool}</span>}
          {asset.role && <span className="type-tag">{ROLE_LABELS[asset.role] ?? asset.role}</span>}
          {asset.niche && <span className="niche-tag">{asset.niche}</span>}
          <button className="asset-edit-btn" onClick={onEdit}>Edit</button>
        </div>
      </div>

      {/* Source info */}
      {(asset.source_ref || asset.external_url) && (
        <div className="asset-detail-section">
          <div className="asset-detail-section-title">Source</div>
          {asset.source_ref && <div className="asset-source-ref">{asset.source_ref}</div>}
          {asset.external_url && (
            <a href={asset.external_url} target="_blank" rel="noopener noreferrer" className="asset-external-link">
              Open in {asset.source_tool || 'source tool'} ↗
            </a>
          )}
        </div>
      )}

      {/* Specs */}
      {showSpecs && asset.specs && (
        <div className="asset-detail-section">
          <div className="asset-detail-section-title">Specs</div>
          <div className="asset-specs-text">{asset.specs}</div>
        </div>
      )}

      {/* Notes */}
      <div className="asset-detail-section">
        <div className="asset-detail-section-title">Notes</div>
        <textarea
          className="form-textarea"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Usage tips, caveats, export instructions…"
        />
        {savingNotes && <span className="asset-saving-indicator">Saving…</span>}
      </div>

      {/* Linked products */}
      <div className="asset-detail-section">
        <div className="asset-detail-section-title">Linked products</div>
        {linkedProducts.map(({ linkId, product }) => {
          const statusCfg = PRODUCT_STATUS[product.status]
          return (
            <div
              key={linkId}
              className="linked-product-row"
              onClick={() => onLinkedProductClick(product)}
            >
              <span className="linked-product-thumb">{productEmoji(product.product_type)}</span>
              <span className="linked-product-name">{product.name}</span>
              <span className="linked-product-status" style={{ color: statusCfg?.color }}>{statusCfg?.label}</span>
              <span className="linked-row-chevron">›</span>
              <button
                className="linked-product-unlink"
                onClick={e => { e.stopPropagation(); unlinkProduct(linkId) }}
                title="Unlink"
              >×</button>
            </div>
          )
        })}
        <div style={{ position: 'relative' }}>
          <button className="link-another-btn" onClick={() => setLinkProductOpen(v => !v)}>
            + Link another product
          </button>
          {linkProductOpen && (
            <LinkProductDropdown
              brandId={activeBrand.id}
              excludeIds={linkedProductIds}
              onLink={linkProduct}
              onClose={() => setLinkProductOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Used in campaigns */}
      <div className="asset-detail-section">
        <div className="asset-detail-section-title">Used in campaigns</div>
        {linkedCampaigns.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', paddingBottom: 4 }}>Not linked to any campaigns</div>
        ) : (
          linkedCampaigns.map(({ linkId, campaign }) => (
            <div key={linkId} className="linked-campaign-row">
              <span className="linked-campaign-name">{campaign.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DesignAssets() {
  const { activeBrand } = useBrand()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('assets')
      .select('*')
      .eq('brand_id', activeBrand.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAssets(data ?? [])
        setLoading(false)
      })
  }, [activeBrand.id])

  function handleSave(saved, mode) {
    if (mode === 'insert') {
      setAssets(prev => [saved, ...prev])
      setSelectedId(saved.id)
    } else {
      setAssets(prev => prev.map(a => a.id === saved.id ? saved : a))
    }
  }

  function handleDelete(id) {
    setAssets(prev => prev.filter(a => a.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function openAdd() { setEditingAsset(null); setPanelOpen(true) }
  function openEdit(asset) { setEditingAsset(asset); setPanelOpen(true) }

  const filtered = filter === 'all' ? assets : assets.filter(a => a.role === filter)
  const selectedAsset = assets.find(a => a.id === selectedId) ?? null

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="assets-page">
      {/* Page header sits above the master-detail layout */}
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h1 className="page-title">Design Assets</h1>
        <button className="btn-add" onClick={openAdd}>+ Add asset</button>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⬡</span>
          <span className="empty-text">No assets yet</span>
          <button className="btn-add" onClick={openAdd}>+ Add asset</button>
        </div>
      ) : (
        <div className="assets-layout">
          {/* Left column — asset list */}
          <div className="assets-list-col">
            <FilterPills options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
            <div className="assets-list">
              {filtered.length === 0 ? (
                <div className="assets-list-empty">No assets match this filter</div>
              ) : (
                filtered.map(asset => (
                  <div
                    key={asset.id}
                    className={`asset-list-item ${selectedId === asset.id ? 'asset-list-item--selected' : ''}`}
                    onClick={() => setSelectedId(asset.id)}
                  >
                    <div className="asset-list-thumb">{assetEmoji(asset.role)}</div>
                    <div className="asset-list-info">
                      <div className="asset-list-filename">{asset.filename}</div>
                      <div className="asset-list-meta">
                        {asset.source_tool && <span>{asset.source_tool}</span>}
                        {asset.source_tool && asset.role && <span>·</span>}
                        {asset.role && <span>{ROLE_LABELS[asset.role]}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column — detail panel */}
          <div className="assets-detail-col">
            {selectedAsset ? (
              <AssetDetail
                key={selectedAsset.id}
                asset={selectedAsset}
                onEdit={() => openEdit(selectedAsset)}
                onLinkedProductClick={p => setQuickViewProduct(p)}
              />
            ) : (
              <div className="assets-detail-empty">
                <span>Select an asset to view details</span>
              </div>
            )}

            {/* Quick view overlay — positioned within detail col */}
            {quickViewProduct && (
              <div className="quick-view-overlay">
                <QuickViewCard
                  product={quickViewProduct}
                  onClose={() => setQuickViewProduct(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {panelOpen && (
        <AssetPanel
          asset={editingAsset}
          brandId={activeBrand.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
