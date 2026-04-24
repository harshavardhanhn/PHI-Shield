import { useState } from 'react'
import { scanMessage, redactMessage } from '../api.js'
import RiskAlert from '../components/AlertModal.jsx'
import HighlightedText from '../components/RiskBadge.jsx'

const DEMO_MESSAGES = [
  {
    label: 'Safe message',
    text: 'Hi team, the 3pm standup is moved to 4pm. Please update your calendars.',
  },
  {
    label: 'Medium risk',
    text: 'Patient John Doe, DOB 03/14/1978, is a diabetic and needs his Metformin renewed.',
  },
  {
    label: 'High risk',
    text: 'Hi Dr Patel — please find below.\nJohn Doe, SSN 123-45-6789, MRN 004821, DOB 03/14/1978.\nDiagnosis: Type 2 diabetes, hypertension. Metformin 500mg BID.\nCall him at (312) 555-0198 or john.doe@gmail.com.',
  },
]

export default function ComposePage() {
  const [to, setTo]           = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody]       = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [redacted, setRedacted] = useState(null)
  const [error, setError]     = useState(null)

  async function handleScan() {
    if (!body.trim()) return
    setLoading(true)
    setResult(null)
    setRedacted(null)
    setError(null)
    try {
      const data = await scanMessage(body, to || 'demo-user', 'email')
      setResult(data)
    } catch {
      setError('Could not reach the PHI-Shield API. Make sure the backend is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedact() {
    try {
      const data = await redactMessage(body)
      setRedacted(data.redacted_message)
    } catch {
      setError('Redaction failed.')
    }
  }

  function handleDismiss() {
    setResult(null)
    setRedacted(null)
    setBody('')
  }

  function loadDemo(msg) {
    setBody(msg.text)
    setResult(null)
    setRedacted(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Compose message</h1>
        <p className="mt-1 text-sm text-gray-500">
          PHI-Shield scans outbound messages for protected health information before they leave your environment.
        </p>
      </div>

      {/* Demo shortcuts */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Try a demo:</span>
        {DEMO_MESSAGES.map(m => (
          <button
            key={m.label}
            onClick={() => loadDemo(m)}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-white
                       hover:bg-gray-50 text-gray-600 transition-colors"
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Compose form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* To / Subject */}
        <div className="divide-y divide-gray-100">
          <div className="flex items-center px-4 py-2.5 gap-3">
            <span className="text-xs text-gray-400 w-14 flex-shrink-0">To</span>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@hospital.org"
              className="flex-1 text-sm outline-none bg-transparent text-gray-800
                         placeholder:text-gray-300"
            />
          </div>
          <div className="flex items-center px-4 py-2.5 gap-3">
            <span className="text-xs text-gray-400 w-14 flex-shrink-0">Subject</span>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-sm outline-none bg-transparent text-gray-800
                         placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Body */}
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={9}
          placeholder="Write your message here…"
          className="w-full px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300
                     outline-none resize-none font-mono leading-relaxed border-t border-gray-100"
        />

        {/* Action bar */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <span className="text-xs text-gray-400">{body.length} chars</span>
          <button
            onClick={handleScan}
            disabled={loading || !body.trim()}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg
                       hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white
                                  rounded-full animate-spin" />
                Scanning…
              </>
            ) : (
              'Scan before sending'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Risk alert */}
      {result && (
        <RiskAlert
          result={result}
          onRedact={result.action !== 'pass' ? handleRedact : undefined}
          onDismiss={handleDismiss}
          redactedText={redacted}
        />
      )}

      {/* Highlighted view */}
      {result && result.detected_entities.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">PHI highlighted</h2>
          <HighlightedText html={result.highlighted_text} />
          <div className="mt-2 flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-200 border-b-2 border-red-500 inline-block"/>
              High risk
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border-b-2 border-amber-500 inline-block"/>
              Medium risk
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border-b-2 border-blue-500 inline-block"/>
              Low risk
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
