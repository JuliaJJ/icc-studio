import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'

const AVAILABLE_TABS = [
  { id: 'Etsy',       label: 'Etsy' },
  { id: 'KDP',        label: 'KDP' },
  { id: 'Gumroad',    label: 'Gumroad' },
  { id: 'Stan Store', label: 'Stan Store' },
  { id: 'Pinterest',  label: 'Pinterest' },
  { id: 'Social',     label: 'Social' },
]

const LIBRARY_SECTIONS = [
  { type: 'task_label',   label: 'Task Labels',        hint: 'Labels used to categorise tasks.' },
  { type: 'format',       label: 'Product Formats',    hint: 'Reusable format values on product pages (e.g. PDF, PNG, SVG).' },
  { type: 'size',         label: 'Product Sizes',      hint: 'Reusable size values on product pages (e.g. 8×10, A4, 5×7).' },
  { type: 'shop_section', label: 'Etsy Shop Sections', hint: 'Etsy shop section names used when listing products.' },
]

// ─── Brand Configuration ──────────────────────────────────────────────────────

function ColorField({ label, value, onChange }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <div className="color-field">
        <input
          type="color"
          className="color-swatch-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="form-input color-hex-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

function BrandCard({ brand }) {
  const { updateBrand } = useBrand()
  const [form, setForm] = useState({
    name: brand.name,
    short_code: brand.short_code,
    tagline: brand.tagline ?? '',
    accent_color: brand.accent_color,
    tag_bg_color: brand.tag_bg_color ?? '#F5F5F3',
    tag_text_color: brand.tag_text_color ?? '#1A1A18',
    platform_tabs: brand.platform_tabs ?? ['Etsy', 'Pinterest', 'Social'],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  function toggleTab(id) {
    setForm(prev => {
      const tabs = prev.platform_tabs.includes(id)
        ? prev.platform_tabs.filter(t => t !== id)
        : [...prev.platform_tabs, id]
      return { ...prev, platform_tabs: tabs }
    })
  }

  function set(field) {
    return (value) => { setForm(prev => ({ ...prev, [field]: value })); setSaved(false) }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const err = await updateBrand(brand.id, form)
    setSaving(false)
    if (err) setError(err.message)
    else setSaved(true)
  }

  return (
    <div className="settings-brand-card">
      <div className="settings-brand-card-header">
        <span className="brand-dot" style={{ backgroundColor: form.accent_color }} />
        <span className="settings-brand-name">{brand.name}</span>
      </div>

      <form className="settings-brand-form" onSubmit={handleSave}>
        <div className="settings-fields-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label className="form-label">Brand name</label>
            <input className="form-input" type="text" value={form.name}
              onChange={(e) => set('name')(e.target.value)} required />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Short code</label>
            <input className="form-input" type="text" value={form.short_code}
              onChange={(e) => set('short_code')(e.target.value.toUpperCase())}
              maxLength={5} required />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Tagline</label>
          <input className="form-input" type="text" value={form.tagline}
            onChange={(e) => set('tagline')(e.target.value)}
            placeholder="Shown in sidebar and brand switcher" />
        </div>

        <div className="settings-fields-row">
          <ColorField label="Accent color"    value={form.accent_color}    onChange={set('accent_color')} />
          <ColorField label="Tag background"  value={form.tag_bg_color}    onChange={set('tag_bg_color')} />
          <ColorField label="Tag text"        value={form.tag_text_color}  onChange={set('tag_text_color')} />
        </div>

        <div className="form-field">
          <label className="form-label">Product page tabs</label>
          <div className="settings-tab-hint">Overview is always shown. Select which platform tabs appear on product pages for this brand.</div>
          <div className="settings-tab-toggles">
            {AVAILABLE_TABS.map(tab => {
              const active = form.platform_tabs.includes(tab.id)
              return (
                <button key={tab.id} type="button"
                  className={`settings-tab-toggle ${active ? 'settings-tab-toggle--active' : ''}`}
                  style={active ? { background: form.accent_color, borderColor: form.accent_color, color: '#fff' } : {}}
                  onClick={() => toggleTab(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="settings-brand-footer">
          {error && <span className="settings-error">{error}</span>}
          {saved && !error && <span className="settings-saved">Saved</span>}
          <button className="settings-save-btn" type="submit" disabled={saving}
            style={{ backgroundColor: form.accent_color }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Library section ──────────────────────────────────────────────────────────

function LibrarySection({ brandId, type, label, hint }) {
  const [values, setValues] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!brandId) return
    supabase.from('value_library').select('id, value')
      .eq('brand_id', brandId).eq('type', type).order('value')
      .then(({ data }) => { setValues(data ?? []); setLoading(false) })
  }, [brandId, type])

  async function handleAdd(e) {
    e.preventDefault()
    const v = input.trim().toLowerCase().replace(/\s+/g, '-')
    if (!v || values.find(x => x.value === v)) { setInput(''); return }
    const { data } = await supabase.from('value_library')
      .upsert({ brand_id: brandId, type, value: v }, { onConflict: 'brand_id,type,value' })
      .select().single()
    if (data) setValues(prev => [...prev, data].sort((a, b) => a.value.localeCompare(b.value)))
    setInput('')
  }

  async function handleDelete(id) {
    await supabase.from('value_library').delete().eq('id', id)
    setValues(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="library-section">
      <div className="library-section-header">
        <span className="library-section-label">{label}</span>
        <span className="library-section-hint">{hint}</span>
      </div>

      {loading ? (
        <div className="library-section-empty">Loading…</div>
      ) : (
        <div className="library-section-values">
          {values.length === 0 && (
            <span className="library-section-empty">No entries yet</span>
          )}
          {values.map(v => (
            <span key={v.id} className="library-value-pill">
              {v.value}
              <button type="button" className="library-value-remove"
                onClick={() => handleDelete(v.id)} aria-label={`Remove ${v.value}`}>×</button>
            </span>
          ))}
        </div>
      )}

      <form className="library-add-row" onSubmit={handleAdd}>
        <input
          className="form-input library-add-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Add ${label.toLowerCase().replace(/s$/, '')}…`}
        />
        <button type="submit" className="library-add-btn" disabled={!input.trim()}>Add</button>
      </form>
    </div>
  )
}

// ─── Manage Libraries tab ─────────────────────────────────────────────────────

function ManageLibraries() {
  const { activeBrand } = useBrand()

  if (!activeBrand.id) return <div className="loading-state">No brand selected.</div>

  return (
    <div className="libraries-page">
      <p className="libraries-intro">
        Libraries store reusable values for the active brand — <strong>{activeBrand.name}</strong>.
        Values added here are available as autocomplete suggestions when creating or editing tasks and products.
      </p>

      {LIBRARY_SECTIONS.map(s => (
        <LibrarySection key={s.type} brandId={activeBrand.id} {...s} />
      ))}

      <div className="library-section library-section--link">
        <div className="library-section-header">
          <span className="library-section-label">Keywords</span>
          <span className="library-section-hint">SEO keywords organised by niche, used on product pages.</span>
        </div>
        <div className="library-section-values">
          <Link to="/keywords" className="library-keywords-link">Manage keywords →</Link>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { brands } = useBrand()
  const [tab, setTab] = useState('brands')

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="product-tabs" style={{ marginBottom: 24 }}>
        <button className={`product-tab ${tab === 'brands' ? 'product-tab--active' : ''}`}
          onClick={() => setTab('brands')}>Brand Configuration</button>
        <button className={`product-tab ${tab === 'libraries' ? 'product-tab--active' : ''}`}
          onClick={() => setTab('libraries')}>Manage Libraries</button>
      </div>

      {tab === 'brands' && (
        <div className="settings-brand-list">
          {brands.map(brand => brand.id ? <BrandCard key={brand.id} brand={brand} /> : null)}
        </div>
      )}

      {tab === 'libraries' && <ManageLibraries />}
    </div>
  )
}
