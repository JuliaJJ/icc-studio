import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { PRODUCT_STATUS, productEmoji, PLATFORMS } from '../lib/constants'

function KeywordInput({ keywords, onChange }) {
  const [input, setInput] = useState('')

  function handleKeyDown(e) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      const trimmed = input.trim()
      if (!keywords.includes(trimmed)) onChange([...keywords, trimmed])
      setInput('')
    }
    if (e.key === 'Backspace' && !input && keywords.length > 0) {
      onChange(keywords.slice(0, -1))
    }
  }

  return (
    <div className="tag-input-wrapper">
      {keywords.map((kw, i) => (
        <span key={i} className="keyword-tag">
          {kw}
          <button type="button" className="keyword-tag-remove" onClick={() => onChange(keywords.filter((_, j) => j !== i))}>×</button>
        </span>
      ))}
      <input
        className="tag-input"
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={keywords.length === 0 ? 'Type keyword + Enter' : ''}
      />
    </div>
  )
}

function PlatformSelector({ selected, onChange }) {
  function toggle(platform) {
    if (selected.includes(platform)) {
      onChange(selected.filter(p => p !== platform))
    } else {
      onChange([...selected, platform])
    }
  }
  return (
    <div className="platform-selector">
      {PLATFORMS.map(p => (
        <button
          key={p}
          type="button"
          className={`platform-tag ${selected.includes(p) ? 'platform-tag--active' : ''}`}
          onClick={() => toggle(p)}
        >
          {p}
        </button>
      ))}
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeBrand } = useBrand()
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [linkedAssets, setLinkedAssets] = useState([])
  const imageInputRef = useRef(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setProduct(data)
        setForm({
          name: data?.name ?? '',
          status: data?.status ?? 'idea',
          niche: data?.niche ?? '',
          product_type: data?.product_type ?? '',
          platform: data?.platform ?? [],
          price: data?.price ?? '',
          sku: data?.sku ?? '',
          description: data?.description ?? '',
          keywords: data?.keywords ?? [],
          ad_creative_notes: data?.ad_creative_notes ?? '',
          notes: data?.notes ?? '',
          listed_at: data?.listed_at ?? '',
          target_launch_date: data?.target_launch_date ?? '',
          last_updated_at: data?.last_updated_at ?? '',
        })
        // Load signed URL for primary image
        const path = data?.image_urls?.[0]
        if (path) {
          supabase.storage.from('icc-assets').createSignedUrl(path, 3600)
            .then(({ data: urlData }) => { if (urlData) setImageUrl(urlData.signedUrl) })
        }
        setLoading(false)
      })

    // Load linked assets
    supabase
      .from('asset_product_links')
      .select('id, assets(id, filename, role)')
      .eq('product_id', id)
      .then(({ data }) => setLinkedAssets((data ?? []).map(r => r.assets).filter(Boolean)))
  }, [id])

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const path = `products/${activeBrand.id}/${id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('icc-assets').upload(path, file)
    if (!error) {
      await supabase.from('products').update({ image_urls: [path] }).eq('id', id)
      setProduct(prev => ({ ...prev, image_urls: [path] }))
      const { data: urlData } = await supabase.storage.from('icc-assets').createSignedUrl(path, 3600)
      if (urlData) setImageUrl(urlData.signedUrl)
    }
    setUploadingImage(false)
  }

  async function handleImageRemove() {
    await supabase.from('products').update({ image_urls: [] }).eq('id', id)
    setProduct(prev => ({ ...prev, image_urls: [] }))
    setImageUrl(null)
  }

  function setField(field) {
    return (e) => {
      setSaved(false)
      setForm(prev => ({ ...prev, [field]: e.target.value }))
    }
  }

  function setDirect(field, value) {
    setSaved(false)
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      price: form.price === '' ? null : Number(form.price),
      listed_at: form.listed_at || null,
      target_launch_date: form.target_launch_date || null,
      last_updated_at: form.last_updated_at || null,
    }
    const { data } = await supabase.from('products').update(payload).eq('id', id).select().single()
    setProduct(data)
    setSaving(false)
    setSaved(true)
  }

  async function handleDelete() {
    if (!confirm('Delete this product? This cannot be undone.')) return
    await supabase.from('products').delete().eq('id', id)
    navigate('/catalog')
  }

  if (loading || !form) return <div className="loading-state">Loading…</div>
  if (!product) return <div className="loading-state">Product not found.</div>

  const statusCfg = PRODUCT_STATUS[form.status]

  return (
    <div className="product-detail">
      <div className="product-detail-back">
        <Link to="/catalog" className="back-link">← Catalog</Link>
      </div>

      <form onSubmit={handleSave}>
        {/* Header */}
        <div className="product-detail-header">
          <input
            className="product-name-input"
            type="text"
            value={form.name}
            onChange={setField('name')}
            placeholder="Product name"
            required
          />
          <div className="product-header-meta">
            <select
              className="form-select"
              value={form.status}
              onChange={setField('status')}
              style={{ color: statusCfg?.color, background: statusCfg?.bg, borderColor: 'transparent', fontWeight: 500 }}
            >
              {Object.entries(PRODUCT_STATUS).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
            <PlatformSelector selected={form.platform} onChange={v => setDirect('platform', v)} />
          </div>
        </div>

        {/* Image area */}
        <div
          className="product-image-area"
          style={{ cursor: imageUrl ? 'default' : 'pointer', padding: 0, overflow: 'hidden' }}
          onClick={() => { if (!imageUrl) imageInputRef.current?.click() }}
        >
          {imageUrl ? (
            <>
              <img src={imageUrl} alt={form.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div className="product-image-actions">
                <button type="button" className="product-image-action-btn" onClick={() => imageInputRef.current?.click()}>Change</button>
                <button type="button" className="product-image-action-btn" onClick={handleImageRemove}>Remove</button>
              </div>
            </>
          ) : (
            <>
              <span style={{ fontSize: 28 }}>{productEmoji(form.product_type)}</span>
              <span className="product-image-note">{uploadingImage ? 'Uploading…' : 'Click to upload image'}</span>
            </>
          )}
        </div>
        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

        {/* Details section */}
        <div className="product-detail-section">
          <div className="product-detail-section-title">Details</div>
          <div className="product-fields-grid">
            <div className="form-field">
              <label className="form-label">Niche</label>
              <input className="form-input" type="text" value={form.niche} onChange={setField('niche')} placeholder="e.g. Nurses" />
            </div>
            <div className="form-field">
              <label className="form-label">Product type</label>
              <input className="form-input" type="text" value={form.product_type} onChange={setField('product_type')} placeholder="e.g. Apparel" />
            </div>
            <div className="form-field">
              <label className="form-label">Price ($)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.price} onChange={setField('price')} placeholder="0.00" />
            </div>
            <div className="form-field">
              <label className="form-label">SKU</label>
              <input className="form-input" type="text" value={form.sku} onChange={setField('sku')} placeholder="e.g. BWC-NRS-001" />
            </div>
            <div className="form-field">
              <label className="form-label">Listed date</label>
              <input className="form-input" type="date" value={form.listed_at} onChange={setField('listed_at')} />
            </div>
            <div className="form-field">
              <label className="form-label">Target launch</label>
              <input className="form-input" type="date" value={form.target_launch_date} onChange={setField('target_launch_date')} />
            </div>
            <div className="form-field">
              <label className="form-label">Last updated</label>
              <input className="form-input" type="date" value={form.last_updated_at} onChange={setField('last_updated_at')} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="product-detail-section">
          <div className="product-detail-section-title">Listing description</div>
          <textarea className="form-textarea" rows={5} value={form.description} onChange={setField('description')} placeholder="Full listing copy…" />
        </div>

        {/* Keywords */}
        <div className="product-detail-section">
          <div className="product-detail-section-title">Keywords</div>
          <KeywordInput keywords={form.keywords} onChange={v => setDirect('keywords', v)} />
        </div>

        {/* Ad creative notes */}
        <div className="product-detail-section">
          <div className="product-detail-section-title">Ad creative notes</div>
          <textarea className="form-textarea" rows={3} value={form.ad_creative_notes} onChange={setField('ad_creative_notes')} placeholder="Notes on creative strategy…" />
        </div>

        {/* Internal notes */}
        <div className="product-detail-section">
          <div className="product-detail-section-title">Internal notes</div>
          <textarea className="form-textarea" rows={3} value={form.notes} onChange={setField('notes')} placeholder="Internal notes…" />
        </div>

        {/* Linked assets */}
        {linkedAssets.length > 0 && (
          <div className="product-detail-section">
            <div className="product-detail-section-title">Linked assets</div>
            {linkedAssets.map(asset => (
              <div key={asset.id} className="product-linked-asset-row">
                <span>{asset.role === 'source_file' ? '📁' : asset.role === 'mockup' ? '🖼️' : asset.role === 'listing_image' ? '🏞️' : '🎨'}</span>
                <span className="product-linked-asset-name">{asset.filename}</span>
              </div>
            ))}
          </div>
        )}

        {/* Save bar */}
        <div className="product-save-bar">
          <button type="button" className="btn-danger" onClick={handleDelete}>Delete product</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saved && <span className="settings-saved">Saved</span>}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
