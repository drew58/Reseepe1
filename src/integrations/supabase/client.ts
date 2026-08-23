import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** Project ref taken from the backend URL, e.g. https://<ref>.supabase.co */
const urlRef = SUPABASE_URL?.match(/https?:\/\/([^.]+)\./)?.[1];

/** Reads the project ref out of a legacy JWT-style anon key (new sb_publishable_ keys have none). */
function keyRef(key?: string): string | null {
  if (!key) return null;
  const parts = key.split(".");
  if (parts.length !== 3) return null; // not a JWT (e.g. sb_publishable_...) -> can't verify
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))?.ref ?? null;
  } catch {
    return null;
  }
}

/**
 * Candidate keys in priority order. Drop in your own anon / publishable key via
 * either env var — whichever one actually belongs to VITE_SUPABASE_URL wins.
 */
const candidates = [
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
].filter(Boolean) as string[];

const SUPABASE_ANON_KEY =
  candidates.find((k) => {
    const ref = keyRef(k);
    return ref === null || ref === urlRef; // unverifiable keys are accepted as-is
  }) ?? candidates[0];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing backend env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file."
  );
}

if (import.meta.env.DEV) {
  const chosenRef = keyRef(SUPABASE_ANON_KEY);
  if (chosenRef && urlRef && chosenRef !== urlRef) {
    console.error(
      `[supabase] Key/URL mismatch: key belongs to project "${chosenRef}" but URL points to "${urlRef}". Update your .env key.`
    );
  }
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});