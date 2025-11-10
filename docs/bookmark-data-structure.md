# ブックマークデータ構造

## 概要

このドキュメントは、Comiketterのブックマーク機能で保存されるツイートデータの構造を説明します。

## データ保存方針

### 基本方針

- **BookmarkDBは完全なデータを保存**: ブックマーク登録時に`ProcessedTweet`の全情報を保存し、キャッシュに依存しない設計
- **キャッシュは一時的なデータ**: APIレスポンスの一時的な保存のみを目的とする

### 必須項目

ブックマーク登録時に、以下の情報が必須項目として保存されます：

1. **基本情報**
   - `tweetId`: ツイートID
   - `authorUsername`: 投稿者のユーザー名
   - `authorDisplayName`: 投稿者の表示名
   - `authorId`: 投稿者のID
   - `content`: ツイート本文
   - `tweetDate`: ツイート投稿日時

2. **統計情報**（必須項目として追加）
   - `favoriteCount`: いいね数
   - `retweetCount`: リツイート数
   - `replyCount`: リプライ数

3. **プロフィール情報**（必須項目として追加）
   - `authorProfileImageUrl`: 投稿者のプロフィール画像URL

4. **メディア情報**（任意）
   - `mediaUrls`: メディアURLの配列
   - `mediaTypes`: メディアタイプの配列
   - `mediaPreviewUrls`: メディアのサムネイルURLの配列（動画/GIFのプレビュー用）

5. **リプライ情報**（任意）
   - `replyToTweetId`: リプライ先のツイートID
   - `replyToUsername`: リプライ先のユーザー名

## BookmarkedTweetDB インターフェース

```typescript
export interface BookmarkedTweetDB {
  id: string;
  bookmarkId: string;
  tweetId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorId?: string;
  authorProfileImageUrl?: string;  // 必須項目（追加）
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  mediaPreviewUrls?: string[];  // メディアのサムネイルURL（動画/GIFのプレビュー用）
  tweetDate: string;
  savedAt: string;
  isRetweet: boolean;
  isReply: boolean;
  replyToTweetId?: string;
  replyToUsername?: string;
  saveType: 'url' | 'blob' | 'mixed';
  // 統計情報（必須項目として追加）
  favoriteCount?: number;  // 必須項目
  retweetCount?: number;   // 必須項目
  replyCount?: number;     // 必須項目
}
```

## データ取得フロー

### 1. ブックマーク登録時

```
1. ユーザーがブックマークボタンをクリック
   ↓
2. ApiCacheManager.findTweetById() でキャッシュからProcessedTweetを取得
   ↓
3. ProcessedTweetから以下の情報を抽出：
   - user.avatar_url → authorProfileImageUrl
   - favorite_count → favoriteCount
   - retweet_count → retweetCount
   - reply_count → replyCount
   - media[] → mediaUrls, mediaTypes, mediaPreviewUrls
     - 動画/GIFの場合はMediaExtractorを使用して実際の動画URLを取得
     - プレビューURLとしてmedia_url_httpsを保存
   ↓
4. BookmarkDBに保存（既に同じbookmarkIdとtweetIdの組み合わせが存在する場合は上書き）
```

### 2. ツイート表示時

```
1. BookmarkDBからデータを取得
   ↓
2. isBookmarkedTweetComplete() でデータの完全性をチェック
   ↓
3. 完全なデータの場合：
   - convertBookmarkedTweetToUITweet() でUI用の型に変換
   - カスタムツイートカードで表示
   ↓
4. 不完全なデータの場合：
   - TweetEmbedコンポーネントで代替表示
```

## データ完全性チェック

`isBookmarkedTweetComplete()` 関数は、以下の項目をチェックします：

1. **最小限の必須情報**
   - `content` が存在するか
   - `authorUsername` が存在するか
   - `tweetDate` が存在するか

2. **統計情報**（必須項目として追加）
   - `favoriteCount` が定義されているか
   - `retweetCount` が定義されているか
   - `replyCount` が定義されているか

3. **プロフィール画像URL**（必須項目として追加）
   - `authorProfileImageUrl` が存在するか

これらの項目がすべて存在する場合、データは「完全」とみなされます。

## JSON構造からの抽出

Twitter APIレスポンスのJSON構造から、以下のパスで情報を抽出します：

### 統計情報

- **いいね数**: `legacy.favorite_count`
- **リツイート数**: `legacy.retweet_count`
- **リプライ数**: `legacy.reply_count`

### プロフィール画像URL

- **パス**: `core.user_results.result.avatar.image_url`
- **ProcessedUser**: `user.avatar_url` として保存

### 実装例

```typescript
// ProcessedTweetからBookmarkDBへの変換
const mediaExtractor = new MediaExtractor();
const mediaUrls: string[] = [];
const mediaTypes: string[] = [];
const mediaPreviewUrls: string[] = [];

// メディア情報を抽出
if (cachedTweet.media && Array.isArray(cachedTweet.media)) {
  for (const m of cachedTweet.media) {
    mediaTypes.push(m.type || 'photo');
    
    if (m.type === 'video' || m.type === 'animated_gif') {
      // 動画/GIFの場合はMediaExtractorを使用して実際の動画URLを取得
      const videoUrl = mediaExtractor.getBestVideoUrl(m);
      if (videoUrl) {
        mediaUrls.push(videoUrl);
        mediaPreviewUrls.push(m.media_url_https || '');  // プレビューURL
      } else {
        mediaUrls.push(m.media_url_https || '');
        mediaPreviewUrls.push(m.media_url_https || '');
      }
    } else {
      // 画像の場合はmedia_url_httpsを使用
      mediaUrls.push(m.media_url_https || '');
      mediaPreviewUrls.push(m.media_url_https || '');
    }
  }
}

const bookmarkedTweet = {
  tweetId: cachedTweet.id_str,
  authorUsername: cachedTweet.user.screen_name,
  authorDisplayName: cachedTweet.user.name,
  authorId: cachedTweet.user.screen_name,
  authorProfileImageUrl: cachedTweet.user.avatar_url,  // プロフィール画像URL
  content: cachedTweet.full_text,
  mediaUrls,
  mediaTypes,
  mediaPreviewUrls,  // メディアのサムネイルURL
  favoriteCount: cachedTweet.favorite_count,  // いいね数
  retweetCount: cachedTweet.retweet_count,    // リツイート数
  replyCount: cachedTweet.reply_count,        // リプライ数
  // ... その他の情報
};
```

## 後方互換性

既存のブックマークデータには、統計情報やプロフィール画像URLが保存されていない可能性があります。

この場合、以下の対応が行われます：

1. **データ取得時**: `isBookmarkedTweetComplete()` が `false` を返す
2. **表示時**: `TweetEmbed` コンポーネントで代替表示
3. **再登録時**: 新しいデータ構造で保存される

## 関連ファイル

- **型定義**: `src/utils/bookmarkDB.ts` (BookmarkedTweetDB)
- **データ変換**: `src/bookmarks/utils/tweet-converter.ts`
- **登録処理**: `src/utils/bookmarkApiClient.ts` (addTweetToBookmark)
- **表示処理**: `src/bookmarks/tweet/Tweet.tsx`
- **キャッシュ検索**: `src/utils/api-cache.ts` (ApiCacheManager.findTweetById)
- **メディア抽出**: `src/api-processor/media-extractor.ts` (MediaExtractor)

## 更新履歴

- 2025-01-XX: 統計情報（いいね数、リツイート数、リプライ数）とプロフィール画像URLを必須項目として追加
- 2025-01-XX: メディアプレビューURL（mediaPreviewUrls）フィールドを追加

