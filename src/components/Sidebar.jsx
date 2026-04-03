import { NavLink } from 'react-router-dom'
import { useBrand } from '../context/BrandContext'

const NAV = [
  {
    label: 'Daily',
    items: [
      { to: '/', label: 'Today', icon: '◈' },
      { to: '/tasks', label: 'Tasks', icon: '✓' },
      { to: '/pipeline', label: 'Pipeline', icon: '⇢' },
      { to: '/calendar', label: 'Launch Calendar', icon: '◻' },
    ],
  },
  {
    label: 'Products',
    items: [
      { to: '/catalog', label: 'Catalog', icon: '⊞' },
      { to: '/prompts', label: 'Prompt Library', icon: '⌥' },
      { to: '/assets', label: 'Design Assets', icon: '⬡' },
      { to: '/keywords', label: 'Keywords', icon: '#' },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/campaigns', label: 'Ad Campaigns', icon: '◎' },
      { to: '/revenue', label: 'Revenue', icon: '$' },
      { to: '/quick-access', label: 'Quick Access', icon: '⚡' },
    ],
  },
]

export default function Sidebar() {
  const { activeBrand } = useBrand()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">ICC Studio</div>
        <div className="sidebar-subtitle">{activeBrand.name}</div>
      </div>
      <div className="sidebar-divider" />
      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.label} className="nav-group">
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item--active' : ''}`
                }
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
