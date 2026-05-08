# Karute — 松本さんのダイエットアプリ

「あすけん」を参考に作った松本さん専用のパーソナルダイエット/食事記録アプリ。
個人利用（自分用）想定で、データは全て端末ローカル（LocalStorage）に保存します。

## 特徴

- 14栄養素のバランス表示・PFC・スコア
- 4区分（朝/昼/夕/間食）の食事ログ
- 体重・運動の記録
- **AI 機能（Claude API）**
  - ハル先生（AI 管理栄養士）からのデイリーアドバイス
  - 写真から食事を自動推定（vision）
  - 自然文（"おにぎり2個と味噌汁"）から複数品目を抽出
  - **★ AI 筋トレプラン生成**（目玉機能）
  - 1on1 チャット相談

## 始め方

```bash
npm install
cp .env.example .env.local
# .env.local に GEMINI_API_KEY=AIza... を入れる (https://aistudio.google.com/apikey で発行)
npm run dev
```

ブラウザで http://localhost:3000 を開く。スマホブラウザでホーム画面に追加して使う想定。

API キーは設定画面（/profile）から個人ローカルに保存することもできます。
推奨はサーバ環境変数 `GEMINI_API_KEY` を使うこと。

## ディレクトリ

```
app/                  Next.js App Router (UIページ + API routes)
  api/advice/         デイリーアドバイス
  api/parse-text/     自然文→構造化
  api/photo/          画像→食品認識
  api/plan/           週次筋トレプラン生成
  api/chat/           ハル先生チャット
components/           UI コンポーネント
lib/
  types.ts            型定義
  foods.ts            内蔵食品 DB
  nutrition.ts        栄養素計算 / BMR / 目標値
  store.ts            LocalStorage 永続化フック
  llm.ts              Google Gemini SDK ラッパ
docs/design-spec.md   要件 / UI仕様（Designer引き継ぎ用）
```

## 使用モデル

全機能で `gemini-2.5-flash-lite` を使用（テキスト・vision とも $0.10 / $0.40 per 1M tokens）。
JSON 出力は `responseMimeType: "application/json"` で構造化。

## モバイルで使う（PWA）

このアプリは PWA 対応しており、Vercel にデプロイすると iPhone / Android のホーム画面に追加してネイティブアプリ風に使えます。

### Vercel デプロイ手順

1. https://vercel.com/ に GitHub アカウントでログイン
2. **New Project** → `Naru-365/Playgrounds` をインポート
3. 設定で:
   - **Root Directory**: `02_diet_app`
   - **Framework Preset**: Next.js（自動検出）
4. **Environment Variables** に `GEMINI_API_KEY = AIza...` を追加（Production / Preview / Development 全部チェック）
5. **Deploy** を押す → `https://xxx.vercel.app` URL が払い出される

### ホーム画面に追加

- **iPhone (Safari)**: 払い出された URL を開く → 共有ボタン → 「ホーム画面に追加」
- **Android (Chrome)**: URL を開くとアドレスバー下にインストールバナーが出るので「インストール」

ホーム画面のアイコンから起動するとフルスクリーン（アドレスバー無し）で立ち上がります。

### オフライン挙動

サービスワーカーが画面と静的アセットをキャッシュするので、機内モードでも食事ログ閲覧 / 入力 / 体重記録 / 運動記録は動きます（AI 機能はネットワーク必須）。

## ローカルだけで使うなら

API ルートを使うため Next.js dev/start が必要（GitHub Pages は静的ホスティングのため API ルートが動かない）。

## 注意

- 個人利用のため認証なし。データは端末ローカルのみ。
- 栄養価は内蔵 DB と AI 推定値の混在で、医療目的では使えません。
- ハル先生 / Karute はオリジナルキャラ・ブランドです（あすけん公式とは無関係）。
