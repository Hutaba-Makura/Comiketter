/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 動画ダウンロード専用クラス
 * キャッシュからツイート情報を取得し、最高ビットレートの動画URLを選択してダウンロード
 */

import type { ProcessedTweet, ProcessedMedia } from '../api-processor/types';
import type { TweetMediaFileProps, AppSettings, DownloadHistory } from '../types';
import { PatternToken, AggregationToken } from '../types';
import { ApiCacheManager } from '../utils/api-cache';
import { FilenameGenerator } from '../utils/filenameGenerator';
import { StorageManager } from '../utils/storage';

/**
 * 動画バリアント情報
 */
interface VideoVariant {
  bitrate?: number;
  content_type: string;
  url: string;
}

/**
 * 動画ダウンロード要求
 */
export interface VideoDownloadRequest {
  tweetId: string;
  screenName?: string;
}

/**
 * 動画ダウンロード結果
 */
export interface VideoDownloadResult {
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
 * 動画ダウンロード専用クラス
 */
export class VideoDownloader {
  /**
   * 動画ダウンロードを実行
   */
  async downloadVideo(request: VideoDownloadRequest): Promise<VideoDownloadResult> {
    try {
      console.log(`🎬 Comiketter: 動画ダウンロード開始 - TweetID: ${request.tweetId}`);

      // 1. キャッシュからツイート情報を取得
      const cachedTweet = await this.getTweetFromCache(request.tweetId);
      if (!cachedTweet) {
        return {
          success: false,
          error: `キャッシュにツイートが見つかりません: ${request.tweetId}`
        };
      }

      // 2. 動画メディアを抽出
      const videoMedia = this.extractVideoMedia(cachedTweet);
      if (videoMedia.length === 0) {
        return {
          success: false,
          error: 'このツイートには動画が含まれていません'
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

      // 4. 各動画をダウンロード（シリアル番号を割り当て）
      const downloadResults = await Promise.allSettled(
        videoMedia.map((media, index) => {
          const serial = index + 1; // 1から始まるシリアル番号
          return this.downloadSingleVideo(media, cachedTweet, settings, serial);
        })
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
          errors.push(`動画${index + 1}: ${error}`);
        }
      });

      if (successfulDownloads.length === 0) {
        return {
          success: false,
          error: `すべての動画ダウンロードが失敗しました: ${errors.join(', ')}`
        };
      }

      console.log(`🎬 Comiketter: 動画ダウンロード完了 - ${successfulDownloads.length}件成功`);

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
      console.error('🎬 Comiketter: 動画ダウンロードエラー:', error);
      return {
        success: false,
        error: `動画ダウンロード中にエラーが発生しました: ${errorMessage}`
      };
    }
  }

  /**
   * キャッシュからツイート情報を取得
   * キャッシュにない場合はWeb要素から取得を試行
   */
  private async getTweetFromCache(tweetId: string): Promise<ProcessedTweet | null> {
    try {
      const cachedTweet = await ApiCacheManager.findTweetById(tweetId);
      if (cachedTweet) {
        console.log(`🎬 Comiketter: キャッシュからツイートを取得: ${tweetId}`);
        return cachedTweet;
      }

      console.warn(`🎬 Comiketter: キャッシュにツイートが見つかりません: ${tweetId}`);
      
      // キャッシュにない場合はWeb要素から取得を試行
      const domTweet = await this.getTweetFromDOM(tweetId);
      if (domTweet) {
        console.log(`🎬 Comiketter: Web要素からツイートを取得: ${tweetId}`);
        return domTweet;
      }

      return null;
    } catch (error) {
      console.error('🎬 Comiketter: キャッシュ取得エラー:', error);
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
        console.warn('🎬 Comiketter: アクティブなタブが見つかりません');
        return null;
      }

      const tab = response[0];
      if (!tab.id) {
        console.warn('🎬 Comiketter: タブIDが取得できません');
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
            console.log('🎬 Comiketter: Web要素からメディア情報を変換:', media);
            return {
              id_str: `dom_${Date.now()}_${Math.random()}`,
              type: media.type === 'image' ? 'photo' : 'video',
              // media_url_httpsを優先的に使用し、なければurlを使用
              media_url_https: media.media_url_https || media.url,
              // 動画情報がある場合は追加
              ...(media.type === 'video' && media.video_info ? {
                video_info: media.video_info
              } : {})
            };
          });
          console.log('🎬 Comiketter: 変換後のメディア情報:', processedTweet.media);
        }

