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

export interface CustomBookmark {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tweetCount: number;
}

export interface BookmarkedTweet {
  id: string;
  tweetId: string;
  bookmarkId: string;
  savedAt: string;
  tweet: Tweet;
  saveType: 'url' | 'blob' | 'mixed';
}

export interface DownloadHistory {
  id: string;
  tweetId: string;
  fileName: string;
  filePath: string;
  downloadUrl: string;
  downloadedAt: string;
  downloadMethod: 'chrome-api' | 'native-messaging';
  accountName: string;
}

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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
} 