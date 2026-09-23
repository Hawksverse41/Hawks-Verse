create extension if not exists pgcrypto;
create table if not exists public.tournaments(id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null,season text,prize_pool numeric default 0,status text default 'upcoming',registration_open_at timestamptz,registration_close_at timestamptz,max_squads int,is_published boolean default false,poster_url text,short_rules text,created_at timestamptz default now());
create table if not exists public.registrations(id uuid primary key default gen_random_uuid(),registration_id text unique,tournament_id uuid references public.tournaments(id),team_name text not null,team_logo_url text,igl_name text not null,igl_uid text not null,igl_mobile text not null,player2_name text not null,player2_uid text not null,player3_name text not null,player3_uid text not null,player4_name text not null,player4_uid text not null,status text default 'registered',admin_note text,created_at timestamptz default now(),updated_at timestamptz default now());
alter table public.tournaments enable row level security; alter table public.registrations enable row level security;
drop policy if exists "published tournaments" on public.tournaments;
create policy "published tournaments" on public.tournaments for select to anon,authenticated using(is_published=true);
grant select on public.tournaments to anon,authenticated;
create or replace function public.create_registration(p_tournament_id uuid,p_team_name text,p_team_logo_url text,p_igl_name text,p_igl_uid text,p_igl_mobile text,p_player2_name text,p_player2_uid text,p_player3_name text,p_player3_uid text,p_player4_name text,p_player4_uid text) returns json language plpgsql security definer set search_path=public as $$
declare new_id text; n int; new_row public.registrations;
begin
if not exists(select 1 from tournaments where id=p_tournament_id and is_published and status in('upcoming','ongoing')) then raise exception 'Registration closed'; end if;
if exists(select 1 from registrations where tournament_id=p_tournament_id and lower(team_name)=lower(trim(p_team_name)) and status<>'rejected') then raise exception 'Team/Squad name already exists'; end if;
select count(*)+1 into n from registrations where tournament_id=p_tournament_id;
new_id:='HV-FM-'||lpad(n::text,3,'0');
insert into registrations(registration_id,tournament_id,team_name,team_logo_url,igl_name,igl_uid,igl_mobile,player2_name,player2_uid,player3_name,player3_uid,player4_name,player4_uid) values(new_id,p_tournament_id,trim(p_team_name),nullif(trim(p_team_logo_url),''),trim(p_igl_name),trim(p_igl_uid),trim(p_igl_mobile),trim(p_player2_name),trim(p_player2_uid),trim(p_player3_name),trim(p_player3_uid),trim(p_player4_name),trim(p_player4_uid));
return json_build_object('registration_id',new_id); end $$;
create or replace function public.check_registration(p_registration_id text) returns table(registration_id text,team_name text,status text) language sql security definer set search_path=public as $$ select r.registration_id,r.team_name,r.status from registrations r where upper(r.registration_id)=upper(trim(p_registration_id)) limit 1 $$;
grant execute on function public.create_registration(uuid,text,text,text,text,text,text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.check_registration(text) to anon,authenticated;
insert into tournaments(slug,name,season,prize_pool,status,max_squads,is_published,short_rules) values('weekly-wars-s2','HAWKS VERSE WEEKLY WARS','S2',2000,'ongoing',48,true,'Free entry. Squad of 4 compulsory.') on conflict(slug) do update set is_published=true,status='ongoing';
