import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "user" | "creator" | "admin";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    let sessionLoaded = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (sessionLoaded) setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      sessionLoaded = true;
      setLoading(false);
    }).catch((error) => {
      console.error("Session loading failed:", error);
      sessionLoaded = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }

    let cancelled = false;

    const loadRoles = async () => {
      setRolesLoading(true);

      const pendingRole = localStorage.getItem("reseepe_pending_google_role") as AppRole | null;
      const pendingUsername = localStorage.getItem("reseepe_pending_google_username");

      if (pendingRole) {
        try {
          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              role: pendingRole,
              ...(pendingUsername ? { username: pendingUsername } : {}),
            },
          });
          if (metadataError) throw metadataError;

          const { error: syncError } = await supabase.rpc("sync_google_user_state", {
            requested_role: pendingRole,
            requested_username: pendingUsername,
          });
          if (syncError) throw syncError;

          localStorage.removeItem("reseepe_pending_google_role");
          localStorage.removeItem("reseepe_pending_google_username");
        } catch (error) {
          console.error("Google user sync failed:", error);
        }
      }

      const [{ data, error }, { data: profile }] = await Promise.all([
        supabase.from("user_roles" as any).select("role")
          .eq("user_id", user.id),
        supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);

      if (error) {
        console.error("Role loading failed:", error);
      } else if (!cancelled) {
        const loadedRoles = ((data as any[]) || []).map((roleRow) => roleRow.role as AppRole);
        const profileRole = (profile as { role?: string | null } | null)?.role;
        if (profileRole === "creator" || profileRole === "admin") loadedRoles.push(profileRole);
        if (loadedRoles.length === 0 && (user.user_metadata?.role === "creator" || user.user_metadata?.role === "admin")) {
          loadedRoles.push(user.user_metadata.role as AppRole);
        }
        setRoles(Array.from(new Set(loadedRoles)));
      }

      if (!cancelled) setRolesLoading(false);
    };

    void loadRoles();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: "user" | "creator",
    username?: string,
  ) => {
    const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, "");
    const redirectUrl = `${appUrl}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName, role, username },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    if (data.user) {
      setUser(data.user);
      return data.user;
    }
    return null;
  };

  const isCreator = roles.includes("creator") || roles.includes("admin");

  return { user, session, loading, roles, rolesLoading, isCreator, signUp, signIn, signOut, getCurrentUser };
};
