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
  type: 'image' | 'video';
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
  type: 'image' | 'video'
  ext: string
  tweetContent?: string
  mediaUrls?: string[]
  mediaTypes?: string[]
  tweetDate?: string
}

export interface DownloadConfig {
  url: string
  filename: string
  saveAs: boolean
  conflictAction: 'uniquify' | 'overwrite' | 'prompt'
}

// カスタムブックマーク関連の型定義
export interface CustomBookmark {
  id: string
  name: string
  description?: string
  createdAt: string;
  updatedAt: string;
  tweetCount: number;
  tweetIds: string[]
}

export interface BookmarkedTweet {
  id: string;
  tweetId: string;
  bookmarkId: string;
  savedAt: string;
  tweet: Tweet;
  saveType: 'url' | 'blob' | 'mixed';
}

export interface BookmarkTweet {
  id: string
  bookmarkId: string
  tweetId: string
  tweetData: {
    text: string
    author: {
      screenName: string
      displayName: string
      profileImageUrl: string
    }
    mediaUrls: string[]
    createdAt: string
  }
  savedAt: string
  saveFormat: 'url' | 'file' | 'mixed'
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