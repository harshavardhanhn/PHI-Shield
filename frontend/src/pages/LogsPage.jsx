import { useEffect, useState } from 'react'
import { fetchLogs } from '../api.js'

function Badge({ action }) {
  const cls = action === 'block' ? 'badge-high' : action === 'redact' ? 'badge-medium' : 'badge-low'
  return <span className={cls}>{action}</span>
}

export default function LogsPage() {
  const [logs, setLogs]     = useState([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const LIMIT = 25

  async function load(off = 0) {
    setLoading(true)
    try {
      const data = await fetchLogs(LIMIT, off)
      setLogs(data)
      setOffset(off)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(0) }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit log</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every scan is recorded — required for HIPAA compliance audits.
          </p>
        </div>
        <button
          onClick={() => load(offset)}
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white
                     hover:bg-gray-50 text-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100
                        text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span className="col-span-1">Action</span>
          <span className="col-span-2">Time (UTC)</span>
          <span className="col-span-2">Sender</span>
          <span className="col-span-1">Channel</span>
          <span className="col-span-4">Preview</span>
          <span className="col-span-1 text-right">Score</span>
          <span className="col-span-1">PHI types</span>
        </div>

        {loading && (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Loading…</p>
        )}

        {!loading && logs.length === 0 && (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">
            No scan events yet. Go to Compose to run your first scan.
          </p>
        )}

        <div className="divide-y divide-gray-50">
          {logs.map(log => (
            <div
              key={log.id}
              className="grid grid-cols-12 gap-4 px-6 py-3 text-sm items-center hover:bg-gray-50"
            >
              <span className="col-span-1"><Badge action={log.action} /></span>
              <span className="col-span-2 text-gray-400 font-mono text-xs">
                {new Date(log.timestamp + 'Z').toISOString().replace('T', ' ').slice(0, 19)}
              </span>
              <span className="col-span-2 text-gray-600 truncate">{log.sender}</span>
              <span className="col-span-1 text-gray-400">{log.channel}</span>
              <span className="col-span-4 text-gray-600 truncate font-mono text-xs">
                {log.message_preview}
              </span>
              <span className={`col-span-1 text-right font-semibold text-sm ${
                log.risk_band === 'high' ? 'text-red-600' :
                log.risk_band === 'medium' ? 'text-amber-600' : 'text-green-600'
              }`}>
                {log.risk_score}
              </span>
              <span className="col-span-1 text-gray-400 text-xs truncate">
                {log.phi_types || '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Showing {offset + 1}–{offset + logs.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => load(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="px-3 py-1 border border-gray-200 rounded-lg bg-white hover:bg-gray-50
                         disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            >
              Previous
            </button>
            <button
              onClick={() => load(offset + LIMIT)}
              disabled={logs.length < LIMIT}
              className="px-3 py-1 border border-gray-200 rounded-lg bg-white hover:bg-gray-50
                         disabled:opacity-30 disabled:cursor-not-allowed text-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
