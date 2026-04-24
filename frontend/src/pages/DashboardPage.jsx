import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import api from "../api";
import RiskBadge from "../components/RiskBadge";

function scoreBand(score) {
  if (score > 70) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

export default function DashboardPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const { data } = await api.get("/logs");
        setLogs(data);
      } catch {
        setLogs([]);
      }
    };

    loadLogs();
  }, []);

  const stats = useMemo(() => {
    const dist = { Low: 0, Medium: 0, High: 0 };
    let violations = 0;

    for (const item of logs) {
      dist[scoreBand(item.risk_score)] += 1;
      if (item.is_sensitive) violations += 1;
    }

    return {
      total: logs.length,
      violations,
      chartData: [
        { name: "Low", value: dist.Low, color: "#16a34a" },
        { name: "Medium", value: dist.Medium, color: "#f59e0b" },
        { name: "High", value: dist.High, color: "#dc2626" },
      ],
    };
  }, [logs]);

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-black">Risk Distribution</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={stats.chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={4}
              >
                {stats.chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-100 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Scans</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs uppercase tracking-wide text-red-600">Violations</p>
            <p className="text-2xl font-black text-red-700">{stats.violations}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-black">Scan Logs</h2>
        <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
          {logs.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No logs yet. Send a few messages first.</p>
          )}

          {logs.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <RiskBadge score={item.risk_score} />
                <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{item.message}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
