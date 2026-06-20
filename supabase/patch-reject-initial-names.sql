begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'review_event_participants_customer_name_real_name_ck'
  ) then
    alter table public.review_event_participants
    add constraint review_event_participants_customer_name_real_name_ck
    check (
      char_length(btrim(customer_name)) >= 2
      and customer_name !~ '[ㄱ-ㅎㅏ-ㅣ]'
    ) not valid;
  end if;
end
$$;

commit;
