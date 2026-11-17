import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@careos/supabase-client";
import type { CareOSAuthContext, CareOSMembership, CareOSUser } from "@careos/auth";
import {
  getSupabaseForPortal,
  detectPortalScope,
  setPortalScope,
  type PortalType,
} from "./supabase.js";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: CareOSUser | null;
  authContext: CareOSAuthContext | null;
  activeMembership: CareOSMembership | null;
  isPlatformAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  currentPortal: PortalType;
  setPortal: (portal: PortalType) => void;
  signIn: (email: string, password: string, targetPortal?: PortalType) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  switchTenant: (tenantId: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [portal, setPortalState] = useState<PortalType>(detectPortalScope());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authContext, setAuthContext] = useState<CareOSAuthContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setPortal = (newPortal: PortalType) => {
    setPortalScope(newPortal);
    setPortalState(newPortal);
  };

  // Keep portal synchronized with URL
  useEffect(() => {
    const handleUrlChange = () => {
      const detected = detectPortalScope();
      if (detected !== portal) {
        setPortalState(detected);
      }
    };

    window.addEventListener("popstate", handleUrlChange);
    // Periodically sync in case of client-side react-router transitions
    const interval = setInterval(handleUrlChange, 500);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      clearInterval(interval);
    };
  }, [portal]);

  // Fetch full application auth context from API or DB
  const fetchAuthContext = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setAuthContext(null);
      return;
    }

    try {
      let apiPayload: any = null;
      try {
        const response = await fetch("/api/v1/auth/me", {
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
        });

        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("application/json")) {
          apiPayload = await response.json();
        }
      } catch (netErr) {
        console.warn("API server unavailable for /auth/me, using direct Supabase queries", netErr);
      }

      if (apiPayload?.data) {
        setAuthContext(apiPayload.data);
      } else {
        const client = getSupabaseForPortal(portal);

        const { data: profile } = await client
          .from("profiles")
          .select("*")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        const { data: adminRecord } = await client
          .from("platform_admins")
          .select("id")
          .eq("user_id", currentSession.user.id)
          .maybeSingle();

        const { data: memberships } = await client
          .from("tenant_memberships")
          .select("*, tenants(id, name, slug)")
          .eq("user_id", currentSession.user.id)
          .eq("is_active", true);

        const memList: CareOSMembership[] = (memberships || []).map((m: any) => ({
          id: m.id,
          tenantId: m.tenant_id,
          tenantSlug: m.tenants?.slug || "",
          tenantName: m.tenants?.name || "",
          portal: m.portal,
          departmentId: m.department_id,
          isActive: m.is_active,
          roles: [],
          permissions: [],
        }));

        setAuthContext({
          user: {
            id: currentSession.user.id,
            email: currentSession.user.email || "",
            fullName: profile?.full_name || currentSession.user.email || "CareOS User",
            avatarUrl: profile?.avatar_url,
            preferredLanguage: profile?.preferred_language || "en",
          },
          memberships: memList,
          activeMembership: memList[0] || null,
          activeTenantId: memList[0]?.tenantId || null,
          isPlatformAdmin: Boolean(adminRecord),
        });
      }
    } catch (err: any) {
      console.error("Failed to load user auth context", err);
      setError(err.message || "Failed to load session details");
    }
  }, [portal]);

  // Portal-scoped session management
  useEffect(() => {
    const client = getSupabaseForPortal(portal);
    setIsLoading(true);

    client.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      void fetchAuthContext(initialSession).finally(() => setIsLoading(false));
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      await fetchAuthContext(newSession);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [portal, fetchAuthContext]);

  const signIn = async (email: string, password: string, targetPortal?: PortalType) => {
    setError(null);
    const activePortal = targetPortal || portal;
    setPortal(activePortal);
    const client = getSupabaseForPortal(activePortal);

    const { data, error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return { error: signInError.message };
    }

    setSession(data.session);
    setUser(data.user);
    await fetchAuthContext(data.session);
    return {};
  };

  const signOut = async () => {
    const client = getSupabaseForPortal(portal);
    await client.auth.signOut();
    setSession(null);
    setUser(null);
    setAuthContext(null);
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    const client = getSupabaseForPortal(portal);
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (resetError) {
      setError(resetError.message);
      return { error: resetError.message };
    }
    return {};
  };

  const updatePassword = async (password: string) => {
    setError(null);
    const client = getSupabaseForPortal(portal);
    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      return { error: updateError.message };
    }
    return {};
  };

  const switchTenant = async (tenantId: string) => {
    if (!session) return false;

    try {
      const response = await fetch("/api/v1/auth/switch-tenant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tenantId }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("application/json")) {
        const payload = await response.json();
        if (payload?.data) {
          setAuthContext(payload.data);
          return true;
        }
      }
    } catch {
      // Fallback local switch
    }

    if (authContext) {
      const targetMem = authContext.memberships.find(
        (m) => m.tenantId === tenantId && m.isActive
      );
      if (targetMem) {
        setAuthContext({
          ...authContext,
          activeTenantId: tenantId,
          activeMembership: targetMem,
        });
        return true;
      }
    }

    return false;
  };

  const refreshSession = async () => {
    const client = getSupabaseForPortal(portal);
    const {
      data: { session: refreshed },
    } = await client.auth.getSession();
    setSession(refreshed);
    setUser(refreshed?.user ?? null);
    await fetchAuthContext(refreshed);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile: authContext?.user ?? null,
        authContext,
        activeMembership: authContext?.activeMembership ?? null,
        isPlatformAdmin: Boolean(authContext?.isPlatformAdmin),
        isLoading,
        error,
        currentPortal: portal,
        setPortal,
        signIn,
        signOut,
        sendPasswordReset,
        updatePassword,
        switchTenant,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
