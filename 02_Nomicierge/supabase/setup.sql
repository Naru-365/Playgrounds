-- =====================================================================
-- Nomicierge セットアップ SQL
-- Supabase ダッシュボード → SQL Editor に全文貼り付けて実行してください。
-- 実行結果の最後に event_id と organizer_token が表示されるので控えること。
-- =====================================================================

-- イベント(飲み会)本体
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_info text,
  status text not null default 'collecting'
    check (status in ('collecting', 'review', 'voting', 'decided')),
  decided_candidate_id uuid,
  created_at timestamptz not null default now()
);

-- 幹事トークン。anon 用のポリシーを一切付けない = REST API からは見えない。
-- Edge Function(service role)だけが照合に使う。
create table organizer_secrets (
  event_id uuid primary key references events(id),
  token text not null
);

-- S-02 の回答(予算を除く)。名前で upsert する。
create table responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  participant_name text not null,
  from_type text,
  station text,
  genres jsonb not null default '[]',
  any_genre boolean not null default false,
  mood text,
  mood_note text,
  smoke text,
  updated_at timestamptz not null default now(),
  unique (event_id, participant_name)
);

-- 予算だけ別テーブル。名前も responses への参照も持たない = 匿名性の担保。
-- client_key は端末 localStorage の乱数で、同じ端末からの再回答の上書きにだけ使う。
-- created_at を持たせない(挿入タイミングとの相関を減らす)。
create table budget_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  budget text not null,
  client_key uuid not null,
  unique (event_id, client_key)
);

-- AI が提案した候補店(幹事が編集可)
create table candidates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  position int not null,
  name text not null,
  genre text,
  area text,
  budget_range text,
  smoke text,
  url text,
  reason text,
  edited_by_organizer boolean not null default false,
  unique (event_id, position)
);

-- 記名投票。1人1票、選び直しは upsert。
create table votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id),
  candidate_id uuid not null references candidates(id),
  voter_name text not null,
  updated_at timestamptz not null default now(),
  unique (event_id, voter_name)
);

-- =====================================================================
-- RLS: anon key を公開 HTML に埋める前提の最低限の制限。
-- delete は誰にも許可しない。candidates の insert は service role のみ。
-- =====================================================================

alter table events enable row level security;
alter table organizer_secrets enable row level security;
alter table responses enable row level security;
alter table budget_votes enable row level security;
alter table candidates enable row level security;
alter table votes enable row level security;

-- events: 読み取りと、status / decided_candidate_id の更新(幹事画面が直接叩く)
create policy events_select on events for select to anon using (true);
create policy events_update on events for update to anon using (true) with check (true);

-- organizer_secrets: ポリシーなし = anon から不可視

-- responses / budget_votes / votes: select + upsert(insert & update)
create policy responses_select on responses for select to anon using (true);
create policy responses_insert on responses for insert to anon with check (true);
create policy responses_update on responses for update to anon using (true) with check (true);

create policy budget_votes_select on budget_votes for select to anon using (true);
create policy budget_votes_insert on budget_votes for insert to anon with check (true);
create policy budget_votes_update on budget_votes for update to anon using (true) with check (true);

create policy votes_select on votes for select to anon using (true);
create policy votes_insert on votes for insert to anon with check (true);
create policy votes_update on votes for update to anon using (true) with check (true);

-- candidates: 読み取りと更新(幹事のインライン編集)。insert/delete は Edge Function のみ。
create policy candidates_select on candidates for select to anon using (true);
create policy candidates_update on candidates for update to anon using (true) with check (true);

-- =====================================================================
-- シードデータ: イベント1件 + 幹事トークン
-- =====================================================================

with new_event as (
  insert into events (name, event_info)
  values ('7月度 チーム懇親会', '7/24(金) 19:00〜 ・ 6名')
  returning id
), new_secret as (
  insert into organizer_secrets (event_id, token)
  select id, replace(gen_random_uuid()::text, '-', '') from new_event
  returning event_id, token
)
select
  event_id  as "★ EVENT_ID (js/config.js に貼る)",
  token     as "★ ORGANIZER_TOKEN (幹事URLの ?key= に使う)"
from new_secret;
