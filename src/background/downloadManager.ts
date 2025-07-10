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
import { 
  DownloadHistory, 
  DownloadHistoryStats, 
  TweetMediaFileProps, 
  AppSettings 
} from '../types';

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
  private mediaCache: Map<string, TweetMediaFileProps[]> = new Map();

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
    
    try {
      // GraphQLレスポンスの解析
      if (message.path.includes('/graphql/')) {
        this.processGraphQLResponse(message.data);
      }
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  /**
   * GraphQLレスポンスを処理してメディア情報を抽出
   */
  private processGraphQLResponse(data: unknown): void {
    try {
      const response = data as any;
      
      // ツイート情報を抽出
      if (response.data && response.data.instructions) {
        for (const instruction of response.data.instructions) {
          if (instruction.type === 'TimelineAddEntries') {
            for (const entry of instruction.entries) {
              if (entry.content && entry.content.itemContent) {
                this.extractMediaFromTweet(entry.content.itemContent);
              }
            }
          }
        }
      }

      // 直接的なツイート情報
      if (response.data && response.data.tweet) {
        this.extractMediaFromTweet(response.data.tweet);
      }

      // タイムラインエントリー
      if (response.data && response.data.user && response.data.user.result && response.data.user.result.timeline_v2) {
        const timeline = response.data.user.result.timeline_v2.timeline.instructions;
        for (const instruction of timeline) {
          if (instruction.type === 'TimelineAddEntries') {
            for (const entry of instruction.entries) {
              if (entry.content && entry.content.itemContent) {
                this.extractMediaFromTweet(entry.content.itemContent);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Comiketter: Failed to process GraphQL response:', error);
    }
  }

  /**
   * ツイートからメディア情報を抽出
   */
  private extractMediaFromTweet(tweetData: any): void {
    try {
      const tweet = tweetData.tweet_results?.result || tweetData;
      if (!tweet || !tweet.legacy) return;

      const legacy = tweet.legacy;
      const tweetId = legacy.id_str;
      const user = tweet.core?.user_results?.result?.legacy || {};
      
      const mediaFiles: TweetMediaFileProps[] = [];

      // メディア情報を抽出
      if (legacy.extended_entities && legacy.extended_entities.media) {
        for (const media of legacy.extended_entities.media) {
          if (media.type === 'photo') {
            // 画像の場合、最高品質のURLを取得
            const photoUrl = media.media_url_https || media.media_url;
            if (photoUrl) {
              mediaFiles.push({
                tweetId,
                source: photoUrl,
                tweetUser: {
                  screenName: user.screen_name || '',
                  userId: user.id_str || '',
                  displayName: user.name || user.screen_name || '',
                  isProtected: user.protected || false,
                },
                type: 'image',
                ext: this.getFileExtension(photoUrl),
                serial: mediaFiles.length + 1,
                hash: this.generateHash(photoUrl),
                createdAt: new Date(),
              });
            }
          } else if (media.type === 'video') {
            // 動画の場合、最高品質のURLを取得
            const videoInfo = media.video_info;
            if (videoInfo && videoInfo.variants) {
              const videoVariant = videoInfo.variants
                .filter((v: any) => v.content_type === 'video/mp4')
                .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
              
              if (videoVariant && videoVariant.url) {
                mediaFiles.push({
                  tweetId,
                  source: videoVariant.url,
                  tweetUser: {
                    screenName: user.screen_name || '',
                    userId: user.id_str || '',
                    displayName: user.name || user.screen_name || '',
                    isProtected: user.protected || false,
                  },
                  type: 'video',
                  ext: 'mp4',
                  serial: mediaFiles.length + 1,
                  hash: this.generateHash(videoVariant.url),
                  createdAt: new Date(),
                });
              }
            }
          }
        }
      }

      // キャッシュに保存
      if (mediaFiles.length > 0) {
        this.mediaCache.set(tweetId, mediaFiles);
        console.log('Comiketter: Media info cached for tweet:', tweetId, mediaFiles.length, 'files');
      }
    } catch (error) {
      console.error('Comiketter: Failed to extract media from tweet:', error);
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
        authorUsername: mediaFile.tweetUser.screenName,
        authorDisplayName: mediaFile.tweetUser.displayName,
        authorId: mediaFile.tweetUser.id,
        filename: filename,
        filepath: filename, // 実際のパスはChromeが管理
        originalUrl: mediaFile.source,
        downloadMethod: currentSettings.downloadMethod,
        fileType: this.getFileTypeFromUrl(mediaFile.source),
        downloadedAt: new Date().toISOString(),
        status: 'pending',
        tweetContent: mediaFile.tweetContent,
        mediaUrls: mediaFile.mediaUrls,
        mediaTypes: mediaFile.mediaTypes,
        tweetDate: mediaFile.tweetDate,
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
      conflictAction: 'uniquify'
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
   * URLからファイルタイプを取得
   */
  private getFileTypeFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'avi':
        return 'video/x-msvideo';
      default:
        return 'application/octet-stream';
    }
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
      // キャッシュからメディア情報を取得
      const cachedMedia = this.mediaCache.get(tweetId);
      if (cachedMedia && cachedMedia.length > 0) {
        console.log('Comiketter: Found cached media for tweet:', tweetId, cachedMedia.length, 'files');
        return cachedMedia;
      }

      console.log('Comiketter: No cached media found for tweet:', tweetId);
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
      
      // 履歴を更新
      await StorageManager.updateDownloadHistory(history.id, { 
        status: statusString,
        ...(status === DownloadStatus.Complete && { 
          fileSize: await this.getDownloadedFileSize(downloadId) 
        })
      });
      
      if (status === DownloadStatus.Complete || status === DownloadStatus.Failed) {
        this.downloadHistory.delete(downloadId);
      }
    }
  }

  /**
   * ダウンロードされたファイルのサイズを取得
   */
  private async getDownloadedFileSize(downloadId: number): Promise<number | undefined> {
    try {
      const downloadItem = await chrome.downloads.search({ id: downloadId });
      return downloadItem[0]?.fileSize;
    } catch (error) {
      console.error('Comiketter: Failed to get download file size:', error);
      return undefined;
    }
  }

  /**
   * ダウンロード履歴を取得
   */
  async getDownloadHistory(): Promise<DownloadHistory[]> {
    return await StorageManager.getDownloadHistory();
  }

  /**
   * ダウンロード履歴統計を取得
   */
  async getDownloadHistoryStats(): Promise<DownloadHistoryStats> {
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
   * 設定を更新する
   * @param newSettings 新しい設定
   */
  updateSettings(newSettings: AppSettings): void {
    this.settings = newSettings;
    console.log('Comiketter: DownloadManager settings updated');
  }
} 