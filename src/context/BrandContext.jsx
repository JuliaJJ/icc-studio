import { createContext, useContext, useState } from 'react'

export const BRANDS = [
  {
    id: 'bwc',
    name: 'Bare Wall Club',
    shortCode: 'BWC',
    tagline: 'Wall art · Etsy / Gumroad',
    accentColor: '#1D9E75',
    tagBgColor: '#E0F5ED',
    tagTextColor: '#0F5C43',
  },
  {
    id: 'ep',
    name: 'Esoterica Press',
    shortCode: 'EP',
    tagline: 'Journals · Tarot / Astrology',
    accentColor: '#7F77DD',
    tagBgColor: '#EEEDFB',
    tagTextColor: '#4A42A8',
  },
  {
    id: 'nac',
    name: 'Niche Apparel Co.',
    shortCode: 'NAC',
    tagline: 'Nurses · Teachers · Trades POD',
    accentColor: '#D85A30',
    tagBgColor: '#FAEEE8',
    tagTextColor: '#943D21',
  },
  {
    id: 'pc',
    name: 'Prompt Collective',
    shortCode: 'PC',
    tagline: 'AI prompt packs · Gumroad / Stan',
    accentColor: '#BA7517',
    tagBgColor: '#F7EDDA',
    tagTextColor: '#7A4D0F',
  },
]

const BrandContext = createContext(null)

export function BrandProvider({ children }) {
  const [activeBrand, setActiveBrand] = useState(BRANDS[0])

  function switchBrand(brand) {
    setActiveBrand(brand)
    const app = document.getElementById('app')
    if (app) {
      app.style.setProperty('--brand-accent', brand.accentColor)
      app.style.setProperty('--brand-tag-bg', brand.tagBgColor)
      app.style.setProperty('--brand-tag-text', brand.tagTextColor)
    }
  }

  return (
    <BrandContext.Provider value={{ activeBrand, switchBrand, brands: BRANDS }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}
