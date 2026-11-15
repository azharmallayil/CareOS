import React, { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AdminShell } from "./AdminShell.js";
import { useAuth } from "../../lib/auth-context.js";
import { Badge } from "../../components/ui/Badge.js";
import {
  Building,
  Shield,
  Activity,
  Server,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  Plus,
  X,
  CheckCircle2,
  Copy,
  AlertCircle,
} from "lucide-react";

interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  created_at: string;
}

interface NewTenantResponse {
  tenant: TenantSummary;
  admin?: {
    userId: string;
    email: string;
    fullName: string;
  } | null;
  loginUrl: string;
}

export default function AdminPortal() {
  return (
    <AdminShell>
      <Routes>
        <Route path="/" element={<PlatformTenantsDirectory />} />
        <Route path="/audit" element={<PlatformGlobalAudit />} />
        <Route path="/system" element={<PlatformInfrastructure />} />
      </Routes>
    </AdminShell>
  );
}

function PlatformTenantsDirectory() {
  const { session } = useAuth();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<NewTenantResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<"enterprise" | "professional" | "starter">("enterprise");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("CareOS@2026!");

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate slug from name if not manually modified
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(autoSlug);
  };

  const fetchTenants = async () => {
    if (!session?.access_token) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/admin/tenants", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const rawText = await res.text();
      let payload: any = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        // ignore
      }

      if (!res.ok) {
        throw new Error(payload?.error?.message || `HTTP ${res.status}: Failed to fetch tenants`);
      }

      if (payload && Array.isArray(payload.data)) {
        setTenants(payload.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [session?.access_token]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/v1/admin/tenants", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          plan,
          adminFullName: adminFullName.trim() || undefined,
          adminEmail: adminEmail.trim() || undefined,
          adminPassword: adminPassword || undefined,
        }),
      });

      const rawText = await res.text();
      let json: any = null;
      try {
        json = rawText ? JSON.parse(rawText) : null;
      } catch {
        // ignore
      }

      if (!res.ok) {
        throw new Error(
          json?.error?.message ||
          (rawText && rawText.length < 200 ? rawText : `Server error (${res.status} ${res.statusText})`)
        );
      }

      if (!json?.data) {
        throw new Error("Invalid response received from server");
      }

      setCreationResult(json.data);
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setCreationResult(null);
    setFormError(null);
    setName("");
    setSlug("");
    setAdminFullName("");
    setAdminEmail("");
    setAdminPassword("CareOS@2026!");
    setCopied(false);
  };

  const copyCredentials = () => {
    if (!creationResult) return;
    const text = `CareOS Telematics Portal Access:
Company: ${creationResult.tenant.name}
Slug: ${creationResult.tenant.slug}
Login URL: ${window.location.origin}/operations
Admin User: ${creationResult.admin?.email || adminEmail}
Password: ${adminPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            SaaS Platform Tenants
          </h1>
          <p className="text-xs text-neutral-400">
            Multi-tenant control plane, isolation parameters, and telematics company management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-500 transition"
          >
            <Plus className="h-4 w-4" />
            Add Telematics Company
          </button>
          <button
            onClick={fetchTenants}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/60 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Active Tenants
          </span>
          <div className="mt-2 text-2xl font-bold text-white">{tenants.length}</div>
          <p className="mt-1 text-[10px] text-emerald-400">100% Operational</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Tenancy Security
          </span>
          <div className="mt-2 text-2xl font-bold text-white">Isolated</div>
          <p className="mt-1 text-[10px] text-emerald-400">RLS Enforced</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Signups Gate
          </span>
          <div className="mt-2 text-2xl font-bold text-white">Private</div>
          <p className="mt-1 text-[10px] text-neutral-400">Invite & Admin Only</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Platform Role
          </span>
          <div className="mt-2 text-2xl font-bold text-red-400">Superadmin</div>
          <p className="mt-1 text-[10px] text-neutral-400">Zero Cross-Tenant Leakage</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tenants by name or slug..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-xs text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="border-b border-neutral-800 bg-neutral-900/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <tr>
              <th className="px-4 py-3">Tenant Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Tenant UUID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 text-right">Isolation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-850">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  {isLoading ? "Loading tenants..." : "No tenants found."}
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3.5 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-red-500" />
                      <span>{t.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-neutral-400">{t.slug}</td>
                  <td className="px-4 py-3.5 font-mono text-neutral-400 text-[11px]">{t.id}</td>
                  <td className="px-4 py-3.5">
                    <span className="rounded bg-emerald-950 border border-emerald-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 uppercase font-semibold text-[10px] text-neutral-300">
                    {t.plan}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <Lock className="h-3 w-3" />
                      RLS Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE NEW TELEMATICS COMPANY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-red-600/20 p-2 text-red-400">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Add New Telematics Company
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Provision an isolated multi-tenant organization and admin
                  </p>
                </div>
              </div>
              <button
                onClick={resetModal}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {creationResult ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span>Company Successfully Provisioned!</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    Database schema, roles, permissions, and initial admin credentials have been configured.
                  </p>
                </div>

                <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs font-mono text-neutral-300">
                  <div>
                    <span className="text-neutral-500">Company Name:</span>{" "}
                    <span className="text-white font-semibold">{creationResult.tenant.name}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Tenant Slug:</span>{" "}
                    <span className="text-emerald-400">{creationResult.tenant.slug}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Tenant ID:</span>{" "}
                    <span className="text-neutral-400">{creationResult.tenant.id}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Admin Email:</span>{" "}
                    <span className="text-white font-semibold">{creationResult.admin?.email || adminEmail}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Initial Password:</span>{" "}
                    <span className="text-amber-300">{adminPassword}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Operations Portal URL:</span>{" "}
                    <span className="text-sky-400">{window.location.origin}/operations</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={copyCredentials}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-800 py-2.5 text-xs font-semibold text-white hover:bg-neutral-700 transition"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied to Clipboard!" : "Copy Access Details"}
                  </button>
                  <button
                    onClick={resetModal}
                    className="flex-1 inline-flex items-center justify-center rounded-lg bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-500 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTenant} className="mt-5 space-y-4">
                {formError && (
                  <div className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-xs text-red-200">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Riyadh Telematics Fleet"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Organization Slug *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. riyadh-telematics"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={plan}
                    onChange={(e: any) => setPlan(e.target.value)}
                    className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="enterprise">Enterprise (Unlimited fleet assets, 24/7 SLA)</option>
                    <option value="professional">Professional (Up to 500 fleet assets)</option>
                    <option value="starter">Starter (Up to 100 fleet assets)</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                    Initial Company Admin User
                  </h4>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Admin Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tariq Al-Otaibi"
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Admin Work Email
                      </label>
                      <input
                        type="email"
                        placeholder="admin@riyadhtelematics.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Initial Temporary Password
                    </label>
                    <input
                      type="text"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !name || !slug}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-500 disabled:opacity-50 transition"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Provisioning...
                      </>
                    ) : (
                      "Provision Telematics Company"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformGlobalAudit() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
      <Activity className="mx-auto h-10 w-10 text-neutral-600" />
      <h3 className="mt-3 text-base font-semibold text-white">Global Platform Audit Trail</h3>
      <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
        Cross-tenant global audit aggregator. Records tenant lifecycle, subscription upgrades, and platform admin interventions.
      </p>
    </div>
  );
}

function PlatformInfrastructure() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
      <Server className="mx-auto h-10 w-10 text-neutral-600" />
      <h3 className="mt-3 text-base font-semibold text-white">Hostinger & Supabase Telemetry</h3>
      <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
        Region: Singapore (ap-southeast-1) • Supabase Connection: Active • Worker Runtime: OCI container isolated.
      </p>
    </div>
  );
}
