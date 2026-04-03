import { useState } from 'react'
import { useBrand } from '../context/BrandContext'

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
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  function set(field) {
    return (value) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setSaved(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const err = await updateBrand(brand.id, form)
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
    }
  }

  return (
    <div className="settings-brand-card">
      <div className="settings-brand-card-header">
        <span
          className="brand-dot"
          style={{ backgroundColor: form.accent_color }}
        />
        <span className="settings-brand-name">{brand.name}</span>
      </div>

      <form className="settings-brand-form" onSubmit={handleSave}>
        <div className="settings-fields-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label className="form-label">Brand name</label>
            <input
              className="form-input"
              type="text"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              required
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label className="form-label">Short code</label>
            <input
              className="form-input"
              type="text"
              value={form.short_code}
              onChange={(e) => set('short_code')(e.target.value.toUpperCase())}
              maxLength={5}
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Tagline</label>
          <input
            className="form-input"
            type="text"
            value={form.tagline}
            onChange={(e) => set('tagline')(e.target.value)}
            placeholder="Shown in sidebar and brand switcher"
          />
        </div>

        <div className="settings-fields-row">
          <ColorField
            label="Accent color"
            value={form.accent_color}
            onChange={set('accent_color')}
          />
          <ColorField
            label="Tag background"
            value={form.tag_bg_color}
            onChange={set('tag_bg_color')}
          />
          <ColorField
            label="Tag text"
            value={form.tag_text_color}
            onChange={set('tag_text_color')}
          />
        </div>

        <div className="settings-brand-footer">
          {error && <span className="settings-error">{error}</span>}
          {saved && !error && <span className="settings-saved">Saved</span>}
          <button
            className="settings-save-btn"
            type="submit"
            disabled={saving}
            style={{ backgroundColor: form.accent_color }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Settings() {
  const { brands } = useBrand()

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-section-label">Brand Configuration</div>

      <div className="settings-brand-list">
        {brands.map((brand) =>
          brand.id ? <BrandCard key={brand.id} brand={brand} /> : null
        )}
      </div>
    </div>
  )
}
