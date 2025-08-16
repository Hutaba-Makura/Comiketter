# APIキャッシュ機能実装概要

`response-processing-rule.md`に基づいて、Twitter APIレスポンスをキャッシュとして保存する機能を実装しました。

## 実装内容

### 1. 型定義の拡張 (`src/api-processor/types.ts`)

- `CachedTweet`: キャッシュされたツイート情報（タイムスタンプとAPIソース情報付き）
- `ApiCacheEntry`: キャッシュエントリ（APIタイプ、パス、有効期限など）
- `ApiCacheResult`: キャッシュ処理結果（キャッシュ済みツイート、新規ツイート、エラー）

### 2. キャッシュ管理クラス (`src/utils/api-cache.ts`)

#### 主要機能
- **キャッシュ保存**: `saveCache()` - ツイート情報をキャッシュとして保存
- **キャッシュ取得**: `getCachedTweets()` - 有効期限内のキャッシュからツイートを取得
- **重複除去**: `processWithCache()` - 新規ツイートのみを抽出してキャッシュを更新
- **期限切れ削除**: `cleanupExpiredCache()` - 期限切れキャッシュを自動削除
- **統計取得**: `getCacheStats()` - キャッシュの統計情報を取得

#### キャッシュ設定
- **有効期限**: 24時間
- **最大エントリ数**: 1000件
- **ストレージキー**: `comiketter_api_cache`

### 3. APIプロセッサーの拡張 (`src/api-processor/api-processor.ts`)

#### 新機能
- **キャッシュ統合**: `processApiResponse()` - キャッシュ機能付きのAPI処理
- **デバッグ用**: `processApiResponseWithoutCache()` - キャッシュ無効での処理
- **キャッシュ管理**: 静的メソッドでキャッシュ操作を提供

#### 処理フロー
1. APIレスポンスを受信
2. ツイート情報を抽出
3. キャッシュと比較して新規ツイートを特定
4. 新規ツイートをキャッシュに保存
5. キャッシュ済みツイートと新規ツイートを統合して返却

### 4. バックグラウンドスクリプトの統合 (`src/background/messageHandler.ts`)

#### 新機能
- **キャッシュアクション**: `CACHE_ACTION`メッセージタイプの処理
- **API処理統合**: `ApiProcessor`を使用したキャッシュ機能付きAPI処理
- **エラーハンドリング**: キャッシュ処理エラーの適切な処理

#### 対応アクション
- `getCacheStats`: キャッシュ統計の取得
- `cleanupExpiredCache`: 期限切れキャッシュの削除
- `clearAllCache`: 全キャッシュの削除
- `findTweetById`: 指定されたid_strでツイートを検索
- `findTweetsByIds`: 指定されたid_strのリストでツイートを一括検索
- `findTweetsByUsername`: 指定されたユーザー名でツイートを検索

### 5. テスト実装 (`src/test/api-cache.test.ts`)

#### テストケース
- キャッシュ保存・取得の正常動作
- 期限切れキャッシュの適切な処理
- 重複ツイートの除去
- キャッシュ統計の正確性
- エラーハンドリング
- ツイート検索機能の動作確認

## 使用方法

### 基本的な使用例

```typescript
import { ApiProcessor } from '../api-processor';

// APIプロセッサーのインスタンス作成
const apiProcessor = new ApiProcessor();

// APIレスポンスを処理（キャッシュ機能付き）
const result = await apiProcessor.processApiResponse({
  path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
  data: apiResponseData,
  timestamp: Date.now()
});

console.log(`処理されたツイート数: ${result.tweets.length}`);
console.log(`エラー数: ${result.errors.length}`);
```

### キャッシュ管理

```typescript
// キャッシュ統計の取得
const stats = await ApiProcessor.getCacheStats();
console.log(`キャッシュエントリ数: ${stats.totalEntries}`);
console.log(`キャッシュツイート数: ${stats.totalTweets}`);

// 期限切れキャッシュの削除
await ApiProcessor.cleanupExpiredCache();

// 全キャッシュの削除
await ApiProcessor.clearAllCache();
```

