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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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

          const { error: profileError } = await supabase.from("profiles").upsert(
            {
              user_id: user.id,
              display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
              username: pendingUsername ?? user.user_metadata?.username ?? null,
              role: pendingRole,
            },
            { onConflict: "user_id" },
          );
          if (profileError) throw profileError;

          const { error: roleError } = await supabase.from("user_roles").upsert(
            { user_id: user.id, role: pendingRole },
            { onConflict: "user_id,role" },
          );
          if (roleError) throw roleError;

          localStorage.removeItem("reseepe_pending_google_role");
          localStorage.removeItem("reseepe_pending_google_username");
        } catch (error) {
          console.error("Google user sync failed:", error);
        }
      }

      const { data, error } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", user.id);

      if (error) {
        console.error("Role loading failed:", error);
      } else if (!cancelled) {
        setRoles(((data as any[]) || []).map((roleRow) => roleRow.role as AppRole));
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
    const redirectUrl = `${window.location.origin}/home`;
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

  const isCreator = roles.includes("creator") || roles.includes("admin");

  return { user, session, loading, roles, rolesLoading, isCreator, signUp, signIn, signOut };
};
