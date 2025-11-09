/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ダウンロード履歴管理・API処理専用マネージャー
 * 画像処理はImageDownloaderに、動画処理はVideoDownloaderに移行済み
 */

import { StorageManager } from '../utils/storage';
import { ApiProcessor } from '../api-processor';
import { 
  DownloadHistory, 
  AppSettings 
} from '../types';

/**
 * ダウンロード履歴管理・API処理専用マネージャー
 * 画像・動画のダウンロード処理は専用クラスに移行済み
 */
export class DownloadManager {
  private settings: AppSettings | null = null;
  private apiProcessor: ApiProcessor;

  constructor() {
    this.apiProcessor = new ApiProcessor();
    this.initialize();
  }

  // ==================== 初期化・設定 ====================

  /**
   * 初期化処理
   */
  private async initialize(): Promise<void> {
    try {
      this.settings = await StorageManager.getSettings();
    } catch (error) {
      console.error('Comiketter: Failed to initialize DownloadManager:', error);
    }
  }

  /**
   * 設定を取得
   */
  private async getSettings(): Promise<AppSettings | null> {
    if (!this.settings) {
      try {
      this.settings = await StorageManager.getSettings();
      } catch (error) {
        console.error('Comiketter: Failed to get settings:', error);
      }
    }
    return this.settings;
  }

  /**
   * 設定を取得（パブリックメソッド）
   */
  async getCurrentSettings(): Promise<AppSettings | null> {
    return await this.getSettings();
  }

  /**
   * 設定を更新する
   */
  updateSettings(newSettings: AppSettings): void {
    this.settings = newSettings;
    console.log('Comiketter: DownloadManager settings updated');
  }

  // ==================== API処理 ====================

  /**
   * APIレスポンスを処理し、メディア情報を抽出
   * 画像・動画のダウンロード処理は専用クラスに移行済み
   */
  async processApiResponse(message: {
    path: string;
    data: unknown;
    timestamp: number;
  }): Promise<void> {
    try {
      const result = await this.apiProcessor.processApiResponse(message);
      
      // API処理結果をログ出力
      if (result.tweets.length > 0) {
        console.log(`Comiketter: API処理完了 - ${result.tweets.length}件のツイートを処理`);
      }

      if (result.errors.length > 0) {
        console.warn('Comiketter: API処理でエラーが発生しました:', result.errors);
      }
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  // ==================== ダウンロード履歴管理 ====================

  /**
   * ダウンロード履歴を取得
   */
  async getDownloadHistory(): Promise<DownloadHistory[]> {
    return await StorageManager.getDownloadHistory();
  }

  /**
   * ダウンロード履歴統計を取得
   */
  async getDownloadHistoryStats(): Promise<any> {
    return await StorageManager.getDownloadHistoryStats();
  }

  /**
   * ツイートIDでダウンロード履歴を検索
   */
  async getDownloadHistoryByTweetId(tweetId: string): Promise<DownloadHistory[]> {
    return await StorageManager.getDownloadHistoryByTweetId(tweetId);
  }

  /**
   * ユーザー名でダウンロード履歴を検索
   */
  async getDownloadHistoryByUsername(username: string): Promise<DownloadHistory[]> {
    return await StorageManager.getDownloadHistoryByUsername(username);
  }

  /**
   * ステータスでダウンロード履歴を検索
   */
  async getDownloadHistoryByStatus(status: 'success' | 'failed' | 'pending'): Promise<DownloadHistory[]> {
    return await StorageManager.getDownloadHistoryByStatus(status);
  }

  /**
   * 日付範囲でダウンロード履歴を検索
   */
  async getDownloadHistoryByDateRange(startDate: string, endDate: string): Promise<DownloadHistory[]> {
    return await StorageManager.getDownloadHistoryByDateRange(startDate, endDate);
  }

  /**
   * ダウンロード履歴を削除
   */
  async deleteDownloadHistory(id: string): Promise<void> {
    return await StorageManager.deleteDownloadHistory(id);
  }

  /**
   * ダウンロード履歴をクリア
   */
  async clearDownloadHistory(): Promise<void> {
    return await StorageManager.clearDownloadHistory();
  }

  /**
   * ダウンロード状態を更新
   */
  async updateDownloadStatus(downloadId: number, status: 'pending' | 'failed' | 'success'): Promise<void> {
    try {
      const downloadItem = await chrome.downloads.search({ id: downloadId });
      if (downloadItem.length > 0) {
        const historyId = downloadId.toString();
        try {
          await StorageManager.updateDownloadHistory(historyId, { 
            status: status,
            ...(status === 'success' && { 
              fileSize: downloadItem[0].fileSize 
            })
          });
          console.log('Comiketter: Download status updated:', { downloadId, status });
        } catch (error) {
          // 存在しないIDの場合は警告のみ（updateDownloadHistory内で処理済み）
          // その他のエラーのみログ出力
          if (error instanceof Error && !error.message.includes('not found')) {
            console.error('Comiketter: Failed to update download status:', error);
          }
        }
      }
    } catch (error) {
      console.error('Comiketter: Failed to update download status:', error);
    }
  }

  // ==================== テスト・デバッグ ====================

  /**
   * テスト用のダウンロード機能
   */
  async testDownload(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return { success: response.ok };
    } catch (error) {
      console.error('Comiketter: Test download failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

