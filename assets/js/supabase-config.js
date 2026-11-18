/* Supabase connection. Fill in from Supabase → Project Settings → API.
   The anon (public) key is safe to ship in the browser: Row Level Security in supabase/schema.sql
   is what protects the data. NEVER put the service_role key in this file. */
window.NICER_SUPABASE = {
  url: "https://YOUR-PROJECT-REF.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY"
};
