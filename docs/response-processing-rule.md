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
- `HomeTimeline` - ホームタイムライン（従来版）
- `HomeLatestTimeline` - ホームタイムライン
- `TweetDetail` - ツイート詳細

- `UserTweets` - ユーザーのツイート
- `UserTweetsAndReplies` - ユーザーのツイートとリプライ
- `UserHighlightsTweets` - ユーザーのハイライトツイート
- `UserArticlesTweets` - ユーザーの記事ツイート
- `TweetResultByRestId` - REST IDによるツイート取得
- `Likes` - いいね
- `SearchTimeline` - 検索タイムライン
- `CommunitiesExploreTimeline` - コミュニティタイムライン
- `ListLatestTweetsTimeline` - リストタイムライン

### 2.2 処理対象外API
- `CreateBookmarks` - ブックマーク
- `FavoriteTweet` - 一旦処理しない（抽出不要）
- `CreateRetweet` - リツイート処理は別途実装予定
- `useUpsellTrackingMutation` - 画面の縦横比を変えた際に送信
- `NotificationsTimeline` - 通知欄の読み込み
- `dm/conversation/` - DMの会話履歴

- `UserMedia` - 一旦処理しない（抽出不要）
- `UnfavoriteTweet` - 一旦処理しない（抽出不要）
- `UserByScreenName` - ユーザー情報のみのため処理対象外
- `UserByRestId` - ユーザー情報のみのため処理対象外
- `useUpsellTrackingMutation` - 追跡用のため処理対象外

処理対象外のAPIはフィルタに記述しない、ここにはTwitterのAPIの把握の為、後に機能を追加する為に記述している。

### 2.3 APIレスポンス構造の処理
- `instructions`（配列）
  - 各要素の `type` が `"TimelineAddEntries"` のみ処理対象
  - `entries`（配列）
    - ここに収納されている要素１個がツイート1個分の情報を持っており、この要素が持つ辞書型の中から以下に示したキーのみを取得する

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
| `tweet.legacy.possibly_sensitive`                 | センシティブメディア表示制御フラグ |
| `tweet.core.user_results.result.core.name`        | 投稿者表示名            |
| `tweet.core.user_results.result.core.screen_name` | 投稿者アカウント名         |
| `tweet.core.user_results.result.avatar.image_url` | 投稿者アイコンURL        |

## オプションキー（存在する場合のみ保存）

| パス                                              | 説明                                        |
| ----------------------------------------------- | ----------------------------------------- |
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


