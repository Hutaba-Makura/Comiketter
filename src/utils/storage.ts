// Chrome extension storage utility functions
import type { Settings, CustomBookmark, BookmarkedTweet, DownloadHistory } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  tlAutoUpdateDisabled: false,
  saveFormat: 'url',
  autoDownloadConditions: {
    retweet: false,
    like: false,
    both: false,
  },
  downloadMethod: 'chrome-api',
  saveDirectory: '',
};

export class StorageManager {
  // Settings management
  static async getSettings(): Promise<Settings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        resolve(result.settings || DEFAULT_SETTINGS);
      });
    });
  }

  static async saveSettings(settings: Partial<Settings>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ settings }, resolve);
    });
  }

  // Custom Bookmarks management
  static async getCustomBookmarks(): Promise<CustomBookmark[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customBookmarks'], (result) => {
        resolve(result.customBookmarks || []);
      });
    });
  }

  static async saveCustomBookmark(bookmark: CustomBookmark): Promise<void> {
    const bookmarks = await this.getCustomBookmarks();
    const existingIndex = bookmarks.findIndex((b) => b.id === bookmark.id);
    
    if (existingIndex >= 0) {
      bookmarks[existingIndex] = bookmark;
    } else {
      bookmarks.push(bookmark);
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ customBookmarks: bookmarks }, resolve);
    });
  }

  static async deleteCustomBookmark(bookmarkId: string): Promise<void> {
    const bookmarks = await this.getCustomBookmarks();
    const filteredBookmarks = bookmarks.filter((b) => b.id !== bookmarkId);

    return new Promise((resolve) => {
      chrome.storage.local.set({ customBookmarks: filteredBookmarks }, resolve);
    });
  }

  // Bookmarked Tweets management
  static async getBookmarkedTweets(): Promise<BookmarkedTweet[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['bookmarkedTweets'], (result) => {
        resolve(result.bookmarkedTweets || []);
      });
    });
  }

  static async saveBookmarkedTweet(bookmarkedTweet: BookmarkedTweet): Promise<void> {
    const bookmarkedTweets = await this.getBookmarkedTweets();
    const existingIndex = bookmarkedTweets.findIndex((bt) => bt.id === bookmarkedTweet.id);
    
    if (existingIndex >= 0) {
      bookmarkedTweets[existingIndex] = bookmarkedTweet;
    } else {
      bookmarkedTweets.push(bookmarkedTweet);
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ bookmarkedTweets }, resolve);
    });
  }

  static async deleteBookmarkedTweet(bookmarkedTweetId: string): Promise<void> {
    const bookmarkedTweets = await this.getBookmarkedTweets();
    const filteredTweets = bookmarkedTweets.filter((bt) => bt.id !== bookmarkedTweetId);

    return new Promise((resolve) => {
      chrome.storage.local.set({ bookmarkedTweets: filteredTweets }, resolve);
    });
  }

  // Download History management
  static async getDownloadHistory(): Promise<DownloadHistory[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['downloadHistory'], (result) => {
        resolve(result.downloadHistory || []);
      });
    });
  }

  static async saveDownloadHistory(history: DownloadHistory): Promise<void> {
    const downloadHistory = await this.getDownloadHistory();
    downloadHistory.push(history);

    return new Promise((resolve) => {
      chrome.storage.local.set({ downloadHistory }, resolve);
    });
  }

  static async clearDownloadHistory(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['downloadHistory'], resolve);
    });
  }
} 