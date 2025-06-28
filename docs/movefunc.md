# 機能移植・流用方針

- TwitterMediaHarvest から流用する際は、該当ソースの先頭や修正箇所にライセンス表記を必ず記載すること。
- 保存方式はchrome.downloads API（デフォルト）とNativeMessaging+curl（オプション、.bat等で連携）両対応。
- CBデータ構造は保存形式や参照方式に応じて柔軟に設計。
- 開発順序は「API傍受→DL処理→DB構築→ブックマーク処理→ブックマーク表示」。

---

移植したい機能の関連ファイルを調査してリストアップいたします。まず、プロジェクト構造を詳しく確認して、各機能に関連するファイルを特定していきます。
## 移植したい機能の関連ファイル一覧

### 1.  API傍受（リクエスト/レスポンス監視）

#### XHR / Fetch 傍受
- **`src/injections/injectFetch.ts`** - メインのAPI傍受処理
  - XMLHttpRequest.prototype.open の Proxy による傍受
  - Twitter API の GraphQL エンドポイント監視
  - レスポンスキャプチャとカスタムイベント発火

#### レスポンス収集イベント
- **`src/applicationUseCases/captureResponseAndCache.ts`** - 傍受したレスポンスの処理
- **`src/serviceWorker/messageHandlers/captureResponse.ts`** - メッセージハンドラー
- **`src/serviceWorker/initMessageRouter.ts`** - メッセージルーター設定

#### webpackChunk 傍受
- **`src/injections/injectFetch.ts`** (89-172行目) - webpackChunk の Proxy 処理
  - `self.webpackChunk_twitter_responsive_web` の傍受
  - 動的モジュールロードの監視
  - Transaction ID 生成器の取得

### 2. 🧠 キャッシュ機構（データの一時保存）

#### TweetResponseCache
- **`src/infra/caches/tweetResponseCache.ts`** - メインのキャッシュ実装
- **`src/provider/caches.ts`** - キャッシュのプロバイダー設定
- **`src/mocks/caches/tweetResponseCache.ts`** - モック実装

#### CommandCache
- **`src/libs/XApi/commands/types.ts`** - CommandCache インターフェース定義
- **`src/libs/XApi/mock/commandCache.ts`** - モック実装
- **`src/libs/XApi/commands/abstractFetchTweet.ts`** (226-243行目) - キャッシュ読み書き処理

#### キャッシュ保存/取得処理
- **`src/applicationUseCases/downloadTweetMedia.ts`** (94-110行目) - キャッシュからの情報取得
- **`src/infra/useCases/nativeFetchTweetSolution.ts`** (53-70行目) - CacheStorage 実装

### 3. 🔍 情報取得（DL処理に必要なメディア情報の確定）

#### キャッシュからの情報取得
- **`src/applicationUseCases/downloadTweetMedia.ts`** - キャッシュ確認とダウンロード処理

#### Tweet解析
- **`src/libs/XApi/parsers/tweet.ts`** - ツイート内容の解析
- **`src/libs/XApi/parsers/tweetMedia.ts`** - メディア情報の抽出
- **`src/libs/XApi/parsers/refinements.ts`** - ツイートタイプ判定
- **`src/domain/factories/tweetToTweetMediaFiles.ts`** - ツイートからメディアファイルへの変換
- **`src/domain/valueObjects/tweet.ts`** - ツイートエンティティ

#### APIフェッチ処理
- **`src/infra/useCases/nativeFetchTweetSolution.ts`** - API取得ソリューション
- **`src/libs/XApi/client.ts`** - API クライアント
- **`src/libs/XApi/commands/`** - 各種APIコマンド
  - `abstractFetchTweet.ts`
  - `latestFetchTweet.ts`
  - `restIdFetchTweet.ts`
  - `guestFetchTweet.ts`

### 4.  ダウンロードボタンの追加（DOM操作）

#### MutationObserverによる監視
- **`src/contentScript/observers/observer.ts`** - 基本のObserver実装
- **`src/contentScript/observers/TwitterMediaObserver.ts`** - Twitter用Observer
- **`src/contentScript/observers/TweetDeckBetaObserver.ts`** - TweetDeck用Observer

#### ダウンロードボタン生成
- **`src/contentScript/core/Harvester.ts`** - メインのボタン生成処理
- **`src/contentScript/core/index.ts`** - ハーベスターの初期化
- **`src/contentScript/utils/button.ts`** - ボタン状態管理とクリック処理

#### クリック時のメッセージ送信
- **`src/libs/webExtMessage/messages/downloadTweetMedia.ts`** - ダウンロードメッセージ
- **`src/serviceWorker/messageHandlers/downloadMediaHandler.ts`** - ダウンロード処理ハンドラー

### その他の関連ファイル

#### 型定義・インターフェース
- **`src/libs/XApi/types/tweet.d.ts`** - ツイート型定義
- **`src/domain/valueObjects/`** - 各種値オブジェクト
- **`src/types/harvest.d.ts`** - ハーベスト関連型定義

#### ユーティリティ
- **`src/utils/result.ts`** - 結果型ユーティリティ
- **`src/helpers/`** - 各種ヘルパー関数

#### テストデータ
- **`src/test-data/`** - テスト用JSONデータ
- **`src/libs/XApi/parsers/test-data/`** - パーサー用テストデータ

これらのファイルを移植することで、Twitter Media Harvest拡張機能の主要な機能を別の拡張機能に移植することができます。各機能は独立して動作するよう設計されているため、必要に応じて一部の機能のみを移植することも可能です。