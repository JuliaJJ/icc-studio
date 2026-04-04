import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { PRODUCT_STATUS, productEmoji, NICHES, PRODUCT_TIERS, FULFILLMENT_OPTIONS } from '../lib/constants'
import { normalizeLabel } from '../lib/taskNlp'

// ─── Tab definitions ──────────────────────────────────────────────────────────

const ALL_TABS = [
  { id: 'overview',   label: 'Overview',   alwaysOn: true },
  { id: 'checklist',  label: 'Checklist',  alwaysOn: true },
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

// ─── Library tag input (saves new values to value_library) ───────────────────

function LibraryTagInput({ values, onChange, brandId, type, placeholder }) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!brandId) return
    supabase.from('value_library').select('value').eq('brand_id', brandId).eq('type', type).order('value')
      .then(({ data }) => setSuggestions((data ?? []).map(r => r.value)))
  }, [brandId, type])

  async function add(val) {
    const t = val.trim()
    if (!t || values.includes(t)) { setInput(''); return }
    onChange([...values, t])
    setInput('')
    await supabase.from('value_library')
      .upsert({ brand_id: brandId, type, value: t }, { onConflict: 'brand_id,type,value' })
    setSuggestions(prev => [...new Set([...prev, t])].sort())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && input.trim()) { e.preventDefault(); add(input) }
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
            <button type="button" className="keyword-tag-remove" onClick={() => onChange(values.filter((_, j) => j !== i))}>×</button>
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
          placeholder={values.length === 0 ? placeholder : ''}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="library-suggestions">
          {filtered.map(s => (
            <button key={s} type="button" className="library-suggestion-item" onMouseDown={() => add(s)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Library single input (saves new value to value_library on blur) ──────────

function LibrarySingleInput({ value, onChange, brandId, type, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!brandId) return
    supabase.from('value_library').select('value').eq('brand_id', brandId).eq('type', type).order('value')
      .then(({ data }) => setSuggestions((data ?? []).map(r => r.value)))
  }, [brandId, type])

  async function saveToLibrary(val) {
    const t = val.trim()
    if (!t) return
    await supabase.from('value_library')
      .upsert({ brand_id: brandId, type, value: t }, { onConflict: 'brand_id,type,value' })
    setSuggestions(prev => [...new Set([...prev, t])].sort())
  }

  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value)

  return (
    <div className="library-input-wrap">
      <input
        className="form-input"
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 150); saveToLibrary(value) }}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="library-suggestions">
          {filtered.map(s => (
            <button key={s} type="button" className="library-suggestion-item"
              onMouseDown={() => { onChange(s); setOpen(false) }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Bundle membership section ────────────────────────────────────────────────

function BundleSection({ productId, brandId, isBundle }) {
  const [memberships, setMemberships] = useState([])
  const [members, setMembers]         = useState([])
  const [allBundles, setAllBundles]   = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: membershipRows },
        { data: bundlesData },
        { data: productsData },
      ] = await Promise.all([
        supabase.from('bundle_members').select('id, bundle_id').eq('product_id', productId),
        supabase.from('products').select('id, name').eq('brand_id', brandId).eq('is_bundle', true).neq('id', productId).order('name'),
        supabase.from('products').select('id, name').eq('brand_id', brandId).eq('is_bundle', false).order('name'),
      ])

      // Resolve bundle names for memberships
      const bundleIds = (membershipRows ?? []).map(r => r.bundle_id)
      const nameMap = {}
      if (bundleIds.length) {
        const { data: names } = await supabase.from('products').select('id, name').in('id', bundleIds)
        ;(names ?? []).forEach(b => { nameMap[b.id] = b.name })
      }
      setMemberships((membershipRows ?? []).map(r => ({ id: r.id, bundleId: r.bundle_id, name: nameMap[r.bundle_id] ?? '' })))
      setAllBundles(bundlesData ?? [])
      setAllProducts(productsData ?? [])

      // If this is a bundle, load its member products
      if (isBundle) {
        const { data: memberRows } = await supabase.from('bundle_members').select('id, product_id').eq('bundle_id', productId)
        const productIds = (memberRows ?? []).map(r => r.product_id)
        const prodNameMap = {}
        if (productIds.length) {
          const { data: names } = await supabase.from('products').select('id, name').in('id', productIds)
          ;(names ?? []).forEach(p => { prodNameMap[p.id] = p.name })
        }
        setMembers((memberRows ?? []).map(r => ({ id: r.id, productId: r.product_id, name: prodNameMap[r.product_id] ?? '' })))
      }
      setLoading(false)
    }
    load()
  }, [productId, brandId, isBundle])

  async function addToBundle(bundleId) {
    const { data } = await supabase.from('bundle_members')
      .insert({ bundle_id: bundleId, product_id: productId }).select('id').single()
    const bundle = allBundles.find(b => b.id === bundleId)
    if (data && bundle) setMemberships(prev => [...prev, { id: data.id, bundleId, name: bundle.name }])
  }

  async function removeFromBundle(id) {
    await supabase.from('bundle_members').delete().eq('id', id)
    setMemberships(prev => prev.filter(m => m.id !== id))
  }

  async function addMember(pid) {
    const { data } = await supabase.from('bundle_members')
      .insert({ bundle_id: productId, product_id: pid }).select('id').single()
    const product = allProducts.find(p => p.id === pid)
    if (data && product) setMembers(prev => [...prev, { id: data.id, productId: pid, name: product.name }])
  }

  async function removeMember(id) {
    await supabase.from('bundle_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  if (loading) return null

  const availableBundles  = allBundles.filter(b => !memberships.some(m => m.bundleId === b.id))
  const availableProducts = allProducts.filter(p => !members.some(m => m.productId === p.id))

  return (
    <>
      {isBundle && (
        <div className="product-detail-section">
          <div className="product-detail-section-title">Bundle members</div>
          {members.map(m => (
            <div key={m.id} className="bundle-row">
              <span className="bundle-row-name">{m.name}</span>
              <button type="button" className="bundle-row-remove" onClick={() => removeMember(m.id)}>×</button>
            </div>
          ))}
          {members.length === 0 && <div className="bundle-empty">No products in this bundle yet.</div>}
          {availableProducts.length > 0 && (
            <select className="form-select bundle-add-select"
              onChange={e => { if (e.target.value) { addMember(e.target.value); e.target.value = '' } }}>
              <option value="">+ Add product to bundle…</option>
              {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
      )}
      <div className="product-detail-section">
        <div className="product-detail-section-title">In bundles</div>
        {memberships.map(m => (
          <div key={m.id} className="bundle-row">
            <span className="bundle-row-name">{m.name}</span>
            <button type="button" className="bundle-row-remove" onClick={() => removeFromBundle(m.id)}>×</button>
          </div>
        ))}
        {memberships.length === 0 && <div className="bundle-empty">Not part of any bundle.</div>}
        {availableBundles.length > 0 && (
          <select className="form-select bundle-add-select"
            onChange={e => { if (e.target.value) { addToBundle(e.target.value); e.target.value = '' } }}>
            <option value="">+ Add to bundle…</option>
            {availableBundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>
    </>
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

// ─── Checklist tab ────────────────────────────────────────────────────────────

async function generateTasksFromTemplate(templateId, productId, brandId) {
  const { data: items } = await supabase.from('task_template_items').select('*')
    .eq('template_id', templateId).order('sort_order').order('created_at')
  if (!items?.length) return []
  const { data } = await supabase.from('tasks').insert(
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
  ).select()
  return data ?? []
}

function sortChecklistTasks(tasks) {
  const withDate    = tasks.filter(t => t.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date))
  const withoutDate = tasks.filter(t => !t.due_date)
  const fromTpl     = withoutDate.filter(t => t.template_item_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const adHoc       = withoutDate.filter(t => !t.template_item_id).sort((a, b) => a.created_at.localeCompare(b.created_at))
  return [...withDate, ...fromTpl, ...adHoc]
}

function ChecklistTab({ productId, brandId, templateId: initialTemplateId, onTemplateChange }) {
  const navigate = useNavigate()
  const [tasks, setTasks]               = useState([])
  const [templates, setTemplates]       = useState([])
  const [templateId, setTemplateId]     = useState(initialTemplateId ?? '')
  const [appliedTpl, setAppliedTpl]     = useState(null)
  const [loading, setLoading]           = useState(true)
  const [applying, setApplying]         = useState(false)
  const [newTitle, setNewTitle]         = useState('')
  const [addingTask, setAddingTask]     = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('*').eq('product_id', productId).order('created_at'),
      supabase.from('task_templates').select('id, name').eq('brand_id', brandId).order('name'),
    ]).then(([{ data: t }, { data: tpl }]) => {
      setTasks(t ?? [])
      setTemplates(tpl ?? [])
      if (initialTemplateId) {
        const match = (tpl ?? []).find(x => x.id === initialTemplateId)
        setAppliedTpl(match ?? null)
      }
      setLoading(false)
    })
  }, [productId, brandId])

  async function applyTemplate(overwrite = false) {
    const templateTasks = tasks.filter(t => t.template_item_id)
    if (templateTasks.length > 0 && !overwrite) {
      const count = templateTasks.length
      if (!confirm(`This product already has ${count} template-generated task${count !== 1 ? 's' : ''}. Replace them with the new template?`)) return
    }
    setApplying(true)
    if (templateTasks.length > 0) {
      await supabase.from('tasks').delete().in('id', templateTasks.map(t => t.id))
    }
    const newTasks = await generateTasksFromTemplate(templateId, productId, brandId)
    await supabase.from('products').update({ template_id: templateId }).eq('id', productId)
    const match = templates.find(t => t.id === templateId)
    setAppliedTpl(match ?? null)
    setTasks(prev => [...prev.filter(t => !t.template_item_id), ...newTasks])
    onTemplateChange(templateId)
    setApplying(false)
  }

  async function toggleTask(task) {
    const newStatus = task.status === 'done' ? 'open' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  async function addTask(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAddingTask(true)
    const { data } = await supabase.from('tasks').insert({
      brand_id: brandId, product_id: productId,
      title: newTitle.trim(), status: 'open', priority: 'medium',
    }).select().single()
    if (data) setTasks(prev => [...prev, data])
    setNewTitle('')
    setAddingTask(false)
  }

  if (loading) return <div className="loading-state">Loading…</div>

  const sorted = sortChecklistTasks(tasks)

  return (
    <div className="checklist-tab">
      <div className="checklist-template-row">
        <select className="form-select" value={templateId} onChange={e => setTemplateId(e.target.value)}
          style={{ flex: 1 }}>
          <option value="">— select template —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" className="library-add-btn" disabled={!templateId || applying}
          onClick={() => applyTemplate()}>
          {applying ? 'Applying…' : appliedTpl ? 'Change' : 'Apply'}
        </button>
      </div>
      {appliedTpl && (
        <div className="checklist-applied-label">Template: <strong>{appliedTpl.name}</strong></div>
      )}

      <div className="checklist-task-list">
        {sorted.length === 0 && <div className="checklist-empty">No tasks yet — apply a template or add one below.</div>}
        {sorted.map(task => (
          <div key={task.id} className="checklist-task-row">
            <button
              type="button"
              className={`task-checkbox ${task.status === 'done' ? 'task-checkbox--checked' : ''}`}
              onClick={() => toggleTask(task)}
              aria-label={task.status === 'done' ? 'Mark open' : 'Mark done'}
            >
              {task.status === 'done' && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div className="checklist-task-content" onClick={() => navigate(`/tasks/${task.id}`)}>
              <span className={`task-title ${task.status === 'done' ? 'task-title--done' : ''}`}>
                {task.title}
              </span>
              <div className="task-meta">
                {task.template_item_id && <span className="task-template-icon" title="Generated from template">⊞</span>}
                {(task.labels ?? []).map(l => <span key={l} className="task-label-tag">{l}</span>)}
                {task.due_date && <span className="task-due">{task.due_date}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="checklist-add-row" onSubmit={addTask}>
        <input
          className="form-input"
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task…"
          disabled={addingTask}
        />
        <button type="submit" className="library-add-btn" disabled={!newTitle.trim() || addingTask}>Add</button>
      </form>
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
          is_bundle:          data?.is_bundle          ?? false,
          template_id:        data?.template_id        ?? null,
          niche:              data?.niche              ?? '',
          tier:               data?.tier               ?? '',
          theme:              data?.theme              ?? '',
          palette:            data?.palette            ?? '',
          formats:            data?.formats            ?? [],
          sizes:              data?.sizes              ?? [],
          fulfillment:        data?.fulfillment        ?? '',
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

  async function handleArchive() {
    const isArchived = product?.is_archived
    const msg = isArchived
      ? 'Restore this product to your active catalog?'
      : 'Archive this product? Its tasks will be hidden from the master task list.'
    if (!confirm(msg)) return
    await supabase.from('products').update({ is_archived: !isArchived }).eq('id', id)
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

        {/* ── Checklist tab ───────────────────────────────────────────────── */}
        {activeTab === 'checklist' && (
          <ChecklistTab
            productId={id}
            brandId={activeBrand.id}
            templateId={form.template_id}
            onTemplateChange={tid => setDirect('template_id', tid)}
          />
        )}

        {/* ── Overview tab ────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="product-tab-content">
            <div className="product-detail-section">
              <div className="product-detail-section-title">Details</div>
              <div className="product-fields-grid">
                <div className="form-field">
                  <label className="form-label">Niche</label>
                  <select className="form-select" value={form.niche} onChange={setField('niche')}>
                    <option value="">— select —</option>
                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Tier</label>
                  <select className="form-select" value={form.tier} onChange={setField('tier')}>
                    <option value="">— select —</option>
                    {PRODUCT_TIERS.map(t => (
                      <option key={t.value} value={t.value}>{t.label} · {t.hint}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Theme</label>
                  <input className="form-input" type="text" value={form.theme} onChange={setField('theme')} placeholder="e.g. Botanical, Celestial" />
                </div>
                <div className="form-field">
                  <label className="form-label">Palette</label>
                  <input className="form-input" type="text" value={form.palette} onChange={setField('palette')} placeholder="e.g. Earth tones, Pastel" />
                </div>
                <div className="form-field">
                  <label className="form-label">Fulfillment</label>
                  <select className="form-select" value={form.fulfillment} onChange={setField('fulfillment')}>
                    <option value="">— select —</option>
                    {FULFILLMENT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
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
              <LabelRow label="Formats" />
              <LibraryTagInput
                values={form.formats} onChange={v => setDirect('formats', v)}
                brandId={activeBrand.id} type="format"
                placeholder="Type format + Enter (e.g. A4, Letter, Square)"
              />
            </div>

            <div className="product-detail-section">
              <LabelRow label="Sizes" />
              <LibraryTagInput
                values={form.sizes} onChange={v => setDirect('sizes', v)}
                brandId={activeBrand.id} type="size"
                placeholder="Type size + Enter (e.g. 8×10, 11×14)"
              />
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
              <LibrarySingleInput
                value={pc.etsy.section}
                onChange={v => setPc('etsy', 'section', v)}
                brandId={activeBrand.id}
                type="shop_section"
                placeholder="e.g. Nurse Gifts, Wall Art"
              />
            </div>

            <div className="product-detail-section">
              <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="detail_is_bundle"
                  checked={form.is_bundle}
                  onChange={e => { setSaved(false); setForm(p => ({ ...p, is_bundle: e.target.checked })) }}
                />
                <label htmlFor="detail_is_bundle" style={{ fontSize: 13, color: 'var(--color-text-secondary)', userSelect: 'none', cursor: 'pointer' }}>
                  This is a bundle product
                </label>
              </div>
            </div>

            <BundleSection productId={id} brandId={activeBrand.id} isBundle={form.is_bundle} />
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-ghost" onClick={handleArchive}>
              {product?.is_archived ? 'Restore' : 'Archive'}
            </button>
            <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>
          </div>
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
