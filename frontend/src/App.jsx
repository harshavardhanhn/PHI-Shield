import { Routes, Route, NavLink } from 'react-router-dom'
import ComposePage from './pages/ComposePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LogsPage from './pages/LogsPage.jsx'

const NAV = [
  { to: '/',          label: 'Compose' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/logs',      label: 'Audit Log' },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-8">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-lg">🛡</span>
            <span>PHI<span className="text-red-600">Shield</span></span>
          </div>
          <nav className="flex gap-1">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-mono">
              HIPAA Guard v2.0
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/"          element={<ComposePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/logs"      element={<LogsPage />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        PHI-Shield — Real-Time HIPAA Breach Prevention · All scans are logged for compliance
      </footer>
    </div>
  )
}
