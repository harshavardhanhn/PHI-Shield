import { useState } from "react";
import api from "../api";
import AlertModal from "../components/AlertModal";
import RiskBadge from "../components/RiskBadge";

export default function ComposePage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState("");

  const handleSend = async () => {
    if (!message.trim()) {
      setStatus("Type a message before sending.");
      return;
    }

    try {
      setLoading(true);
      setStatus("");
      const { data } = await api.post("/scan", { message });
      setScanResult(data);

      if (data.is_sensitive) {
        setShowModal(true);
      } else {
        setStatus("Message Sent: no PHI risk detected.");
      }
    } catch (error) {
      setStatus("Failed to scan message. Check backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnyway = () => {
    setShowModal(false);
    setStatus("Message Sent with override (risky). Logged for audit.");
  };

  const handleRedactAndSend = async () => {
    try {
      const { data } = await api.post("/redact", { message });
      setMessage(data.redacted_message);
      setShowModal(false);
      setStatus("Message redacted and sent safely.");
    } catch (error) {
      setStatus("Redaction failed. Please retry.");
    }
  };

  return (
    <section className="animate-fade-in">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow">
          <h2 className="mb-3 text-xl font-black text-slateink">Compose Message</h2>
          <p className="mb-4 text-sm text-slate-600">
            Outgoing messages are scanned in real time for PHI before send.
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-52 w-full rounded-xl border border-slate-300 p-4 text-sm leading-relaxed outline-none ring-teal-500 focus:ring"
            placeholder="Write an email or clinical note..."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleSend}
              disabled={loading}
              className="rounded-lg bg-tealdeep px-5 py-2.5 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-60"
            >
              {loading ? "Scanning..." : "Send"}
            </button>
            {scanResult && <RiskBadge score={scanResult.risk_score} />}
          </div>

          {status && (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">{status}</p>
          )}
        </div>

        <aside className="rounded-2xl border border-teal-100 bg-white p-5 shadow">
          <h3 className="mb-3 text-lg font-black">Demo Inputs</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="rounded-lg bg-slate-50 p-3">Meeting at 5 PM</li>
            <li className="rounded-lg bg-slate-50 p-3">Patient John Doe, diabetic, DOB 1990</li>
            <li className="rounded-lg bg-slate-50 p-3">John Doe SSN 123-45-6789</li>
          </ul>
        </aside>
      </div>

      <AlertModal
        open={showModal}
        scanResult={scanResult}
        onClose={() => setShowModal(false)}
        onSendAnyway={handleSendAnyway}
        onRedactSend={handleRedactAndSend}
      />
    </section>
  );
}
