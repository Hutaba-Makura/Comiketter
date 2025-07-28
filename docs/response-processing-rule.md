# Twitter API レスポンス処理ルール

Twitterから傍受した各種APIの情報（パス、レスポンス、タイムスタンプなど）を処理・キャッシュするためのルールをまとめます。

この情報は `ApiProcessor` クラスの `processApiResponse` メソッドで処理され、統一された形式でダウンロード処理や履歴登録、カスタムブックマーク登録などの各機能で参照されます。

---

## 1. 基本仕様

### 1.1 処理構造
- `ApiProcessor` クラスがメインの処理を担当
- `TweetExtractor` でツイート情報を抽出
- `UserExtractor` でユーザー情報を抽出
- `MediaExtractor` でメディア情報を抽出
- `ApiCacheManager` でキャッシュ機能を管理

### 1.2 インターフェース
```ts
processApiResponse(message: {
  path: string;
  data: unknown;
  timestamp: number;
}): ApiProcessingResult
```

### 1.3 戻り値
```ts
interface ApiProcessingResult {
  tweets: ProcessedTweet[];
  errors: string[];
}
```

### 1.4 入力パラメータ
- `path` にはAPIのエンドポイント（例: `https://x.com/i/api/graphql/...`）
- `data` にはAPIレスポンス本体
- `timestamp` には取得時刻（UNIXタイムスタンプ）

---

## 2. 対応APIタイプ

### 2.1 処理対象API
- 使われているのが確認できたAPI
  - `HomeTimeline` - ホームタイムライン（従来版）
  - `HomeLatestTimeline` - ホームタイムライン
  - `TweetDetail` - ツイート詳細
  - `ListLatestTweetsTimeline` - リストタイムライン
  - `SearchTimeline` - 検索タイムライン
  - `CommunityTweetsTimeline` - コミュニティのタイムライン
  - `CommunityTweetSearchModuleQuery` - コミュニティの検索タイムライン
  - `Bookmarks` - ブックマークのタイムライン
  - `BookmarkSearchTimeline` - ブックマークの検索タイムライン
  - `UserTweets` - ユーザーのツイート
- 使われているのが確認出来なかったAPI
  - `UserTweetsAndReplies` - ユーザーのツイートとリプライ
  - `UserHighlightsTweets` - ユーザーのハイライトツイート
  - `UserArticlesTweets` - ユーザーの記事ツイート
  - `TweetResultByRestId` - REST IDによるツイート取得
  - `CommunitiesExploreTimeline` - コミュニティタイムライン

### 2.2 処理対象外API
- 使われているのが確認できたAPI
  - `CreateBookmarks` - ブックマーク （一旦処理しない）
  - `DeleteBookmark` - ブックマーク解除 （一旦処理しない）
  - `FavoriteTweet` - いいね （一旦処理しない）
  - `UnfavoriteTweet` - いいね解除 （一旦処理しない）
  - `CreateRetweet` - リツイート （一旦処理しない）
  - `DeleteRetweet` - リツイート解除 （一旦処理しない）
  - `dm/conversation/` - DMの会話履歴 （一旦処理しない）
  - `UserMedia` - ユーザーのメディア欄　（一旦処理しない）
  - `useUpsellTrackingMutation` - 画面の縦横比を変えた際に送信 （一旦処理しない）
  - `NotificationsTimeline` - 通知欄の読み込み （抽出不要）
  - `CreateTweet` - ツイート （抽出不要）
- 使われているのが確認出来なかったAPI
  - `Likes` - いいね
  - `UserByScreenName` - ユーザー情報のみのため処理対象外
  - `UserByRestId` - ユーザー情報のみのため処理対象外
  - `useUpsellTrackingMutation` - 追跡用のため処理対象外

処理対象外のAPIはフィルタに記述しない、ここにはTwitterのAPIの把握の為、後に機能を追加する為に記述している。

### 2.4 傍聴対象と処理対象のルール

