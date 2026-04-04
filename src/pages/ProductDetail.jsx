import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { PRODUCT_STATUS, productEmoji, PLATFORMS } from '../lib/constants'

// ─── Tab definitions ──────────────────────────────────────────────────────────

const ALL_TABS = [
  { id: 'overview',   label: 'Overview',   alwaysOn: true },
  { id: 'Etsy',       label: 'Etsy' },
  { id: 'KDP',        label: 'KDP' },
  { id: 'Gumroad',    label: 'Gumroad' },
  { id: 'Stan Store', label: 'Stan Store' },
  { id: 'Pinterest',  label: 'Pinterest' },
  { id: 'Social',     label: 'Social' },
]

const NEXT_STATUS = { idea: 'in_progress', in_progress: 'ready', ready: 'live' }

const PLATFORM_MEDIA_SPECS = {
  Etsy: {
    maxImages: 10, maxVideos: 1,
    hint: 'Up to 10 images (min 570 px, 2000×2000 rec.) · 1 video (5–15 s, min 720p, max 100 MB)',
    accepts: 'image/*,video/mp4,video/quicktime',
  },
  KDP: {
    maxImages: 1, maxVideos: 0,
    hint: 'Cover image (KDP generates the final composite from your uploaded cover file)',
    accepts: 'image/*',
  },
  Gumroad: {
    maxImages: 5, maxVideos: 0,
    hint: 'Cover + additional images (1280×720 px or 1:1 recommended)',
    accepts: 'image/*',
  },
  'Stan Store': {
    maxImages: 3, maxVideos: 0,
    hint: 'Cover image (1:1 recommended)',
    accepts: 'image/*',
  },
  Pinterest: {
    maxImages: 5, maxVideos: 1,
    hint: '2:3 ratio (1000×1500 px rec.) · Video pins up to 15 min',
    accepts: 'image/*,video/mp4,video/quicktime',
  },
  Social: {
    maxImages: 10, maxVideos: 5,
    hint: '1:1 for grid · 4:5 for feed · 9:16 for stories/reels',
    accepts: 'image/*,video/mp4,video/quicktime',
  },
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" className="copy-btn" onClick={copy} disabled={!text}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function LabelRow({ label, extra, copyText }) {
  return (
    <div className="form-label-row">
      <label className="form-label">{label}</label>
      <div className="form-label-row-right">
        {extra}
        {copyText !== undefined && <CopyButton text={copyText} />}
      </div>
    </div>
  )
}

// ─── Etsy tag input (max 13 tags, max 20 chars each) ─────────────────────────

function EtsyTagInput({ tags, onChange }) {
  const [input, setInput] = useState('')
  const MAX = 13
  const CHAR_MAX = 20

  function add(val) {
    const t = val.trim().toLowerCase()
    if (!t || tags.includes(t) || tags.length >= MAX) return
    onChange([...tags, t])
    setInput('')
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ',') && input) { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1))
  }

  return (
    <div>
      <div className="tag-input-wrapper">
        {tags.map((tag, i) => (
          <span key={i} className={`keyword-tag ${tag.length > CHAR_MAX ? 'keyword-tag--warn' : ''}`}>
            {tag}
            {tag.length > CHAR_MAX && <span className="etsy-tag-warn" title="Exceeds 20 chars"> !</span>}
            <button type="button" className="keyword-tag-remove" onClick={() => onChange(tags.filter((_, j) => j !== i))}>×</button>
          </span>
        ))}
        {tags.length < MAX && (
          <input
            className="tag-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input.trim()) add(input) }}
            placeholder={tags.length === 0 ? 'Type tag + Enter (max 20 chars)' : ''}
          />
        )}
      </div>
      <div className="etsy-tag-meta">
        <span className={tags.length >= MAX ? 'etsy-tag-count--full' : 'etsy-tag-count'}>{tags.length} / {MAX} tags</span>
        {tags.some(t => t.length > CHAR_MAX) && (
          <span className="etsy-tag-warn-msg">Some tags exceed 20 characters</span>
        )}
      </div>
    </div>
  )
}

// ─── Hashtag input ────────────────────────────────────────────────────────────

