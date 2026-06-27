-- Self-service account deletion (required by Apple App Store guideline 5.1.1(v)).
--
-- A security-definer RPC that lets a signed-in user delete THEIR OWN auth user.
-- FK on-delete-cascade then wipes everything they own:
--   auth.users → profiles → binders → binder_items
--                         → wantlist_items
--                         → trades → messages, trade_proposals → items
--                         → push_tokens
-- It can only ever delete the caller (auth.uid()), never anyone else.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
