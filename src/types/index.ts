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
  }
  createdAt: Date
  serial: number
  hash: string
  source: string
  type: 'image' | 'video'
  ext: string
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
  id: string
  tweetId: string
  fileName: string;
  filePath: string;
  downloadUrl: string;
  downloadedAt: string;
  downloadMethod: 'chrome-api' | 'native-messaging';
  accountName: string;
  mediaUrl?: string
  filename?: string
  downloadPath?: string
  fileSize?: number
  status?: 'success' | 'failed' | 'pending'
}

// 設定関連の型定義
export interface Settings {
  tlAutoUpdateDisabled: boolean;
  saveFormat: 'url' | 'blob' | 'mixed';
  autoDownloadConditions: {
    retweet: boolean;
    like: boolean;
    both: boolean;
  };
  downloadMethod: 'chrome-api' | 'native-messaging';
  saveDirectory: string;
}

export interface AppSettings {
  // ダウンロード設定
  downloadMethod: 'chrome-api' | 'native-messaging'
  saveFormat: 'url' | 'file' | 'mixed'
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