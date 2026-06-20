begin;

create or replace function public.ff_keep_saved_staff_names()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(old.promoter_name, '')), '') is not null
    and new.promoter_name is distinct from old.promoter_name then
    new.promoter_name := old.promoter_name;
  end if;

  if nullif(btrim(coalesce(old.gift_staff_name, '')), '') is not null
    and new.gift_staff_name is distinct from old.gift_staff_name then
    new.gift_staff_name := old.gift_staff_name;
  end if;

  return new;
end;
$$;

drop trigger if exists review_event_participants_keep_saved_staff_names
on public.review_event_participants;

create trigger review_event_participants_keep_saved_staff_names
before update of promoter_name, gift_staff_name
on public.review_event_participants
for each row
execute function public.ff_keep_saved_staff_names();

commit;
