import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BrandProvider, BRANDS } from './context/BrandContext'
import Layout from './components/Layout'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Pipeline from './pages/Pipeline'
import LaunchCalendar from './pages/LaunchCalendar'
import Catalog from './pages/Catalog'
import PromptLibrary from './pages/PromptLibrary'
import DesignAssets from './pages/DesignAssets'
import Keywords from './pages/Keywords'
import AdCampaigns from './pages/AdCampaigns'
import Revenue from './pages/Revenue'
import QuickAccess from './pages/QuickAccess'
import './index.css'

// Set initial brand CSS variables on #app before first render
const app = document.getElementById('app')
const defaultBrand = BRANDS[0]
app.style.setProperty('--brand-accent', defaultBrand.accentColor)
app.style.setProperty('--brand-tag-bg', defaultBrand.tagBgColor)
app.style.setProperty('--brand-tag-text', defaultBrand.tagTextColor)

createRoot(app).render(
  <StrictMode>
    <BrandProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="calendar" element={<LaunchCalendar />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="prompts" element={<PromptLibrary />} />
            <Route path="assets" element={<DesignAssets />} />
            <Route path="keywords" element={<Keywords />} />
            <Route path="campaigns" element={<AdCampaigns />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="quick-access" element={<QuickAccess />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BrandProvider>
  </StrictMode>
)
