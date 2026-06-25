// Bindar landing — public Supabase config.
//
// SAFE TO COMMIT / SHIP IN CLIENT CODE. The anon/publishable key is designed to
// be public; the waitlist table has Row-Level Security with NO direct access —
// all writes go through the SECURITY DEFINER RPCs in
// supabase/migrations/0009_waitlist.sql. The key cannot read the email list.
//
// To point at a different project, replace these two values.
export const SUPABASE_URL = 'https://xlytsgrrncoxitufmfqj.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_ePztR4lcgVj9IzbYMNioHA_UAu9vWY0'
