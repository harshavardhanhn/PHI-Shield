import RiskBadge from "./RiskBadge";

export default function AlertModal({ open, scanResult, onClose, onSendAnyway, onRedactSend }) {
  if (!open || !scanResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-2xl">
        <h2 className="mb-2 text-xl font-black text-ember">Potential PHI Leak Detected</h2>
        <p className="mb-4 text-sm text-slate-600">
          Sensitive entities were found in this message. Review before sending.
        </p>

        <div className="mb-4 flex items-center gap-3">
          <RiskBadge score={scanResult.risk_score} />
          <span className="text-xs font-medium text-slate-500">
            {scanResult.detected_entities.length} entities detected
          </span>
        </div>

        <div className="mb-5 rounded-xl border border-red-100 bg-red-50/60 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-ember/75">
            Highlighted PHI
          </p>
          <div
            className="max-h-52 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: scanResult.highlighted_text }}
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {scanResult.detected_entities.map((item, idx) => (
            <span
              key={`${item.start}-${item.end}-${idx}`}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {item.label}: {item.text}
            </span>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onSendAnyway}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            Send Anyway
          </button>
          <button
            onClick={onRedactSend}
            className="rounded-lg bg-ember px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Redact & Send
          </button>
        </div>
      </div>
    </div>
  );
}