#### 傍聴対象（apiInterceptor.ts）
- **処理対象API**: すべて傍聴対象
- **処理対象外API（一旦処理しない）**: 傍聴対象に含める
- **処理対象外API（使用確認できなかった）**: 傍聴対象から除外

#### 処理対象（api-processor.ts）
- **処理対象API**: ツイート情報を抽出してキャッシュに保存
- **処理対象外API（一旦処理しない）**: `console.log(\`Comiketter: ${apiType} APIは別途処理が必要です\`);`で統一
- **処理対象外API（使用確認できなかった）**: 処理対象から除外

### 2.3 APIレスポンス構造の処理

#### 対応するAPIレスポンス構造
実装では以下の3つの構造に対応しています：

1. **ホームタイムライン系**
   ```json
   {
     "data": {
       "home": {
         "home_timeline_urt": {
           "instructions": [...]
         }
       }
     }
   }
   ```

2. **ツイート詳細系**
   ```json
   {
     "data": {
       "threaded_conversation_with_injections_v2": {
         "instructions": [...]
       }
     }
   }
   ```

3. **その他のAPI**
   ```json
   {
     "data": {
       "instructions": [...]
     }
   }
   ```

#### 処理フロー
- `instructions`（配列）
  - 各要素の `type` が `"TimelineAddEntries"` のみ処理対象
  - `entries`（配列）
    - content
      - itemContent
        - tweet_results
          - result
            - ここに収納されている要素１個がツイート1個分の情報を持っており、この要素が持つ辞書型の中から以下に示したキーのみを取得する

entry.content.itemContent.tweet_results.resultに収集したい要素がある。
<br>つまり、entries[].content.itemContent.tweet_results.result から tweet を取り出す
<br>必須キーが欠けているものは収集しなくてよい

```json
{
    "data": {
        "threaded_conversation_with_injections_v2": {
            "instructions": [
                {
                    "type": "TimelineClearCache"
                },
                {
                    "type": "TimelineAddEntries",
                    "entries": [
                        {
                            "entryId": "tweet-1940726218699297260",
                            "sortIndex": "1947285839201435648",
                            "content": {
                                "entryType": "TimelineTimelineItem",
                                "__typename": "TimelineTimelineItem",
                                "itemContent": {
                                    "itemType": "TimelineTweet",
                                    "__typename": "TimelineTweet",
                                    "tweet_results": {
                                        "result": {
                        ⋮
```

---

APIレスポンスから取り出すべきキー一覧

## 必須キー一覧（全ツイートに共通）

| パス                                                | 説明                |
| ------------------------------------------------- | ----------------- |
| `tweet.legacy.id_str`                             | ツイートのID（文字列）      |
| `tweet.legacy.full_text`                          | ツイート本文            |
| `tweet.legacy.created_at`                         | ツイート作成日時          |
| `tweet.legacy.favorite_count`                     | いいね数              |
| `tweet.legacy.retweet_count`                      | リツイート数            |
| `tweet.legacy.reply_count`                        | リプライ数             |
| `tweet.legacy.quote_count`                        | 引用ツイート数           |
| `tweet.legacy.bookmarked`                         | 自身がブックマークしたかどうか   |
| `tweet.legacy.favorited`                          | 自身がいいねしたかどうか      |
| `tweet.legacy.retweeted`                          | 自身がリツイートしたかどうか    |
| `tweet.core.user_results.result.core.name`        | 投稿者表示名            |
| `tweet.core.user_results.result.core.screen_name` | 投稿者アカウント名         |
| `tweet.core.user_results.result.avatar.image_url` | 投稿者アイコンURL        |

## オプションキー（存在する場合のみ保存）

