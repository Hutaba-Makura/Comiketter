/**
 * API処理で使用する型定義
 */

export interface ApiResponseMessage {
  path: string;
  data: unknown;
  timestamp: number;
}

export interface ProcessedTweet {
  id_str: string;
  full_text: string;
  created_at: string;
  favorite_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  bookmarked: boolean;
  favorited: boolean;
  retweeted: boolean;
  possibly_sensitive: boolean;
  user: ProcessedUser;
  media?: ProcessedMedia[];
  in_reply_to_screen_name?: string;
  in_reply_to_status_id_str?: string;
  in_reply_to_user_id_str?: string;
  conversation_id_str?: string;
  retweeted_status?: ProcessedTweet;
}

export interface ProcessedUser {
  name: string;
  screen_name: string;
  avatar_url: string;
}

export interface ProcessedMedia {
  id_str: string;
  type: 'photo' | 'video' | 'animated_gif';
  media_url_https: string;
  video_info?: {
    duration_millis: number;
    aspect_ratio: [number, number];
    variants: {
      bitrate?: number;
      content_type: string;
      url: string;
    }[];
  };
}

export interface ApiProcessingResult {
  tweets: ProcessedTweet[];
  errors: string[];
}

export type ApiType = 
  | 'HomeLatestTimeline'
  | 'UserTweets'
  | 'TweetDetail'
  | 'UserMedia'
  | 'Favorite'
  | 'Unfavorite'
  | 'CreateRetweet'
  | 'Bookmarks'
  | 'Likes'
  | 'CommunitiesExploreTimeline'
  | 'ListLatestTweetsTimeline'
  | 'Unknown'; 