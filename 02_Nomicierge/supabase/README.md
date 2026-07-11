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

## セキュリティ上の割り切り(6人の飲み会用)

- anon key と幹事トークンは公開 HTML / URL に載る前提の設計です。
- 回答・投票の書き込みは anon key で誰でも可能(RLS で delete のみ禁止)。
- 予算回答は名前と紐づかない別テーブルに保存され、幹事にも個人の回答は見えません
  (画面には常に分布と中央値のみ表示)。
- 厳密な認証・改ざん防止が必要な用途にはそのまま使わないでください。
