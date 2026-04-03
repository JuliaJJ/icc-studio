import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import FilterPills from '../components/FilterPills'

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = ['Pinterest', 'Etsy Ads', 'Google Ads', 'Meta']

const STATUS_OPTIONS = ['draft', 'active', 'paused', 'ended']

const STATUS_CFG = {
  draft:  { label: 'Draft',  bg: '#F1EFE8', color: '#444441' },
  active: { label: 'Active', bg: '#EAF3DE', color: '#27500A' },
  paused: { label: 'Paused', bg: '#FCEBEB', color: '#791F1F' },
  ended:  { label: 'Ended',  bg: '#E6E6E6', color: '#666666' },
}

const FILTER_OPTIONS = [
  { value: 'all',       label: 'All' },
  { value: 'Pinterest', label: 'Pinterest' },
  { value: 'Etsy Ads',  label: 'Etsy Ads' },
  { value: 'active',    label: 'Active' },
]

function fmt(n, prefix = '') {
  if (n == null || n === 0) return '—'
  return prefix + Number(n).toLocaleString()
}

function fmtRoas(roas) {
  if (roas == null) return '—'
  return Number(roas).toFixed(2) + 'x'
}

function fmtDateRange(start, end) {
  if (!start) return null
  const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!end) return s + ' –'
  const e = new Date(end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} – ${e}`
}

// ─── Product picker for campaigns ────────────────────────────────────────────

function ProductPicker({ brandId, selectedIds, onChange }) {
  const [products, setProducts] = useState([])
  const [open, setOpen] = useState(false)
  const [productMap, setProductMap] = useState({})
  const dropdownRef = useRef(null)

  useEffect(() => {
    supabase.from('products').select('id, name, niche').eq('brand_id', brandId).order('name')
      .then(({ data }) => {
        const list = data ?? []
        setProducts(list)
        const map = {}
        list.forEach(p => { map[p.id] = p })
        setProductMap(map)
      })
  }, [brandId])

  useEffect(() => {
    function handle(e) { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const available = products.filter(p => !selectedIds.includes(p.id))

  return (
    <div className="campaign-product-picker">
      {selectedIds.length > 0 && (
        <div className="campaign-product-chips">
          {selectedIds.map(id => {
            const p = productMap[id]
            return p ? (
              <span key={id} className="campaign-product-chip">
                {p.name}
                <button type="button" onClick={() => onChange(selectedIds.filter(x => x !== id))}>×</button>
              </span>
            ) : null
          })}
        </div>
      )}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button type="button" className="link-another-btn" onClick={() => setOpen(v => !v)}>
          + Link a product
        </button>
        {open && (
          <div className="link-dropdown">
            {available.length === 0 ? (
              <div className="link-dropdown-empty">No more products to link</div>
            ) : (
              available.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="link-dropdown-item"
                  onClick={() => { onChange([...selectedIds, p.id]); setOpen(false) }}
                >
                  <span className="link-dropdown-name">{p.name}</span>
                  {p.niche && <span className="niche-tag" style={{ fontSize: 10 }}>{p.niche}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Campaign Panel ───────────────────────────────────────────────────────────

function CampaignPanel({ campaign, brandId, onSave, onDelete, onClose }) {
  const initialForm = {
    name:         campaign?.name         ?? '',
    platform:     campaign?.platform     ?? 'Pinterest',
    status:       campaign?.status       ?? 'draft',
    start_date:   campaign?.start_date   ?? '',
    end_date:     campaign?.end_date     ?? '',
    budget_daily: campaign?.budget_daily ?? '',
    spend_total:  campaign?.spend_total  ?? '',
    impressions:  campaign?.impressions  ?? '',
    clicks:       campaign?.clicks       ?? '',
    roas:         campaign?.roas         ?? '',
    niche:        campaign?.niche        ?? '',
    notes:        campaign?.notes        ?? '',
    product_ids:  campaign?.product_ids  ?? [],
  }
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  function confirmClose() {
    if (JSON.stringify(form) !== JSON.stringify(initialForm)) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const numericFields = ['budget_daily', 'spend_total', 'impressions', 'clicks', 'roas']
    const payload = { ...form, brand_id: brandId }
    numericFields.forEach(f => { if (payload[f] === '' || payload[f] === 0) payload[f] = null })
    if (campaign) {
      const { data } = await supabase.from('campaigns').update(payload).eq('id', campaign.id).select().single()
      onSave(data, 'update')
    } else {
      const { data } = await supabase.from('campaigns').insert(payload).select().single()
      onSave(data, 'insert')
    }
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!campaign || !window.confirm('Delete this campaign?')) return
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    onDelete(campaign.id)
    onClose()
  }

  return (
    <div className="panel-overlay">
      <div className="panel-backdrop" onClick={confirmClose} />
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">{campaign ? 'Edit campaign' : 'New campaign'}</span>
          <button className="panel-close" onClick={confirmClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="panel-form">
          <div className="form-field">
            <label className="form-label">Campaign name</label>
            <input className="form-input" type="text" value={form.name} onChange={set('name')} required autoFocus />
          </div>
          <div className="form-field">
            <label className="form-label">Platform</label>
            <select className="form-select" value={form.platform} onChange={set('platform')}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>)}
            </select>
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label">Start date</label>
              <input className="form-input" type="date" value={form.start_date} onChange={set('start_date')} />
            </div>
            <div className="form-field">
              <label className="form-label">End date</label>
              <input className="form-input" type="date" value={form.end_date} onChange={set('end_date')} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label">Daily budget ($)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.budget_daily} onChange={set('budget_daily')} />
            </div>
            <div className="form-field">
              <label className="form-label">Total spend ($)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.spend_total} onChange={set('spend_total')} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label">Impressions</label>
              <input className="form-input" type="number" min="0" step="1" value={form.impressions} onChange={set('impressions')} />
            </div>
            <div className="form-field">
              <label className="form-label">Clicks</label>
              <input className="form-input" type="number" min="0" step="1" value={form.clicks} onChange={set('clicks')} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label className="form-label">ROAS</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.roas} onChange={set('roas')} placeholder="e.g. 3.2" />
            </div>
            <div className="form-field">
              <label className="form-label">Niche</label>
              <input className="form-input" type="text" value={form.niche} onChange={set('niche')} placeholder="e.g. Nurses" />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Linked products</label>
            <ProductPicker
              brandId={brandId}
              selectedIds={form.product_ids}
              onChange={ids => setForm(p => ({ ...p, product_ids: ids }))}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={set('notes')} />
          </div>
          <div className="panel-actions">
            {campaign && <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>}
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save campaign'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({ campaign, linkedCreatives, onEdit }) {
  const statusCfg = STATUS_CFG[campaign.status] ?? STATUS_CFG.draft
  const isDraft = campaign.status === 'draft'
  const dateRange = fmtDateRange(campaign.start_date, campaign.end_date)

  return (
    <div className="campaign-card" onClick={onEdit}>
      {/* Header */}
      <div className="campaign-card-header">
        <div className="campaign-card-title-row">
          <span className="campaign-card-name">{campaign.name}</span>
          <span
            className="campaign-status-pill"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        </div>
        <div className="campaign-card-sub">
          <span className="campaign-platform-tag">{campaign.platform}</span>
          {dateRange && <span className="campaign-date-range">{dateRange}</span>}
        </div>
      </div>

      {/* Stats row */}
      <div className="campaign-card-stats">
        <div className="campaign-stat">
          <span className="campaign-stat-label">Spend</span>
          <span className="campaign-stat-value">{isDraft ? '—' : fmt(campaign.spend_total, '$')}</span>
        </div>
        <div className="campaign-stat">
          <span className="campaign-stat-label">Impressions</span>
          <span className="campaign-stat-value">{isDraft ? '—' : fmt(campaign.impressions)}</span>
        </div>
        <div className="campaign-stat">
          <span className="campaign-stat-label">Clicks</span>
          <span className="campaign-stat-value">{isDraft ? '—' : fmt(campaign.clicks)}</span>
        </div>
        <div className="campaign-stat">
          <span className="campaign-stat-label">ROAS</span>
          <span className="campaign-stat-value">{isDraft ? '—' : fmtRoas(campaign.roas)}</span>
        </div>
      </div>

      {/* Linked creative chips */}
      {linkedCreatives.length > 0 && (
        <div className="campaign-creative-chips">
          {linkedCreatives.map(a => (
            <span key={a.id} className="campaign-creative-chip">🎨 {a.filename}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      {(campaign.niche || campaign.platform || (campaign.product_ids?.length > 0)) && (
        <div className="campaign-card-footer">
          <div className="campaign-footer-tags">
            {campaign.niche && <span className="niche-tag">{campaign.niche}</span>}
            {campaign.platform && <span className="type-tag">{campaign.platform}</span>}
          </div>
          {campaign.product_ids?.length > 0 && (
            <span className="campaign-product-count">{campaign.product_ids.length} product{campaign.product_ids.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdCampaigns() {
  const { activeBrand } = useBrand()
  const [campaigns, setCampaigns] = useState([])
  const [linkedCreativesMap, setLinkedCreativesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', activeBrand.id)
      .order('created_at', { ascending: false })
      .then(async ({ data: camps }) => {
        const campList = camps ?? []
        setCampaigns(campList)

        if (campList.length > 0) {
          const ids = campList.map(c => c.id)
          const { data: links } = await supabase
            .from('asset_campaign_links')
            .select('campaign_id, assets(id, filename)')
            .in('campaign_id', ids)
          const map = {}
          ;(links ?? []).forEach(l => {
            if (!l.assets) return
            if (!map[l.campaign_id]) map[l.campaign_id] = []
            map[l.campaign_id].push(l.assets)
          })
          setLinkedCreativesMap(map)
        }
        setLoading(false)
      })
  }, [activeBrand.id])

  function handleSave(saved, mode) {
    if (mode === 'insert') setCampaigns(prev => [saved, ...prev])
    else setCampaigns(prev => prev.map(c => c.id === saved.id ? saved : c))
  }

  function handleDelete(id) {
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  function openEdit(campaign) { setEditingCampaign(campaign); setPanelOpen(true) }
  function openAdd() { setEditingCampaign(null); setPanelOpen(true) }

  const filtered = campaigns.filter(c => {
    if (filter === 'all') return true
    if (filter === 'active') return c.status === 'active'
    return c.platform === filter
  })

  // Metrics
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend_total) || 0), 0)
  const roasValues = campaigns.filter(c => c.roas != null).map(c => Number(c.roas))
  const avgRoas = roasValues.length > 0 ? (roasValues.reduce((s, r) => s + r, 0) / roasValues.length).toFixed(2) : null

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="campaigns-page">
      <div className="page-header">
        <h1 className="page-title">Ad Campaigns</h1>
        <button className="btn-add" onClick={openAdd}>+ New campaign</button>
      </div>

      {/* Metrics row */}
      <div className="campaigns-metrics">
        <div className="campaigns-metric-card">
          <span className="campaigns-metric-label">Total spend</span>
          <span className="campaigns-metric-value">${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="campaigns-metric-card">
          <span className="campaigns-metric-label">Active campaigns</span>
          <span className="campaigns-metric-value">{activeCampaigns.length}</span>
        </div>
        <div className="campaigns-metric-card">
          <span className="campaigns-metric-label">Total campaigns</span>
          <span className="campaigns-metric-value">{campaigns.length}</span>
        </div>
        <div className="campaigns-metric-card">
          <span className="campaigns-metric-label">Average ROAS</span>
          <span className="campaigns-metric-value">{avgRoas ? avgRoas + 'x' : '—'}</span>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">◎</span>
          <span className="empty-text">No campaigns yet</span>
          <button className="btn-add" onClick={openAdd}>+ New campaign</button>
        </div>
      ) : (
        <>
          <FilterPills options={FILTER_OPTIONS} active={filter} onChange={setFilter} />
          <div className="campaigns-list">
            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '20px 0' }}>
                No campaigns match this filter
              </div>
            ) : (
              filtered.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  linkedCreatives={linkedCreativesMap[campaign.id] ?? []}
                  onEdit={() => openEdit(campaign)}
                />
              ))
            )}
          </div>
        </>
      )}

      {panelOpen && (
        <CampaignPanel
          campaign={editingCampaign}
          brandId={activeBrand.id}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  )
}
