import { useState, useRef, useEffect } from 'react'
import { useBrand } from '../context/BrandContext'

export default function BrandSwitcher() {
  const { activeBrand, switchBrand, brands } = useBrand()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="brand-switcher" ref={ref}>
      <button
        className="brand-switcher-btn"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="brand-dot"
          style={{ backgroundColor: activeBrand.accent_color }}
        />
        <span className="brand-short-code">{activeBrand.short_code}</span>
        <span className="caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="brand-dropdown">
          {brands.map((brand) => (
            <button
              key={brand.id}
              className="brand-option"
              onClick={() => {
                switchBrand(brand)
                setOpen(false)
              }}
            >
              <span
                className="brand-dot"
                style={{ backgroundColor: brand.accentColor }}
              />
              <div className="brand-option-info">
                <span className="brand-option-name">{brand.name}</span>
                <span className="brand-option-tagline">{brand.tagline}</span>
              </div>
              {activeBrand.id === brand.id && (
                <span className="brand-check">✓</span>
              )}
            </button>
          ))}
          <div className="brand-dropdown-divider" />
          <button className="brand-add-btn">+ Add brand</button>
        </div>
      )}
    </div>
  )
}
