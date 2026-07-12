# Nomicierge — Supabase セットアップ手順

条件収集 → AI 候補提案 → 記名投票 → 決定 のフローを動かすためのセットアップです。
作業はコピペ4回 + トグル1回。所要 10 分ほど。

## 1. Supabase プロジェクトを作る

1. https://supabase.com にログイン(無料プランで OK)
2. **New project** → リージョンは **Northeast Asia (Tokyo)** を選択して作成

## 2. テーブルを作る

1. ダッシュボード左メニュー → **SQL Editor**
2. このフォルダの [`setup.sql`](./setup.sql) を全文貼り付けて **Run**
3. 実行結果に表示される **EVENT_ID** と **ORGANIZER_TOKEN** を控える

> **既にセットアップ済みのプロジェクトを更新する場合**
> `setup.sql` を作り直さず、[`migration_002_event_create.sql`](./migration_002_event_create.sql)
> を SQL Editor に貼り付けて **Run** してください。`events` テーブルに
> `event_date` / `expected_count` の2列を追加します(冪等・二重実行しても安全)。
> 新規に `setup.sql` を実行した場合はこの2列が既に入っているので不要です。

## 3. フロントに接続情報を貼る

1. ダッシュボード → **Settings → API** を開く
2. `../js/config.js` の3定数を書き換える:

```js
const NOMI_CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',   // Project URL
  SUPABASE_ANON_KEY: 'eyJ...',                // anon (public) key
  EVENT_ID: '....-....-....',                 // 手順2で控えた EVENT_ID
};
```

anon key は「公開してよい」キーです(アクセス制限は RLS 側で行っています)。

## 4. Edge Function をデプロイする

1. ダッシュボード → **Edge Functions** → **Deploy a new function** → 名前は `suggest-candidates`
2. エディタに [`functions/suggest-candidates/index.ts`](./functions/suggest-candidates/index.ts) の中身を貼り付け
3. **「Verify JWT」を必ずオフ**にしてデプロイ(認可は幹事トークンで自前チェックしています)

CLI 派の場合:

```sh
supabase functions deploy suggest-candidates --no-verify-jwt
```

### create-event 関数(イベント作成用)

`create.html` からイベントを新規作成するための関数です。同じ要領でもう1つデプロイします。

1. ダッシュボード → **Edge Functions** → **Deploy a new function** → 名前は `create-event`
2. エディタに [`functions/create-event/index.ts`](./functions/create-event/index.ts) の中身を貼り付け
3. **「Verify JWT」を必ずオフ**にしてデプロイ

```sh
supabase functions deploy create-event --no-verify-jwt
```

この関数は `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`(どちらも Supabase が自動注入)
だけで動きます。**`ANTHROPIC_API_KEY` は不要**です(LLM 呼び出しはありません)。

`create.html` を使わず setup.sql のシードイベント1件だけで運用する場合は、
この関数のデプロイは不要です。

## 5. ANTHROPIC_API_KEY を登録する

1. https://console.anthropic.com → API Keys でキーを発行
2. ダッシュボード → **Edge Functions → Secrets** に `ANTHROPIC_API_KEY` として登録

候補生成1回あたり Claude Opus + Web 検索数回で数十円程度です。

## 6. URL を配る

| 誰に | URL |
|---|---|
| 参加者 | `.../02_Nomicierge/index.html`(条件入力 → 投票へ誘導されます) |
| 幹事(自分) | `.../02_Nomicierge/organizer.html?key=<ORGANIZER_TOKEN>` |

ローカル確認は `python3 -m http.server 8000 -d 02_Nomicierge` などで OK。
GitHub Pages / Vercel への公開設定は本リポジトリでは未構成です(必要になったら別途)。

## 7. マルチイベント運用(create.html で毎回作る)

飲み会ごとに `setup.sql` を叩き直す代わりに、`create.html` からイベントを
量産できます(手順4で `create-event` 関数をデプロイ済みであることが前提)。

1. ブラウザで `.../02_Nomicierge/create.html` を開く
2. 飲み会名・開催日・想定人数を入力して **作戦会議をスタート** を押す
3. 発行される **3つの URL** を用途ごとに配る

| 誰に | URL |
|---|---|
| 参加者 | `.../answer.html?event=<EVENT_ID>` |
| 参加者(投票) | `.../vote.html?event=<EVENT_ID>` |
| 幹事(自分) | `.../organizer.html?event=<EVENT_ID>&key=<ORGANIZER_TOKEN>` |

各画面は URL の `?event=<EVENT_ID>` を読み、**`js/config.js` の `EVENT_ID` より優先**します。
そのため手順3で `config.js` に `EVENT_ID` を貼らなくても、URL さえ配れば複数イベントを
並行して運用できます。`config.js` の `EVENT_ID` を使う既存の単一イベント運用も
そのまま有効です(`?event=` が付かない場合のフォールバックになります)。

幹事 URL の `?key=` は他人に配らないでください(この URL を持つ人だけが
AI 提案の実行・投票の締め切りなど管理操作を行えます)。

## セキュリティ上の割り切り(6人の飲み会用)

- anon key と幹事トークンは公開 HTML / URL に載る前提の設計です。
- 回答・投票の書き込みは anon key で誰でも可能(RLS で delete のみ禁止)。
- 予算回答は名前と紐づかない別テーブルに保存され、幹事にも個人の回答は見えません
  (画面には常に分布と中央値のみ表示)。
- 厳密な認証・改ざん防止が必要な用途にはそのまま使わないでください。
