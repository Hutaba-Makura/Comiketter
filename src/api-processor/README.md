# API処理機能

Twitter APIレスポンスを処理し、各機能（ダウンロード、カスタムブックマーク、ボタン変更など）で利用可能な形式に変換する機能です。

## 概要

この機能は、Twitterから傍受した各種APIの情報（パス、レスポンス、タイムスタンプなど）を処理・キャッシュし、統一された形式で各機能に提供します。

## 構造

```
src/api-processor/
├── index.ts              # エントリーポイント
├── api-processor.ts      # メイン処理クラス
├── tweet-extractor.ts    # ツイート情報抽出
├── user-extractor.ts     # ユーザー情報抽出
├── media-extractor.ts    # メディア情報抽出
├── types.ts             # 型定義
└── README.md            # このファイル
```

## 使用方法

### 基本的な使用方法

```typescript
import { ApiProcessor } from '../api-processor';

const apiProcessor = new ApiProcessor();

// APIレスポンスを処理
const result = apiProcessor.processApiResponse({
  path: '/i/api/graphql/HomeLatestTimeline',
  data: apiResponseData,
  timestamp: Date.now()
});

// 処理結果を利用
for (const tweet of result.tweets) {
  console.log(`ツイートID: ${tweet.id_str}`);
  console.log(`本文: ${tweet.full_text}`);
  console.log(`ユーザー: ${tweet.user.screen_name}`);
  
  if (tweet.media) {
    console.log(`メディア数: ${tweet.media.length}`);
  }
}

// エラーの確認
if (result.errors.length > 0) {
  console.warn('処理エラー:', result.errors);
}
```

### ダウンロード機能での使用例

```typescript
import { ApiProcessor } from '../api-processor';
import { DownloadManager } from '../background/downloadManager';

class EnhancedDownloadManager {
  private apiProcessor: ApiProcessor;
  private downloadManager: DownloadManager;

  constructor() {
    this.apiProcessor = new ApiProcessor();
    this.downloadManager = new DownloadManager();
  }

  processApiResponse(message: ApiResponseMessage): void {
    // API処理でツイート情報を抽出
    const result = this.apiProcessor.processApiResponse(message);
    
    // メディア付きツイートをダウンロード対象として登録
    for (const tweet of result.tweets) {
      if (tweet.media && tweet.media.length > 0) {
        this.registerForDownload(tweet);
      }
    }
  }

  private registerForDownload(tweet: ProcessedTweet): void {
    // ダウンロード処理の実装
  }
}
```

### カスタムブックマーク機能での使用例

```typescript
import { ApiProcessor } from '../api-processor';
import { BookmarkManager } from '../utils/bookmarkManager';

class EnhancedBookmarkManager {
  private apiProcessor: ApiProcessor;
  private bookmarkManager: BookmarkManager;

  constructor() {
    this.apiProcessor = new ApiProcessor();
    this.bookmarkManager = new BookmarkManager();
  }

  processApiResponse(message: ApiResponseMessage): void {
    // API処理でツイート情報を抽出
    const result = this.apiProcessor.processApiResponse(message);
    
    // ブックマーク対象として登録
    for (const tweet of result.tweets) {
      if (this.shouldBookmark(tweet)) {
        this.registerBookmark(tweet);
      }
    }
  }

  private shouldBookmark(tweet: ProcessedTweet): boolean {
    // ブックマーク条件の判定
    return tweet.favorited || tweet.bookmarked;
  }

  private registerBookmark(tweet: ProcessedTweet): void {
    // ブックマーク登録処理
  }
}
```

## 対応API

以下のAPIタイプに対応しています：

- `HomeLatestTimeline` - ホームタイムライン
- `UserTweets` - ユーザーのツイート
- `TweetDetail` - ツイート詳細
- `Bookmarks` - ブックマーク
- `Likes` - いいね
- `CommunitiesExploreTimeline` - コミュニティタイムライン
- `ListLatestTweetsTimeline` - リストタイムライン

## 処理される情報

### 必須情報（全ツイートに共通）

- ツイートID (`id_str`)
- ツイート本文 (`full_text`)
- 作成日時 (`created_at`)
- いいね数 (`favorite_count`)
- リツイート数 (`retweet_count`)
- リプライ数 (`reply_count`)
- 引用ツイート数 (`quote_count`)
- ブックマーク状態 (`bookmarked`)
- いいね状態 (`favorited`)
- リツイート状態 (`retweeted`)
- センシティブフラグ (`possibly_sensitive`)
- ユーザー情報 (`user`)

### オプション情報

- メディア情報 (`media`)
- 返信先情報 (`in_reply_to_*`)
- リツイート元情報 (`retweeted_status`)
- 会話ID (`conversation_id_str`)

## エラーハンドリング

API処理中にエラーが発生した場合、`ApiProcessingResult.errors`配列にエラーメッセージが格納されます。各機能ではこのエラー情報を確認して適切に処理してください。

## テスト

```bash
npm test src/test/api-processor.test.ts
```

## 今後の拡張

- 新しいAPIタイプの追加
- より詳細なメディア情報の抽出
- パフォーマンス最適化
- キャッシュ機能の強化 