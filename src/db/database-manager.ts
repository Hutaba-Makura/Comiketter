/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 統合データベース管理クラス
 */

import { BookmarkDatabase, bookmarkDB } from './bookmark-db';
import { DownloadHistoryDatabase, downloadHistoryDB } from './download-history-db';
import { SettingsDatabase, settingsDB } from './settings-db';

export interface DatabaseStats {
  bookmarks: {
    totalBookmarks: number;
    totalTweets: number;
    activeBookmarks: number;
  };
  downloadHistory: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    totalSize: number;
  };
  settings: {
    totalSettings: number;
  };
}

export class DatabaseManager {
  private bookmarkDB: BookmarkDatabase;
  private downloadHistoryDB: DownloadHistoryDatabase;
  private settingsDB: SettingsDatabase;

  constructor() {
    this.bookmarkDB = bookmarkDB;
    this.downloadHistoryDB = downloadHistoryDB;
    this.settingsDB = settingsDB;
  }

  /**
   * 全データベースを初期化
   */
  async initAll(): Promise<void> {
    try {
      await Promise.all([
        this.bookmarkDB.init(),
        this.downloadHistoryDB.init(),
        this.settingsDB.init(),
      ]);
      console.log('Comiketter: All databases initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize databases:', error);
      throw error;
    }
  }

  /**
   * 全データベースの統計情報を取得
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [bookmarkStats, downloadStats, settings] = await Promise.all([
        this.bookmarkDB.getBookmarkStats(),
        this.downloadHistoryDB.getDownloadHistoryStats(),
        this.settingsDB.getAllSettings(),
      ]);

      return {
        bookmarks: {
          totalBookmarks: bookmarkStats.totalBookmarks,
          totalTweets: bookmarkStats.totalTweets,
          activeBookmarks: bookmarkStats.activeBookmarks,
        },
        downloadHistory: {
          total: downloadStats.total,
          success: downloadStats.success,
          failed: downloadStats.failed,
          pending: downloadStats.pending,
          totalSize: downloadStats.totalSize,
        },
        settings: {
          totalSettings: settings.length,
        },
      };
    } catch (error) {
      console.error('Comiketter: Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * 全データベースのデータをクリア
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        this.bookmarkDB.clearAllData(),
        this.downloadHistoryDB.clearAllData(),
        this.settingsDB.clearAllData(),
      ]);
      console.log('Comiketter: All database data cleared successfully');
    } catch (error) {
      console.error('Comiketter: Failed to clear database data:', error);
      throw error;
    }
  }

  /**
   * 全データベースを削除
   */
  async deleteAllDatabases(): Promise<void> {
    try {
      await Promise.all([
        this.bookmarkDB.deleteDatabase(),
        this.downloadHistoryDB.deleteDatabase(),
        this.settingsDB.deleteDatabase(),
      ]);
      console.log('Comiketter: All databases deleted successfully');
    } catch (error) {
      console.error('Comiketter: Failed to delete databases:', error);
      throw error;
    }
  }

  /**
   * テスト用リセット
   */
  async resetForTesting(): Promise<void> {
    try {
      await Promise.all([
        this.bookmarkDB.resetForTesting(),
        this.downloadHistoryDB.resetForTesting(),
        this.settingsDB.resetForTesting(),
      ]);
      console.log('Comiketter: All databases reset for testing');
    } catch (error) {
      console.error('Comiketter: Failed to reset databases for testing:', error);
      throw error;
    }
  }

  /**
   * データベースの健全性チェック
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.initAll();
      const stats = await this.getDatabaseStats();
      
      // 基本的な健全性チェック
      const isHealthy = 
        stats.bookmarks.totalBookmarks >= 0 &&
        stats.downloadHistory.total >= 0 &&
        stats.settings.totalSettings >= 0;

      console.log('Comiketter: Database health check completed:', isHealthy);
      return isHealthy;
    } catch (error) {
      console.error('Comiketter: Database health check failed:', error);
      return false;
    }
  }

  /**
   * データベースのバックアップ（簡易版）
   */
  async exportData(): Promise<{
    bookmarks: any[];
    downloadHistory: any[];
    settings: any[];
  }> {
    try {
      const [bookmarks, downloadHistory, settings] = await Promise.all([
        this.bookmarkDB.getAllBookmarks(),
        this.downloadHistoryDB.getAllDownloadHistory(),
        this.settingsDB.getAllSettings(),
      ]);

      return {
        bookmarks,
        downloadHistory,
        settings,
      };
    } catch (error) {
      console.error('Comiketter: Failed to export data:', error);
      throw error;
    }
  }

  /**
   * データベースの復元（簡易版）
   */
  async importData(data: {
    bookmarks: any[];
    downloadHistory: any[];
    settings: any[];
  }): Promise<void> {
    try {
      // 既存データをクリア
      await this.clearAllData();

      // 新しいデータをインポート
      for (const bookmark of data.bookmarks) {
        await this.bookmarkDB.addBookmark(bookmark);
      }

      for (const history of data.downloadHistory) {
        await this.downloadHistoryDB.addDownloadHistory(history);
      }

      for (const setting of data.settings) {
        await this.settingsDB.setSetting(
          setting.key,
          setting.value,
          setting.description,
          setting.category
        );
      }

      console.log('Comiketter: Data imported successfully');
    } catch (error) {
      console.error('Comiketter: Failed to import data:', error);
      throw error;
    }
  }

  /**
   * 個別のDBインスタンスを取得
   */
  getBookmarkDB(): BookmarkDatabase {
    return this.bookmarkDB;
  }

  getDownloadHistoryDB(): DownloadHistoryDatabase {
    return this.downloadHistoryDB;
  }

  getSettingsDB(): SettingsDatabase {
    return this.settingsDB;
  }
}

// シングルトンインスタンス
export const databaseManager = new DatabaseManager(); 