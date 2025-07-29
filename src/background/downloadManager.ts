/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest browserDownloadMediaFile.ts
 */

import { FilenameGenerator } from '../utils/filenameGenerator';
import { StorageManager } from '../utils/storage';
import { ApiProcessor } from '../api-processor';
import { 
  DownloadHistory, 
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

/**
 * ダウンロードマネージャー - TwitterMediaHarvest準拠のシンプルな実装
 */
export class DownloadManager {
  private settings: AppSettings | null = null;
  private mediaCache: Map<string, TweetMediaFileProps[]> = new Map();
  private apiProcessor: ApiProcessor;

  constructor() {
    this.apiProcessor = new ApiProcessor();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.settings = await StorageManager.getSettings();
    } catch (error) {
      console.error('Comiketter: Failed to initialize DownloadManager:', error);
    }
  }

  /**
   * APIレスポンスを処理し、メディア情報を抽出
   */
  async processApiResponse(message: {
    path: string;
    data: unknown;
    timestamp: number;
  }): Promise<void> {
    try {
      // 新しいAPI処理構造を使用
      const result = await this.apiProcessor.processApiResponse(message);
      
      // 抽出されたツイートからメディア情報をキャッシュに保存
      for (const tweet of result.tweets) {
        if (tweet.media && tweet.media.length > 0) {
          const mediaFiles = this.convertToMediaFiles(tweet);
          this.mediaCache.set(tweet.id_str, mediaFiles);
        }
      }

      // エラーがあればログ出力
      if (result.errors.length > 0) {
        console.warn('Comiketter: API処理でエラーが発生しました:', result.errors);
      }
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  /**
   * ProcessedTweetをTweetMediaFilePropsに変換
   */
  private convertToMediaFiles(tweet: any): TweetMediaFileProps[] {
    const mediaFiles: TweetMediaFileProps[] = [];
    
    if (!tweet.media || !Array.isArray(tweet.media)) {
      return mediaFiles;
    }

    for (let i = 0; i < tweet.media.length; i++) {
      const media = tweet.media[i];
      const mediaType = this.detectMediaType(media.media_url_https);
      
      if (mediaType === 'image' || mediaType === 'thumbnail') {
        // 画像の場合
        const mediaFile = this.createMediaFile({
          tweetId: tweet.id_str,
          source: media.media_url_https,
          user: tweet.user,
          type: 'image',
          ext: this.getFileExtension(media.media_url_https),
          serial: i + 1,
          tweetContent: tweet.full_text,
          tweetDate: tweet.created_at,
          mediaKey: media.id_str
        });
        mediaFiles.push(mediaFile);
      } else if (mediaType === 'video' && media.video_info?.variants) {
        // 動画の場合
        const bestVariant = this.selectBestVideoVariant(media.video_info.variants);
        if (bestVariant) {
          const mediaFile = this.createMediaFile({
            tweetId: tweet.id_str,
            source: bestVariant.url,
            user: tweet.user,
            type: 'video',
            ext: this.getFileExtension(bestVariant.url),
            serial: i + 1,
            tweetContent: tweet.full_text,
            tweetDate: tweet.created_at,
            mediaKey: media.id_str
          });
          mediaFiles.push(mediaFile);
        }
      }
    }

    return mediaFiles;
  }

  /**
   * インストラクションからメディア情報を抽出
   */
  private extractMediaFromInstructions(instructions: any[]): void {
    for (const instruction of instructions) {
      if (instruction.type === 'TimelineAddEntries' && Array.isArray(instruction.entries)) {
        for (const entry of instruction.entries) {
          const itemContent = entry?.content?.itemContent;
          if (itemContent?.tweet_results?.result) {
            this.extractMediaFromTweet(itemContent.tweet_results.result);
          }
        }
      }
    }
  }

  /**
   * ツイートからメディア情報を抽出
   */
  private extractMediaFromTweet(tweet: any): void {
    try {
      if (!tweet?.legacy) return;
      
      const legacy = tweet.legacy;
      const tweetId = legacy.id_str;
      const user = tweet.core?.user_results?.result?.legacy || {};
      const mediaFiles: TweetMediaFileProps[] = [];

      // メディア情報を抽出
      if (legacy.extended_entities?.media) {
        let imageIndex = 0;
        let videoIndex = 0;
        
        for (const media of legacy.extended_entities.media) {
          if (media.type === 'photo') {
            const photoUrl = media.media_url_https || media.media_url;
            if (photoUrl && !this.isProfileOrBannerImage(photoUrl)) {
              mediaFiles.push(this.createMediaFile({
                tweetId,
                source: photoUrl,
                user,
                type: 'image',
                ext: this.getFileExtension(photoUrl),
                serial: ++imageIndex,
                tweetContent: legacy.full_text || '',
                tweetDate: legacy.created_at || '',
              }));
            }
          } else if (media.type === 'video' || media.type === 'animated_gif') {
            const videoInfo = media.video_info;
            if (videoInfo?.variants?.length > 0) {
              const bestVariant = this.selectBestVideoVariant(videoInfo.variants);
              if (bestVariant?.url) {
                mediaFiles.push(this.createMediaFile({
                  tweetId,
                  source: bestVariant.url,
                  user,
                  type: 'video',
                  ext: 'mp4',
                  serial: ++videoIndex,
                  tweetContent: legacy.full_text || '',
                  tweetDate: legacy.created_at || '',
                  mediaKey: media.media_key || '',
                }));
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
   * メディアファイルオブジェクトを作成
   */
  private createMediaFile(params: {
    tweetId: string;
    source: string;
    user: any;
    type: 'image' | 'video';
    ext: string;
    serial: number;
    tweetContent: string;
    tweetDate: string;
    mediaKey?: string;
  }): TweetMediaFileProps {
    return {
      tweetId: params.tweetId,
      source: params.source,
      tweetUser: {
        screenName: params.user.screen_name || '',
        userId: params.user.id_str || '',
        displayName: params.user.name || params.user.screen_name || '',
        isProtected: params.user.protected || false,
      },
      type: params.type,
      ext: params.ext,
      serial: params.serial,
      hash: this.generateHash(params.source),
      createdAt: new Date(),
      tweetContent: params.tweetContent,
      tweetDate: params.tweetDate,
      ...(params.mediaKey && { mediaKey: params.mediaKey }),
    };
  }

  /**
   * 動画バリアントから最高ビットレートのものを選択
   */
  private selectBestVideoVariant(variants: any[]): any {
    const mp4Variants = variants.filter((v: any) => v.content_type === 'video/mp4');
    if (mp4Variants.length === 0) return null;
    
    return mp4Variants.reduce((prev: any, curr: any) => {
      const prevBitrate = prev.bitrate || 0;
      const currBitrate = curr.bitrate || 0;
      return currBitrate >= prevBitrate ? curr : prev;
    });
  }

  /**
   * プロフィール画像やバナー画像かどうかを判定
   */
  private isProfileOrBannerImage(url: string): boolean {
    const urlLower = url.toLowerCase();
    const profilePatterns = [
      '/profile_images/',
      '/profile_banners/',
      '/profile_images_normal/',
      '/profile_images_bigger/',
      '/profile_images_mini/',
    ];
    
    return profilePatterns.some(pattern => urlLower.includes(pattern));
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
    
    // 動画URLの場合はmp4を返す
    if (urlLower.includes('video.twimg.com/')) {
      return 'mp4';
    }
    
    // 画像URLの場合はjpgを返す
    if (urlLower.includes('pbs.twimg.com/media/')) {
      return 'jpg';
    }
    
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
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * ツイートメディアのダウンロードを開始
   */
  async downloadTweetMedia(request: DownloadRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings();
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      let mediaFiles: TweetMediaFileProps[] = [];

      // キャッシュから取得
      if (!request.mediaUrls) {
        const cachedMedia = this.mediaCache.get(request.tweetId);
        if (cachedMedia) {
          mediaFiles = cachedMedia;
        }
      } else {
        // 直接URLが提供されている場合
        mediaFiles = request.mediaUrls.map((url, index) => ({
          source: url,
          type: this.detectMediaType(url),
          tweetId: request.tweetId,
          mediaKey: this.generateHash(url),
          tweetUser: {
            screenName: request.screenName,
            userId: '',
            displayName: request.screenName,
            isProtected: false
          },
          createdAt: new Date(),
          serial: index + 1,
          hash: this.generateHash(url),
          ext: this.getFileExtension(url),
          tweetContent: '',
          tweetDate: '',
        }));
      }

      // メディアファイルをフィルタリング
      const filteredMediaFiles = mediaFiles.filter(mediaFile => {
        if (mediaFile.source.includes('thumb') || mediaFile.source.includes('small')) {
          return false;
        }
        if (this.isProfileOrBannerImage(mediaFile.source)) {
          return false;
        }
        return true;
      });

      if (filteredMediaFiles.length === 0) {
        return { success: false, error: 'No valid media files found' };
      }

      // ダウンロードを実行
      const downloadPromises = filteredMediaFiles.map(mediaFile => 
        this.downloadMediaFile(mediaFile, settings)
      );

      await Promise.all(downloadPromises);
      return { success: true };
    } catch (error) {
      console.error('Comiketter: Download failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * メディアタイプを検出
   */
  private detectMediaType(url: string): 'image' | 'thumbnail' | 'video' {
    const urlLower = url.toLowerCase();
    
    const thumbnailPatterns = [
      'thumb', 'small', 'mini', '_normal', '_bigger', '_mini',
      'profile_images_normal', 'profile_images_bigger', 'profile_images_mini',
    ];
    
    if (thumbnailPatterns.some(pattern => urlLower.includes(pattern))) {
      return 'thumbnail';
    }
    
    if (urlLower.includes('.mp4') || urlLower.includes('video.twimg.com/')) {
      return 'video';
    }
    
    return 'image';
  }

  /**
   * メディアファイルをダウンロードする
   */
  async downloadMediaFile(
    mediaFile: TweetMediaFileProps,
    settings: AppSettings
  ): Promise<DownloadHistory> {
    try {
      const filename = FilenameGenerator.makeFilename(mediaFile, settings.filenameSettings);
      const downloadId = await this.executeDownload(mediaFile.source, filename, settings);
      
      if (downloadId === undefined) {
        throw new Error('Download failed');
      }

      const downloadHistory: DownloadHistory = {
        id: downloadId.toString(),
        tweetId: mediaFile.tweetId,
        authorUsername: mediaFile.tweetUser.screenName,
        authorDisplayName: mediaFile.tweetUser.displayName,
        authorId: mediaFile.tweetUser.userId,
        filename: filename,
        filepath: filename,
        originalUrl: mediaFile.source,
        downloadMethod: settings.downloadMethod,
        fileType: this.getFileTypeFromUrl(mediaFile.source),
        downloadedAt: new Date().toISOString(),
        status: 'success',
        fileSize: await this.getDownloadedFileSize(downloadId)
      };

      await StorageManager.addDownloadHistory(downloadHistory);
      return downloadHistory;
    } catch (error) {
      console.error('Comiketter: Failed to download media file:', error);
      
      const errorHistory: DownloadHistory = {
        id: Date.now().toString(),
        tweetId: mediaFile.tweetId,
        authorUsername: mediaFile.tweetUser.screenName,
        authorDisplayName: mediaFile.tweetUser.displayName,
        authorId: mediaFile.tweetUser.userId,
        filename: '',
        filepath: '',
        originalUrl: mediaFile.source,
        downloadMethod: 'chrome_downloads',
        fileType: this.getFileTypeFromUrl(mediaFile.source),
        downloadedAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };

      await StorageManager.addDownloadHistory(errorHistory);
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
  ): Promise<number | undefined> {
    const downloadOptions: chrome.downloads.DownloadOptions = {
      url: url,
      filename: filename,
      saveAs: false
    };

    return new Promise((resolve) => {
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Comiketter: Download error:', chrome.runtime.lastError);
          resolve(undefined);
        } else {
          resolve(downloadId);
        }
      });
    });
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
   * 設定を更新する
   */
  updateSettings(newSettings: AppSettings): void {
    this.settings = newSettings;
    console.log('Comiketter: DownloadManager settings updated');
  }

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

  /**
   * ダウンロード状態を更新
   */
  async updateDownloadStatus(downloadId: number, status: 'pending' | 'failed' | 'success'): Promise<void> {
    try {
      const downloadItem = await chrome.downloads.search({ id: downloadId });
      if (downloadItem.length > 0) {
        const historyId = downloadId.toString();
        await StorageManager.updateDownloadHistory(historyId, { 
          status: status,
          ...(status === 'success' && { 
            fileSize: downloadItem[0].fileSize 
          })
        });
        console.log('Comiketter: Download status updated:', { downloadId, status });
      }
    } catch (error) {
      console.error('Comiketter: Failed to update download status:', error);
    }
  }
}

