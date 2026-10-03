/* Bhoomi Infratech — site configuration (public-safe by design).
   Both keys below are PUBLIC keys, safe to expose in the browser:
   the Supabase anon key is locked down by database row-level security,
   and the Turnstile site key is domain-bound (its secret lives only in
   the Supabase dashboard). Never put any secret/service-role key here. */
window.SITE_CONFIG = {
  supabaseUrl: 'https://ellxzaaorbfkactqmljo.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbHh6YWFvcmJma2FjdHFtbGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTYyODIsImV4cCI6MjEwNjQ5MjI4Mn0.xJAZa73xzBN0NMRoe6q8LnwgwFABNITbHcxH6Zq5-ms',
  captchaSiteKey: '0x4AAAAAAFMn4LNm6RF2BO1i'
};
