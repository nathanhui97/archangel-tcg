-- Optional human-readable city label for display (e.g. "Toronto, Ontario").
-- Derived on-device by reverse-geocoding the GPS fix; the stored lat/lng remain
-- rounded for privacy. Not exposed via public_profiles — for the user's own view.

alter table public.profiles add column if not exists city text;
