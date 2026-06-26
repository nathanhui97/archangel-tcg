-- Milestone 4 follow-up: manual card ordering within a binder.
--
-- binder_items previously had no explicit order — they were sorted by created_at.
-- This adds a `position` column so users can drag-reorder cards in their binders.
-- Lower position = earlier in the grid.

alter table public.binder_items
  add column if not exists position int not null default 0;

-- Backfill existing rows by created_at, but only on first run: if any binder
-- already has manual ordering (a non-zero position), leave everything alone so
-- re-running this migration never clobbers a user's arrangement.
do $$
begin
  if not exists (select 1 from public.binder_items where position <> 0) then
    with ordered as (
      select id,
             row_number() over (partition by binder_id order by created_at) - 1 as rn
      from public.binder_items
    )
    update public.binder_items bi
    set position = ordered.rn
    from ordered
    where ordered.id = bi.id;
  end if;
end $$;

create index if not exists binder_items_binder_position_idx
  on public.binder_items (binder_id, position);