### キャッシュ検索機能

```typescript
// 指定されたid_strでツイートを検索
const tweet = await ApiProcessor.findTweetById('1234567890');
if (tweet) {
  console.log(`ツイートを発見: ${tweet.full_text}`);
  console.log(`キャッシュ保存日時: ${new Date(tweet.cached_at).toLocaleString()}`);
  console.log(`取得元API: ${tweet.api_source}`);
} else {
  console.log('ツイートが見つかりませんでした');
}

// 複数のid_strでツイートを一括検索
const tweetIds = ['1234567890', '0987654321', '1122334455'];
const tweets = await ApiProcessor.findTweetsByIds(tweetIds);
console.log(`検索対象: ${tweetIds.length}件, 発見: ${tweets.length}件`);

// 指定されたユーザー名でツイートを検索
const userTweets = await ApiProcessor.findTweetsByUsername('username');
console.log(`${userTweets.length}件のツイートを発見`);

// ユーザーの最新ツイートを取得（キャッシュ保存日時でソート）
const latestUserTweets = userTweets
  .sort((a, b) => b.cached_at - a.cached_at)
  .slice(0, 10);
```

### メッセージ経由での使用例

```typescript
// 単一ツイート検索
chrome.runtime.sendMessage({
  type: 'CACHE_ACTION',
  payload: {
    action: 'findTweetById',
    data: { id_str: '1234567890' }
  }
}, (response) => {
  if (response.success && response.data) {
    console.log('ツイートを発見:', response.data);
  }
});

// 複数ツイート検索
chrome.runtime.sendMessage({
  type: 'CACHE_ACTION',
  payload: {
    action: 'findTweetsByIds',
    data: { id_strs: ['1234567890', '0987654321'] }
  }
}, (response) => {
  if (response.success) {
    console.log('ツイート一覧:', response.data);
  }
});

// ユーザーツイート検索
chrome.runtime.sendMessage({
  type: 'CACHE_ACTION',
  payload: {
    action: 'findTweetsByUsername',
    data: { username: 'username' }
  }
}, (response) => {
  if (response.success) {
    console.log('ユーザーツイート:', response.data);
  }
});
```

## パフォーマンス向上

### 1. 重複処理の回避
- 同じツイートの重複処理を防止
- API呼び出し回数の削減

### 2. レスポンス時間の短縮
- キャッシュからの高速取得
- 新規データのみの処理

### 3. ストレージ使用量の最適化
- 期限切れキャッシュの自動削除
- 最大エントリ数の制限

### 4. 効率的な検索機能
- 有効期限内のキャッシュからの高速検索
- 複数条件での一括検索対応
- 重複除去による検索結果の最適化

## エラーハンドリング

### 1. キャッシュ保存エラー
- Chrome Storage APIのエラーを適切に処理
- エラーログの出力

### 2. データ整合性
- 不正なデータの検証
- 型安全性の確保

### 3. フォールバック
- キャッシュ機能が失敗した場合の通常処理へのフォールバック

## 今後の拡張予定

### 1. キャッシュ設定のカスタマイズ
- 有効期限の設定可能化
- 最大エントリ数の調整

### 2. キャッシュ分析機能
- キャッシュヒット率の計測
- パフォーマンス分析

### 3. 高度なキャッシュ戦略
- LRU（Least Recently Used）アルゴリズムの実装
- 優先度付きキャッシュ

### 4. 検索機能の拡張
- 全文検索機能の実装
- 日付範囲での検索
- メディアタイプでの絞り込み検索
- 検索結果のソート・フィルタリング機能

## 注意事項

1. **ストレージ使用量**: キャッシュはChrome Storage Localを使用するため、使用量に注意が必要
2. **データ鮮度**: 24時間の有効期限により、古いデータは自動的に削除される
3. **互換性**: 既存のAPI処理機能との互換性を維持
4. **デバッグ**: キャッシュ無効モードでデバッグが可能

この実装により、Twitter APIレスポンスの効率的な処理とキャッシュ管理が可能になり、ユーザーエクスペリエンスの向上が期待できます。 