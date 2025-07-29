/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 画像ダウンロード専用クラス
 * キャッシュからツイート情報を取得し、画像URLを選択してダウンロード
 */

import type { ProcessedTweet, ProcessedMedia } from '../api-processor/types';
import type { TweetMediaFileProps, AppSettings, DownloadHistory } from '../types';
import { ApiCacheManager } from '../utils/api-cache';
import { FilenameGenerator } from '../utils/filenameGenerator';
import { StorageManager } from '../utils/storage';

/**
 * 画像ダウンロード要求
 */
export interface ImageDownloadRequest {
  tweetId: string;
  screenName?: string;
}

/**
 * 画像ダウンロード結果
 */
export interface ImageDownloadResult {
  success: boolean;
  error?: string;
  downloadedFiles?: string[];
  tweetInfo?: {
    id: string;
    author: string;
    content: string;
    date: string;
  };
}

/**
 * 画像ダウンロード専用クラス
 */
export class ImageDownloader {
  /**
   * 画像ダウンロードを実行
   */
  async downloadImages(request: ImageDownloadRequest): Promise<ImageDownloadResult> {
    try {
      console.log(`🖼️ Comiketter: 画像ダウンロード開始 - TweetID: ${request.tweetId}`);

      // 1. キャッシュからツイート情報を取得
      const cachedTweet = await this.getTweetFromCache(request.tweetId);
      if (!cachedTweet) {
        return {
          success: false,
          error: `キャッシュにツイートが見つかりません: ${request.tweetId}`
        };
      }

      // 2. 画像メディアを抽出
      const imageMedia = this.extractImageMedia(cachedTweet);
      if (imageMedia.length === 0) {
        return {
          success: false,
          error: 'このツイートには画像が含まれていません'
        };
      }

      // 3. 設定を取得
      const settings = await this.getSettings();
      if (!settings) {
        return {
          success: false,
          error: '設定を取得できませんでした'
        };
      }

      // 4. 各画像をダウンロード
      const downloadResults = await Promise.allSettled(
        imageMedia.map(media => this.downloadSingleImage(media, cachedTweet, settings))
      );

      // 5. 結果を集計
      const successfulDownloads: string[] = [];
      const errors: string[] = [];

      downloadResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.filename) {
          successfulDownloads.push(result.value.filename);
        } else {
          const error = result.status === 'rejected' 
            ? result.reason?.message || 'Unknown error'
            : result.value?.error || 'Download failed';
          errors.push(`画像${index + 1}: ${error}`);
        }
      });

      if (successfulDownloads.length === 0) {
        return {
          success: false,
          error: `すべての画像ダウンロードが失敗しました: ${errors.join(', ')}`
        };
      }

      console.log(`🖼️ Comiketter: 画像ダウンロード完了 - ${successfulDownloads.length}件成功`);

      return {
        success: true,
        downloadedFiles: successfulDownloads,
        tweetInfo: {
          id: cachedTweet.id_str,
          author: cachedTweet.user.screen_name,
          content: cachedTweet.full_text,
          date: cachedTweet.created_at
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🖼️ Comiketter: 画像ダウンロードエラー:', error);
      return {
        success: false,
        error: `画像ダウンロード中にエラーが発生しました: ${errorMessage}`
      };
    }
  }

  /**
   * キャッシュからツイート情報を取得
   */
  private async getTweetFromCache(tweetId: string): Promise<ProcessedTweet | null> {
    try {
      const cachedTweet = await ApiCacheManager.findTweetById(tweetId);
      if (!cachedTweet) {
        console.warn(`🖼️ Comiketter: キャッシュにツイートが見つかりません: ${tweetId}`);
        return null;
      }

      console.log(`🖼️ Comiketter: キャッシュからツイートを取得: ${tweetId}`);
      return cachedTweet;
    } catch (error) {
      console.error('🖼️ Comiketter: キャッシュ取得エラー:', error);
      return null;
    }
  }

  /**
   * ツイートから画像メディアを抽出
   */
  private extractImageMedia(tweet: ProcessedTweet): ProcessedMedia[] {
    if (!tweet.media || !Array.isArray(tweet.media)) {
      return [];
    }

    const imageMedia = tweet.media.filter(media => 
      media.type === 'photo'
    );

    console.log(`🖼️ Comiketter: 画像メディアを抽出 - ${imageMedia.length}件`);
    return imageMedia;
  }

  /**
   * 最適な画像URLを取得
   */
  private getBestImageUrl(media: ProcessedMedia): string | null {
    if (!media.media_url_https) {
      console.warn('🖼️ Comiketter: 画像URLが見つかりません');
      return null;
    }

    // サムネイル画像を除外
    const url = media.media_url_https;
    if (this.isThumbnailImage(url)) {
      console.warn('🖼️ Comiketter: サムネイル画像は除外されます');
      return null;
    }

    // プロフィール画像やバナー画像を除外
    if (this.isProfileOrBannerImage(url)) {
      console.warn('🖼️ Comiketter: プロフィール画像は除外されます');
      return null;
    }

    console.log(`🖼️ Comiketter: 画像URLを選択: ${url}`);
    return url;
  }

  /**
   * 単一画像をダウンロード
   */
  private async downloadSingleImage(
    media: ProcessedMedia,
    tweet: ProcessedTweet,
    settings: AppSettings
  ): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      // 最適な画像URLを取得
      const imageUrl = this.getBestImageUrl(media);
      if (!imageUrl) {
        return {
          success: false,
          error: '有効な画像URLを取得できませんでした'
        };
      }

      // TweetMediaFilePropsを作成
      const mediaFile: TweetMediaFileProps = {
        tweetId: tweet.id_str,
        source: imageUrl,
        tweetUser: {
          screenName: tweet.user.screen_name,
          userId: '', // 必要に応じて設定
          displayName: tweet.user.name,
          isProtected: false
        },
        type: 'image',
        ext: this.getImageFileExtension(imageUrl),
        serial: 1, // 複数画像がある場合は適切に設定
        hash: this.generateHash(imageUrl),
        createdAt: new Date(),
        tweetContent: tweet.full_text,
        tweetDate: tweet.created_at,
        mediaKey: media.id_str
      };

      // ファイル名を生成
      const filename = FilenameGenerator.makeFilename(mediaFile, settings.filenameSettings);

      // Chrome APIを使用してダウンロード
      const downloadId = await this.executeDownload(imageUrl, filename);
      if (downloadId === undefined) {
        throw new Error('Chrome download API failed');
      }

      // ダウンロード履歴を保存
      const downloadHistory: DownloadHistory = {
        id: downloadId.toString(),
        tweetId: tweet.id_str,
        authorUsername: tweet.user.screen_name,
        authorDisplayName: tweet.user.name,
        filename: filename,
        filepath: filename,
        originalUrl: imageUrl,
        downloadMethod: 'chrome_downloads',
        fileType: this.getImageFileType(imageUrl),
        downloadedAt: new Date().toISOString(),
        status: 'success',
        tweetContent: tweet.full_text,
        tweetDate: tweet.created_at
      };

      await StorageManager.addDownloadHistory(downloadHistory);

      console.log(`🖼️ Comiketter: 画像ダウンロード成功 - ${filename}`);
      return {
        success: true,
        filename: filename
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🖼️ Comiketter: 単一画像ダウンロードエラー:', error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Chrome APIを使用してダウンロードを実行
   */
  private async executeDownload(url: string, filename: string): Promise<number | undefined> {
    const downloadOptions: chrome.downloads.DownloadOptions = {
      url: url,
      filename: filename,
      saveAs: false
    };

    return new Promise((resolve) => {
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('🖼️ Comiketter: Chrome download error:', chrome.runtime.lastError);
          resolve(undefined);
        } else {
          resolve(downloadId);
        }
      });
    });
  }

  /**
   * 設定を取得
   */
  private async getSettings(): Promise<AppSettings | null> {
    try {
      const result = await chrome.storage.local.get('comiketter_settings');
      return result.comiketter_settings || null;
    } catch (error) {
      console.error('🖼️ Comiketter: 設定取得エラー:', error);
      return null;
    }
  }

  /**
   * サムネイル画像かどうかを判定
   */
  private isThumbnailImage(url: string): boolean {
    const urlLower = url.toLowerCase();
    const thumbnailPatterns = [
      'thumb', 'small', 'mini', '_normal', '_bigger', '_mini',
      'profile_images_normal', 'profile_images_bigger', 'profile_images_mini',
    ];
    
    return thumbnailPatterns.some(pattern => urlLower.includes(pattern));
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
   * 画像ファイル拡張子を取得
   */
  private getImageFileExtension(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
    if (urlLower.includes('.png')) return 'png';
    if (urlLower.includes('.gif')) return 'gif';
    if (urlLower.includes('.webp')) return 'webp';
    
    // 画像URLの場合はjpgを返す
    if (urlLower.includes('pbs.twimg.com/media/')) {
      return 'jpg';
    }
    
    return 'jpg';
  }

  /**
   * 画像ファイルタイプを取得
   */
  private getImageFileType(url: string): string {
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
      default:
        return 'image/jpeg';
    }
  }

  /**
   * URLからハッシュを生成
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
} 