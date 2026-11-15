import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { AdminShell } from "./AdminShell.js";
import { useAuth } from "../../lib/auth-context.js";
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
  Database,
  Download,
  Upload,
  FileText,
  Key,
  Calendar,
  Infinity as InfinityIcon,
  Clock,
  Trash2,
  FileCheck,
  Edit3,
  Users,
  Briefcase,
  Layers,
  MapPin,
  Globe,
  Phone,
  Mail,
} from "lucide-react";

interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  legal_name?: string | null;
  commercial_register?: string | null;
  tax_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  country?: string;
  city?: string | null;
  address_line1?: string | null;
  subscription_valid_until?: string | null;
  is_unlimited_validity?: boolean;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

interface TenantDocument {
  id: string;
  document_type: string;
  title: string;
  file_name: string;
  file_size_bytes?: number;
  mime_type?: string;
  file_data: string;
  created_at: string;
  notes?: string;
}

interface TenantAdminUser {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  portal: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminPortal() {
  return (
    <AdminShell>
      <Routes>
        <Route path="/" element={<PlatformTenantsDirectory />} />
        <Route path="/backup" element={<PlatformBackupRestore />} />
      </Routes>
    </AdminShell>
  );
}

// ============================================================================
// 1. TENANTS DIRECTORY & MANAGEMENT
// ============================================================================
function PlatformTenantsDirectory() {
  const { session } = useAuth();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Form Fields for Creation
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newPlan, setNewPlan] = useState<"enterprise" | "professional" | "starter">("enterprise");
  const [newLegalName, setNewLegalName] = useState("");
  const [newCr, setNewCr] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCity, setNewCity] = useState("Riyadh");
  const [newAddress, setNewAddress] = useState("");
  const [newIsUnlimited, setNewIsUnlimited] = useState(true);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("CareOS@2026!");

  // Edit / Details Modal State
  const [selectedTenant, setSelectedTenant] = useState<TenantSummary | null>(null);
  const [tenantDocs, setTenantDocs] = useState<TenantDocument[]>([]);
  const [tenantAdmins, setTenantAdmins] = useState<TenantAdminUser[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "subscription" | "credentials" | "documents">("details");

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editCr, setEditCr] = useState("");
  const [editTaxId, setEditTaxId] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editIsUnlimited, setEditIsUnlimited] = useState(true);
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Document upload form
  const [docType, setDocType] = useState<string>("commercial_registration");
  const [docTitle, setDocTitle] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; mime: string; data: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password reset form
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);

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

  const handleNameChange = (val: string) => {
    setNewName(val);
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setNewSlug(autoSlug);
  };

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
          name: newName.trim(),
          slug: newSlug.trim(),
          plan: newPlan,
          legalName: newLegalName.trim() || undefined,
          commercialRegister: newCr.trim() || undefined,
          taxId: newTaxId.trim() || undefined,
          contactEmail: newEmail.trim() || undefined,
          contactPhone: newPhone.trim() || undefined,
          city: newCity.trim() || undefined,
          addressLine1: newAddress.trim() || undefined,
          isUnlimitedValidity: newIsUnlimited,
          subscriptionValidUntil: newIsUnlimited ? null : newExpiryDate ? new Date(newExpiryDate).toISOString() : null,
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
          (rawText && rawText.length < 200 ? rawText : `Server error (${res.status})`)
        );
      }

      setCreationResult(json.data);
      fetchTenants();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openManageModal = async (tenant: TenantSummary) => {
    setSelectedTenant(tenant);
    setEditName(tenant.name || "");
    setEditSlug(tenant.slug || "");
    setEditPlan(tenant.plan || "enterprise");
    setEditStatus(tenant.status || "active");
    setEditLegalName(tenant.legal_name || tenant.name || "");
    setEditCr(tenant.commercial_register || "");
    setEditTaxId(tenant.tax_id || "");
    setEditEmail(tenant.contact_email || "");
    setEditPhone(tenant.contact_phone || "");
    setEditWebsite(tenant.website || "");
    setEditCity(tenant.city || "Riyadh");
    setEditAddress(tenant.address_line1 || "");
    setEditIsUnlimited(tenant.is_unlimited_validity !== false);
    setEditExpiryDate(
      tenant.subscription_valid_until
        ? new Date(tenant.subscription_valid_until).toISOString().slice(0, 10)
        : ""
    );
    setEditNotes(tenant.notes || "");
    setPasswordResetSuccess(null);
    setSelectedFile(null);
    setDocTitle("");
    setActiveTab("details");

    // Fetch live details including documents and admin users
    if (!session?.access_token) return;
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenant.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.data) {
        setTenantDocs(json.data.documents || []);
        setTenantAdmins(json.data.adminUsers || []);
      }
    } catch (e) {
      console.error("Failed to load tenant details:", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedTenant || !session?.access_token) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${selectedTenant.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim(),
          plan: editPlan,
          status: editStatus,
          legalName: editLegalName.trim() || null,
          commercialRegister: editCr.trim() || null,
          taxId: editTaxId.trim() || null,
          contactEmail: editEmail.trim() || null,
          contactPhone: editPhone.trim() || null,
          website: editWebsite.trim() || null,
          city: editCity.trim() || null,
          addressLine1: editAddress.trim() || null,
          isUnlimitedValidity: editIsUnlimited,
          subscriptionValidUntil: editIsUnlimited
            ? null
            : editExpiryDate
            ? new Date(editExpiryDate).toISOString()
            : null,
          notes: editNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update tenant");

      setSuccessBanner(`Company "${editName}" updated successfully!`);
      setTimeout(() => setSuccessBanner(null), 4000);
      fetchTenants();
      setSelectedTenant(json.data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        mime: file.type || "application/pdf",
        data: reader.result as string,
      });
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !selectedFile || !session?.access_token) return;

    setIsUploadingDoc(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${selectedTenant.id}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType: docType,
          title: docTitle.trim() || selectedFile.name,
          fileName: selectedFile.name,
          fileData: selectedFile.data,
          fileSizeBytes: selectedFile.size,
          mimeType: selectedFile.mime,
          notes: docNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to upload document");

      setTenantDocs([json.data, ...tenantDocs]);
      setSelectedFile(null);
      setDocTitle("");
      setDocNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedTenant || !session?.access_token) return;
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/v1/admin/tenants/${selectedTenant.id}/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to delete document");

      setTenantDocs(tenantDocs.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !selectedAdminId || !newResetPassword || !session?.access_token) return;

    setIsResettingPassword(true);
    setPasswordResetSuccess(null);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${selectedTenant.id}/reset-admin-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedAdminId,
          newPassword: newResetPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reset password");

      setPasswordResetSuccess(json.message);
      setNewResetPassword("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsResettingPassword(false);
    }
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

  const filtered = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.commercial_register && t.commercial_register.includes(searchTerm)) ||
      (t.tax_id && t.tax_id.includes(searchTerm)) ||
      t.id.includes(searchTerm);

    const matchesPlan = filterPlan === "all" || t.plan === filterPlan;
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Telematics Companies & Subscriptions
          </h1>
          <p className="text-xs text-neutral-400">
            Control plane for managing client telematics firms, official CR/VAT records, subscriptions, credentials & legal documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCreationResult(null);
              setIsCreateModalOpen(true);
            }}
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

      {successBanner && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950/80 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/60 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Active Companies
          </span>
          <div className="mt-2 text-2xl font-bold text-white">{tenants.length}</div>
          <p className="mt-1 text-[10px] text-emerald-400">
            {tenants.filter((t) => t.status === "active").length} Operational & Live
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Subscription Validity
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {tenants.filter((t) => t.is_unlimited_validity !== false).length} Unlimited
          </div>
          <p className="mt-1 text-[10px] text-neutral-400">
            {tenants.filter((t) => t.is_unlimited_validity === false).length} Term Licenses
          </p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Isolation Security
          </span>
          <div className="mt-2 text-2xl font-bold text-white">RLS Active</div>
          <p className="mt-1 text-[10px] text-emerald-400">Zero Data Leakage</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Platform Recovery
          </span>
          <div className="mt-2 text-2xl font-bold text-sky-400">
            <Link to="/admin/backup" className="hover:underline flex items-center gap-1.5">
              <Database className="h-5 w-5" />
              Backup Ready
            </Link>
          </div>
          <p className="mt-1 text-[10px] text-neutral-400">All Tables & Files Exportable</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Company Name, Slug, CR Number, or Tax ID..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-xs text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-300 focus:border-red-500 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="enterprise">Enterprise</option>
            <option value="professional">Professional</option>
            <option value="starter">Starter</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-300 focus:border-red-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
        <table className="w-full text-left text-xs text-neutral-300">
          <thead className="border-b border-neutral-800 bg-neutral-900/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            <tr>
              <th className="px-4 py-3">Company & Official Details</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Subscription Validity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-850">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  {isLoading ? "Loading companies..." : "No telematics companies found."}
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <Building className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{t.name}</span>
                    </div>
                    {t.legal_name && t.legal_name !== t.name && (
                      <p className="text-[11px] text-neutral-400 mt-0.5">{t.legal_name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-400 font-mono">
                      {t.commercial_register && (
                        <span>CR: {t.commercial_register}</span>
                      )}
                      {t.tax_id && (
                        <span>VAT: {t.tax_id}</span>
                      )}
                      {t.city && (
                        <span>{t.city}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-neutral-400 text-xs">{t.slug}</td>
                  <td className="px-4 py-3.5">
                    <span className="rounded bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-200">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {t.is_unlimited_validity !== false ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950 border border-emerald-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <InfinityIcon className="h-3 w-3" />
                        Unlimited
                      </span>
                    ) : t.subscription_valid_until ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-300">
                        <Clock className="h-3 w-3 text-amber-400" />
                        Valid until {new Date(t.subscription_valid_until).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-500">Not Set</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        t.status === "active"
                          ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                          : t.status === "trial"
                          ? "bg-sky-950 border border-sky-800 text-sky-400"
                          : "bg-red-950 border border-red-800 text-red-400"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => openManageModal(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Manage & Documents
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE NEW COMPANY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-red-600/20 p-2 text-red-400">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Onboard New Telematics Company
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Collect official details, CR/VAT numbers, subscription validity & provision initial admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
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
                    Database schema, department, roles, permissions, and tenant admin account configured.
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
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreationResult(null);
                    }}
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

                {/* Basic Company Identity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Company Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Najd Telematics Fleet"
                      value={newName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Organization URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. najd-telematics"
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Official Legal Details */}
                <div className="pt-2 border-t border-neutral-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                    Official Company Information
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Legal Registered Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Najd Technology LLC"
                        value={newLegalName}
                        onChange={(e) => setNewLegalName(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Commercial Register (CR)
                      </label>
                      <input
                        type="text"
                        placeholder="1010XXXXXX"
                        value={newCr}
                        onChange={(e) => setNewCr(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        VAT / Tax ID
                      </label>
                      <input
                        type="text"
                        placeholder="300XXXXXXXXXXXX"
                        value={newTaxId}
                        onChange={(e) => setNewTaxId(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Official Phone
                      </label>
                      <input
                        type="text"
                        placeholder="+966 11 XXX XXXX"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Official Email
                      </label>
                      <input
                        type="email"
                        placeholder="info@najdtelematics.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        City / Headquarters
                      </label>
                      <input
                        type="text"
                        placeholder="Riyadh"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Subscription Tier & Validity */}
                <div className="pt-2 border-t border-neutral-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                    Subscription Tier & License Validity
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Subscription Plan Tier
                      </label>
                      <select
                        value={newPlan}
                        onChange={(e: any) => setNewPlan(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      >
                        <option value="enterprise">Enterprise (Unlimited Fleet Assets, 24/7 SLA)</option>
                        <option value="professional">Professional (Up to 500 Fleet Assets)</option>
                        <option value="starter">Starter (Up to 100 Fleet Assets)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        License Validity
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="newUnlimitedCheck"
                          checked={newIsUnlimited}
                          onChange={(e) => setNewIsUnlimited(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-red-600 focus:ring-red-500"
                        />
                        <label htmlFor="newUnlimitedCheck" className="text-xs text-neutral-200 font-semibold cursor-pointer flex items-center gap-1.5">
                          <InfinityIcon className="h-4 w-4 text-emerald-400" />
                          Unlimited Validity (Permanent / Lifetime)
                        </label>
                      </div>

                      {!newIsUnlimited && (
                        <div className="pt-1">
                          <input
                            type="date"
                            required={!newIsUnlimited}
                            value={newExpiryDate}
                            onChange={(e) => setNewExpiryDate(e.target.value)}
                            className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Initial Admin Account */}
                <div className="pt-2 border-t border-neutral-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                    Initial Tenant Administrator
                  </h4>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Admin Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tariq Al-Harbi"
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
                        placeholder="admin@najdtelematics.com"
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
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newName || !newSlug}
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

      {/* MANAGE COMPANY DETAILS, DOCUMENTS & CREDENTIALS MODAL */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-red-500" />
                  <h3 className="text-base font-bold text-white">
                    {selectedTenant.name}
                  </h3>
                  <span className="rounded bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-300">
                    {selectedTenant.slug}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tenant UUID: {selectedTenant.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-neutral-800 mt-4 space-x-1">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  activeTab === "details"
                    ? "border-red-500 text-white"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Official Details
              </button>
              <button
                onClick={() => setActiveTab("subscription")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  activeTab === "subscription"
                    ? "border-red-500 text-white"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Subscription & Validity
              </button>
              <button
                onClick={() => setActiveTab("credentials")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  activeTab === "credentials"
                    ? "border-red-500 text-white"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                <Key className="h-4 w-4" />
                Admin Credentials ({tenantAdmins.length})
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                  activeTab === "documents"
                    ? "border-red-500 text-white"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                <FileText className="h-4 w-4" />
                Company Documents ({tenantDocs.length})
              </button>
            </div>

            {/* TAB 1: OFFICIAL DETAILS */}
            {activeTab === "details" && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Company Brand Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Organization Slug
                    </label>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Official Legal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Najd Telematics Ltd"
                      value={editLegalName}
                      onChange={(e) => setEditLegalName(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Commercial Register (CR)
                    </label>
                    <input
                      type="text"
                      placeholder="1010XXXXXX"
                      value={editCr}
                      onChange={(e) => setEditCr(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      VAT / Tax ID
                    </label>
                    <input
                      type="text"
                      placeholder="300XXXXXXXXXXXX"
                      value={editTaxId}
                      onChange={(e) => setEditTaxId(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Official Contact Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Official Contact Phone
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Website URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Headquarters City
                    </label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Physical Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="Building, Road, District"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Internal Operator Notes
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Private notes for platform admins..."
                    className="w-full rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-neutral-800">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
                  >
                    {isSavingEdit ? "Saving Changes..." : "Save Official Details"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SUBSCRIPTION & VALIDITY */}
            {activeTab === "subscription" && (
              <div className="mt-5 space-y-5">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Subscription Tier
                      </label>
                      <select
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      >
                        <option value="enterprise">Enterprise (Unlimited fleet assets, priority 24/7 SLA)</option>
                        <option value="professional">Professional (Up to 500 fleet assets)</option>
                        <option value="starter">Starter (Up to 100 fleet assets)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        Account Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                      >
                        <option value="active">Active (Full access to all portals)</option>
                        <option value="trial">Trial Period</option>
                        <option value="suspended">Suspended (All member logins blocked)</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-850">
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      License Validity Terms
                    </label>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="editUnlimitedCheck"
                          checked={editIsUnlimited}
                          onChange={(e) => setEditIsUnlimited(e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-red-600 focus:ring-red-500"
                        />
                        <label htmlFor="editUnlimitedCheck" className="text-xs text-neutral-200 font-semibold cursor-pointer flex items-center gap-1.5">
                          <InfinityIcon className="h-4 w-4 text-emerald-400" />
                          Unlimited Validity (No Expiry Date / Lifetime SaaS License)
                        </label>
                      </div>

                      {!editIsUnlimited && (
                        <div className="max-w-xs pt-1">
                          <label className="block text-[11px] text-neutral-400 mb-1">
                            Set Expiry Date:
                          </label>
                          <input
                            type="date"
                            value={editExpiryDate}
                            onChange={(e) => setEditExpiryDate(e.target.value)}
                            className="w-full rounded-lg border border-neutral-750 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
                  >
                    {isSavingEdit ? "Updating Subscription..." : "Update Subscription & Validity"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: ADMIN CREDENTIALS */}
            {activeTab === "credentials" && (
              <div className="mt-5 space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Active Company Administrators
                  </h4>
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
                    <table className="w-full text-left text-xs text-neutral-300">
                      <thead className="border-b border-neutral-800 bg-neutral-900 text-[11px] uppercase tracking-wider text-neutral-400">
                        <tr>
                          <th className="px-4 py-2.5">Admin Full Name</th>
                          <th className="px-4 py-2.5">Email Address</th>
                          <th className="px-4 py-2.5">Portal Access</th>
                          <th className="px-4 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850">
                        {tenantAdmins.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                              No company administrators registered yet.
                            </td>
                          </tr>
                        ) : (
                          tenantAdmins.map((adm) => (
                            <tr key={adm.userId}>
                              <td className="px-4 py-3 font-semibold text-white">{adm.fullName}</td>
                              <td className="px-4 py-3 font-mono text-neutral-300">{adm.email}</td>
                              <td className="px-4 py-3">
                                <span className="rounded bg-sky-950 border border-sky-800 px-2 py-0.5 text-[10px] font-semibold text-sky-400">
                                  {adm.portal}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedAdminId(adm.userId)}
                                  className="rounded bg-neutral-800 border border-neutral-700 px-2.5 py-1 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700 transition"
                                >
                                  Reset Password
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Password Reset Box */}
                {selectedAdminId && (
                  <form onSubmit={handleResetPassword} className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-red-400" />
                        <h5 className="text-xs font-bold text-white">
                          Reset Password for {tenantAdmins.find((a) => a.userId === selectedAdminId)?.email}
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAdminId("")}
                        className="text-neutral-400 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    {passwordResetSuccess && (
                      <div className="text-xs text-emerald-400 font-semibold">
                        {passwordResetSuccess}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Enter new temporary password..."
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        className="flex-1 rounded-lg border border-neutral-750 bg-neutral-950 px-3 py-2 text-xs font-mono text-white focus:border-red-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isResettingPassword || newResetPassword.length < 8}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
                      >
                        {isResettingPassword ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 4: COMPANY DOCUMENTS & LICENSES */}
            {activeTab === "documents" && (
              <div className="mt-5 space-y-5">
                {/* Upload Box */}
                <form onSubmit={handleUploadDocument} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-red-400" />
                    <h5 className="text-xs font-bold text-white">
                      Upload Official Company Document or Certificate
                    </h5>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        Document Type
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                      >
                        <option value="commercial_registration">Commercial Registration (CR)</option>
                        <option value="telematics_license">CITC Telematics License</option>
                        <option value="tax_certificate">Tax / VAT Certificate</option>
                        <option value="sla_contract">Master Agreement / SLA</option>
                        <option value="brand_logo">Official Brand Logo</option>
                        <option value="other">Other Document</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        Document Title
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2026 CR Certificate"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="w-full rounded-lg border border-neutral-750 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                        Select File (PDF, PNG, JPG)
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        required
                        accept=".pdf,.png,.jpg,.jpeg,.svg,.doc,.docx"
                        onChange={handleFileChange}
                        className="w-full text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <input
                      type="text"
                      placeholder="Optional notes or reference number..."
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      className="max-w-md w-full rounded-lg border border-neutral-750 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
                    />

                    <button
                      type="submit"
                      disabled={isUploadingDoc || !selectedFile}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploadingDoc ? "Uploading..." : "Upload Document"}
                    </button>
                  </div>
                </form>

                {/* Documents List */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="border-b border-neutral-800 bg-neutral-900 text-[11px] uppercase tracking-wider text-neutral-400">
                      <tr>
                        <th className="px-4 py-2.5">Document Title</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">File Details</th>
                        <th className="px-4 py-2.5">Uploaded</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {tenantDocs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                            No documents uploaded yet for this company.
                          </td>
                        </tr>
                      ) : (
                        tenantDocs.map((doc) => (
                          <tr key={doc.id}>
                            <td className="px-4 py-3 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-red-500 shrink-0" />
                                <span>{doc.title}</span>
                              </div>
                              {doc.notes && (
                                <p className="text-[10px] text-neutral-400 mt-0.5">{doc.notes}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-300">
                                {doc.document_type.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-neutral-400 font-mono text-[11px]">
                              {doc.file_name}
                              {doc.file_size_bytes && (
                                <span className="ml-2 text-neutral-500">
                                  ({(doc.file_size_bytes / 1024).toFixed(1)} KB)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-neutral-400 text-[11px]">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={doc.file_data}
                                  download={doc.file_name}
                                  className="rounded bg-neutral-800 border border-neutral-700 p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-700"
                                  title="Download / View"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="rounded bg-red-950/60 border border-red-800 p-1.5 text-red-400 hover:bg-red-900 hover:text-white"
                                  title="Delete Document"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. GLOBAL DISASTER RECOVERY & COMPLETE PLATFORM BACKUP
// ============================================================================
function PlatformBackupRestore() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<any | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSummary = async () => {
    if (!session?.access_token) return;
    setIsLoadingSummary(true);
    try {
      const res = await fetch("/api/v1/admin/backup/summary", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.data) setSummary(json.data);
    } catch (e) {
      console.error("Failed to fetch backup summary:", e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [session?.access_token]);

  const handleDownloadFullBackup = async () => {
    if (!session?.access_token) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/v1/admin/backup", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Backup generation failed on server");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `careos-complete-platform-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Backup export error: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    setRestoreError(null);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.tables || typeof parsed.tables !== "object") {
          throw new Error("Invalid backup format: Missing 'tables' collection");
        }
        setRestoreFile(parsed);
      } catch (err: any) {
        setRestoreError("Failed to parse backup JSON: " + err.message);
        setRestoreFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreFile || !confirmRestore || !session?.access_token) return;

    setIsRestoring(true);
    setRestoreError(null);

    try {
      const res = await fetch("/api/v1/admin/restore", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(restoreFile),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Restore failed");

      setRestoreResult(json);
      fetchSummary();
      setRestoreFile(null);
      setConfirmRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setRestoreError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Database className="h-6 w-6 text-red-500" />
          Global Platform Backup & Disaster Recovery
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Full system snapshots capturing all telematics companies, customer portals, staff, fleet assets, IoT devices, service tickets, work orders, service visits, and legal documents.
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Telematics Companies
          </span>
          <div className="mt-2 text-2xl font-bold text-white">{summary?.totalTenants ?? "..."}</div>
          <p className="mt-1 text-[10px] text-emerald-400">100% Backed Up</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Fleet Customers & Sites
          </span>
          <div className="mt-2 text-2xl font-bold text-white">{summary?.totalCustomers ?? "..."}</div>
          <p className="mt-1 text-[10px] text-neutral-400">Accounts & Geofences</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Tickets & Work Orders
          </span>
          <div className="mt-2 text-2xl font-bold text-white">
            {(summary?.totalTickets || 0) + (summary?.totalWorkOrders || 0)}
          </div>
          <p className="mt-1 text-[10px] text-neutral-400">Full Operational History</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Documents & Evidence
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {(summary?.totalDocuments || 0) + (summary?.totalEvidence || 0)}
          </div>
          <p className="mt-1 text-[10px] text-emerald-400">Certificates & Photos</p>
        </div>
      </div>

      {/* 1. EXPORT ON-DEMAND BACKUP */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-red-500" />
              <h3 className="text-base font-bold text-white">
                Download Complete System Backup
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              Generates a single self-contained JSON archive containing all database tables, company configurations, uploaded certificates, fleet asset records, and complete service histories.
            </p>
          </div>

          <button
            onClick={handleDownloadFullBackup}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-red-500 disabled:opacity-50 transition shrink-0"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Generating Snapshot..." : "Download Full Platform Backup (.json)"}
          </button>
        </div>
      </div>

      {/* 2. RESTORE SNAPSHOT */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              Restore Platform from Backup Snapshot
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Import a previously exported CareOS backup snapshot file. Restores telematics companies, customer portals, technicians, assets, tickets, and document files.
          </p>
        </div>

        {restoreError && (
          <div className="rounded-lg border border-red-800 bg-red-950/70 p-3 text-xs text-red-200">
            {restoreError}
          </div>
        )}

        {restoreResult && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Platform Restore Completed Successfully!</span>
            </div>
            <p className="text-xs text-emerald-200/80">
              Restored timestamp: {new Date(restoreResult.restoredAt).toLocaleString()}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono text-neutral-300">
              {Object.entries(restoreResult.restoredSummary || {}).slice(0, 9).map(([tbl, count]: any) => (
                <div key={tbl} className="bg-neutral-900 rounded p-1.5 border border-neutral-800">
                  <span className="text-neutral-400">{tbl}:</span> <span className="text-emerald-400">{count} rows</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border border-dashed border-neutral-750 rounded-xl p-6 text-center hover:border-neutral-600 transition">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            id="backupFileInput"
          />
          <label htmlFor="backupFileInput" className="cursor-pointer space-y-2 block">
            <Upload className="mx-auto h-8 w-8 text-neutral-500" />
            <div className="text-xs font-semibold text-neutral-200">
              {restoreFileName ? (
                <span className="text-emerald-400 font-mono">{restoreFileName}</span>
              ) : (
                "Click to select or drag and drop a CareOS Backup (.json) file"
              )}
            </div>
            <p className="text-[10px] text-neutral-500">
              Only valid JSON archives generated by CareOS Control Plane are supported
            </p>
          </label>
        </div>

        {/* Pre-flight inspection */}
        {restoreFile && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Snapshot Pre-Flight Inspection
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                Exported: {new Date(restoreFile.exportedAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-[11px] font-mono text-neutral-300">
              {Object.entries(restoreFile.summary || {}).map(([tbl, count]: any) => (
                <div key={tbl} className="bg-neutral-950 rounded p-2 border border-neutral-850">
                  <span className="text-neutral-400">{tbl}:</span>{" "}
                  <span className="text-white font-bold">{count}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirmRestoreCheck"
                  checked={confirmRestore}
                  onChange={(e) => setConfirmRestore(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="confirmRestoreCheck" className="text-xs text-amber-300 font-semibold cursor-pointer">
                  I understand this will upsert and restore records into the CareOS database.
                </label>
              </div>

              <button
                onClick={handleExecuteRestore}
                disabled={!confirmRestore || isRestoring}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition"
              >
                {isRestoring ? "Restoring Platform..." : "Execute System Restore"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
