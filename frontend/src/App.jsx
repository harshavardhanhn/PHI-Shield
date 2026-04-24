import { NavLink, Route, Routes } from "react-router-dom";
import ComposePage from "./pages/ComposePage";
import DashboardPage from "./pages/DashboardPage";

const navBase =
  "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-teal-50 text-slateink">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="mb-8 rounded-2xl border border-teal-100 bg-white/85 p-5 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-tealdeep/70">
                Hackathon Demo
              </p>
              <h1 className="text-2xl font-black sm:text-3xl">
                Real-Time PHI Leak Prevention System
              </h1>
            </div>
            <nav className="flex gap-2 rounded-full bg-teal-100/60 p-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `${navBase} ${isActive ? "bg-white text-tealdeep shadow" : "text-tealdeep/80 hover:bg-white/80"}`
                }
              >
                Email Simulator
              </NavLink>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `${navBase} ${isActive ? "bg-white text-tealdeep shadow" : "text-tealdeep/80 hover:bg-white/80"}`
                }
              >
                Dashboard
              </NavLink>
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<ComposePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </div>
  );
}
