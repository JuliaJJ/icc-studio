import { useState } from 'react'
import { useBrand } from '../context/BrandContext'
import { groupColor } from '../lib/constants'

const DEFAULT_GROUPS = ['Storefronts', 'Design tools', 'Marketing', 'Research tools', 'Fulfillment']

function LinkPanel({ link, existingGroups, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    name: link?.name ?? '',
    url: link?.url ?? '',
    group: link?.group ?? '',
  })
  const [saving, setSaving] = useState(false)

  function setField(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    onSave({ ...form, color: link?.color ?? null })
    setSaving(false)
    onClose()
  }

  const allGroups = [...new Set([...DEFAULT_GROUPS, ...existingGroups])]

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={onClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{link ? 'Edit link' : 'New link'}</span>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              type="text"
              value={form.name}
              onChange={setField('name')}
              required
              autoFocus
              placeholder="e.g. Etsy Shop"
            />
          </div>
          <div className="form-field">
            <label className="form-label">URL</label>
            <input
              className="form-input"
              type="url"
              value={form.url}
              onChange={setField('url')}
              required
              placeholder="https://"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Group</label>
            <input
              className="form-input"
              type="text"
              list="group-suggestions"
              value={form.group}
              onChange={setField('group')}
              required
              placeholder="e.g. Storefronts"
            />
            <datalist id="group-suggestions">
              {allGroups.map(g => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div className="panel-actions">
            {link && (
              <button type="button" className="btn-danger" onClick={() => { onDelete(link); onClose() }}>
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function QuickAccess() {
  const { activeBrand, updateBrand } = useBrand()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [saving, setSaving] = useState(false)

  const links = activeBrand.quick_links ?? []

  // Group links by their group field
  const grouped = links.reduce((acc, link) => {
    const key = link.group || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(link)
    return acc
  }, {})

  const existingGroups = Object.keys(grouped)

  async function saveLinks(newLinks) {
    setSaving(true)
    await updateBrand(activeBrand.id, { quick_links: newLinks })
    setSaving(false)
  }

  function handleSave(formData) {
    let newLinks
    if (editingIndex !== null) {
      newLinks = links.map((l, i) => i === editingIndex ? formData : l)
    } else {
      newLinks = [...links, formData]
    }
    saveLinks(newLinks)
  }

  function handleDelete(link) {
    const newLinks = links.filter((l, i) => i !== editingIndex)
    saveLinks(newLinks)
  }

  function openAdd() {
    setEditingLink(null)
    setEditingIndex(null)
    setPanelOpen(true)
  }

  function openEdit(link, index) {
    setEditingLink(link)
    setEditingIndex(index)
    setPanelOpen(true)
  }

  return (
    <div className="quick-access-page">
      <div className="page-header">
        <h1 className="page-title">Quick Access</h1>
        <button className="btn-add" onClick={openAdd}>+ Add link</button>
      </div>

      {links.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">⚡</span>
          <span className="empty-text">No links yet</span>
          <button className="btn-add" onClick={openAdd}>+ Add link</button>
        </div>
      ) : (
        <div className="quick-access-grid">
          {Object.entries(grouped).map(([group, groupLinks]) => {
            const accent = groupColor(group)
            return (
            <div key={group} className="quick-access-card" style={{ borderTop: `3px solid ${accent}` }}>
              <div className="quick-access-card-title" style={{ color: accent }}>{group}</div>
              <div className="link-pills-grid">
                {groupLinks.map((link) => {
                  const globalIndex = links.findIndex(l => l === link)
                  return (
                    <div key={globalIndex} className="link-pill-wrapper">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-pill"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="link-pill-dot" style={{ background: accent }} />
                        <span className="link-pill-label">{link.name}</span>
                      </a>
                      <button
                        className="link-pill-edit"
                        onClick={() => openEdit(link, globalIndex)}
                        title="Edit link"
                      >
                        ···
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )})}
        </div>
      )}

      {saving && <div className="saving-toast">Saving…</div>}

      {panelOpen && (
        <LinkPanel
          link={editingLink}
          existingGroups={existingGroups}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
