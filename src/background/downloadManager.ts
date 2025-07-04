/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest browserDownloadMediaFile.ts
 */

// Download Manager for media download functionality
import { FilenameGenerator } from '../utils/filenameGenerator';
import { StorageManager } from '../utils/storage';
import type { TweetMediaFileProps, DownloadHistory, AppSettings } from '../types';

export enum DownloadStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Complete = 'complete',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface DownloadRequest {
  tweetId: string;
  screenName: string;
  mediaUrls?: string[];
}

export class DownloadManager {
  private settings: AppSettings | null = null;
  private downloadHistory: Map<number, DownloadHistory> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.settings = await StorageManager.getSettings();
      console.log('Comiketter: DownloadManager initialized');
    } catch (error) {
      console.error('Comiketter: Failed to initialize DownloadManager:', error);
    }
  }

  /**
   * APIレスポンスを処理し、必要に応じてダウンロードを実行する
   * @param message APIレスポンスメッセージ
   */
  processApiResponse(message: {
    path: string;
    data: unknown;
    timestamp: number;
  }): void {
    console.log('Comiketter: DownloadManager processing API response:', message.path);
    
    // TODO: 特定のAPIパスに対する処理を実装
    // 例: ツイート情報の抽出、メディアURLの取得、ダウンロード実行など
    
    // 現在はログ出力のみ
    if (message.path.includes('/graphql/')) {
      console.log('Comiketter: GraphQL API response detected');
      // TODO: GraphQLレスポンスの解析とダウンロード処理
    }
  }

  /**
   * ツイートメディアのダウンロードを開始
   */
  async downloadTweetMedia(request: DownloadRequest): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Comiketter: Starting download for tweet:', request.tweetId);

      // 設定を取得
      const settings = await this.getSettings();
      if (!settings) {
        throw new Error('Settings not available');
      }

      // メディアURLを取得（API傍受から取得済みの場合）
      let mediaUrls = request.mediaUrls;
      if (!mediaUrls || mediaUrls.length === 0) {
        // API傍受からメディア情報を取得
        const cachedMedia = await this.getCachedMediaInfo(request.tweetId);
        if (cachedMedia) {
          mediaUrls = cachedMedia.map(media => media.source);
        }
      }

      if (!mediaUrls || mediaUrls.length === 0) {
        throw new Error('No media found for this tweet');
      }

      // 各メディアファイルをダウンロード
      const downloadPromises = mediaUrls.map((url, index) => 
        this.downloadMediaFile({
          tweetId: request.tweetId,
          source: url,
          tweetUser: { 
            screenName: request.screenName,
            userId: '',
            displayName: request.screenName,
            isProtected: false
          },
          type: this.detectMediaType(url),
          ext: this.getFileExtension(url),
          serial: index + 1,
          hash: this.generateHash(url),
          createdAt: new Date(),
        }, settings)
      );

      await Promise.all(downloadPromises);

      console.log('Comiketter: Download completed for tweet:', request.tweetId);
      return { success: true };

    } catch (error) {
      console.error('Comiketter: Download failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * メディアファイルをダウンロードする
   * @param mediaFile メディアファイル情報
   * @param settings 設定（省略時は現在の設定を使用）
   */
  async downloadMediaFile(
    mediaFile: TweetMediaFileProps,
    settings?: AppSettings
  ): Promise<DownloadHistory> {
    const currentSettings = settings || this.settings;
    if (!currentSettings) {
      throw new Error('Settings not available for download');
    }

    try {
      // ファイル名を生成
      const filename = FilenameGenerator.makeFilename(mediaFile, currentSettings.filenameSettings);
      
      // ダウンロード実行
      const downloadId = await this.executeDownload(mediaFile.source, filename, currentSettings);
      
      // ダウンロード履歴を作成
      const downloadHistory: Omit<DownloadHistory, 'id'> = {
        tweetId: mediaFile.tweetId,
        fileName: filename,
        filePath: filename, // 実際のパスはChromeが管理
        downloadUrl: mediaFile.source,
        downloadedAt: new Date().toISOString(),
        downloadMethod: currentSettings.downloadMethod,
        accountName: mediaFile.tweetUser.screenName,
        mediaUrl: mediaFile.source,
        status: DownloadStatus.Pending,
      };

      // 履歴を保存
      const savedHistory = await StorageManager.addDownloadHistory(downloadHistory);
      
      // ダウンロードIDを履歴に保存
      this.downloadHistory.set(downloadId, savedHistory);
      
      console.log('Comiketter: Media file download started:', filename);
      return savedHistory;
    } catch (error) {
      console.error('Comiketter: Failed to download media file:', error);
      throw error;
    }
  }

  /**
   * Chrome APIを使用してダウンロードを実行
   */
  private async executeDownload(
    url: string, 
    filename: string, 
    settings: AppSettings
  ): Promise<number> {
    const downloadOptions: chrome.downloads.DownloadOptions = {
      url: url,
      filename: filename,
      saveAs: false, // 設定に応じて変更可能
      conflictAction: 'uniquify',
      headers: [
        {
          name: 'Referer',
          value: 'https://x.com/'
        }
      ]
    };

    // サブディレクトリが設定されている場合
    if (!settings.filenameSettings.noSubDirectory && settings.filenameSettings.directory) {
      downloadOptions.filename = `${settings.filenameSettings.directory}/${filename}`;
    }

    try {
      const downloadId = await chrome.downloads.download(downloadOptions);
      
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }

      return downloadId;
    } catch (error) {
      console.error('Comiketter: Chrome download failed:', error);
      throw error;
    }
  }

  /**
   * メディアタイプを検出
   */
  private detectMediaType(url: string): 'image' | 'video' {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    
    const urlLower = url.toLowerCase();
    
    if (imageExtensions.some(ext => urlLower.includes(ext))) {
      return 'image';
    }
    
    if (videoExtensions.some(ext => urlLower.includes(ext))) {
      return 'video';
    }
    
    // URLパターンから判定
    if (urlLower.includes('pbs.twimg.com/media/')) {
      return 'image';
    }
    
    if (urlLower.includes('video.twimg.com/')) {
      return 'video';
    }
    
    // デフォルトは画像
    return 'image';
  }

  /**
   * ファイル拡張子を取得
   */
  private getFileExtension(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
    if (urlLower.includes('.png')) return 'png';
    if (urlLower.includes('.gif')) return 'gif';
    if (urlLower.includes('.webp')) return 'webp';
    if (urlLower.includes('.mp4')) return 'mp4';
    if (urlLower.includes('.mov')) return 'mov';
    if (urlLower.includes('.avi')) return 'avi';
    if (urlLower.includes('.webm')) return 'webm';
    
    // デフォルト
    return 'jpg';
  }

  /**
   * ハッシュ値を生成
   */
  private generateHash(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * キャッシュされたメディア情報を取得
   */
  private async getCachedMediaInfo(tweetId: string): Promise<TweetMediaFileProps[] | null> {
    try {
      // API傍受でキャッシュされたメディア情報を取得
      // TODO: 実装予定のgetTweetCacheメソッドを使用
      console.warn('Comiketter: getTweetCache not implemented yet');
      return null;
    } catch (error) {
      console.warn('Comiketter: Failed to get cached media info:', error);
      return null;
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
   * ダウンロード状態を更新
   */
  async updateDownloadStatus(downloadId: number, status: DownloadStatus): Promise<void> {
    const history = this.downloadHistory.get(downloadId);
    if (history) {
      const statusString = status === DownloadStatus.Complete ? 'success' : 
                          status === DownloadStatus.Failed ? 'failed' : 'pending';
      history.status = statusString;
      await StorageManager.updateDownloadHistory(history.id, { status: statusString });
      
      if (status === DownloadStatus.Complete || status === DownloadStatus.Failed) {
        this.downloadHistory.delete(downloadId);
      }
    }
  }

  /**
   * ダウンロード履歴を取得
   */
  async getDownloadHistory(): Promise<DownloadHistory[]> {
    return await StorageManager.getDownloadHistory();
  }

  /**
   * ダウンロード履歴をクリア
   */
  async clearDownloadHistory(): Promise<void> {
    // TODO: StorageManagerにclearDownloadHistoryメソッドを追加予定
    console.warn('Comiketter: clearDownloadHistory not implemented yet');
    this.downloadHistory.clear();
  }

  /**
   * 設定を更新する
   * @param newSettings 新しい設定
   */
  updateSettings(newSettings: AppSettings): void {
    this.settings = newSettings;
    console.log('Comiketter: DownloadManager settings updated');
  }
} 