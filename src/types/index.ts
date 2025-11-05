// Basic type definitions for Comiketter

export interface Tweet {
  id: string;
  text: string;
  author: {
    username: string;
    displayName: string;
    profileImageUrl?: string;
  };
  createdAt: string;
  media?: MediaItem[];
  url: string;
}

export interface MediaItem {
  type: 'image' | 'video' | 'animated_gif';
  url: string;
  originalUrl?: string;
  thumbnailUrl?: string;
}

// API傍受関連の型定義
export interface ApiInterceptResponse {
  url: string
  method: string
  response: any
  timestamp: number
}

export interface ApiInterceptEvent {
  type: 'API_INTERCEPT'
  data: ApiInterceptResponse
}

// ファイル名・パス設定関連の型定義
export enum PatternToken {
  Account = '{account}',
  AccountId = '{accountId}',
  TweetId = '{tweetId}',
  Serial = '{serial}',
  Hash = '{hash}',
  Date = '{date}',
  Datetime = '{datetime}',
  UnderscoreDateTime = '{underscoreDatetime}',
  Timestamp = '{timestamp}',
  TweetDate = '{tweetDate}',
  TweetDatetime = '{tweetDatetime}',
  UnderscroeTweetDatetime = '{underscroeTweetDatetime}',
  TweetTimestamp = '{tweetTimestamp}',
}

export enum AggregationToken {
  Account = '{account}',
}

export interface FilenameSettingProps {
  directory: string
  noSubDirectory: boolean
  filenamePattern: PatternToken[]
  fileAggregation: boolean
  groupBy: AggregationToken
}

export interface TweetMediaFileProps {
  tweetId: string
  tweetUser: {
    screenName: string
    userId: string
    displayName: string
    isProtected: boolean
    id?: string // オプショナルに修正
  }
  createdAt: Date
  serial: number
  hash: string
  source: string
  type: 'image' | 'thumbnail' | 'video' // thumbnailを追加
  ext: string
  tweetContent?: string
  mediaUrls?: string[]
  mediaTypes?: string[]
  tweetDate?: string
  mediaKey?: string // 動画のmedia_keyを追加
}

// ダウンロード競合時の動作
export enum ConflictAction {
  Uniquify = 'uniquify',
  Overwrite = 'overwrite',
  Prompt = 'prompt'
}

export interface DownloadConfig {
  url: string
  filename: string
  saveAs: boolean
  conflictAction: ConflictAction
}

// カスタムブックマーク関連の型定義
export interface CustomBookmark {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  tweetCount?: number; // ツイート数を追加
}

export interface BookmarkedTweet {
  id: string;
  bookmarkId: string;
  tweetId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorId?: string;
  authorProfileImageUrl?: string;
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  mediaPreviewUrls?: string[]; // メディアのサムネイルURL（動画/GIFのプレビュー用）
  tweetDate: string;
  savedAt: string;
  isRetweet: boolean;
  isReply: boolean;
  replyToTweetId?: string;
  replyToUsername?: string;
  saveType: 'url' | 'blob' | 'mixed';
  // 統計情報
  favoriteCount?: number;
  retweetCount?: number;
  replyCount?: number;
}

// ブックマーク統計情報
export interface BookmarkStats {
  totalBookmarks: number;
  totalTweets: number;
  activeBookmarks: number;
  tweetsByBookmark: { [bookmarkId: string]: number };
}

// ブックマーク検索条件
export interface BookmarkSearchParams {
  name?: string;
  isActive?: boolean;
  authorUsername?: string;
  isRetweet?: boolean;
  isReply?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ダウンロード履歴関連の型定義
export interface DownloadHistory {
  id: string;
  tweetId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorId?: string;
  filename: string;
  filepath: string;
  originalUrl: string;
  downloadMethod: 'chrome_downloads' | 'native_messaging';
  fileSize?: number;
  fileType: string;
  downloadedAt: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  tweetContent?: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  tweetDate?: string;
}

// ダウンロード履歴統計情報
export interface DownloadHistoryStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  totalSize: number;
}

// ダウンロード履歴検索条件
export interface DownloadHistorySearchParams {
  tweetId?: string;
  authorUsername?: string;
  status?: 'success' | 'failed' | 'pending';
  downloadMethod?: 'chrome_downloads' | 'native_messaging';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// 設定関連の型定義（統一版）
export interface AppSettings {
  // 基本設定
  tlAutoUpdateDisabled: boolean;
  
  // ダウンロード設定
  downloadMethod: 'chrome_downloads' | 'native_messaging'
  saveFormat: 'url' | 'blob' | 'mixed'
  saveDirectory: string
  
  // 自動ダウンロード条件
  autoDownloadConditions: {
    retweet: boolean;
    like: boolean;
    both: boolean;
  }
  
  // 自動保存トリガー（新しい形式）
  autoSaveTriggers: {
    retweet: boolean
    like: boolean
    retweetAndLike: boolean
  }
  
  // ファイル名・パス設定
  filenameSettings: FilenameSettingProps
  
  // メディアダウンロード設定
  mediaDownloadSettings: {
    includeVideoThumbnail: boolean; // 動画サムネイルを含めるかどうか
    excludeProfileImages: boolean; // プロフィール画像を除外するかどうか
    excludeBannerImages: boolean; // バナー画像を除外するかどうか
  }
  
  // UI設定
  timelineAutoUpdate: boolean
  showCustomBookmarks: boolean
}

// 後方互換性のためのSettings型（AppSettingsのエイリアス）
export type Settings = AppSettings;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// イベント型定義
export type AppEvent = 
  | ApiInterceptEvent
  | { type: 'DOWNLOAD_START'; data: { tweetId: string; mediaUrl: string } }
  | { type: 'DOWNLOAD_COMPLETE'; data: DownloadHistory }
  | { type: 'BOOKMARK_ADDED'; data: { bookmarkId: string; tweetId: string } }
  | { type: 'SETTINGS_UPDATED'; data: Partial<AppSettings> } 