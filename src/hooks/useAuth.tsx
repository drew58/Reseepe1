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

  // Load roles when user changes
  useEffect(() => {
    if (!user) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setRoles(((data as any[]) || []).map((r) => r.role as AppRole));
        setRolesLoading(false);
      });
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
