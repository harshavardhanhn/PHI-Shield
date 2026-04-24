const CONFIG = {
  block: {
    bg:     'bg-red-50',
    border: 'border-red-200',
    dot:    'bg-red-500',
    title:  'Transmission blocked',
    titleColor: 'text-red-900',
    bodyColor:  'text-red-700',
  },
  redact: {
    bg:     'bg-amber-50',
    border: 'border-amber-200',
    dot:    'bg-amber-500',
    title:  'PHI detected — redaction suggested',
    titleColor: 'text-amber-900',
    bodyColor:  'text-amber-700',
  },
  pass: {
    bg:     'bg-green-50',
    border: 'border-green-200',
    dot:    'bg-green-500',
    title:  'Message cleared',
    titleColor: 'text-green-900',
    bodyColor:  'text-green-700',
  },
}

export default function RiskAlert({ result, onRedact, onDismiss, redactedText }) {
  if (!result) return null
  const c = CONFIG[result.action] || CONFIG.pass

  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${c.titleColor}`}>{c.title}</p>

          {result.action !== 'pass' && (
            <p className={`mt-1 text-sm ${c.bodyColor}`}>
              Detected {result.detected_entities.length} PHI element
              {result.detected_entities.length !== 1 ? 's' : ''} across{' '}
              {Object.keys(result.phi_type_counts).join(', ')}.
              Risk score: <strong>{result.risk_score}/100</strong>.
            </p>
          )}

          {result.action === 'pass' && (
            <p className={`mt-1 text-sm ${c.bodyColor}`}>
              No protected health information detected. Risk score: {result.risk_score}/100.
            </p>
          )}
        </div>

        {/* Risk badge */}
        <span className={`badge-${result.risk_band} flex-shrink-0`}>
          {result.risk_band.toUpperCase()}
        </span>
      </div>

      {/* Entity chips */}
      {result.detected_entities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 pl-5">
          {Object.entries(result.phi_type_counts).map(([type, count]) => (
            <span
              key={type}
              className="text-xs px-2 py-0.5 rounded-full bg-white/70 border border-current font-mono text-red-800"
            >
              {type} ×{count}
            </span>
          ))}
        </div>
      )}

      {/* Redacted preview */}
      {redactedText && (
        <div className="mt-3 pl-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Redacted version:</p>
          <p className="text-sm bg-white/60 rounded-lg px-3 py-2 font-mono text-gray-700 break-words">
            {redactedText}
          </p>
        </div>
      )}

      {/* Actions */}
      {result.action !== 'pass' && (
        <div className="mt-3 pl-5 flex gap-2">
          {onRedact && !redactedText && (
            <button
              onClick={onRedact}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg
                         hover:bg-gray-50 font-medium text-gray-700 transition-colors"
            >
              Redact PHI and send
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Discard
            </button>
          )}
        </div>
      )}
    </div>
  )
}
