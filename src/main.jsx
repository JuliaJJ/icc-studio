import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BrandProvider, DEFAULT_BRAND } from './context/BrandContext'
import AuthGuard from './components/AuthGuard'
import Layout from './components/Layout'
import Login from './pages/Login'
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
import Settings from './pages/Settings'
import './index.css'

// Set initial brand CSS variables before first render
const app = document.getElementById('app')
app.style.setProperty('--brand-accent', DEFAULT_BRAND.accent_color)
app.style.setProperty('--brand-tag-bg', DEFAULT_BRAND.tag_bg_color)
app.style.setProperty('--brand-tag-text', DEFAULT_BRAND.tag_text_color)

createRoot(app).render(
  <StrictMode>
    <AuthProvider>
      <BrandProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <Layout />
                </AuthGuard>
              }
            >
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
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BrandProvider>
    </AuthProvider>
  </StrictMode>
)
