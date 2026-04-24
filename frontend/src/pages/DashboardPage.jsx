import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fetchStats, fetchLogs } from '../api.js'

const STAT_CARDS = [
  { key: 'total_scans',    label: 'Total scans',  color: 'text-gray-900' },
  { key: 'total_blocked',  label: 'Blocked',      color: 'text-red-700'  },
  { key: 'total_redacted', label: 'Redacted',     color: 'text-amber-700'},
  { key: 'total_passed',   label: 'Passed',       color: 'text-green-700'},
]

const BAR_COLORS = {
  SSN: '#dc2626', MRN: '#ea580c', DIAGNOSIS: '#d97706',
  MEDICATION: '#ca8a04', PERSON: '#7c3aed', DOB: '#db2777',
  PHONE: '#2563eb', EMAIL: '#0891b2', ADDRESS: '#16a34a',
  DEFAULT: '#6b7280',
}

function ActionBadge({ action }) {
  const map = {
    block:  'badge-high',
    redact: 'badge-medium',
    pass:   'badge-low',
  }
  return <span className={map[action] || 'badge-low'}>{action}</span>
}

export default function DashboardPage() {
  const [stats, setStats]   = useState(null)
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const [s, l] = await Promise.all([fetchStats(), fetchLogs(8)])
      setStats(s)
      setLogs(l)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const chartData = stats
    ? Object.entries(stats.phi_type_breakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Live overview — refreshes every 5 seconds.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(s => (
          <div key={s.key} className="stat-card">
            <span className="text-xs text-gray-400 font-medium">{s.label}</span>
            <span className={`text-3xl font-semibold ${s.color}`}>
              {stats?.[s.key] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* PHI type breakdown */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">PHI types detected (all time)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map(entry => (
                  <Cell
                    key={entry.name}
                    fill={BAR_COLORS[entry.name] || BAR_COLORS.DEFAULT}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent events */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent events</h2>
          <span className="text-xs text-gray-400">Last 8 scans</span>
        </div>
        <div className="divide-y divide-gray-50">
          {logs.length === 0 && (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">
              No scans yet — try sending a message.
            </p>
          )}
          {logs.map(log => (
            <div key={log.id} className="px-6 py-3 flex items-center gap-4 text-sm hover:bg-gray-50">
              <ActionBadge action={log.action} />
              <span className="text-gray-400 text-xs font-mono min-w-[130px]">
                {new Date(log.timestamp + 'Z').toLocaleTimeString()}
              </span>
              <span className="text-gray-600 truncate flex-1">{log.message_preview}</span>
              <span className="text-gray-400 text-xs flex-shrink-0">
                {log.phi_types || '—'}
              </span>
              <span className={`font-mono text-xs flex-shrink-0 ${
                log.risk_band === 'high' ? 'text-red-600' :
                log.risk_band === 'medium' ? 'text-amber-600' : 'text-green-600'
              }`}>
                {log.risk_score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
