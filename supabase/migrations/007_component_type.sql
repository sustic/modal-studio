alter table modal_map_components
  add column if not exists component_type text not null default 'passive'
    check (component_type in ('passive', 'active'));

alter table project_components
  add column if not exists component_type text not null default 'passive'
    check (component_type in ('passive', 'active'));
