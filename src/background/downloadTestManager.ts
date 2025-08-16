/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v.2. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2
 * 
 * Comiketter: Download Test Manager for testing download functionality
 */

import { StorageManager } from '../utils/storage';
import { VideoDownloader } from '../downloaders/video-downloader';
import { ImageDownloader } from '../downloaders/image-downloader';
import type { AppSettings } from '../types';

export class DownloadTestManager {
  private videoDownloader: VideoDownloader;
  private imageDownloader: ImageDownloader;

  constructor() {
    this.videoDownloader = new VideoDownloader();
    this.imageDownloader = new ImageDownloader();
  }

  /**
   * テスト用のダウンロード機能
   */
  async testDownload(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Comiketter: Testing download with URL:', url);
      
      const settings = await StorageManager.getSettings();
      if (!settings) {
        throw new Error('Settings not available');
      }

      // 動画URLの場合はVideoDownloaderを使用
      if (this.isVideoUrl(url)) {
        console.log('Comiketter: Testing video download');
        // 動画の場合は、実際のツイートIDが必要なので、テスト用のダミーリクエストを作成
        const result = await this.videoDownloader.downloadVideo({
          tweetId: 'test-video-tweet',
          screenName: 'testuser'
        });
        return result;
      }

      // 画像URLの場合はImageDownloaderを使用
      if (this.isImageUrl(url)) {
        console.log('Comiketter: Testing image download');
        const result = await this.imageDownloader.downloadImages({
          tweetId: 'test-image-tweet',
          screenName: 'testuser'
        });
        return result;
      }

      throw new Error('Unsupported media type');
    } catch (error) {
      console.error('Comiketter: Test download failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 動画URLかどうかを判定
   */
  private isVideoUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];
    return videoExtensions.some(ext => urlLower.includes(ext)) || urlLower.includes('video.twimg.com/');
  }

  /**
   * 画像URLかどうかを判定
   */
  private isImageUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => urlLower.includes(ext)) || urlLower.includes('pbs.twimg.com/media/');
  }
} 