function HashtagInput({ hashtags, onChange, placeholder }) {
  const [input, setInput] = useState('')

  function add(val) {
    let t = val.trim()
    if (!t) return
    if (!t.startsWith('#')) t = '#' + t
    if (!hashtags.includes(t)) onChange([...hashtags, t])
    setInput('')
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && input.trim()) { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && hashtags.length > 0) onChange(hashtags.slice(0, -1))
  }

  return (
    <div className="tag-input-wrapper">
      {hashtags.map((tag, i) => (
        <span key={i} className="keyword-tag">
          {tag}
          <button type="button" className="keyword-tag-remove" onClick={() => onChange(hashtags.filter((_, j) => j !== i))}>×</button>
        </span>
      ))}
      <input
        className="tag-input"
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) add(input) }}
        placeholder={hashtags.length === 0 ? (placeholder ?? 'Type hashtag + Enter') : ''}
      />
    </div>
  )
}

// ─── Keyword input ────────────────────────────────────────────────────────────

function KeywordInput({ keywords, onChange }) {
  const [input, setInput] = useState('')

  function handleKeyDown(e) {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      const trimmed = input.trim()
      if (!keywords.includes(trimmed)) onChange([...keywords, trimmed])
      setInput('')
    }
    if (e.key === 'Backspace' && !input && keywords.length > 0) onChange(keywords.slice(0, -1))
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

// ─── Platform selector ────────────────────────────────────────────────────────

function PlatformSelector({ selected, onChange }) {
  function toggle(p) {
    onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])
  }
  return (
    <div className="platform-selector">
      {PLATFORMS.map(p => (
        <button key={p} type="button"
          className={`platform-tag ${selected.includes(p) ? 'platform-tag--active' : ''}`}
          onClick={() => toggle(p)}
        >{p}</button>
      ))}
    </div>
  )
}

// ─── Keyword library picker ───────────────────────────────────────────────────

