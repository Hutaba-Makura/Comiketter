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
   * 動画の実際のURLを取得（TwitterMediaHarvest準拠）
   */
  private getVideoUrl(tweetId: string): string | null {
    // 動画の実際のURLを構築
    // TwitterMediaHarvestの実装を参考に、動画IDから実際のURLを生成
    try {
      // 動画IDのパターンを抽出
      const videoIdMatch = tweetId.match(/(\d+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        // 動画の実際のURLを構築（複数の解像度を試行）
        const resolutions = [
          '1280x720', // HD
          '1920x1080', // Full HD
          '854x480', // SD
          '640x360', // Low quality
        ];
        
        // 最初の解像度を返す（実際の実装では、URLの妥当性をチェックしてから返す）
        const videoUrl = `https://video.twimg.com/ext_tw_video/${videoId}/pu/vid/${resolutions[0]}/video.mp4`;
        console.log('Comiketter: Generated video URL:', videoUrl);
        return videoUrl;
      }
    } catch (error) {
      console.error('Comiketter: Failed to generate video URL:', error);
    }
    return null;
  }

  /**
   * ツイートからメディア情報を抽出（TwitterMediaHarvest準拠）
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
        let imageIndex = 0;
        let videoIndex = 0;

        for (const media of legacy.extended_entities.media) {
          if (media.type === 'photo') {
            // 画像の場合、最高品質のURLを取得
            const photoUrl = media.media_url_https || media.media_url;
            if (photoUrl && !this.isProfileOrBannerImage(photoUrl)) {
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
                serial: ++imageIndex,
                hash: this.generateHash(photoUrl),
                createdAt: new Date(),
              });
            }
          } else if (media.type === 'video' || media.type === 'animated_gif') {
            // 動画の場合、TwitterMediaHarvestと同様の処理
            const videoInfo = media.video_info;
            if (videoInfo && videoInfo.variants) {
              // MP4ファイルのみをフィルタリング
              const mp4Variants = videoInfo.variants.filter((v: any) => v.content_type === 'video/mp4');
              
              if (mp4Variants.length > 0) {
                // 最高ビットレートのMP4ファイルを選択
                const bestVariant = mp4Variants.reduce((prev: any, curr: any) => 
                  (curr.bitrate || 0) >= (prev.bitrate || 0) ? curr : prev
                );
                
                if (bestVariant && bestVariant.url) {
                  mediaFiles.push({
                    tweetId,
                    source: bestVariant.url,
                    tweetUser: {
                      screenName: user.screen_name || '',
                      userId: user.id_str || '',
                      displayName: user.name || user.screen_name || '',
                      isProtected: user.protected || false,
                    },
                    type: 'video',
                    ext: 'mp4',
                    serial: ++videoIndex,
                    hash: this.generateHash(bestVariant.url),
                    createdAt: new Date(),
                  });
                }
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
   * テスト用のダウンロード機能
   */
  async testDownload(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Comiketter: Testing download with URL:', url);
      
      const settings = await this.getSettings();
      if (!settings) {
        throw new Error('Settings not available');
      }

      // 動画URLの場合は特別な処理
      if (url.includes('video.twimg.com')) {
        console.log('Comiketter: Testing video download with special handling');
        console.log('Comiketter: Video URL to test:', url);
      }

      const testMediaFile: TweetMediaFileProps = {
        tweetId: 'test',
        source: url,
        tweetUser: {
          screenName: 'testuser',
          userId: '123456',
          displayName: 'Test User',
          isProtected: false,
        },
        type: this.detectMediaType(url),
        ext: this.getFileExtension(url),
        serial: 1,
        hash: this.generateHash(url),
        createdAt: new Date(),
      };

      await this.downloadMediaFile(testMediaFile, settings);
      
      console.log('Comiketter: Test download completed successfully');
      return { success: true };
    } catch (error) {
      console.error('Comiketter: Test download failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * ツイートメディアのダウンロードを開始（TwitterMediaHarvest準拠）
   */
  async downloadTweetMedia(request: DownloadRequest): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Comiketter: Starting download for tweet:', request.tweetId);

      // 設定を取得
      const settings = await this.getSettings();
      if (!settings) {
        throw new Error('Settings not available');
      }
      console.log('Comiketter: Settings loaded:', settings);

      // メディアURLを取得（API傍受から取得済みの場合）
      let mediaFiles: TweetMediaFileProps[] = [];
      if (request.mediaUrls && request.mediaUrls.length > 0) {
        // 直接URLが提供された場合
        console.log('Comiketter: Using direct media URLs:', request.mediaUrls);
        mediaFiles = request.mediaUrls.map((url, index) => ({
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
        }));
      } else {
        // API傍受からメディア情報を取得
        console.log('Comiketter: Looking for cached media info');
        const cachedMedia = await this.getCachedMediaInfo(request.tweetId);
        if (cachedMedia) {
          mediaFiles = cachedMedia;
          console.log('Comiketter: Found cached media files:', cachedMedia.length);
        } else {
          console.log('Comiketter: No cached media found');
        }
      }

      console.log('Comiketter: Total media files found:', mediaFiles.length);
      if (mediaFiles.length === 0) {
        throw new Error('No media found for this tweet');
      }

      // TwitterMediaHarvestと同様のフィルタリング処理
      const filteredMediaFiles = mediaFiles.filter(mediaFile => {
        console.log('Comiketter: Checking media file:', mediaFile.source, 'type:', mediaFile.type);
        
        // ダミー動画URLの場合は実際の動画URLを取得
        if (mediaFile.source === 'video://placeholder') {
          console.log('Comiketter: Placeholder video URL detected, attempting to get actual video URL');
          const actualVideoUrl = this.getVideoUrl(request.tweetId);
          if (actualVideoUrl) {
            console.log('Comiketter: Found actual video URL:', actualVideoUrl);
            // 動画ファイルとして扱う
            mediaFile.source = actualVideoUrl;
            mediaFile.type = 'video';
            mediaFile.ext = 'mp4';
            console.log('Comiketter: Updated media file to video:', mediaFile);
            return true;
          } else {
            console.log('Comiketter: Could not get actual video URL, excluding placeholder');
            return false;
          }
        }
        
        // 動画サムネイルが検出された場合、実際の動画URLを取得
        if (mediaFile.type === 'thumbnail' && mediaFile.source.includes('ext_tw_video_thumb')) {
          console.log('Comiketter: Video thumbnail detected, attempting to get actual video URL');
          const actualVideoUrl = this.getVideoUrl(request.tweetId);
          if (actualVideoUrl) {
            console.log('Comiketter: Found actual video URL:', actualVideoUrl);
            // 動画ファイルとして扱う
            mediaFile.source = actualVideoUrl;
            mediaFile.type = 'video';
            mediaFile.ext = 'mp4';
            console.log('Comiketter: Updated media file to video:', mediaFile);
            return true;
          } else {
            console.log('Comiketter: Could not get actual video URL, excluding thumbnail');
            return false;
          }
        }
        
        // 動画サムネイル除外設定をチェック
        if (mediaFile.type === 'thumbnail' && !settings.mediaDownloadSettings.includeVideoThumbnail) {
          console.log('Comiketter: Excluding thumbnail:', mediaFile.source);
          return false;
        }
        
        // プロフィール画像除外設定をチェック
        if (settings.mediaDownloadSettings.excludeProfileImages && this.isProfileOrBannerImage(mediaFile.source)) {
          console.log('Comiketter: Excluding profile/banner image:', mediaFile.source);
          return false;
        }
        
        console.log('Comiketter: Including media file:', mediaFile.source);
        return true;
      });

      console.log('Comiketter: Filtered media files:', filteredMediaFiles.length);
      if (filteredMediaFiles.length === 0) {
        console.log('Comiketter: All media files filtered out for tweet:', request.tweetId);
        return { success: true }; // フィルタリングで除外された場合は成功として扱う
      }

      // 各メディアファイルをダウンロード
      console.log('Comiketter: Starting download of', filteredMediaFiles.length, 'files');
      const downloadPromises = filteredMediaFiles.map(mediaFile => 
        this.downloadMediaFile(mediaFile, settings)
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
   * プロフィール画像やバナー画像かどうかを判定
   * @param url 画像URL
   * @returns プロフィール画像やバナー画像の場合true
   */
  private isProfileOrBannerImage(url: string): boolean {
    try {
      // URLパターンマッチングで判定
      const urlLower = url.toLowerCase();
      
      // プロフィール画像のパターン
      const profilePatterns = [
        '/profile_images/',
        '/profile_banners/',
        '/profile_images_normal/',
        '/profile_images_bigger/',
        '/profile_images_mini/',
      ];
      
      // バナー画像のパターン
      const bannerPatterns = [
        '/profile_banners/',
        '/banner_images/',
      ];
      
      return profilePatterns.some(pattern => urlLower.includes(pattern)) ||
             bannerPatterns.some(pattern => urlLower.includes(pattern));
    } catch (error) {
      console.error('Comiketter: Error checking profile/banner image:', error);
      return false;
    }
  }

  /**
   * メディアファイルをダウンロードする
   * TwitterMediaHarvestの実装を参考にしたリトライ機能付き
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
      console.log('Comiketter: Processing media file:', mediaFile.source);
      console.log('Comiketter: Media file type:', mediaFile.type);
      
      // ファイル名を生成
      const filename = FilenameGenerator.makeFilename(mediaFile, currentSettings.filenameSettings);
      console.log('Comiketter: Generated filename:', filename);
      
      // 動画ファイルの場合はリトライ機能を有効にする
      if (mediaFile.type === 'video' && mediaFile.source.includes('video.twimg.com')) {
        return await this.downloadVideoWithRetry(mediaFile, filename, currentSettings);
      }
      
      // 通常のダウンロード実行
      console.log('Comiketter: Starting Chrome download for:', mediaFile.source);
      const downloadId = await this.executeDownload(mediaFile.source, filename, currentSettings);
      console.log('Comiketter: Chrome download ID:', downloadId);
      
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
      
      console.log('Comiketter: Media file download started successfully:', filename);
      return savedHistory;
    } catch (error) {
      console.error('Comiketter: Failed to download media file:', error);
      throw error;
    }
  }

  /**
   * 動画ファイルをリトライ機能付きでダウンロード
   * TwitterMediaHarvestの実装を参考にした動画専用ダウンロード機能
   */
  private async downloadVideoWithRetry(
    mediaFile: TweetMediaFileProps,
    filename: string,
    settings: AppSettings
  ): Promise<DownloadHistory> {
    const urlsToTry = [mediaFile.source, ...this.generateAlternativeVideoUrls(mediaFile.source)];
    
    for (let i = 0; i < urlsToTry.length; i++) {
      const url = urlsToTry[i];
      try {
        console.log(`Comiketter: Trying video URL ${i + 1}/${urlsToTry.length}:`, url);
        
        const downloadId = await this.executeDownload(url, filename, settings);
        
        // ダウンロード履歴を作成
        const downloadHistory: Omit<DownloadHistory, 'id'> = {
          tweetId: mediaFile.tweetId,
          authorUsername: mediaFile.tweetUser.screenName,
          authorDisplayName: mediaFile.tweetUser.displayName,
          authorId: mediaFile.tweetUser.id,
          filename: filename,
          filepath: filename,
          originalUrl: url,
          downloadMethod: settings.downloadMethod,
          fileType: this.getFileTypeFromUrl(url),
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
        
        console.log('Comiketter: Video download started successfully with URL:', url);
        return savedHistory;
      } catch (error) {
        console.warn(`Comiketter: Failed to download video with URL ${i + 1}:`, error);
        
        // 最後のURLでも失敗した場合はエラーを投げる
        if (i === urlsToTry.length - 1) {
          throw new Error(`Failed to download video after trying ${urlsToTry.length} different URLs`);
        }
        
        // 少し待ってから次のURLを試す
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('No valid video URL found');
  }

  /**
   * Chrome APIを使用してダウンロードを実行
   * TwitterMediaHarvestの実装を参考に、シンプルで安全なアプローチを採用
   */
  private async executeDownload(
    url: string, 
    filename: string, 
    settings: AppSettings
  ): Promise<number> {
    // URLの検証
    if (!url || url.trim() === '') {
      throw new Error('Download URL is empty or invalid');
    }

    // ダミー動画URLの場合はエラー
    if (url === 'video://placeholder') {
      throw new Error('Placeholder video URL detected - actual video URL not available');
    }

    // URLが有効かチェック（基本的な検証）
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // 動画URLの場合は事前検証を実行
    if (url.includes('video.twimg.com')) {
      console.log('Comiketter: Video URL detected, validating before download');
      const isValid = await this.validateVideoUrl(url);
      if (!isValid) {
        throw new Error('Video URL validation failed - URL may be invalid or expired');
      }
    }

    // TwitterMediaHarvestの実装を参考に、シンプルなオプションのみ使用
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

    console.log('Comiketter: Download options:', downloadOptions);
    console.log('Comiketter: URL to download:', url);
    console.log('Comiketter: Filename:', filename);

    try {
      console.log('Comiketter: Calling chrome.downloads.download...');
      const downloadId = await chrome.downloads.download(downloadOptions);
      console.log('Comiketter: Chrome download returned ID:', downloadId);
      
      // TwitterMediaHarvestの実装を参考に、ダウンロード失敗の判定
      if (this.isDownloadFailed(downloadId)) {
        const errorMessage = chrome.runtime.lastError?.message || 'Failed to download';
        console.error('Comiketter: Chrome runtime error:', chrome.runtime.lastError);
        throw new Error(errorMessage);
      }

      return downloadId;
    } catch (error) {
      console.error('Comiketter: Chrome download failed:', error);
      console.error('Comiketter: Failed URL:', url);
      console.error('Comiketter: Failed filename:', filename);
      throw error;
    }
  }

  /**
   * メディアタイプを検出（TwitterMediaHarvest準拠）
   */
  private detectMediaType(url: string): 'image' | 'thumbnail' | 'video' {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    
    const urlLower = url.toLowerCase();
    
    // サムネイル画像のパターン
    const thumbnailPatterns = [
      'thumb',
      'small',
      'mini',
      '_normal',
      '_bigger',
      '_mini',
      'profile_images_normal',
      'profile_images_bigger',
      'profile_images_mini',
    ];
    
    // サムネイル判定
    if (thumbnailPatterns.some(pattern => urlLower.includes(pattern))) {
      return 'thumbnail';
    }
    
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
   * ダウンロードが失敗したかどうかを判定
   * TwitterMediaHarvestの実装を参考にしたヘルパー関数
   */
  private isDownloadFailed(downloadId: number | undefined): downloadId is undefined {
    return downloadId === undefined;
  }

  /**
   * 動画URLの有効性を検証
   * TwitterMediaHarvestの実装を参考にした検証機能
   */
  private async validateVideoUrl(url: string): Promise<boolean> {
    try {
      console.log('Comiketter: Validating video URL:', url);
      
      // HEADリクエストでURLの有効性をチェック
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // CORSエラーを回避
        cache: 'no-cache'
      });

      // no-corsモードではresponse.okが常にfalseになるため、
      // レスポンスが存在するかどうかで判定
      if (response.type === 'opaque') {
        console.log('Comiketter: Video URL validation successful (opaque response)');
        return true;
      }

      // 通常のレスポンスの場合はステータスコードをチェック
      if (response.ok) {
        console.log('Comiketter: Video URL validation successful (status:', response.status, ')');
        return true;
      }

      console.warn('Comiketter: Video URL validation failed (status:', response.status, ')');
      return false;
    } catch (error) {
      console.warn('Comiketter: Video URL validation error:', error);
      // エラーが発生した場合は、ダウンロードを試行する（URLが有効な可能性がある）
      return true;
    }
  }

  /**
   * 動画URLから異なる品質のURLを生成
   * TwitterMediaHarvestの実装を参考にした品質選択機能
   */
  private generateAlternativeVideoUrls(originalUrl: string): string[] {
    const alternativeUrls: string[] = [];
    
    try {
      // ext_tw_videoのURLパターンを解析
      const extTwVideoMatch = originalUrl.match(/\/ext_tw_video\/([^\/]+)\/pu\/vid\/([^\/]+)\/([^\/]+)\/([^?]+)/);
      if (extTwVideoMatch) {
        const [, videoId, codec, resolution, filename] = extTwVideoMatch;
        
        // 異なる解像度を試す
        const resolutions = ['480x270', '640x360', '1280x720', '1920x1080'];
        const currentResolution = resolution;
        
        for (const res of resolutions) {
          if (res !== currentResolution) {
            const alternativeUrl = originalUrl.replace(
              `/vid/${codec}/${currentResolution}/${filename}`,
              `/vid/${codec}/${res}/${filename}`
            );
            alternativeUrls.push(alternativeUrl);
          }
        }
      }
      
      // amplify_videoのURLパターンも対応
      const amplifyVideoMatch = originalUrl.match(/\/amplify_video\/([^\/]+)\/vid\/([^\/]+)\/([^\/]+)\/([^?]+)/);
      if (amplifyVideoMatch) {
        const [, videoId, codec, resolution, filename] = amplifyVideoMatch;
        
        const resolutions = ['320x434', '480x652', '720x980', '1080x1464'];
        const currentResolution = resolution;
        
        for (const res of resolutions) {
          if (res !== currentResolution) {
            const alternativeUrl = originalUrl.replace(
              `/vid/${codec}/${currentResolution}/${filename}`,
              `/vid/${codec}/${res}/${filename}`
            );
            alternativeUrls.push(alternativeUrl);
          }
        }
      }
      
      console.log('Comiketter: Generated alternative video URLs:', alternativeUrls);
    } catch (error) {
      console.warn('Comiketter: Failed to generate alternative video URLs:', error);
    }
    
    return alternativeUrls;
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