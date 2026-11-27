create function private.imported_resident_room_type(p_tenant uuid, p_resident uuid)
returns text language sql stable security definer set search_path = '' as $$
 with resident as (
  select * from public.residents where tenant_id=p_tenant and id=p_resident
 ), latest as (
  select source_sha from public.student_house_excel_imports
  where tenant_id=p_tenant order by imported_at desc, sheet_order limit 1
 ), matching as (
  select s.sheet_order, r.obj->>0 as row_number, cells.values, cells.edited
  from resident p
  join public.student_house_excel_imports s on s.tenant_id=p.tenant_id
  join latest l on l.source_sha=s.source_sha
  cross join lateral jsonb_array_elements((s.payload::jsonb)->'rows') with ordinality r(obj, position)
  cross join lateral (
   select jsonb_object_agg(lower(btrim(h.label)),v.resolved) as values,
     bool_or(e.column_number is not null and lower(btrim(h.label)) in ('typ izby','typ')
       and nullif(v.resolved,'') is not null) as edited
   from jsonb_array_elements_text((s.payload::jsonb)->'rows'->0->1) with ordinality h(label,pos)
   left join public.student_house_excel_import_edits e
    on e.tenant_id=s.tenant_id and e.source_sha=s.source_sha and e.sheet_order=s.sheet_order
    and e.row_number=(r.obj->>0)::integer and e.column_number=h.pos
   cross join lateral (select btrim(case when e.column_number is not null then to_jsonb(e.value)#>>'{}'
     else r.obj->1->>(h.pos::integer-1) end) as resolved) v
   where lower(btrim(h.label)) in ('email','e-mail','od','izba','meno','priezvisko','typ izby','typ')
  ) cells
  where r.position>1 and nullif(btrim(p.email),'') is not null
  and lower(coalesce(cells.values->>'email',cells.values->>'e-mail'))=lower(btrim(p.email))
  and cells.values->>'od'=p.accommodation_from::text
  and lower(regexp_replace(cells.values->>'izba','[[:space:]]+','','g'))=
      lower(regexp_replace(p.verified_room_number,'[[:space:]]+','','g'))
  and lower(regexp_replace(concat_ws(' ',cells.values->>'meno',cells.values->>'priezvisko'),'[[:space:]]+',' ','g'))=
      lower(regexp_replace(btrim(p.full_name),'[[:space:]]+',' ','g'))
 ), categories as (
  select *, coalesce(nullif(values->>'typ izby',''),nullif(values->>'typ','')) as category,
   count(*) over (partition by sheet_order) as matches from matching
 )
 select category from categories where matches=1 and category is not null
 order by edited desc nulls last, sheet_order desc limit 1;
$$;
revoke all on function private.imported_resident_room_type(uuid,uuid) from public, anon, authenticated;

create function public.resident_imported_room_type(p_tenant uuid, p_resident uuid)
returns text language sql stable security definer set search_path = '' as $$
 select case when private.own_resident(p_tenant,p_resident)
 or private.has_role(p_tenant,array['org_admin','reception']::public.member_role[])
 then private.imported_resident_room_type(p_tenant,p_resident) end;
$$;
revoke all on function public.resident_imported_room_type(uuid,uuid) from public, anon;
grant execute on function public.resident_imported_room_type(uuid,uuid) to authenticated;