function KeywordLibraryPicker({ brandId, productNiche, currentKeywords, onAdd, onClose }) {
  const [libraryKeywords, setLibraryKeywords] = useState([])
  const [nicheFilter, setNicheFilter] = useState(productNiche ?? 'all')

  useEffect(() => {
    supabase.from('keywords').select('id, keyword, niche').eq('brand_id', brandId)
      .order('niche').order('keyword')
      .then(({ data }) => setLibraryKeywords(data ?? []))
  }, [brandId])

  useEffect(() => {
    function handle(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  const niches = [...new Set(libraryKeywords.map(k => k.niche).filter(Boolean))]
  const filtered = nicheFilter === 'all' ? libraryKeywords : libraryKeywords.filter(k => k.niche === nicheFilter)
  const currentSet = new Set(currentKeywords.map(k => k.toLowerCase()))

  return (
    <div className="kw-picker-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="kw-picker-modal">
        <div className="kw-picker-header">
          <span className="kw-picker-title">Keyword library</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        {niches.length > 1 && (
          <div className="kw-picker-filters">
            <button className={`filter-pill ${nicheFilter === 'all' ? 'filter-pill--active' : ''}`} onClick={() => setNicheFilter('all')}>All</button>
            {niches.map(n => (
              <button key={n} className={`filter-pill ${nicheFilter === n ? 'filter-pill--active' : ''}`} onClick={() => setNicheFilter(n)}>{n}</button>
            ))}
          </div>
        )}
        <div className="kw-picker-list">
          {filtered.length === 0 ? (
            <div className="kw-picker-empty">No keywords in library{nicheFilter !== 'all' ? ` for ${nicheFilter}` : ''}</div>
          ) : filtered.map(kw => {
            const already = currentSet.has(kw.keyword.toLowerCase())
            return (
              <button key={kw.id} className={`kw-picker-item ${already ? 'kw-picker-item--added' : ''}`}
                onClick={() => { if (!already) onAdd(kw.keyword) }} disabled={already}>
                <span className="kw-picker-item-text">{kw.keyword}</span>
                {already ? <span className="kw-picker-item-check">✓</span> : <span className="kw-picker-item-add">+ Add</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Per-platform media grid ──────────────────────────────────────────────────

function ProductAssets({ productId, brandId, platform, spec, assets, onAdd, onRemove }) {
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState({})
  const fileInputRef = useRef(null)

  const imageAssets = assets.filter(a => a.media_type === 'image')
  const videoAssets = assets.filter(a => a.media_type === 'video')
  const canAddMore = imageAssets.length < spec.maxImages || (spec.maxVideos > 0 && videoAssets.length < spec.maxVideos)

  useEffect(() => {
    const missing = assets.filter(a => !signedUrls[a.id])
    if (!missing.length) return
    Promise.all(
      missing.map(a =>
        supabase.storage.from('icc-assets').createSignedUrl(a.file_url, 3600)
          .then(({ data }) => [a.id, data?.signedUrl])
      )
    ).then(pairs => {
      setSignedUrls(prev => {
        const next = { ...prev }
        pairs.forEach(([assetId, url]) => { if (url) next[assetId] = url })
        return next
      })
    })
  }, [assets])

  async function handleUpload(e) {
    const files = [...(e.target.files ?? [])]
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const isVideo = file.type.startsWith('video/')
      const mediaType = isVideo ? 'video' : 'image'
      const currentCount = isVideo ? videoAssets.length : imageAssets.length
      const maxCount = isVideo ? spec.maxVideos : spec.maxImages
      if (currentCount >= maxCount) continue
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `products/${brandId}/${productId}/${platform}-${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('icc-assets').upload(path, file)
      if (!error) {
        const { data } = await supabase.from('product_assets').insert({
          product_id: productId,
          brand_id: brandId,
          platform,
          media_type: mediaType,
          file_url: path,
          sort_order: assets.length,
        }).select().single()
        if (data) onAdd(data)
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleRemove(asset) {
    if (!confirm('Remove this file?')) return
    await supabase.storage.from('icc-assets').remove([asset.file_url])
    await supabase.from('product_assets').delete().eq('id', asset.id)
    onRemove(asset.id)
  }

  return (
    <div className="product-detail-section">
      <div className="product-media-header">
        <span className="product-detail-section-title">Media</span>
        <span className="product-media-spec-hint">{spec.hint}</span>
      </div>
      <div className="product-media-grid">
        {assets.map(asset => (
          <div key={asset.id} className="product-media-thumb">
            {asset.media_type === 'video' ? (
              <div className="product-media-video-thumb">
                <span className="product-media-video-icon">▶</span>
                <span className="product-media-video-label">Video</span>
              </div>
            ) : signedUrls[asset.id] ? (
              <img src={signedUrls[asset.id]} alt="" />
            ) : (
              <div className="product-media-loading" />
            )}
            <button
              type="button"
              className="product-media-remove"
              onClick={() => handleRemove(asset)}
              title="Remove"
            >×</button>
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            className="product-media-add"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <span className="product-media-uploading" /> : <span>+</span>}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={spec.accepts}
        style={{ display: 'none' }}
        onChange={handleUpload}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeBrand } = useBrand()
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [imageUrl, setImageUrl] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [linkedAssets, setLinkedAssets] = useState([])
  const [productAssets, setProductAssets] = useState([])
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false)
  const imageInputRef = useRef(null)

  useEffect(() => {
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => {
        setProduct(data)
        const pc = data?.platform_content ?? {}
        setForm({
          name:               data?.name               ?? '',
          status:             data?.status             ?? 'idea',
          niche:              data?.niche              ?? '',
          product_type:       data?.product_type       ?? '',
          platform:           data?.platform           ?? [],
          price:              data?.price              ?? '',
          sku:                data?.sku                ?? '',
          description:        data?.description        ?? '',
          keywords:           data?.keywords           ?? [],
          ad_creative_notes:  data?.ad_creative_notes  ?? '',
          notes:              data?.notes              ?? '',
          listed_at:          data?.listed_at          ?? '',
          target_launch_date: data?.target_launch_date ?? '',
          last_updated_at:    data?.last_updated_at    ?? '',
          platform_content: {
            etsy: {
              listing_title: pc.etsy?.listing_title ?? '',
              tags:          pc.etsy?.tags          ?? [],
              section:       pc.etsy?.section       ?? '',
            },
            kdp: {
              subtitle:    pc.kdp?.subtitle    ?? '',
              description: pc.kdp?.description ?? '',
              keywords:    pc.kdp?.keywords    ?? [],
              categories:  pc.kdp?.categories  ?? '',
              asin:        pc.kdp?.asin        ?? '',
            },
            gumroad: {
              headline:    pc.gumroad?.headline    ?? '',
              description: pc.gumroad?.description ?? '',
              url:         pc.gumroad?.url         ?? '',
            },
            stan_store: {
              headline:    pc.stan_store?.headline    ?? '',
              description: pc.stan_store?.description ?? '',
              url:         pc.stan_store?.url         ?? '',
            },
            pinterest: {
              pin_title:       pc.pinterest?.pin_title       ?? '',
              pin_description: pc.pinterest?.pin_description ?? '',
              hashtags:        pc.pinterest?.hashtags        ?? [],
            },
            social: {
              caption:       pc.social?.caption       ?? '',
              hashtags:      pc.social?.hashtags      ?? [],
              creative_notes: pc.social?.creative_notes ?? '',
            },
          },
        })
        const path = data?.image_urls?.[0]
        if (path) {
          supabase.storage.from('icc-assets').createSignedUrl(path, 3600)
            .then(({ data: u }) => { if (u) setImageUrl(u.signedUrl) })
        }
        setLoading(false)
      })

    supabase.from('asset_product_links').select('id, assets(id, filename, role)').eq('product_id', id)
      .then(({ data }) => setLinkedAssets((data ?? []).map(r => r.assets).filter(Boolean)))

    supabase.from('product_assets').select('*').eq('product_id', id).order('sort_order').order('created_at')
      .then(({ data }) => setProductAssets(data ?? []))
  }, [id])

  function setField(field) {
    return e => { setSaved(false); setForm(prev => ({ ...prev, [field]: e.target.value })) }
  }

  function setDirect(field, value) {
    setSaved(false)
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setPc(tab, field, value) {
    setSaved(false)
    setForm(prev => ({
      ...prev,
      platform_content: {
        ...prev.platform_content,
        [tab]: { ...prev.platform_content[tab], [field]: value },
      },
    }))
  }

  function setPcField(tab, field) { return e => setPc(tab, field, e.target.value) }

  function assetsFor(platform) { return productAssets.filter(a => a.platform === platform) }
  function handleAssetAdded(asset) { setProductAssets(prev => [...prev, asset]) }
  function handleAssetRemoved(assetId) { setProductAssets(prev => prev.filter(a => a.id !== assetId)) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...form,
      price:              form.price              === '' ? null : Number(form.price),
      listed_at:          form.listed_at          || null,
      target_launch_date: form.target_launch_date || null,
      last_updated_at:    form.last_updated_at    || null,
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

  async function advanceStage() {
    const next = NEXT_STATUS[form.status]
    if (!next) return
    setForm(p => ({ ...p, status: next }))
    await supabase.from('products').update({ status: next }).eq('id', id)
    setSaved(true)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const path = `products/${activeBrand.id}/${id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from('icc-assets').upload(path, file)
    if (!error) {
      await supabase.from('products').update({ image_urls: [path] }).eq('id', id)
      setProduct(prev => ({ ...prev, image_urls: [path] }))
      const { data: u } = await supabase.storage.from('icc-assets').createSignedUrl(path, 3600)
      if (u) setImageUrl(u.signedUrl)
    }
    setUploadingImage(false)
  }

  async function handleImageRemove() {
    await supabase.from('products').update({ image_urls: [] }).eq('id', id)
    setProduct(prev => ({ ...prev, image_urls: [] }))
    setImageUrl(null)
  }

  if (loading || !form) return <div className="loading-state">Loading…</div>
  if (!product) return <div className="loading-state">Product not found.</div>

  const statusCfg = PRODUCT_STATUS[form.status]
  const enabledTabs = activeBrand.platform_tabs ?? ['Etsy', 'Pinterest', 'Social']
  const visibleTabs = ALL_TABS.filter(t => t.alwaysOn || enabledTabs.includes(t.id))
  const pc = form.platform_content

  return (
    <div className="product-detail">
      <div className="product-detail-back">
        <Link to="/catalog" className="back-link">← Catalog</Link>
      </div>

      <form onSubmit={handleSave}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
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
            {NEXT_STATUS[form.status] && (() => {
              const nextCfg = PRODUCT_STATUS[NEXT_STATUS[form.status]]
              return (
                <button type="button" className="btn-next-stage"
                  style={{ background: nextCfg.bg, color: nextCfg.color }}
                  onClick={advanceStage}
                >→ {nextCfg.label}</button>
              )
            })()}
            <PlatformSelector selected={form.platform} onChange={v => setDirect('platform', v)} />
          </div>
        </div>

        {/* ── Image ───────────────────────────────────────────────────────── */}
        <div className="product-image-area"
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

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="product-tabs">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`product-tab ${activeTab === tab.id ? 'product-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="product-tab-content">
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

            <div className="product-detail-section">
              <LabelRow label="Keywords" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
                <button type="button" className="kw-library-btn" onClick={() => setLibraryPickerOpen(true)}>Browse library →</button>
              </div>
              <KeywordInput keywords={form.keywords} onChange={v => setDirect('keywords', v)} />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Ad creative notes" />
              <textarea className="form-textarea" rows={3} value={form.ad_creative_notes} onChange={setField('ad_creative_notes')} placeholder="Notes on creative strategy…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Internal notes" />
              <textarea className="form-textarea" rows={3} value={form.notes} onChange={setField('notes')} placeholder="Internal notes…" />
            </div>

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
          </div>
        )}

        {/* ── Etsy tab ────────────────────────────────────────────────────── */}
        {activeTab === 'Etsy' && (
          <div className="product-tab-content">
            <ProductAssets
              productId={id} brandId={activeBrand.id} platform="Etsy"
              spec={PLATFORM_MEDIA_SPECS.Etsy}
              assets={assetsFor('Etsy')} onAdd={handleAssetAdded} onRemove={handleAssetRemoved}
            />
            <div className="product-detail-section">
              <LabelRow label="Listing title" extra={<span className={`char-count ${pc.etsy.listing_title.length > 120 ? 'char-count--warn' : ''}`}>{pc.etsy.listing_title.length}/140</span>} copyText={pc.etsy.listing_title} />
              <input className="form-input" type="text" maxLength={140} value={pc.etsy.listing_title} onChange={setPcField('etsy', 'listing_title')} placeholder="SEO-optimized listing title…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Listing description" copyText={form.description} />
              <textarea className="form-textarea" rows={8} value={form.description} onChange={setField('description')} placeholder="Full listing copy…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Tags" />
              <EtsyTagInput tags={pc.etsy.tags} onChange={v => setPc('etsy', 'tags', v)} />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Shop section" />
              <input className="form-input" type="text" value={pc.etsy.section} onChange={setPcField('etsy', 'section')} placeholder="e.g. Nurse Gifts, Wall Art" />
            </div>
          </div>
        )}

        {/* ── KDP tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'KDP' && (
          <div className="product-tab-content">
            <ProductAssets
              productId={id} brandId={activeBrand.id} platform="KDP"
              spec={PLATFORM_MEDIA_SPECS.KDP}
              assets={assetsFor('KDP')} onAdd={handleAssetAdded} onRemove={handleAssetRemoved}
            />
            <div className="product-detail-section">
              <LabelRow label="Subtitle" />
              <input className="form-input" type="text" value={pc.kdp.subtitle} onChange={setPcField('kdp', 'subtitle')} placeholder="Book subtitle…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Book description" copyText={pc.kdp.description} />
              <textarea className="form-textarea" rows={8} value={pc.kdp.description} onChange={setPcField('kdp', 'description')} placeholder="KDP book description (HTML supported)…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Keywords" extra={<span className="char-count">{pc.kdp.keywords.length}/7 phrases</span>} />
              <KeywordInput keywords={pc.kdp.keywords} onChange={v => setPc('kdp', 'keywords', v.slice(0, 7))} />
              <div className="field-hint">Up to 7 keyword phrases. Enter to add.</div>
            </div>

            <div className="product-detail-section">
              <LabelRow label="BISAC categories" />
              <input className="form-input" type="text" value={pc.kdp.categories} onChange={setPcField('kdp', 'categories')} placeholder="e.g. HEA032000 · HUM003000" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="ASIN" />
              <input className="form-input" type="text" value={pc.kdp.asin} onChange={setPcField('kdp', 'asin')} placeholder="Once published on Amazon" />
            </div>
          </div>
        )}

        {/* ── Gumroad tab ─────────────────────────────────────────────────── */}
        {activeTab === 'Gumroad' && (
          <div className="product-tab-content">
            <ProductAssets
              productId={id} brandId={activeBrand.id} platform="Gumroad"
              spec={PLATFORM_MEDIA_SPECS.Gumroad}
              assets={assetsFor('Gumroad')} onAdd={handleAssetAdded} onRemove={handleAssetRemoved}
            />
            <div className="product-detail-section">
              <LabelRow label="Headline" copyText={pc.gumroad.headline} />
              <input className="form-input" type="text" value={pc.gumroad.headline} onChange={setPcField('gumroad', 'headline')} placeholder="Short hook for the product page…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Description" copyText={pc.gumroad.description} />
              <textarea className="form-textarea" rows={8} value={pc.gumroad.description} onChange={setPcField('gumroad', 'description')} placeholder="Full product page copy…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Published URL" />
              <input className="form-input" type="url" value={pc.gumroad.url} onChange={setPcField('gumroad', 'url')} placeholder="https://yourname.gumroad.com/l/…" />
            </div>
          </div>
        )}

        {/* ── Stan Store tab ───────────────────────────────────────────────── */}
        {activeTab === 'Stan Store' && (
          <div className="product-tab-content">
            <ProductAssets
              productId={id} brandId={activeBrand.id} platform="Stan Store"
              spec={PLATFORM_MEDIA_SPECS['Stan Store']}
              assets={assetsFor('Stan Store')} onAdd={handleAssetAdded} onRemove={handleAssetRemoved}
            />
            <div className="product-detail-section">
              <LabelRow label="Headline" copyText={pc.stan_store.headline} />
              <input className="form-input" type="text" value={pc.stan_store.headline} onChange={setPcField('stan_store', 'headline')} placeholder="Short hook for the product page…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Description" copyText={pc.stan_store.description} />
              <textarea className="form-textarea" rows={8} value={pc.stan_store.description} onChange={setPcField('stan_store', 'description')} placeholder="Full product page copy…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Published URL" />
              <input className="form-input" type="url" value={pc.stan_store.url} onChange={setPcField('stan_store', 'url')} placeholder="https://stan.store/…" />
            </div>
          </div>
        )}

        {/* ── Pinterest tab ────────────────────────────────────────────────── */}
        {activeTab === 'Pinterest' && (
          <div className="product-tab-content">
            <ProductAssets
              productId={id} brandId={activeBrand.id} platform="Pinterest"
              spec={PLATFORM_MEDIA_SPECS.Pinterest}
              assets={assetsFor('Pinterest')} onAdd={handleAssetAdded} onRemove={handleAssetRemoved}
            />
            <div className="product-detail-section">
              <LabelRow label="Pin title" extra={<span className={`char-count ${pc.pinterest.pin_title.length > 90 ? 'char-count--warn' : ''}`}>{pc.pinterest.pin_title.length}/100</span>} copyText={pc.pinterest.pin_title} />
              <input className="form-input" type="text" maxLength={100} value={pc.pinterest.pin_title} onChange={setPcField('pinterest', 'pin_title')} placeholder="Attention-grabbing pin title…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Pin description" extra={<span className={`char-count ${pc.pinterest.pin_description.length > 450 ? 'char-count--warn' : ''}`}>{pc.pinterest.pin_description.length}/500</span>} copyText={pc.pinterest.pin_description} />
              <textarea className="form-textarea" rows={5} maxLength={500} value={pc.pinterest.pin_description} onChange={setPcField('pinterest', 'pin_description')} placeholder="Description with keywords…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Hashtags" />
              <HashtagInput hashtags={pc.pinterest.hashtags} onChange={v => setPc('pinterest', 'hashtags', v)} />
            </div>
          </div>
        )}

        {/* ── Social tab ───────────────────────────────────────────────────── */}
        {activeTab === 'Social' && (
          <div className="product-tab-content">
            <ProductAssets
              productId={id} brandId={activeBrand.id} platform="Social"
              spec={PLATFORM_MEDIA_SPECS.Social}
              assets={assetsFor('Social')} onAdd={handleAssetAdded} onRemove={handleAssetRemoved}
            />
            <div className="product-detail-section">
              <LabelRow label="Caption" copyText={pc.social.caption} />
              <textarea className="form-textarea" rows={6} value={pc.social.caption} onChange={setPcField('social', 'caption')} placeholder="Instagram / Facebook / TikTok caption…" />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Hashtags" copyText={pc.social.hashtags.join(' ')} />
              <HashtagInput hashtags={pc.social.hashtags} onChange={v => setPc('social', 'hashtags', v)} />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Creative notes" />
              <textarea className="form-textarea" rows={3} value={pc.social.creative_notes} onChange={setPcField('social', 'creative_notes')} placeholder="Notes for the visual / video content…" />
            </div>
          </div>
        )}

        {/* ── Save bar ─────────────────────────────────────────────────────── */}
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

      {libraryPickerOpen && (
        <KeywordLibraryPicker
          brandId={activeBrand.id}
          productNiche={form.niche}
          currentKeywords={form.keywords}
          onAdd={kw => { if (!form.keywords.includes(kw)) setDirect('keywords', [...form.keywords, kw]) }}
          onClose={() => setLibraryPickerOpen(false)}
        />
      )}
    </div>
  )
}
