import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'
import { PIPELINE_COLUMNS, productEmoji } from '../lib/constants'

function NicheTag({ niche }) {
  if (!niche) return null
  return <span className="niche-tag">{niche}</span>
}

function TypeTag({ type }) {
  if (!type) return null
  return <span className="type-tag">{type}</span>
}

export default function Pipeline() {
  const { activeBrand } = useBrand()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBrand.id) return
    setLoading(true)
    supabase
      .from('products')
      .select('id, name, niche, product_type, status, image_urls')
      .eq('brand_id', activeBrand.id)
      .order('created_at')
      .then(({ data }) => {
        setProducts(data ?? [])
        setLoading(false)
      })
  }, [activeBrand.id])

  const byStatus = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.status] = products.filter(p => p.status === col.status)
    return acc
  }, {})

  if (loading) return <div className="loading-state">Loading…</div>

  return (
    <div className="pipeline-page">
      <div className="page-header">
        <h1 className="page-title">Pipeline</h1>
      </div>
      <div className="pipeline-board">
        {PIPELINE_COLUMNS.map(col => (
          <div key={col.status} className="pipeline-col">
            <div
              className="pipeline-col-header"
              style={{ background: col.bg, color: col.color }}
            >
              {col.label}
              <span className="pipeline-col-count">{byStatus[col.status].length}</span>
            </div>
            <div className="pipeline-col-body">
              {byStatus[col.status].length === 0 ? (
                <div className="pipeline-col-empty">—</div>
              ) : (
                byStatus[col.status].map(product => (
                  <div
                    key={product.id}
                    className="product-item-card"
                    onClick={() => navigate(`/catalog/${product.id}`)}
                  >
                    <div className="product-item-name">{product.name}</div>
                    <div className="product-item-tags">
                      <NicheTag niche={product.niche} />
                      <TypeTag type={product.product_type} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
