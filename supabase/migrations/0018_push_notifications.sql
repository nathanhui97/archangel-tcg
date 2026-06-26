-- Milestone 7: push notifications.
--
-- Stores each user's Expo push tokens and fires pushes straight from Postgres
-- triggers via pg_net (POST to Expo's push API) — no Edge Function needed.

create extension if not exists pg_net;

-- ── push_tokens ──
create table if not exists public.push_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens: manage own" on public.push_tokens;
create policy "push_tokens: manage own"
  on public.push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── helper: push to every device a user has registered ──
create or replace function public.send_push(p_user uuid, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tok record;
begin
  for tok in select token from public.push_tokens where user_id = p_user loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object(
        'to', tok.token,
        'title', p_title,
        'body', p_body,
        'sound', 'default',
        'data', coalesce(p_data, '{}'::jsonb)
      )
    );
  end loop;
end;
$$;

-- ── notify the other participant on a new message / proposal / inquiry ──
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  sender_handle text;
  body_text text;
begin
  select case when t.requester_id = new.sender_id then t.recipient_id else t.requester_id end
    into recipient
  from public.trades t where t.id = new.trade_id;

  if recipient is null then return new; end if;

  select handle into sender_handle from public.profiles where id = new.sender_id;

  body_text := case
    when new.kind = 'proposal' then 'Sent you a trade proposal'
    when new.kind = 'inquiry'  then 'Is interested in one of your cards'
    else left(new.body, 120)
  end;

  perform public.send_push(
    recipient,
    '@' || coalesce(sender_handle, 'someone'),
    body_text,
    jsonb_build_object('tradeId', new.trade_id)
  );
  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ── notify the proposer when their proposal is accepted / declined ──
create or replace function public.notify_proposal_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  responder uuid;
  responder_handle text;
begin
  if new.status not in ('accepted', 'declined') or old.status <> 'pending' then
    return new;
  end if;

  select case when t.requester_id = new.proposer_id then t.recipient_id else t.requester_id end
    into responder
  from public.trades t where t.id = new.trade_id;

  select handle into responder_handle from public.profiles where id = responder;

  perform public.send_push(
    new.proposer_id,
    '@' || coalesce(responder_handle, 'someone'),
    case when new.status = 'accepted' then 'Accepted your proposal 🎉' else 'Declined your proposal' end,
    jsonb_build_object('tradeId', new.trade_id)
  );
  return new;
end;
$$;

drop trigger if exists proposals_notify_response on public.trade_proposals;
create trigger proposals_notify_response
  after update on public.trade_proposals
  for each row execute function public.notify_proposal_response();
