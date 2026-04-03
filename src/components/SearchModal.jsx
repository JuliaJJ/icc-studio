import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useBrand } from '../context/BrandContext'

export default function SearchModal({ onClose }) {
  const { activeBrand } = useBrand()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ products: [], assets: [], prompts: [] })
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults({ products: [], assets: [], prompts: [] }); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const like = `%${q}%`
      const [{ data: products }, { data: assets }, { data: prompts }] = await Promise.all([
        supabase.from('products').select('id, name, niche, status').eq('brand_id', activeBrand.id).ilike('name', like).limit(5),
        supabase.from('assets').select('id, filename, role').eq('brand_id', activeBrand.id).ilike('filename', like).limit(5),
        supabase.from('prompts').select('id, title, platform').eq('brand_id', activeBrand.id).ilike('title', like).limit(5),
      ])
      setResults({ products: products ?? [], assets: assets ?? [], prompts: prompts ?? [] })
      setSearching(false)
    }, 200)
    return () => clearTimeout(debounceRef.current)
  }, [query, activeBrand.id])

  function go(path) { navigate(path); onClose() }

  const ROLE_LABEL = { source_file: 'Source file', mockup: 'Mockup', listing_image: 'Listing image', ad_creative: 'Ad creative' }

  const hasResults = results.products.length > 0 || results.assets.length > 0 || results.prompts.length > 0
  const showResults = query.trim().length > 0

  return (
    <div className="search-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-modal">
        <div className="search-input-row">
          <span className="search-icon">⌕</span>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, assets, prompts…"
          />
          {query && <button className="search-clear" onClick={() => setQuery('')}>×</button>}
        </div>

        {showResults && (
          <div className="search-results">
            {!hasResults && !searching && (
              <div className="search-empty">No results for "{query}"</div>
            )}

            {results.products.length > 0 && (
              <div className="search-group">
                <div className="search-group-label">Products</div>
                {results.products.map(p => (
                  <button key={p.id} className="search-result-item" onClick={() => go(`/catalog/${p.id}`)}>
                    <span className="search-result-name">{p.name}</span>
                    {p.niche && <span className="search-result-meta">{p.niche}</span>}
                  </button>
                ))}
              </div>
            )}

            {results.assets.length > 0 && (
              <div className="search-group">
                <div className="search-group-label">Assets</div>
                {results.assets.map(a => (
                  <button key={a.id} className="search-result-item" onClick={() => go('/assets')}>
                    <span className="search-result-name">{a.filename}</span>
                    {a.role && <span className="search-result-meta">{ROLE_LABEL[a.role] ?? a.role}</span>}
                  </button>
                ))}
              </div>
            )}

            {results.prompts.length > 0 && (
              <div className="search-group">
                <div className="search-group-label">Prompts</div>
                {results.prompts.map(p => (
                  <button key={p.id} className="search-result-item" onClick={() => go('/prompts')}>
                    <span className="search-result-name">{p.title}</span>
                    {p.platform && <span className="search-result-meta">{p.platform}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
