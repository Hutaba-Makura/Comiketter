/**
 * react-tweetの仕様に基づく型定義
 * 
 * react-tweetはTwitterのsyndication APIを使用してツイートデータを取得し、
 * 内部で適切な型定義を提供します。
 * 
 * このファイルでは、フォールバック表示用の型定義のみを提供します。
 */

/**
 * フォールバック用のツイート表示型定義
 * react-tweetが失敗した場合の代替表示用
 */
export interface FallbackTweet {
  id: string;
  text: string;
  author: FallbackTweetAuthor;
  stats: FallbackTweetStats;
  media: FallbackTweetMediaItem[];
  createdAt: Date;
  isRetweet?: boolean;
  retweetedBy?: FallbackTweetAuthor;
  isQuote?: boolean;
  quotedTweet?: FallbackTweet;
}

/**
 * フォールバック用のツイート作者の型定義
 */
export interface FallbackTweetAuthor {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  verified: boolean;
}

/**
 * フォールバック用のツイート統計の型定義
 */
export interface FallbackTweetStats {
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
}

/**
 * フォールバック用のツイートメディアの型定義
 */
export interface FallbackTweetMediaItem {
  id: string;
  type: 'image' | 'video' | 'gif';
  url: string;
  previewUrl: string;
  altText?: string;
  width?: number;
  height?: number;
}

// 後方互換性のため、古い型名も残す
export type UITweet = FallbackTweet;
export type TweetAuthor = FallbackTweetAuthor;
export type TweetStats = FallbackTweetStats;
export type TweetMediaItem = FallbackTweetMediaItem;
