import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../lib/auth-context.js";
import { Card } from "../../../components/ui/Card.js";
import { Badge } from "../../../components/ui/Badge.js";
import { Modal } from "../../../components/ui/Modal.js";
import {
  LifeBuoy,
  ArrowLeft,
  Building2,
  MapPin,
  Truck,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Plus,
  AlertCircle,
  FileText,
  UserCheck,
  Calendar,
  Sparkles,
  Zap,
  Check,
  Star,
  Phone,
  Search,
  Navigation,
  CheckSquare,
  Layers,
  Image,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  X,
} from "lucide-react";

export interface RecommendationItem {
  technicianId: string;
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  avgRating: number;
  status: string;
  totalScore: number;
  isEligible: boolean;
  isAvailable: boolean;
  currentWorkload: number;
  maxActiveWorkOrders: number;
  distanceKm?: number | null;
  skills: Array<{ skillCode: string; skillName: string; proficiencyLevel?: string; certified?: boolean }>;
  territories: string[];
  activeWorkOrders: Array<{
    id: string;
    workOrderNumber: string;
    status: string;
    priority: string;
    customerName?: string;
    siteName?: string;
    siteCity?: string;
    distanceKm?: number;
  }>;
  isNearbyAddon: boolean;
  nearbyAddonOpportunity?: {
    workOrderNumber: string;
    siteName: string;
    siteCity?: string;
    distanceKm: number;
    description: string;
  } | null;
  scoreBreakdown: {
    skillScore: number;
    territoryScore: number;
    availabilityScore: number;
    workloadScore: number;
    proximityScore: number;
    routeAddonScore?: number;
  };
  reasons: string[];
}

export interface TicketDetailData {
  id: string;
  tenant_id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
  coverage_type: string;
  reported_via: string;
  sla_due_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_summary: string | null;
  cancellation_reason: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  assignedTechnician?: {
    id: string;
    user_id?: string;
    full_name: string;
    email: string;
    phone: string | null;
    avg_rating?: number;
    status: string;
    skills?: Array<{ skill_code: string; skill_name: string }>;
  } | null;
  activeWorkOrder?: {
    id: string;
    work_order_number: string;
    status: string;
    priority: string;
    scheduled_date: string;
    scheduled_window_start: string;
    scheduled_window_end: string;
  } | null;
  customer_accounts?: {
    id: string;
    name: string;
    account_number: string;
    email: string | null;
    phone: string | null;
  } | null;
  customer_sites?: {
    id: string;
    name: string;
    city: string;
    address_line_1: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  customer_contacts?: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    role_title: string | null;
  } | null;
  assets?: {
    id: string;
    name: string;
    asset_tag: string;
    fleet_number: string | null;
    vin: string | null;
    make: string;
    model: string;
    operational_status: string;
  } | null;
  ticket_categories?: {
    id: string;
    name: string;
    code: string;
    default_priority: string;
    sla_response_hours: number;
    sla_resolution_hours: number;
  } | null;
  statusHistory: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    changed_by: string | null;
    reason: string | null;
    created_at: string;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    actor_id: string | null;
    actor_type: string;
    is_internal: boolean;
    body: string;
    attachments?: Array<{ name: string; url?: string; dataUrl?: string; type?: string; size?: number }>;
    metadata?: Record<string, any>;
    created_at: string;
  }>;
  complaints: Array<{
    id: string;
    complaint_number: string;
    complaint_type: string;
    title: string;
    status: string;
    severity: string;
    created_at: string;
  }>;
}

