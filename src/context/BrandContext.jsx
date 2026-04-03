import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Fallback used before Supabase load completes
const FALLBACK_BRANDS = [
  {
    id: null,
    name: 'Bare Wall Club',
    short_code: 'BWC',
    tagline: 'Wall art · Etsy / Gumroad',
    accent_color: '#1D9E75',
    tag_bg_color: '#E0F5ED',
    tag_text_color: '#0F5C43',
    sort_order: 1,
  },
  {
    id: null,
    name: 'Esoterica Press',
    short_code: 'EP',
    tagline: 'Journals · Tarot / Astrology',
    accent_color: '#7F77DD',
    tag_bg_color: '#EEEDFB',
    tag_text_color: '#4A42A8',
    sort_order: 2,
  },
  {
    id: null,
    name: 'Niche Apparel Co.',
    short_code: 'NAC',
    tagline: 'Nurses · Teachers · Trades POD',
    accent_color: '#D85A30',
    tag_bg_color: '#FAEEE8',
    tag_text_color: '#943D21',
    sort_order: 3,
  },
  {
    id: null,
    name: 'Prompt Collective',
    short_code: 'PC',
    tagline: 'AI prompt packs · Gumroad / Stan',
    accent_color: '#BA7517',
    tag_bg_color: '#F7EDDA',
    tag_text_color: '#7A4D0F',
    sort_order: 4,
  },
]

// Export for use in main.jsx to set initial CSS vars
export const DEFAULT_BRAND = FALLBACK_BRANDS[0]

function applyBrandVars(brand) {
  const app = document.getElementById('app')
  if (!app) return
  app.style.setProperty('--brand-accent', brand.accent_color)
  app.style.setProperty('--brand-tag-bg', brand.tag_bg_color)
  app.style.setProperty('--brand-tag-text', brand.tag_text_color)
}

const BrandContext = createContext(null)

export function BrandProvider({ children }) {
  const [brands, setBrands] = useState(FALLBACK_BRANDS)
  const [activeBrand, setActiveBrand] = useState(FALLBACK_BRANDS[0])

  useEffect(() => {
    async function fetchBrands() {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('sort_order')
      if (error || !data?.length) return
      setBrands(data)
      setActiveBrand((prev) => {
        const match = data.find((b) => b.name === prev.name) ?? data[0]
        applyBrandVars(match)
        return match
      })
    }

    // Fetch immediately if already authenticated, and re-fetch on sign-in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) fetchBrands()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) fetchBrands()
      else {
        setBrands(FALLBACK_BRANDS)
        setActiveBrand(FALLBACK_BRANDS[0])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function switchBrand(brand) {
    setActiveBrand(brand)
    applyBrandVars(brand)
  }

  async function updateBrand(id, updates) {
    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return error

    setBrands((prev) => prev.map((b) => (b.id === id ? data : b)))
    setActiveBrand((prev) => {
      if (prev.id !== id) return prev
      applyBrandVars(data)
      return data
    })
    return null
  }

  return (
    <BrandContext.Provider value={{ activeBrand, switchBrand, brands, updateBrand }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
