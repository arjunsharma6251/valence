-- Study groups never worked: the "members see membership" policy queried its
-- own table, so every read of study_group_members (and of study_groups, whose
-- policy reads it) failed with 42P17 "infinite recursion detected in policy".
-- Membership checks now go through a security-definer function, which reads
-- the table without re-entering its policies.

create or replace function is_group_member(p_group uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from study_group_members where group_id = p_group and user_id = auth.uid());
$$;

drop policy if exists "groups readable by members" on study_groups;
create policy "groups readable by members" on study_groups for select using (is_group_member(id));

drop policy if exists "members see membership" on study_group_members;
create policy "members see membership" on study_group_members for select using (is_group_member(group_id));

-- Create a group and add its creator in one transaction. The creator can't do
-- this with a plain insert: until they are a member, the select policy hides
-- the new row, so INSERT ... RETURNING is denied.
create or replace function create_group(p_code text, p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into study_groups(code, name, created_by) values (p_code, p_name, auth.uid()) returning id into gid;
  insert into study_group_members(group_id, user_id, display_name) values (gid, auth.uid(), p_display_name);
  return gid;
end $$;
revoke execute on function create_group(text, text, text) from public, anon;
grant execute on function create_group(text, text, text) to authenticated;
