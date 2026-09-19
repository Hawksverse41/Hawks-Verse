# HAWKS VERSE Connected Prototype

This version is connected to the HAWKS VERSE Supabase project using the browser-safe Publishable key.

Included:
- Live tournament fetch from Supabase
- Real registration submission through the `create_registration` RPC
- Real registration status lookup
- Supplied Weekly Wars posters
- Responsive esports UI

Important:
- The Publishable key is designed for browser use; database access is protected by RLS and RPC functions.
- Never put a Supabase secret/service-role key in frontend files.
- Hosting is still required before this becomes publicly accessible.
- Admin dashboard/authentication and participant edit flow are the next production modules.