export function TicketDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, authContext } = useAuth();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Transition Modal State
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [isTransitionSubmitting, setIsTransitionSubmitting] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Enhanced Technician Assignment State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isRecsLoading, setIsRecsLoading] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );
  const [scheduledWindow, setScheduledWindow] = useState<{ start: string; end: string }>({
    start: "09:00:00",
    end: "12:00:00",
  });
  const [searchFilter, setSearchFilter] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<"all" | "addon" | "available" | "nearby">("all");
  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // New Comment State
  const [commentBody, setCommentBody] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Timeline Filter
  const [timelineTab, setTimelineTab] = useState<"all" | "public" | "internal">("all");

  const tenantId = authContext?.activeTenantId;
  const token = session?.access_token;

  const fetchTicket = () => {
    if (!token || !tenantId || !id) return;
    setIsLoading(true);
    setErrorMsg(null);

    fetch(`/api/v1/tickets/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Tenant-ID": tenantId,
      },
    })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.error) {
          setErrorMsg(payload.error.message);
        } else if (payload.data) {
          setTicket(payload.data);
        }
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [token, tenantId, id]);

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId || !id || !transitionTarget) return;

    if (!transitionReason.trim()) {
      setTransitionError("A transition reason is mandatory");
      return;
    }

    setIsTransitionSubmitting(true);
    setTransitionError(null);

    try {
      const res = await fetch(`/api/v1/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({
          toStatus: transitionTarget,
          reason: transitionReason.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error?.message || "Status transition failed");
      }

      setTransitionTarget(null);
      setTransitionReason("");
      fetchTicket();
    } catch (err: any) {
      setTransitionError(err.message || "Failed to update ticket status");
    } finally {
      setIsTransitionSubmitting(false);
    }
  };

  const loadTechnicianRecommendations = async (dateOverride?: string) => {
    if (!token || !tenantId || !id) return;
    setIsRecsLoading(true);
    setAssignError(null);
    const dateToQuery = dateOverride || scheduledDate || new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(
        `/api/v1/dispatch/recommendations?ticketId=${id}&scheduledDate=${dateToQuery}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Tenant-ID": tenantId,
            "X-Portal": "operations",
          },
        }
      );
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        if (data.recommendations.length > 0) {
          setSelectedTechId(data.recommendations[0].technicianId);
        }
      }
    } catch (err: any) {
      setAssignError(err.message || "Failed to load technician recommendations");
    } finally {
      setIsRecsLoading(false);
    }
  };

  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId || !id || !selectedTechId) return;

    setIsAssignSubmitting(true);
    setAssignError(null);

    try {
      const res = await fetch("/api/v1/dispatch/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
          "X-Portal": "operations",
        },
        body: JSON.stringify({
          ticketId: id,
          technicianId: selectedTechId,
          scheduledDate,
          scheduledWindowStart: scheduledWindow.start,
          scheduledWindowEnd: scheduledWindow.end,
          priority: ticket?.priority || "medium",
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error?.message || "Failed to dispatch technician");
      }

      setIsAssignModalOpen(false);
      fetchTicket();
    } catch (err: any) {
      setAssignError(err.message || "Failed to assign technician");
    } finally {
      setIsAssignSubmitting(false);
    }
  };

  const handleUnassignTicket = async () => {
    if (!token || !tenantId || !id) return;
    if (!window.confirm("Are you sure you want to unassign the current technician from this ticket?")) return;

    setIsAssignSubmitting(true);
    setAssignError(null);

    try {
      const res = await fetch(`/api/v1/tickets/${id}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({
          assignedTo: null,
          reason: "Unassigned via Operations Desk",
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error?.message || "Failed to unassign ticket");
      }

      setIsAssignModalOpen(false);
      setSelectedTechId("");
      fetchTicket();
    } catch (err: any) {
      setAssignError(err.message || "Failed to unassign technician");
    } finally {
      setIsAssignSubmitting(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId || !id || !commentBody.trim()) return;

    setIsCommentSubmitting(true);
    setCommentError(null);

    try {
      const res = await fetch(`/api/v1/tickets/${id}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": tenantId,
          "X-Portal": "operations",
        },
        body: JSON.stringify({
          eventType: "comment",
          body: commentBody.trim(),
          isInternal: isInternalComment,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error?.message || "Failed to post comment");
      }

      setCommentBody("");
      fetchTicket();
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="error" dot>Critical Priority</Badge>;
      case "high":
        return <Badge variant="warning" dot>High Priority</Badge>;
      case "medium":
        return <Badge variant="info">Medium Priority</Badge>;
      case "low":
        return <Badge variant="neutral">Low Priority</Badge>;
      default:
        return <Badge variant="neutral">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge variant="info">Submitted</Badge>;
      case "under_review":
        return <Badge variant="warning">Under Review</Badge>;
      case "ready_for_assignment":
        return <Badge variant="primary">Ready For Assign</Badge>;
      case "assigned":
      case "accepted":
        return <Badge variant="info">Assigned</Badge>;
      case "in_progress":
      case "technician_en_route":
      case "arrived":
        return <Badge variant="warning" dot>In Progress</Badge>;
      case "on_hold":
        return <Badge variant="neutral">On Hold</Badge>;
      case "service_completed":
        return <Badge variant="info">Service Completed</Badge>;
      case "awaiting_customer_confirmation":
        return <Badge variant="warning" dot>Awaiting Customer Sign-Off</Badge>;
      case "awaiting_operations_verification":
        return <Badge variant="primary" dot>Awaiting Ops Verification</Badge>;
      case "resolved":
        return <Badge variant="success">Resolved</Badge>;
      case "closed":
        return <Badge variant="neutral">Closed</Badge>;
      case "cancelled":
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status.replace(/_/g, " ")}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-neutral-500">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-3 text-lg font-bold text-neutral-900">Ticket Not Available</h2>
        <p className="mt-1 text-sm text-neutral-500">{errorMsg || "The requested ticket was not found."}</p>
        <Link
          to="/operations/tickets"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tickets
        </Link>
      </div>
    );
  }

  // Determine allowed transitions for operations
  const transitionOptions: Array<{ target: string; label: string; variant: "primary" | "warning" | "error" | "neutral" | "success" }> = [];
  switch (ticket.status) {
    case "submitted":
      transitionOptions.push({ target: "under_review", label: "Start Review", variant: "primary" });
      transitionOptions.push({ target: "ready_for_assignment", label: "Skip to Ready for Assign", variant: "neutral" });
      transitionOptions.push({ target: "cancelled", label: "Cancel Ticket", variant: "error" });
      break;
    case "under_review":
      transitionOptions.push({ target: "ready_for_assignment", label: "Approve for Assignment", variant: "primary" });
      transitionOptions.push({ target: "awaiting_quotation", label: "Awaiting Quotation", variant: "warning" });
      transitionOptions.push({ target: "on_hold", label: "Place on Hold", variant: "neutral" });
      transitionOptions.push({ target: "cancelled", label: "Cancel Ticket", variant: "error" });
      break;
    case "ready_for_assignment":
      transitionOptions.push({ target: "assigned", label: "Mark Assigned", variant: "primary" });
      transitionOptions.push({ target: "under_review", label: "Return to Review", variant: "neutral" });
      transitionOptions.push({ target: "cancelled", label: "Cancel Ticket", variant: "error" });
      break;
    case "assigned":
    case "accepted":
      transitionOptions.push({ target: "in_progress", label: "Move to In Progress", variant: "primary" });
      transitionOptions.push({ target: "ready_for_assignment", label: "Reassign Ticket", variant: "warning" });
      transitionOptions.push({ target: "on_hold", label: "Place on Hold", variant: "neutral" });
      break;
    case "in_progress":
      transitionOptions.push({ target: "service_completed", label: "Complete Service", variant: "success" });
      transitionOptions.push({ target: "on_hold", label: "Place on Hold", variant: "warning" });
      break;
    case "on_hold":
      transitionOptions.push({ target: "in_progress", label: "Resume Service", variant: "primary" });
      transitionOptions.push({ target: "under_review", label: "Return to Review", variant: "neutral" });
      transitionOptions.push({ target: "cancelled", label: "Cancel Ticket", variant: "error" });
      break;
    case "service_completed":
      transitionOptions.push({ target: "awaiting_customer_confirmation", label: "Send for Customer Sign-Off", variant: "primary" });
      transitionOptions.push({ target: "awaiting_operations_verification", label: "Move to Ops Verification", variant: "warning" });
      transitionOptions.push({ target: "resolved", label: "Resolve Ticket", variant: "success" });
      break;
    case "awaiting_customer_confirmation":
      transitionOptions.push({ target: "awaiting_operations_verification", label: "Ops Override Verification", variant: "primary" });
      transitionOptions.push({ target: "resolved", label: "Force Resolve", variant: "success" });
      transitionOptions.push({ target: "in_progress", label: "Reopen for Work", variant: "warning" });
      break;
    case "awaiting_operations_verification":
      transitionOptions.push({ target: "resolved", label: "Approve & Resolve Ticket", variant: "success" });
      transitionOptions.push({ target: "under_review", label: "Reject / Return to Review", variant: "error" });
      transitionOptions.push({ target: "in_progress", label: "Reopen for Work", variant: "warning" });
      break;
    case "resolved":
      transitionOptions.push({ target: "closed", label: "Close Ticket", variant: "neutral" });
      transitionOptions.push({ target: "under_review", label: "Reopen Ticket", variant: "warning" });
      break;
  }

  const filteredEvents = ticket.events.filter((ev) => {
    if (timelineTab === "public") return !ev.is_internal;
    if (timelineTab === "internal") return ev.is_internal;
    return true;
  });

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Back Link and Header */}
      <div>
        <Link
          to="/operations/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Support Desk
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-base font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {ticket.ticket_number}
              </span>
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
              <span className="text-xs text-neutral-500">
                Category: <strong className="text-neutral-700">{ticket.ticket_categories?.name || "General"}</strong>
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{ticket.title}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Created {new Date(ticket.created_at).toLocaleString()}
              </span>
              <span>•</span>
              <span>Reported via: <strong className="text-neutral-700 capitalize">{ticket.reported_via}</strong></span>
              <span>•</span>
              <span>Coverage: <strong className="text-neutral-700 capitalize">{ticket.coverage_type}</strong></span>
              {ticket.sla_due_at && (
                <>
                  <span>•</span>
                  <span className="text-amber-700 font-medium">
                    SLA Target: {new Date(ticket.sla_due_at).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status Transitions Control Bar */}
          {transitionOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
              <span className="text-xs font-semibold text-neutral-500 pl-1">Actions:</span>
              {transitionOptions.map((opt) => (
                <button
                  key={opt.target}
                  onClick={() => {
                    setTransitionTarget(opt.target);
                    setTransitionReason("");
                    setTransitionError(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
                    opt.variant === "primary"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : opt.variant === "success"
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : opt.variant === "warning"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : opt.variant === "error"
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Technician Delay Alert Banner */}
      {(() => {
        const delayEvent = ticket.events?.find(
          (ev) => ev.metadata?.is_delay_notice || ev.body?.includes("⚠️ DELAY NOTICE:")
        );
        if (!delayEvent) return null;
        return (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm flex items-start gap-3.5">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-amber-950 uppercase tracking-wide text-sm">
                  Technician Schedule Delay Reported (+{delayEvent.metadata?.delay_minutes || 30} min)
                </span>
                <Badge variant="warning">Schedule Shift</Badge>
              </div>
              <p className="mt-1 text-amber-900 font-medium">
                <strong>Reason:</strong> {delayEvent.metadata?.delay_reason || "Travel / Work Delay"}
              </p>
              {delayEvent.metadata?.new_eta && (
                <p className="mt-0.5 text-amber-950 font-semibold">
                  <strong>Revised ETA:</strong> {delayEvent.metadata.new_eta}
                </p>
              )}
              {delayEvent.metadata?.notes && (
                <p className="mt-1 text-amber-800 italic bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                  "{delayEvent.metadata.notes}"
                </p>
              )}
              <p className="mt-1 text-[11px] text-amber-700">
                Reported {new Date(delayEvent.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Details & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description Card */}
          <Card className="p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Problem Description & Diagnostics
            </h2>
            <div className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed bg-neutral-50 p-4 rounded-lg border border-neutral-100">
              {ticket.description}
            </div>

            {ticket.resolution_summary && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs uppercase tracking-wide">
                  <CheckCircle2 className="h-4 w-4" /> Resolution Summary
                </div>
                <p className="mt-1 text-sm text-emerald-900">{ticket.resolution_summary}</p>
                {ticket.resolved_at && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Resolved at {new Date(ticket.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {ticket.cancellation_reason && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs uppercase tracking-wide">
                  <AlertTriangle className="h-4 w-4" /> Cancellation Reason
                </div>
                <p className="mt-1 text-sm text-rose-900">{ticket.cancellation_reason}</p>
              </div>
            )}
          </Card>

          {/* Customer Attached Photos & Issue Evidence */}
          {(() => {
            const issuePhotos = (ticket.events || [])
              .filter(
                (ev) =>
                  ev.event_type !== "customer_signoff_approved" &&
                  ev.event_type !== "customer_signoff_rejected"
              )
              .flatMap((ev) => (Array.isArray(ev.attachments) ? ev.attachments : []));

            if (issuePhotos.length === 0) return null;

            return (
              <Card className="p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4 text-blue-600" />
                  Customer Attached Issue Photos & Evidence ({issuePhotos.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {issuePhotos.map((photo: any, idx: number) => (
                    <a
                      key={idx}
                      href={photo.url || photo.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 hover:border-blue-500 shadow-xs transition"
                    >
                      <img
                        src={photo.url || photo.dataUrl}
                        alt={photo.name || `Photo ${idx + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-[11px] px-2 py-1 truncate text-center font-medium">
                        {photo.name || `Photo ${idx + 1}`}
                      </span>
                    </a>
                  ))}
                </div>
              </Card>
            );
          })()}

          {/* Customer Work Sign-Off & Satisfaction Rating */}
          {(() => {
            const signoffEvent = ticket.events?.find(
              (ev) =>
                ev.event_type === "customer_signoff_approved" ||
                ev.event_type === "customer_signoff_rejected"
            );

            if (signoffEvent) {
              const isApproved = signoffEvent.event_type === "customer_signoff_approved";
              const rating = signoffEvent.metadata?.rating;
              const feedback = signoffEvent.metadata?.feedback;
              const reworkReason = signoffEvent.metadata?.rework_reason;
              const signature = signoffEvent.metadata?.customer_signature_name;
              const signoffPhotos = Array.isArray(signoffEvent.attachments)
                ? signoffEvent.attachments
                : [];

              return (
                <Card
                  className={`p-5 border ${
                    isApproved
                      ? "border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white"
                      : "border-rose-200 bg-gradient-to-br from-rose-50/50 to-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-white shadow-xs ${
                          isApproved ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      >
                        {isApproved ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-neutral-900">
                          Customer Work Verification: {isApproved ? "Approved & Verified" : "Rework Requested"}
                        </h2>
                        <p className="text-xs text-neutral-500">
                          Logged at {new Date(signoffEvent.created_at).toLocaleString()}
                          {signature ? ` by ${signature}` : ""}
                        </p>
                      </div>
                    </div>

                    {rating && (
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        <span className="text-xs font-bold text-amber-900 mr-1">{rating}.0</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-neutral-200"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {feedback && (
                    <div className="mt-3 text-xs text-neutral-800 bg-white/80 p-3 rounded-lg border border-neutral-200/80">
                      <span className="font-semibold text-neutral-700 block mb-0.5">Customer Feedback:</span>
                      <p className="italic leading-relaxed">"{feedback}"</p>
                    </div>
                  )}

                  {reworkReason && (
                    <div className="mt-3 text-xs text-rose-900 bg-rose-50 p-3 rounded-lg border border-rose-200">
                      <span className="font-semibold text-rose-800 block mb-0.5">Rework Reason:</span>
                      <p>{reworkReason}</p>
                    </div>
                  )}

                  {signoffPhotos.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <span className="text-xs font-semibold text-neutral-700 block">
                        Customer Inspection Photos ({signoffPhotos.length}):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {signoffPhotos.map((photo: any, idx: number) => (
                          <a
                            key={idx}
                            href={photo.url || photo.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative block aspect-video rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 hover:border-blue-400 transition"
                          >
                            <img
                              src={photo.url || photo.dataUrl}
                              alt={photo.name || `Inspection Photo ${idx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate text-center">
                              {photo.name || `Photo ${idx + 1}`}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            }

            if (ticket.status === "awaiting_customer_confirmation") {
              return (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                        Awaiting Customer Approval & Sign-Off
                      </h3>
                      <p className="text-xs text-amber-800">
                        Technician completed the service checkout. The customer has been invited to review, rate (1-5 stars), and approve the work.
                      </p>
                    </div>
                  </div>
                  <Badge variant="warning">In Review</Badge>
                </div>
              );
            }

            return null;
          })()}

          {/* Activity Stream & Notes Card */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-3 gap-2">
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Activity Timeline & Communications
              </h2>

              <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setTimelineTab("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timelineTab === "all" ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  All ({ticket.events.length})
                </button>
                <button
                  onClick={() => setTimelineTab("public")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    timelineTab === "public" ? "bg-white text-neutral-900 shadow-xs font-semibold" : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Public ({ticket.events.filter((e) => !e.is_internal).length})
                </button>
                <button
                  onClick={() => setTimelineTab("internal")}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    timelineTab === "internal" ? "bg-white text-amber-900 shadow-xs font-semibold" : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Lock className="h-3 w-3" /> Internal ({ticket.events.filter((e) => e.is_internal).length})
                </button>
              </div>
            </div>

            {/* Events Timeline List */}
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <p className="text-xs text-neutral-400 italic py-6 text-center">No events in this view</p>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-lg p-3 text-sm border ${
                      event.is_internal
                        ? "bg-amber-50/70 border-amber-200 text-amber-950"
                        : event.event_type === "status_change"
                        ? "bg-neutral-50 border-neutral-200 text-neutral-800"
                        : "bg-white border-neutral-200 text-neutral-900 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {event.is_internal ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] uppercase bg-amber-100/80 px-1.5 py-0.5 rounded">
                            <Lock className="h-2.5 w-2.5" /> Staff Internal Note
                          </span>
                        ) : (
                          <span className="capitalize text-neutral-600 font-medium text-[11px]">
                            {event.actor_type}
                          </span>
                        )}
                        <span className="text-neutral-400">•</span>
                        <span className="text-neutral-500 text-[11px] font-normal">
                          {new Date(event.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm">{event.body}</p>

                    {event.attachments && event.attachments.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {event.attachments.map((photo: any, aIdx: number) => (
                          <a
                            key={aIdx}
                            href={photo.url || photo.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group relative block aspect-video rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 hover:border-blue-500 transition shadow-xs"
                          >
                            <img
                              src={photo.url || photo.dataUrl}
                              alt={photo.name || `Attachment ${aIdx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                            />
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate text-center">
                              {photo.name || `Photo ${aIdx + 1}`}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment / Note Form */}
            <form onSubmit={handlePostComment} className="mt-4 border-t border-neutral-200 pt-4 space-y-3">
              {commentError && (
                <div className="rounded bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
                  {commentError}
                </div>
              )}

              <textarea
                required
                rows={3}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write an update, note, or customer communication..."
                className="w-full rounded-lg border border-neutral-300 p-2.5 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-amber-800">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Internal staff note only (invisible to customer portal)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isCommentSubmitting || !commentBody.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isCommentSubmitting ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Context Information */}
        <div className="space-y-6">
          {/* Customer Account Info */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-neutral-500" /> Customer Account
            </h3>

            {ticket.customer_accounts ? (
              <div className="space-y-2 text-sm">
                <div className="font-bold text-neutral-900">{ticket.customer_accounts.name}</div>
                <div className="text-xs font-mono text-neutral-500">
                  Account: {ticket.customer_accounts.account_number}
                </div>
                {ticket.customer_accounts.phone && (
                  <div className="text-xs text-neutral-600">Phone: {ticket.customer_accounts.phone}</div>
                )}
                {ticket.customer_accounts.email && (
                  <div className="text-xs text-neutral-600">Email: {ticket.customer_accounts.email}</div>
                )}
                <div className="pt-2">
                  <Link
                    to={`/operations/customers/${ticket.customer_accounts.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    View Account Hierarchy <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No customer linked</p>
            )}
          </Card>

          {/* Service Location / Site Info */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-neutral-500" /> Service Location
            </h3>

            {ticket.customer_sites ? (
              <div className="space-y-1.5 text-sm">
                <div className="font-semibold text-neutral-900">{ticket.customer_sites.name}</div>
                <div className="text-xs text-neutral-600">{ticket.customer_sites.address_line_1}</div>
                <div className="text-xs text-neutral-500">{ticket.customer_sites.city}</div>
                {ticket.customer_sites.latitude && ticket.customer_sites.longitude && (
                  <div className="text-[11px] font-mono text-neutral-400 pt-1">
                    GPS: {ticket.customer_sites.latitude.toFixed(5)}, {ticket.customer_sites.longitude.toFixed(5)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No specific site assigned</p>
            )}
          </Card>

          {/* Fleet / Asset Info */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-neutral-500" /> Serviced Asset
            </h3>

            {ticket.assets ? (
              <div className="space-y-2 text-sm">
                <div className="font-bold text-neutral-900">{ticket.assets.name}</div>
                <div className="text-xs text-neutral-600">
                  {ticket.assets.make} {ticket.assets.model}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-2.5 rounded border border-neutral-100">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase">Asset Tag</span>
                    <span className="font-mono font-semibold text-neutral-800">{ticket.assets.asset_tag}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase">Fleet #</span>
                    <span className="font-medium text-neutral-800">{ticket.assets.fleet_number || "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-neutral-400 block text-[10px] uppercase">VIN</span>
                    <span className="font-mono text-neutral-700 truncate block">{ticket.assets.vin || "—"}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <Link
                    to={`/operations/assets/${ticket.assets.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    View Asset & History <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">General Request (No specific asset)</p>
            )}
          </Card>

          {/* Assigned Technician Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-neutral-500" /> Assigned Technician
              </h3>
              <button
                onClick={() => {
                  setIsAssignModalOpen(true);
                  loadTechnicianRecommendations();
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                {ticket.assigned_to || ticket.assignedTechnician ? "Change / Reassign" : "Assign Technician"}
              </button>
            </div>

            <div className="text-sm">
              {ticket.assignedTechnician ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shadow-xs border border-blue-200">
                        {ticket.assignedTechnician.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-neutral-900">
                            {ticket.assignedTechnician.full_name}
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            ★ {Number(ticket.assignedTechnician.avg_rating || 5.0).toFixed(1)}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          {ticket.assignedTechnician.phone || ticket.assignedTechnician.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {ticket.activeWorkOrder && (
                    <div className="rounded-lg bg-blue-50/70 p-2.5 text-xs border border-blue-100 space-y-1">
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-blue-700">
                        <span>{ticket.activeWorkOrder.work_order_number}</span>
                        <span className="uppercase text-[10px] bg-blue-200/60 px-1.5 py-0.5 rounded text-blue-900 font-sans">
                          {ticket.activeWorkOrder.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-600 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-neutral-400" />
                        Scheduled: {ticket.activeWorkOrder.scheduled_date} (
                        {ticket.activeWorkOrder.scheduled_window_start?.slice(0, 5)} -{" "}
                        {ticket.activeWorkOrder.scheduled_window_end?.slice(0, 5)})
                      </div>
                    </div>
                  )}

                  {ticket.assignedTechnician.skills && ticket.assignedTechnician.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {ticket.assignedTechnician.skills.map((s: any, idx: number) => (
                        <span
                          key={idx}
                          className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600"
                        >
                          {s.skill_name || s.skill_code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : ticket.assigned_to ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs">
                      T
                    </div>
                    <div>
                      <span className="font-mono text-xs text-neutral-800">{ticket.assigned_to}</span>
                      <p className="text-[11px] text-neutral-400">Assigned Technician</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 bg-amber-50/60 rounded-lg border border-dashed border-amber-200">
                  <UserCheck className="h-6 w-6 text-amber-500 mx-auto mb-1 opacity-70" />
                  <p className="text-xs font-semibold text-amber-900">No Technician Assigned</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Ticket is ready for smart dispatch recommendation.
                  </p>
                  <button
                    onClick={() => {
                      setIsAssignModalOpen(true);
                      loadTechnicianRecommendations();
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    Assign Technician
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Linked Complaints Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-neutral-500" /> Linked Complaints
              </h3>
              <Link
                to={`/operations/complaints?ticketId=${ticket.id}`}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Manage
              </Link>
            </div>

            {ticket.complaints && ticket.complaints.length > 0 ? (
              <div className="space-y-2">
                {ticket.complaints.map((c) => (
                  <div key={c.id} className="rounded-lg border border-neutral-200 p-2.5 text-xs bg-neutral-50">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="font-mono text-blue-600">{c.complaint_number}</span>
                      <span className="capitalize text-neutral-500">{c.status}</span>
                    </div>
                    <div className="font-medium text-neutral-900 mt-1 line-clamp-1">{c.title}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No complaints logged for this ticket</p>
            )}
          </Card>
        </div>
      </div>

      {/* Mandatory Status Transition Reason Modal */}
      <Modal
        isOpen={Boolean(transitionTarget)}
        onClose={() => setTransitionTarget(null)}
        title={`Confirm Status Transition: ${transitionTarget?.replace(/_/g, " ").toUpperCase()}`}
        description="CareOS requires a mandatory transition reason for every status update to preserve an immutable audit trail."
        maxWidth="md"
      >
        <form onSubmit={handleStatusTransition} className="space-y-4">
          {transitionError && (
            <div className="rounded bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
              {transitionError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Transition Reason / Explanation <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              placeholder="e.g. Parts verified in warehouse; ready for technician assignment and dispatch..."
              className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setTransitionTarget(null)}
              className="rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTransitionSubmitting || !transitionReason.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isTransitionSubmitting ? "Updating Status..." : "Confirm Transition"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Smart Technician Assignment & Dispatch Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Field Technician Dispatch & Route Optimization"
        description="Select certified field technician, evaluate route proximity, and schedule work order."
        maxWidth="3xl"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {assignError && (
            <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{assignError}</span>
            </div>
          )}

          {/* Ticket Target Summary Banner */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/40 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-700">{ticket.ticket_number}</span>
                <span className="font-semibold text-neutral-900">{ticket.title}</span>
                <Badge variant={ticket.priority === "critical" ? "error" : ticket.priority === "high" ? "warning" : "neutral"}>
                  {ticket.priority.toUpperCase()}
                </Badge>
              </div>
              <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-600 border border-neutral-200 uppercase">
                {ticket.coverage_type}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-neutral-600">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                <span>Customer: <strong>{ticket.customer_accounts?.name || "Direct Fleet"}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                <span>Site: <strong>{ticket.customer_sites?.name || "Unspecified"}</strong> ({ticket.customer_sites?.city || "Local"})</span>
              </div>
              {ticket.assets && (
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Asset: <strong>{ticket.assets.fleet_number || ticket.assets.make}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Scheduling Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                Scheduled Service Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  loadTechnicianRecommendations(e.target.value);
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                Time Window
              </label>
              <select
                value={`${scheduledWindow.start}-${scheduledWindow.end}`}
                onChange={(e) => {
                  const [start, end] = e.target.value.split("-");
                  if (start && end) setScheduledWindow({ start, end });
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="09:00:00-12:00:00">Morning Shift (09:00 - 12:00)</option>
                <option value="13:00:00-17:00:00">Afternoon Shift (13:00 - 17:00)</option>
                <option value="17:00:00-21:00:00">Evening Shift (17:00 - 21:00)</option>
                <option value="08:00:00-20:00:00">All Day / Priority Window (08:00 - 20:00)</option>
              </select>
            </div>
          </div>

          {/* Search & Category Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  activeCategoryFilter === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                All Technicians ({recommendations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter("addon")}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  activeCategoryFilter === "addon"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
                }`}
              >
                <Zap className="h-3 w-3" />
                Smart Route Add-ons ({recommendations.filter((r) => r.isNearbyAddon).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter("available")}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  activeCategoryFilter === "available"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                Free & Ready ({recommendations.filter((r) => r.currentWorkload === 0 && r.isEligible).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter("nearby")}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  activeCategoryFilter === "nearby"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
                }`}
              >
                Nearby &lt;15 km ({recommendations.filter((r) => r.distanceKm !== null && r.distanceKm !== undefined && r.distanceKm <= 15).length})
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name or skill..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Technician Cards List */}
          <div className="space-y-2.5">
            {isRecsLoading ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-600 mb-2" />
                Evaluating technician certified skills, real-time GPS locations, active workloads, and route proximity...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
                No technician profiles registered for this tenant.
              </div>
            ) : (
              recommendations
                .filter((rec) => {
                  if (activeCategoryFilter === "addon" && !rec.isNearbyAddon) return false;
                  if (activeCategoryFilter === "available" && (rec.currentWorkload > 0 || !rec.isEligible)) return false;
                  if (activeCategoryFilter === "nearby" && (rec.distanceKm === null || rec.distanceKm === undefined || rec.distanceKm > 15)) return false;
                  if (searchFilter.trim()) {
                    const q = searchFilter.toLowerCase();
                    const matchesName = rec.fullName.toLowerCase().includes(q);
                    const matchesSkill = rec.skills.some((s) => s.skillName.toLowerCase().includes(q) || s.skillCode.toLowerCase().includes(q));
                    return matchesName || matchesSkill;
                  }
                  return true;
                })
                .map((rec) => {
                  const isSelected = selectedTechId === rec.technicianId;
                  return (
                    <div
                      key={rec.technicianId}
                      onClick={() => setSelectedTechId(rec.technicianId)}
                      className={`relative rounded-xl border p-3.5 cursor-pointer transition text-xs ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      {/* Top Row: Info, Avatar, Rating, Contact, Score */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isSelected ? "bg-blue-600 text-white border-blue-700" : "bg-neutral-100 text-neutral-700 border-neutral-200"
                          }`}>
                            {rec.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-neutral-900">{rec.fullName}</span>
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                ★ {rec.avgRating.toFixed(1)}
                              </span>
                              {rec.isNearbyAddon && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                                  <Zap className="h-2.5 w-2.5 fill-white" />
                                  ROUTE ADD-ON OPPORTUNITY
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-neutral-500 text-[11px] mt-0.5">
                              {rec.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-neutral-400" />
                                  {rec.phone}
                                </span>
                              )}
                              {rec.distanceKm !== null && rec.distanceKm !== undefined ? (
                                <span className="flex items-center gap-1 font-semibold text-neutral-700">
                                  <MapPin className="h-3 w-3 text-rose-500" />
                                  📍 {rec.distanceKm} km to site
                                </span>
                              ) : (
                                <span className="text-neutral-400">
                                  Territory: {rec.territories.join(", ") || "General"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Score */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            rec.currentWorkload === 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : rec.currentWorkload < rec.maxActiveWorkOrders
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              rec.currentWorkload === 0 ? "bg-emerald-500" : rec.currentWorkload < rec.maxActiveWorkOrders ? "bg-blue-500" : "bg-rose-500"
                            }`} />
                            {rec.currentWorkload === 0
                              ? "Available / Free"
                              : `Busy (${rec.currentWorkload}/${rec.maxActiveWorkOrders} tasks)`}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-neutral-700">
                            Match Score: <strong className="text-blue-600">{rec.totalScore}</strong>/100
                          </span>
                        </div>
                      </div>

                      {/* Smart Route Add-on Banner (If applicable) */}
                      {rec.isNearbyAddon && rec.nearbyAddonOpportunity && (
                        <div className="mt-2.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-2 text-xs text-amber-900 flex items-start gap-2">
                          <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[11px] uppercase tracking-wide text-amber-800">
                              Proximity Route Clustering Opportunity:
                            </span>
                            <p className="text-[11px] text-amber-950 mt-0.5">
                              {rec.nearbyAddonOpportunity.description}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Active Work Orders Breakdown (If busy) */}
                      {rec.activeWorkOrders && rec.activeWorkOrders.length > 0 && (
                        <div className="mt-2.5 rounded-lg bg-neutral-50/80 border border-neutral-200/80 p-2 text-[11px]">
                          <div className="font-semibold text-neutral-600 flex items-center gap-1 mb-1">
                            <Layers className="h-3 w-3 text-neutral-400" />
                            Ongoing Assigned Tasks ({rec.activeWorkOrders.length}):
                          </div>
                          <div className="space-y-1">
                            {rec.activeWorkOrders.map((wo) => (
                              <div key={wo.id} className="flex items-center justify-between text-neutral-700 pl-4 border-l-2 border-blue-300">
                                <span className="font-mono font-medium">{wo.workOrderNumber}</span>
                                <span>{wo.siteName || wo.siteCity || "Client Site"} {wo.distanceKm !== undefined ? `(${wo.distanceKm} km away)` : ""}</span>
                                <span className="capitalize px-1.5 py-0.2 rounded text-[10px] bg-neutral-200/70 text-neutral-700 font-sans">
                                  {wo.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certified Skills Badges */}
                      {rec.skills && rec.skills.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1">Certified Skills:</span>
                          {rec.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 border border-neutral-200"
                            >
                              {skill.skillName}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Score Breakdown Reasons */}
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-neutral-500">
                        {rec.reasons.slice(0, 3).map((r, idx) => (
                          <span key={idx} className="rounded bg-neutral-100/60 px-1.5 py-0.5 text-neutral-600">
                            • {r}
                          </span>
                        ))}
                      </div>

                      {/* Radio Selection Indicator */}
                      <div className="absolute top-3.5 right-3.5">
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300 bg-white"
                        }`}>
                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 mt-4">
          <div>
            {(ticket.assigned_to || ticket.assignedTechnician) && (
              <button
                type="button"
                onClick={handleUnassignTicket}
                disabled={isAssignSubmitting}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                Unassign Ticket
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="rounded-lg border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignTicket}
              disabled={isAssignSubmitting || !selectedTechId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {isAssignSubmitting ? "Dispatching..." : "Confirm Assignment & Schedule Work Order"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
