# ✅ Comiketter 開発タスクリスト（詳細版）

## 🔷 1. UI関連機能の実装

### ツイートごとの拡張要素追加
- [ ] TL上の各ツイートに **CB（カスタムブックマーク）ボタン**を設置する  
  - [ ] クリック時にカスタムブックマーク選択UIを表示  
  - [ ] 選択されたCBにツイートを保存する処理を送信  
- [ ] TL上の各ツイートに **DL（ダウンロード）ボタン**を設置する  
  - [ ] 押下時に対象ツイートのメディアを取得して保存を開始  

### メインUI・ナビゲーション
- [ ] サイドバーに `CustomBookmarks` ボタンを追加し、保存一覧ページに遷移できるようにする  
- [ ] 保存済みCBツイートを表示する TL風ページを作成  
  - [ ] IndexedDB から取得して表示  
- [ ] 拡張機能アイコンのポップアップUI（設定画面）を作成  
  - [ ] 設定可能項目：  
    - [ ] TL自動更新の抑止 ON/OFF  
    - [ ] 保存形式（画像URL or 画像本体）  
    - [ ] 自動DL条件（RT / いいね / 両方）  
    - [ ] 保存方法（chrome.downloads or curl）  
    - [ ] 履歴ページへのリンク  

---

## 🔷 2. 処理ロジックの実装（移植含む）

### API傍受とイベント発火
- [ ] `injectFetch.ts` をベースに、X の API（GraphQL）通信を傍受する  
  - [ ] `XMLHttpRequest.prototype.open` のProxy  
  - [ ] fetchのラップでレスポンス監視  
  - [ ] カスタムイベントまたはメッセージ発火  

### 自動DL・保存トリガー処理
- [ ] RT / いいねなどの動作を検知（APIレスポンスから抽出）  
- [ ] 条件一致時に DL 処理に遷移  

### メディア情報の取得・保存
- [ ] `downloadTweetMedia.ts`, `tweetMedia.ts`, `tweetToTweetMediaFiles.ts` をベースに  
  - [ ] ツイートから画像/動画URLを取得  
  - [ ] テキスト情報も抽出  
- [ ] ダウンロード処理：  
  - [ ] `chrome.downloads` API で保存  
  - [ ] NativeMessaging + curl で保存（保存パス指定あり）  
- [ ] 保存結果を DL履歴DB に記録  

---

## 🔷 3. DB処理

### IndexedDB 設計と実装
- [ ] CB保存用DB
  - [ ] ツイートID、テキスト、画像URLまたはBlob、CB名など
- [ ] DL履歴DB
  - [ ] ファイル名、ツイートID、保存日、パス、保存方法 など  

---

## 🔷 4. 移植対象ファイルの対応

### 主な移植元一覧（必要な機能だけ調整して使用）

#### 🧪 API傍受
- `src/injections/injectFetch.ts`  
- `src/applicationUseCases/captureResponseAndCache.ts`  
- `src/serviceWorker/messageHandlers/captureResponse.ts`  
- `src/serviceWorker/initMessageRouter.ts`  

#### 🧠 キャッシュ
- `src/infra/caches/tweetResponseCache.ts`  
- `src/applicationUseCases/downloadTweetMedia.ts`（94-110行目）  

#### 🔍 メディア解析
- `src/libs/XApi/parsers/tweetMedia.ts`  
- `src/domain/factories/tweetToTweetMediaFiles.ts`  
- `src/infra/useCases/nativeFetchTweetSolution.ts`  

#### 📥 DOM操作・DL処理
- `src/contentScript/observers/TwitterMediaObserver.ts`  
- `src/contentScript/core/Harvester.ts`  
- `src/libs/webExtMessage/messages/downloadTweetMedia.ts`  

---

## 🔷 5. 開発環境の構築・整備

- [ ] TypeScript + React + Webpack + Mantine の初期構成
- [ ] ESLint + Prettier の導入と整備
- [ ] Jest テストのセットアップ
- [ ] Husky による Git hook（commit 時 lint/format 実行）
- [ ] `setting.json` の読み書き処理と初期デフォルト管理

---

## 🔷 6. 今後検討

- [ ] コミケ公式APIとの連携仕様調査
- [ ] サークル名 → ツイート検索自動連携 など

