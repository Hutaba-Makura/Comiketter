/**
 * Fallback用のツイート表示型定義
 */
export interface UITweet {
  id: string;
  text: string;
  author: TweetAuthor;
  stats: TweetStats;
  media: TweetMediaItem[];
  createdAt: Date;
  isRetweet?: boolean;
  retweetedBy?: TweetAuthor;
  isQuote?: boolean;
  quotedTweet?: UITweet;
}

/**
 * ツイート作者の型定義
 */
export interface TweetAuthor {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  verified: boolean;
}

/**
 * ツイート統計の型定義
 */
export interface TweetStats {
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
}

/**
 * ツイートメディアの型定義
 */
export interface TweetMediaItem {
  id: string;
  type: 'image' | 'video' | 'gif';
  url: string;
  previewUrl: string;
  altText?: string;
  width?: number;
  height?: number;
}
