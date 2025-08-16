/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 統合メディアダウンローダー
 * 画像と動画を同時にダウンロード
 */

import type { ProcessedTweet, ProcessedMedia } from '../api-processor/types';
import type { TweetMediaFileProps, AppSettings, DownloadHistory } from '../types';
import { PatternToken, AggregationToken } from '../types';
import { ApiCacheManager } from '../utils/api-cache';
import { FilenameGenerator } from '../utils/filenameGenerator';
import { StorageManager } from '../utils/storage';

/**
 * メディアダウンロード要求
 */
export interface MediaDownloadRequest {
  tweetId: string;
  screenName?: string;
}

/**
 * メディアダウンロード結果
 */
export interface MediaDownloadResult {
  success: boolean;
  error?: string;
  downloadedFiles?: {
    images: string[];
    videos: string[];
  };
  tweetInfo?: {
    id: string;
    author: string;
    content: string;
    date: string;
  };
  mediaCount?: {
    images: number;
    videos: number;
  };
}

/**
 * 動画バリアント情報
 */
interface VideoVariant {
  bitrate?: number;
  content_type: string;
  url: string;
}

/**
 * 統合メディアダウンローダー
 */
export class MediaDownloader {
  /**
   * メディアダウンロードを実行（画像・動画同時対応）
   */
  async downloadMedia(request: MediaDownloadRequest): Promise<MediaDownloadResult> {
    try {
      console.log(`📱 Comiketter: 統合メディアダウンロード開始 - TweetID: ${request.tweetId}`);

      // 1. キャッシュからツイート情報を取得
      let cachedTweet = await this.getTweetFromCache(request.tweetId);
      if (!cachedTweet) {
        // キャッシュにない場合はDOMから取得を試行
        const domTweet = await this.getTweetFromDOM(request.tweetId);
        if (!domTweet) {
          return {
            success: false,
            error: `ツイートが見つかりません: ${request.tweetId}`
          };
        }

        // DOMから取得したツイートを使用
        cachedTweet = domTweet;
      }

      // 2. メディアを抽出（画像・動画）
      const mediaItems = this.extractAllMedia(cachedTweet);
      if (mediaItems.length === 0) {
        return {
          success: false,
          error: 'このツイートにはダウンロード可能なメディアが含まれていません'
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

      // 4. 各メディアをダウンロード（シリアル番号を割り当て）
      const downloadResults = await Promise.allSettled(
        mediaItems.map((media, index) => {
          const serial = index + 1; // 1から始まるシリアル番号
          return this.downloadSingleMedia(media, cachedTweet, settings, serial);
        })
      );

      // 5. 結果を集計
      const successfulImages: string[] = [];
      const successfulVideos: string[] = [];
      const errors: string[] = [];

      downloadResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.filename) {
          if (result.value.mediaType === 'image') {
            successfulImages.push(result.value.filename);
          } else if (result.value.mediaType === 'video') {
            successfulVideos.push(result.value.filename);
          }
        } else {
          const error = result.status === 'rejected' 
            ? result.reason?.message || 'Unknown error'
            : result.value?.error || 'Download failed';
          const mediaType = mediaItems[index]?.type === 'photo' ? '画像' : '動画';
          errors.push(`${mediaType}${index + 1}: ${error}`);
        }
      });

      const totalSuccess = successfulImages.length + successfulVideos.length;
      if (totalSuccess === 0) {
        return {
          success: false,
          error: `すべてのメディアダウンロードが失敗しました: ${errors.join(', ')}`
        };
      }

      console.log(`📱 Comiketter: 統合メディアダウンロード完了 - 画像${successfulImages.length}件、動画${successfulVideos.length}件成功`);

      return {
        success: true,
        downloadedFiles: {
          images: successfulImages,
          videos: successfulVideos
        },
        tweetInfo: {
          id: cachedTweet.id_str,
          author: cachedTweet.user.screen_name,
          content: cachedTweet.full_text,
          date: cachedTweet.created_at
        },
        mediaCount: {
          images: successfulImages.length,
          videos: successfulVideos.length
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('📱 Comiketter: 統合メディアダウンロードエラー:', error);
      return {
        success: false,
        error: `メディアダウンロード中にエラーが発生しました: ${errorMessage}`
      };
    }
  }

  /**
   * キャッシュからツイート情報を取得
   */
  private async getTweetFromCache(tweetId: string): Promise<ProcessedTweet | null> {
    try {
      const cachedTweet = await ApiCacheManager.findTweetById(tweetId);
      if (cachedTweet) {
        console.log(`📱 Comiketter: キャッシュからツイートを取得: ${tweetId}`);
        return cachedTweet;
      }

      console.warn(`📱 Comiketter: キャッシュにツイートが見つかりません: ${tweetId}`);
      return null;
    } catch (error) {
      console.error('📱 Comiketter: キャッシュ取得エラー:', error);
      return null;
    }
  }

  /**
   * Web要素からツイート情報を取得
   */
  private async getTweetFromDOM(tweetId: string): Promise<ProcessedTweet | null> {
    try {
      // コンテンツスクリプトにメッセージを送信してWeb要素から取得
      const response = await chrome.tabs.query({ active: true, currentWindow: true });
      if (response.length === 0) {
        console.warn('📱 Comiketter: アクティブなタブが見つかりません');
        return null;
      }

      const tab = response[0];
      if (!tab.id) {
        console.warn('📱 Comiketter: タブIDが取得できません');
        return null;
      }

      const result = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_TWEET_FROM_DOM',
        payload: { tweetId }
      });

      if (result && result.success && result.data) {
        // TweetオブジェクトをProcessedTweetに変換
        const tweet = result.data;
        const processedTweet: ProcessedTweet = {
          id_str: tweet.id,
          full_text: tweet.text,
          created_at: tweet.createdAt,
          favorite_count: 0,
          retweet_count: 0,
          reply_count: 0,
          quote_count: 0,
          bookmarked: false,
          favorited: false,
          retweeted: false,
          possibly_sensitive: false,
          user: {
            name: tweet.author.displayName,
            screen_name: tweet.author.username,
            avatar_url: tweet.author.profileImageUrl || ''
          }
        };

        // メディア情報を追加
        if (tweet.media && tweet.media.length > 0) {
          processedTweet.media = tweet.media.map((media: any) => {
            console.log('📱 Comiketter: Web要素からメディア情報を変換:', media);
            
            const mediaUrl = media.media_url_https || media.url;
            console.log('📱 Comiketter: 使用するメディアURL:', mediaUrl);
            
            return {
              id_str: `dom_${Date.now()}_${Math.random()}`,
              type: media.type === 'image' ? 'photo' : 'video',
              media_url_https: mediaUrl,
              ...(media.type === 'video' && media.video_info ? {
                video_info: media.video_info
              } : {})
            };
          });
          console.log('📱 Comiketter: 変換後のメディア情報:', processedTweet.media);
        }

        return processedTweet;
      }

      return null;
    } catch (error) {
      console.error('📱 Comiketter: Web要素からの取得エラー:', error);
      return null;
    }
  }

  /**
   * ツイートから全メディアを抽出（画像・動画）
   */
  private extractAllMedia(tweet: ProcessedTweet): ProcessedMedia[] {
    console.log('📱 Comiketter: 全メディア抽出開始', tweet);
    
    if (!tweet.media || !Array.isArray(tweet.media)) {
      console.warn('📱 Comiketter: ツイートにメディアが存在しません');
      return [];
    }

    console.log('📱 Comiketter: メディア配列:', tweet.media);
    
    // 画像と動画の両方を抽出
    const allMedia = tweet.media.filter(media => {
      console.log('📱 Comiketter: メディアタイプチェック:', media.type, media);
      return media.type === 'photo' || media.type === 'video' || media.type === 'animated_gif';
    });

    console.log(`📱 Comiketter: 全メディアを抽出 - ${allMedia.length}件`);
    return allMedia;
  }

  /**
   * 最適な画像URLを取得
   */
  private getBestImageUrl(media: ProcessedMedia): string | null {
    console.log('📱 Comiketter: 画像URL取得開始', media);
    
    if (!media.media_url_https) {
      console.warn('📱 Comiketter: 画像URLが見つかりません - media_url_httpsが存在しません');
      return null;
    }

    // サムネイル画像を除外
    const url = media.media_url_https;
    console.log(`📱 Comiketter: 画像URLをチェック: ${url}`);
    
    if (this.isThumbnailImage(url)) {
      console.warn('📱 Comiketter: サムネイル画像は除外されます');
      return null;
    }

    // プロフィール画像やバナー画像を除外
    if (this.isProfileOrBannerImage(url)) {
      console.warn('📱 Comiketter: プロフィール画像は除外されます');
      return null;
    }

    console.log(`📱 Comiketter: 画像URLを選択: ${url}`);
    return url;
  }

  /**
   * 最高ビットレートの動画URLを取得
   */
  private getBestVideoUrl(media: ProcessedMedia): string | null {
    if (!media.video_info?.variants || media.video_info.variants.length === 0) {
      console.warn('📱 Comiketter: 動画バリアントが見つかりません');
      return null;
    }

    // MP4形式のバリアントのみをフィルタリング
    const mp4Variants = media.video_info.variants.filter(
      variant => variant.content_type === 'video/mp4'
    );

    if (mp4Variants.length === 0) {
      console.warn('📱 Comiketter: MP4形式の動画バリアントが見つかりません');
      return null;
    }

    // 最高ビットレートのバリアントを選択
    const bestVariant = mp4Variants.reduce((best, current) => {
      const bestBitrate = best.bitrate || 0;
      const currentBitrate = current.bitrate || 0;
      return currentBitrate > bestBitrate ? current : best;
    });

    console.log(`📱 Comiketter: 最高ビットレート動画を選択 - ${bestVariant.bitrate || 0}bps`);
    return bestVariant.url;
  }

  /**
   * 単一メディアをダウンロード
   */
  private async downloadSingleMedia(
    media: ProcessedMedia,
    tweet: ProcessedTweet,
    settings: AppSettings,
    serial: number
  ): Promise<{ success: boolean; filename?: string; mediaType?: 'image' | 'video'; error?: string }> {
    try {
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' = 'image';
      let fileExt = 'jpg';

      if (media.type === 'photo') {
        mediaUrl = this.getBestImageUrl(media);
        mediaType = 'image';
        fileExt = this.getImageFileExtension(mediaUrl || '');
      } else if (media.type === 'video' || media.type === 'animated_gif') {
        mediaUrl = this.getBestVideoUrl(media);
        mediaType = 'video';
        fileExt = 'mp4';
      }

      if (!mediaUrl) {
        return {
          success: false,
          mediaType,
          error: '有効なメディアURLを取得できませんでした'
        };
      }

      // TweetMediaFilePropsを作成
      const mediaFile: TweetMediaFileProps = {
        tweetId: tweet.id_str,
        source: mediaUrl,
        tweetUser: {
          screenName: tweet.user.screen_name,
          userId: '', // 必要に応じて設定
          displayName: tweet.user.name,
          isProtected: false
        },
        type: mediaType,
        ext: fileExt,
        serial: serial, // 引数で渡されたシリアル番号を使用
        hash: this.generateHash(mediaUrl),
        createdAt: new Date(),
        tweetContent: tweet.full_text,
        tweetDate: tweet.created_at,
        mediaKey: media.id_str
      };

      // ファイル名を生成
      const filename = FilenameGenerator.makeFilename(mediaFile, settings.filenameSettings);

      // Chrome APIを使用してダウンロード
      const downloadId = await this.executeDownload(mediaUrl, filename);
      if (downloadId === undefined) {
        throw new Error('Chrome download API failed');
      }

      // ダウンロード履歴を保存（Chrome APIのダウンロードIDを使用）
      const downloadHistory: DownloadHistory = {
        id: downloadId.toString(), // Chrome APIのダウンロードIDを文字列として保存
        tweetId: tweet.id_str,
        authorUsername: tweet.user.screen_name,
        authorDisplayName: tweet.user.name,
        filename: filename,
        filepath: filename,
        originalUrl: mediaUrl,
        downloadMethod: 'chrome_downloads',
        fileType: mediaType === 'image' ? this.getImageFileType(mediaUrl) : 'video/mp4',
        downloadedAt: new Date().toISOString(),
        status: 'pending', // 初期状態はpending
        tweetContent: tweet.full_text,
        tweetDate: tweet.created_at
      };

      await StorageManager.addDownloadHistory(downloadHistory);

      console.log(`📱 Comiketter: ${mediaType === 'image' ? '画像' : '動画'}ダウンロード成功 - ${filename}`);
      return {
        success: true,
        filename: filename,
        mediaType: mediaType
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('📱 Comiketter: 単一メディアダウンロードエラー:', error);
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
          console.error('📱 Comiketter: Chrome download error:', chrome.runtime.lastError);
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
      const settings = await StorageManager.getSettings();
      if (!settings) {
        console.warn('📱 Comiketter: 設定が見つかりません。デフォルト設定を使用します。');
        // デフォルト設定を返す
        return {
          tlAutoUpdateDisabled: false,
          downloadMethod: 'chrome_downloads',
          saveFormat: 'url',
          saveDirectory: '',
          autoDownloadConditions: {
            retweet: false,
            like: false,
            both: false
          },
          autoSaveTriggers: {
            retweet: false,
            like: false,
            retweetAndLike: false
          },
          filenameSettings: {
            directory: '{account}',
            noSubDirectory: false,
            filenamePattern: [PatternToken.TweetId, PatternToken.Serial],
            fileAggregation: false,
            groupBy: AggregationToken.Account
          },
          mediaDownloadSettings: {
            includeVideoThumbnail: false,
            excludeProfileImages: true,
            excludeBannerImages: true
          },
          timelineAutoUpdate: true,
          showCustomBookmarks: true
        };
      }
      return settings;
    } catch (error) {
      console.error('📱 Comiketter: 設定取得エラー:', error);
      throw new Error('設定を取得できませんでした');
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