        return processedTweet;
      }

      return null;
    } catch (error) {
      console.error('🎬 Comiketter: Web要素からの取得エラー:', error);
      return null;
    }
  }

  /**
   * ツイートから動画メディアを抽出
   */
  private extractVideoMedia(tweet: ProcessedTweet): ProcessedMedia[] {
    if (!tweet.media || !Array.isArray(tweet.media)) {
      return [];
    }

    const videoMedia = tweet.media.filter(media => 
      media.type === 'video' || media.type === 'animated_gif'
    );

    console.log(`🎬 Comiketter: 動画メディアを抽出 - ${videoMedia.length}件`);
    return videoMedia;
  }

  /**
   * 最高ビットレートの動画URLを取得
   * response-processing-rule.mdに基づいて実装
   */
  private getBestVideoUrl(media: ProcessedMedia): string | null {
    if (!media.video_info?.variants || media.video_info.variants.length === 0) {
      console.warn('🎬 Comiketter: 動画バリアントが見つかりません');
      return null;
    }

    // MP4形式のバリアントのみをフィルタリング
    const mp4Variants = media.video_info.variants.filter(
      variant => variant.content_type === 'video/mp4'
    );

    if (mp4Variants.length === 0) {
      console.warn('🎬 Comiketter: MP4形式の動画バリアントが見つかりません');
      return null;
    }

    // 最高ビットレートのバリアントを選択
    // response-processing-rule.md: "...video_info.variants[].bitrate を取得し、その中で最も数値が大きいもののURLを ...video_info.variants[].url で取得"
    const bestVariant = mp4Variants.reduce((best, current) => {
      const bestBitrate = best.bitrate || 0;
      const currentBitrate = current.bitrate || 0;
      return currentBitrate > bestBitrate ? current : best;
    });

    console.log(`🎬 Comiketter: 最高ビットレート動画を選択 - ${bestVariant.bitrate || 0}bps`);
    return bestVariant.url;
  }

  /**
   * 単一動画をダウンロード
   */
  private async downloadSingleVideo(
    media: ProcessedMedia,
    tweet: ProcessedTweet,
    settings: AppSettings,
    serial: number
  ): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      // 最高ビットレートの動画URLを取得
      const videoUrl = this.getBestVideoUrl(media);
      if (!videoUrl) {
        return {
          success: false,
          error: '有効な動画URLを取得できませんでした'
        };
      }

      // TweetMediaFilePropsを作成
      const mediaFile: TweetMediaFileProps = {
        tweetId: tweet.id_str,
        source: videoUrl,
        tweetUser: {
          screenName: tweet.user.screen_name,
          userId: '', // 必要に応じて設定
          displayName: tweet.user.name,
          isProtected: false
        },
        type: 'video',
        ext: 'mp4',
        serial: serial, // 引数で渡されたシリアル番号を使用
        hash: this.generateHash(videoUrl),
        createdAt: new Date(),
        tweetContent: tweet.full_text,
        tweetDate: tweet.created_at,
        mediaKey: media.id_str
      };

      // ファイル名を生成
      const filename = FilenameGenerator.makeFilename(mediaFile, settings.filenameSettings);

      // Chrome APIを使用してダウンロード
      const downloadId = await this.executeDownload(videoUrl, filename);
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
        originalUrl: videoUrl,
        downloadMethod: 'chrome_downloads',
        fileType: 'video/mp4',
        downloadedAt: new Date().toISOString(),
        status: 'pending', // 初期状態はpending
        tweetContent: tweet.full_text,
        tweetDate: tweet.created_at
      };

      await StorageManager.addDownloadHistory(downloadHistory);

      console.log(`🎬 Comiketter: 動画ダウンロード成功 - ${filename}`);
      return {
        success: true,
        filename: filename
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('🎬 Comiketter: 単一动画ダウンロードエラー:', error);
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
          console.error('🎬 Comiketter: Chrome download error:', chrome.runtime.lastError);
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
        console.warn('🎬 Comiketter: 設定が見つかりません。デフォルト設定を使用します。');
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
      console.error('🎬 Comiketter: 設定取得エラー:', error);
      throw new Error('設定を取得できませんでした');
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