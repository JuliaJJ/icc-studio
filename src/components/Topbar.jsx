import { useLocation } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'
import BrandSwitcher from './BrandSwitcher'

const PAGE_TITLES = {
  '/': 'Today',
  '/tasks': 'Tasks',
  '/pipeline': 'Pipeline',
  '/calendar': 'Launch Calendar',
  '/catalog': 'Catalog',
  '/prompts': 'Prompt Library',
  '/assets': 'Design Assets',
  '/keywords': 'Keywords',
  '/campaigns': 'Ad Campaigns',
  '/revenue': 'Revenue',
  '/quick-access': 'Quick Access',
}

export default function Topbar() {
  const { activeBrand } = useBrand()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'ICC Studio'

  return (
    <header className="topbar">
      <div
        className="topbar-accent-bar"
        style={{ backgroundColor: activeBrand.accent_color }}
      />
      <div className="topbar-inner">
        <div className="topbar-left">
          <span className="brand-badge">
            <span
              className="brand-dot"
              style={{ backgroundColor: activeBrand.accent_color }}
            />
            <span className="brand-badge-name">{activeBrand.name}</span>
          </span>
          <span className="topbar-divider">·</span>
          <span className="topbar-page-title">{pageTitle}</span>
        </div>
        <BrandSwitcher />
      </div>
    </header>
  )
}
