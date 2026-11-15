import { createBrowserClient, type SupabaseClient } from "@careos/supabase-client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vbckrirksziluvwqpamx.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

export type PortalType = "admin" | "operations" | "technician" | "customer";

export function detectPortalScope(): PortalType {
  if (typeof window === "undefined") return "operations";

  const path = window.location.pathname.toLowerCase();
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/operations")) return "operations";
  if (path.startsWith("/technician")) return "technician";
  if (path.startsWith("/customer")) return "customer";

  const search = new URLSearchParams(window.location.search);
  const portalParam = search.get("portal")?.toLowerCase() as PortalType | null;
  if (portalParam && ["admin", "operations", "technician", "customer"].includes(portalParam)) {
    return portalParam;
  }

  const stored = window.sessionStorage?.getItem("careos_active_portal") as PortalType | null;
  if (stored && ["admin", "operations", "technician", "customer"].includes(stored)) {
    return stored;
  }

  return "operations";
}

export function setPortalScope(portal: PortalType): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("careos_active_portal", portal);
  }
}

const clientCache = new Map<string, SupabaseClient>();

export function getSupabaseForPortal(portal?: string): SupabaseClient {
  const scope = (portal || detectPortalScope()).toLowerCase();
  if (!clientCache.has(scope)) {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      storageKey: `careos-auth-${scope}`,
    });
    clientCache.set(scope, client);
  }
  return clientCache.get(scope)!;
}

// Scoped client for the active portal in this tab
export const supabase = getSupabaseForPortal();
