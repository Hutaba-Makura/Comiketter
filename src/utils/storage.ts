// Chrome extension storage utility functions
import type { Settings, CustomBookmark, BookmarkedTweet, DownloadHistory, BookmarkStats } from '@/types';
import { FilenameSettingProps, AppSettings, PatternToken, AggregationToken } from '../types';
import { FilenameGenerator } from './filenameGenerator';
import { downloadHistoryDB, type DownloadHistoryDB, type DownloadHistoryStats } from './downloadHistoryDB';
import { bookmarkDB, type BookmarkDB, type BookmarkedTweetDB } from './bookmarkDB';

// ストレージキー定数
const STORAGE_KEYS = {
  SETTINGS: 'comiketter_settings',
  FILENAME_SETTINGS: 'comiketter_filename_settings',
  CUSTOM_BOOKMARKS: 'comiketter_custom_bookmarks',
  DOWNLOAD_HISTORY: 'comiketter_download_history',
} as const;

// デフォルト設定
const DEFAULT_SETTINGS: AppSettings = {
  tlAutoUpdateDisabled: false,
  downloadMethod: 'chrome_downloads',
  saveFormat: 'url',
  saveDirectory: 'comiketter',
  autoDownloadConditions: {
    retweet: false,
    like: false,
    both: false,
  },
  autoSaveTriggers: {
    retweet: false,
    like: false,
    retweetAndLike: false,
  },
  filenameSettings: {
    directory: 'comiketter',
    noSubDirectory: false,
    filenamePattern: [PatternToken.Account, PatternToken.TweetDate, PatternToken.TweetId, PatternToken.Serial],
    fileAggregation: false,
    groupBy: AggregationToken.Account,
  },
  mediaDownloadSettings: {
    includeVideoThumbnail: true, // 動画サムネイルを含める（テスト用）
    excludeProfileImages: true, // プロフィール画像は除外
    excludeBannerImages: true, // バナー画像は除外
  },
  timelineAutoUpdate: true,
  showCustomBookmarks: true,
};

/**
 * ストレージ管理クラス
 */