| パス                                              | 説明                                        |
| ----------------------------------------------- | ----------------------------------------- |
| `tweet.legacy.possibly_sensitive`                | センシティブメディア表示制御フラグ（存在しない場合はfalse） |
| `tweet.legacy.extended_entities.media[].id_str` | メディアID                                    |
| `...media[].type`                               | "photo" / "video" / "animated\_gif" のいずれか |
| `...media[].media_url_https`                    | サムネイルまたは画像URL                             |
| `...media[].video_info.variants[].url`          | 動画/GIFの各画質URL                             |
| `...video_info.variants[].bitrate`              | （動画用）画質選択時に使用                             |
| `...video_info.duration_millis`                 | 動画/GIFの長さ（ミリ秒）                            |
| `tweet.legacy.in_reply_to_screen_name`          | 返信先ユーザー                                   |
| `tweet.legacy.in_reply_to_status_id_str`        | 返信先ツイートID                                 |
| `tweet.legacy.in_reply_to_user_id_str`          | 返信先ユーザーID                                 |
| `tweet.retweeted_status_result`                 | リツイート元ツイート情報（ネスト構造）                       |
| `tweet.legacy.conversation_id_str`              | 会話ID（スレッド識別用）                             |

## 補足
オプションキーにある tweet.retweeted_status_result は、実際には構造が1段ネストされていて、

```json
tweet.retweeted_status_result.result.legacy.full_text
```
のようにアクセスします。

## 保存用JSON構造の例（動画付きツイート）

```json
{
  "id_str": "1944427852440711438",
  "full_text": "https://t.co/MVSXqxKK6Y",
  "created_at": "Sun Jul 13 16:05:00 +0000 2025",
  "favorite_count": 23801,
  "retweet_count": 4068,
  "reply_count": 47,
  "quote_count": 290,
  "bookmarked": false,
  "favorited": true,
  "retweeted": true,
  "possibly_sensitive": false,
  "user": {
    "name": "No Context Shitposting",
    "screen_name": "NoContextCrap",
    "avatar_url": "https://pbs.twimg.com/profile_images/1869811311757971456/UPcBhjlg_normal.jpg"
  },
  "media": [
    {
      "id_str": "1944360728472764416",
      "type": "video",
      "media_url_https": "https://pbs.twimg.com/amplify_video_thumb/1944360728472764416/img/IWf6NpBkJH7sKCmM.jpg",
      "video_info": {
        "duration_millis": 16049,
        "aspect_ratio": [1, 1],
        "variants": [
          {
            "bitrate": 1280000,
            "content_type": "video/mp4",
            "url": "https://video.twimg.com/amplify_video/1944360728472764416/vid/720x720/qK94KXWtWMof4vpn.mp4"
          },
          {
            "content_type": "application/x-mpegURL",
            "url": "https://video.twimg.com/amplify_video/1944360728472764416/pl/vxJQuEJ7TUHoBkT9.m3u8"
          }
        ]
      }
    }
  ]
}
```

### 3 保存する情報

2.3で収集した各ツイートのデータには、キャッシュとして保存する際にタイムスタンプを付与する。このタイムスタンプは、各ツイートがいつ取得されたかを示すものであり、一定期間が経過した後に古いキャッシュを削除する際の判定基準として利用される。

この仕組みにより、保存されたデータの鮮度を管理し、ストレージ使用量の増大を防ぐとともに、UI上での古い情報の残留も避けることができる。

---

## 4. キャッシュ機能

### 4.1 キャッシュの仕組み
- `ApiCacheManager` クラスがキャッシュ機能を管理
- `chrome.storage.local` を使用して永続化
- 各APIタイプ・パスごとにキャッシュエントリを管理
- 重複ツイートの検出と新規ツイートの抽出を自動化

### 4.2 キャッシュエントリの構造
```ts
interface ApiCacheEntry {
  id: string;
  tweets: CachedTweet[];
  api_type: ApiType;
  api_path: string;
  timestamp: number;
  expires_at: number;
}
```

### 4.3 キャッシュの有効期限
- デフォルトで24時間（86400000ミリ秒）
- 期限切れのキャッシュは自動的に削除
- 最大1000エントリまで保存（超過時は古いものから削除）

### 4.4 重複検出
- `tweet.legacy.id_str` をキーとして重複を検出
- 既存のツイートは更新、新規ツイートのみを追加
- DB層での重複管理を前提とした設計

