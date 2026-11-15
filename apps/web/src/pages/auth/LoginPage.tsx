import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth-context.js";
import { type PortalType, setPortalScope } from "../../lib/supabase.js";
import { Shield, Briefcase, Wrench, Users, CheckCircle2, Zap } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, currentPortal, setPortal } = useAuth();

  // Detect target portal from URL or location state
  const searchParams = new URLSearchParams(location.search);
  const portalParam = (searchParams.get("portal") as PortalType) || null;
  const from = (location.state as any)?.from?.pathname || null;

  const initialPortal: PortalType =
    portalParam ||
    (from?.startsWith("/admin")
      ? "admin"
      : from?.startsWith("/technician")
      ? "technician"
      : from?.startsWith("/customer")
      ? "customer"
      : "operations");

  const [selectedPortal, setSelectedPortal] = useState<PortalType>(initialPortal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedPortal(initialPortal);
    setPortal(initialPortal);
  }, [initialPortal]);

  const handlePortalSwitch = (p: PortalType) => {
    setSelectedPortal(p);
    setPortal(p);
    setPortalScope(p);
    setErrorMsg(null);
  };

  const handleQuickFill = (targetPortal: PortalType, em: string, pw: string) => {
    handlePortalSwitch(targetPortal);
    setEmail(em);
    setPassword(pw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await signIn(email, password, selectedPortal);
      if (result.error) {
        setErrorMsg(result.error);
        setIsSubmitting(false);
        return;
      }

      // If a specific target was requested, navigate there
      if (from && from !== "/login") {
        navigate(from, { replace: true });
        return;
      }

      // Direct navigation to selected portal
      if (selectedPortal === "admin") navigate("/admin", { replace: true });
      else if (selectedPortal === "operations") navigate("/operations", { replace: true });
      else if (selectedPortal === "technician") navigate("/technician", { replace: true });
      else if (selectedPortal === "customer") navigate("/customer", { replace: true });
      else navigate("/operations", { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 p-4 font-sans text-neutral-100">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-7 shadow-2xl space-y-5">
        <div className="text-center">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white font-bold text-lg shadow-md mb-2">
            C
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">CareOS</h1>
          <p className="mt-1 text-xs text-neutral-400">
            Enterprise Fleet Telematics, Maintenance & Support Desk
          </p>
        </div>

        {/* Portal Isolation Selector */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 text-center">
            Select Workspace Portal (Tab-Isolated)
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-neutral-900 border border-neutral-800">
            <button
              type="button"
              onClick={() => handlePortalSwitch("operations")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                selectedPortal === "operations"
                  ? "bg-neutral-800 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 text-blue-400" />
              Operations
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch("admin")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                selectedPortal === "admin"
                  ? "bg-neutral-800 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-red-500" />
              Platform Admin
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch("technician")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                selectedPortal === "technician"
                  ? "bg-neutral-800 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
              Technician
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch("customer")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                selectedPortal === "customer"
                  ? "bg-neutral-800 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              Customer
            </button>
          </div>
        </div>

        {/* Quick-Fill Presets for Testing Multiple Tabs */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase font-semibold">
            <span className="flex items-center gap-1 text-sky-400">
              <Zap className="h-3 w-3" /> Quick Demo Fill
            </span>
            <span className="text-neutral-500">1-click test credentials</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickFill("admin", "azhar.mallayil@gmail.com", "CareOS@251")}
              className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1.5 text-left hover:border-neutral-700 hover:bg-neutral-850 transition"
            >
              <div className="font-semibold text-red-400">👑 Platform Superadmin</div>
              <div className="text-[10px] text-neutral-400 truncate">azhar.mallayil@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("operations", "admin@arabiantelematics.com", "Password123!")}
              className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1.5 text-left hover:border-neutral-700 hover:bg-neutral-850 transition"
            >
              <div className="font-semibold text-blue-400">🏢 Telematics Admin</div>
              <div className="text-[10px] text-neutral-400 truncate">admin@arabiantelematics...</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("technician", "tech@arabiantelematics.com", "Password123!")}
              className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1.5 text-left hover:border-neutral-700 hover:bg-neutral-850 transition"
            >
              <div className="font-semibold text-amber-400">📱 Field Tech (Ziyad)</div>
              <div className="text-[10px] text-neutral-400 truncate">tech@arabiantelematics...</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill("customer", "customer@almarai-demo.com", "Password123!")}
              className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-2 py-1.5 text-left hover:border-neutral-700 hover:bg-neutral-850 transition"
            >
              <div className="font-semibold text-emerald-400">👥 Fleet Customer</div>
              <div className="text-[10px] text-neutral-400 truncate">customer@almarai...</div>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            className="rounded-lg bg-red-950/80 border border-red-800 p-3 text-xs text-red-200"
            role="alert"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-neutral-300 mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-750 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-neutral-300"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-red-400 hover:text-red-300"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-750 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-500 focus:outline-none disabled:opacity-50 transition"
          >
            {isSubmitting ? "Signing in..." : `Sign in to ${selectedPortal.charAt(0).toUpperCase() + selectedPortal.slice(1)}`}
          </button>
        </form>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-2.5 text-center">
          <p className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>
              <strong>Independent Tab Sessions Active:</strong> Logging out of this tab will not log out your other portal tabs.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