export class StorageManager {
  /**
   * 設定を取得
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 設定を保存
   */
  static async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: newSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * ファイル名設定を取得
   */
  static async getFilenameSettings(): Promise<FilenameSettingProps> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.FILENAME_SETTINGS);
      return result[STORAGE_KEYS.FILENAME_SETTINGS] || FilenameGenerator.getDefaultFilenameSettings();
    } catch (error) {
      console.error('Failed to get filename settings:', error);
      return FilenameGenerator.getDefaultFilenameSettings();
    }
  }

  /**
   * ファイル名設定を保存
   */
  static async saveFilenameSettings(settings: FilenameSettingProps): Promise<void> {
    try {
      // 設定の検証
      const validationError = FilenameGenerator.validateFilenameSettings(settings);
      if (validationError) {
        throw new Error(validationError);
      }

      await chrome.storage.local.set({ [STORAGE_KEYS.FILENAME_SETTINGS]: settings });
    } catch (error) {
      console.error('Failed to save filename settings:', error);
      throw error;
    }
  }

  /**
   * ファイル名設定をリセット
   */
  static async resetFilenameSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.FILENAME_SETTINGS]: FilenameGenerator.getDefaultFilenameSettings()
      });
    } catch (error) {
      console.error('Failed to reset filename settings:', error);
      throw error;
    }
  }

  /**
   * カスタムブックマークを取得
   */
  static async getCustomBookmarks(): Promise<CustomBookmark[]> {
    try {
      const bookmarks = await bookmarkDB.getActiveBookmarks();
      return bookmarks;
    } catch (error) {
      console.error('Failed to get custom bookmarks:', error);
      return [];
    }
  }

  /**
   * カスタムブックマークを保存
   */
  static async saveCustomBookmark(bookmark: Omit<CustomBookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomBookmark> {
    try {
      const savedBookmark = await bookmarkDB.addBookmark(bookmark);
      return savedBookmark;
    } catch (error) {
      console.error('Failed to save custom bookmark:', error);
      throw error;
    }
  }

  /**
   * カスタムブックマークを追加
   */
  static async addCustomBookmark(bookmark: Omit<CustomBookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomBookmark> {
    try {
      const savedBookmark = await bookmarkDB.addBookmark(bookmark);
      return savedBookmark;
    } catch (error) {
      console.error('Failed to add custom bookmark:', error);
      throw error;
    }
  }

  /**
   * カスタムブックマークを更新
   */
  static async updateCustomBookmark(id: string, updates: Partial<CustomBookmark>): Promise<void> {
    try {
      await bookmarkDB.updateBookmark(id, updates);
    } catch (error) {
      console.error('Failed to update custom bookmark:', error);
      throw error;
    }
  }

  /**
   * カスタムブックマークを削除
   */
  static async deleteCustomBookmark(id: string): Promise<void> {
    try {
      await bookmarkDB.deleteBookmark(id);
    } catch (error) {
      console.error('Failed to delete custom bookmark:', error);
      throw error;
    }
  }

  /**
   * ブックマーク統計を取得
   */
  static async getBookmarkStats(): Promise<BookmarkStats> {
    try {
      return await bookmarkDB.getBookmarkStats();
    } catch (error) {
      console.error('Failed to get bookmark stats:', error);
      return {
        totalBookmarks: 0,
        totalTweets: 0,
        activeBookmarks: 0,
        tweetsByBookmark: {},
      };
    }
  }

  /**
   * ブックマーク済みツイートを追加
   */
  static async addBookmarkedTweet(tweet: Omit<BookmarkedTweet, 'id' | 'savedAt'>): Promise<BookmarkedTweet> {
    try {
      const savedTweet = await bookmarkDB.addBookmarkedTweet(tweet);
      return savedTweet;
    } catch (error) {
      console.error('Failed to add bookmarked tweet:', error);
      throw error;
    }
  }

  /**
   * ブックマークIDでツイートを取得
   */
  static async getBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<BookmarkedTweet[]> {
    try {
      return await bookmarkDB.getBookmarkedTweetsByBookmarkId(bookmarkId);
    } catch (error) {
      console.error('Failed to get bookmarked tweets by bookmark ID:', error);
      return [];
    }
  }

  /**
   * ツイートIDでブックマーク済みツイートを取得
   */
  static async getBookmarkedTweetByTweetId(tweetId: string): Promise<BookmarkedTweet[]> {
    try {
      return await bookmarkDB.getBookmarkedTweetByTweetId(tweetId);
    } catch (error) {
      console.error('Failed to get bookmarked tweet by tweet ID:', error);
      return [];
    }
  }

  /**
   * ユーザー名でブックマーク済みツイートを検索
   */
  static async getBookmarkedTweetsByUsername(username: string): Promise<BookmarkedTweet[]> {
    try {
      return await bookmarkDB.getBookmarkedTweetsByUsername(username);
    } catch (error) {
      console.error('Failed to get bookmarked tweets by username:', error);
      return [];
    }
  }

  /**
   * ブックマーク済みツイートを更新
   */
  static async updateBookmarkedTweet(id: string, updates: Partial<BookmarkedTweet>): Promise<void> {
    try {
      await bookmarkDB.updateBookmarkedTweet(id, updates);
    } catch (error) {
      console.error('Failed to update bookmarked tweet:', error);
      throw error;
    }
  }

  /**
   * ブックマーク済みツイートを削除
   */
  static async deleteBookmarkedTweet(id: string): Promise<void> {
    try {
      await bookmarkDB.deleteBookmarkedTweet(id);
    } catch (error) {
      console.error('Failed to delete bookmarked tweet:', error);
      throw error;
    }
  }

  /**
   * ブックマークデータベースをクリア
   */
  static async clearBookmarkData(): Promise<void> {
    try {
      await bookmarkDB.clearAllData();
    } catch (error) {
      console.error('Failed to clear bookmark data:', error);
      throw error;
    }
  }

  /**
   * ダウンロード履歴を取得
   */
  static async getDownloadHistory(): Promise<DownloadHistory[]> {
    try {
      const histories = await downloadHistoryDB.getAllDownloadHistory();
      return histories;
    } catch (error) {
      console.error('Failed to get download history:', error);
      return [];
    }
  }

  /**
   * ダウンロード履歴を保存
   */
  static async saveDownloadHistory(history: Omit<DownloadHistory, 'id'>): Promise<DownloadHistory> {
    try {
      const savedHistory = await downloadHistoryDB.addDownloadHistory(history);
      return savedHistory;
    } catch (error) {
      console.error('Failed to save download history:', error);
      throw error;
    }
  }

  /**
   * ダウンロード履歴を追加
   */
  static async addDownloadHistory(history: Omit<DownloadHistory, 'id'>): Promise<DownloadHistory> {
    try {
      const savedHistory = await downloadHistoryDB.addDownloadHistory(history);
      return savedHistory;
    } catch (error) {
      console.error('Failed to add download history:', error);
      throw error;
    }
  }

  /**
   * ダウンロード履歴を更新
   */
  static async updateDownloadHistory(id: string, updates: Partial<DownloadHistory>): Promise<void> {
    try {
      await downloadHistoryDB.updateDownloadHistory(id, updates);
    } catch (error) {
      console.error('Failed to update download history:', error);
      throw error;
    }
  }

  /**
   * ダウンロード履歴を削除
   */
  static async deleteDownloadHistory(id: string): Promise<void> {
    try {
      await downloadHistoryDB.deleteDownloadHistory(id);
    } catch (error) {
      console.error('Failed to delete download history:', error);
      throw error;
    }
  }

  /**
   * ダウンロード履歴統計を取得
   */
  static async getDownloadHistoryStats(): Promise<DownloadHistoryStats> {
    try {
      return await downloadHistoryDB.getDownloadHistoryStats();
    } catch (error) {
      console.error('Failed to get download history stats:', error);
      return {
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * ツイートIDでダウンロード履歴を検索
   */
  static async getDownloadHistoryByTweetId(tweetId: string): Promise<DownloadHistory[]> {
    try {
      return await downloadHistoryDB.getDownloadHistoryByTweetId(tweetId);
    } catch (error) {
      console.error('Failed to get download history by tweet ID:', error);
      return [];
    }
  }

  /**
   * ユーザー名でダウンロード履歴を検索
   */
  static async getDownloadHistoryByUsername(username: string): Promise<DownloadHistory[]> {
    try {
      return await downloadHistoryDB.getDownloadHistoryByUsername(username);
    } catch (error) {
      console.error('Failed to get download history by username:', error);
      return [];
    }
  }

  /**
   * ステータスでダウンロード履歴を検索
   */
  static async getDownloadHistoryByStatus(status: 'success' | 'failed' | 'pending'): Promise<DownloadHistory[]> {
    try {
      return await downloadHistoryDB.getDownloadHistoryByStatus(status);
    } catch (error) {
      console.error('Failed to get download history by status:', error);
      return [];
    }
  }

  /**
   * 日付範囲でダウンロード履歴を検索
   */
  static async getDownloadHistoryByDateRange(startDate: string, endDate: string): Promise<DownloadHistory[]> {
    try {
      return await downloadHistoryDB.getDownloadHistoryByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Failed to get download history by date range:', error);
      return [];
    }
  }

  /**
   * ダウンロード履歴データベースをクリア
   */
  static async clearDownloadHistory(): Promise<void> {
    try {
      await downloadHistoryDB.clearAllData();
    } catch (error) {
      console.error('Failed to clear download history:', error);
      throw error;
    }
  }

  /**
   * 全データをクリア
   */
  static async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  /**
   * ストレージ使用量を取得
   */
  static async getStorageUsage(): Promise<number> {
    try {
      return await chrome.storage.local.getBytesInUse();
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      throw error;
    }
  }

  /**
   * ID生成
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
} 