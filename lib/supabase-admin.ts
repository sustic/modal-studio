import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key — bypasses RLS.
// Never import this in client components or expose to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
