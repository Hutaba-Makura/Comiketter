// Chrome extension storage utility functions
import type { Settings, CustomBookmark, BookmarkedTweet, DownloadHistory } from '@/types';
import { FilenameSettingProps, AppSettings } from '../types';
import { FilenameGenerator } from './filenameGenerator';

// ストレージキー定数
const STORAGE_KEYS = {
  SETTINGS: 'comiketter_settings',
  FILENAME_SETTINGS: 'comiketter_filename_settings',
  CUSTOM_BOOKMARKS: 'comiketter_custom_bookmarks',
  DOWNLOAD_HISTORY: 'comiketter_download_history',
} as const;

// デフォルト設定
const DEFAULT_SETTINGS: AppSettings = {
  // 基本設定
  tlAutoUpdateDisabled: false,
  
  // ダウンロード設定
  downloadMethod: 'chrome-api',
  saveFormat: 'mixed',
  saveDirectory: 'comiketter',
  
  // 自動ダウンロード条件
  autoDownloadConditions: {
    retweet: false,
    like: false,
    both: false,
  },
  
  // 自動保存トリガー
  autoSaveTriggers: {
    retweet: false,
    like: false,
    retweetAndLike: false,
  },
  
  // ファイル名・パス設定
  filenameSettings: FilenameGenerator.getDefaultFilenameSettings(),
  
  // UI設定
  timelineAutoUpdate: false,
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
      const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_BOOKMARKS);
      return result[STORAGE_KEYS.CUSTOM_BOOKMARKS] || [];
    } catch (error) {
      console.error('Failed to get custom bookmarks:', error);
      return [];
    }
  }

  /**
   * カスタムブックマークを保存
   */
  static async saveCustomBookmarks(bookmarks: CustomBookmark[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_BOOKMARKS]: bookmarks });
    } catch (error) {
      console.error('Failed to save custom bookmarks:', error);
      throw error;
    }
  }

  /**
   * カスタムブックマークを追加
   */
  static async addCustomBookmark(bookmark: Omit<CustomBookmark, 'id' | 'createdAt' | 'updatedAt' | 'tweetCount'>): Promise<CustomBookmark> {
    try {
      const bookmarks = await this.getCustomBookmarks();
      const newBookmark: CustomBookmark = {
        ...bookmark,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tweetCount: 0,
      };
      
      bookmarks.push(newBookmark);
      await this.saveCustomBookmarks(bookmarks);
      return newBookmark;
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
      const bookmarks = await this.getCustomBookmarks();
      const index = bookmarks.findIndex(b => b.id === id);
      if (index === -1) {
        throw new Error(`Bookmark with id ${id} not found`);
      }

      bookmarks[index] = {
        ...bookmarks[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await this.saveCustomBookmarks(bookmarks);
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
      const bookmarks = await this.getCustomBookmarks();
      const filteredBookmarks = bookmarks.filter(b => b.id !== id);
      await this.saveCustomBookmarks(filteredBookmarks);
    } catch (error) {
      console.error('Failed to delete custom bookmark:', error);
      throw error;
    }
  }

  /**
   * ダウンロード履歴を取得
   */
  static async getDownloadHistory(): Promise<DownloadHistory[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.DOWNLOAD_HISTORY);
      return result[STORAGE_KEYS.DOWNLOAD_HISTORY] || [];
    } catch (error) {
      console.error('Failed to get download history:', error);
      return [];
    }
  }

  /**
   * ダウンロード履歴を保存
   */
  static async saveDownloadHistory(history: DownloadHistory[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.DOWNLOAD_HISTORY]: history });
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
      const histories = await this.getDownloadHistory();
      const newHistory: DownloadHistory = {
        ...history,
        id: this.generateId(),
      };
      
      histories.push(newHistory);
      await this.saveDownloadHistory(histories);
      return newHistory;
    } catch (error) {
      console.error('Failed to add download history:', error);
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