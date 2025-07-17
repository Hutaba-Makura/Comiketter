/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v.2. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2
 * 
 * Comiketter: Download Test Manager for testing download functionality
 */

import { TweetMediaFileProps } from '../types';
import { DownloadManager } from './downloadManager';

export class DownloadTestManager {
  private downloadManager: DownloadManager;

  constructor(downloadManager: DownloadManager) {
    this.downloadManager = downloadManager;
  }

  /**
   * テスト用のダウンロード機能
   */
  async testDownload(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Comiketter: Testing download with URL:', url);
      
      const settings = await this.downloadManager.getCurrentSettings();
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

      await this.downloadManager.downloadMediaFile(testMediaFile, settings);
      
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
   * メディアタイプを検出（TwitterMediaHarvest準拠）
   */
  private detectMediaType(url: string): 'image' | 'thumbnail' | 'video' {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm'];    
    const urlLower = url.toLowerCase();
    
    // サムネイル画像のパターン
    const thumbnailPatterns = ['thumb', 'small', 'mini', '_normal', '_bigger', '_mini', 'profile_images_normal', 'profile_images_bigger', 'profile_images_mini'];
    
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
    
    // 動画URLの場合はmp4を返す
    if (urlLower.includes('video.twimg.com/')) {
      return 'mp4';
    }
    
    // 画像URLの場合はjpgを返す
    if (urlLower.includes('pbs.twimg.com/media/')) {
      return 'jpg';
    }
    
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
      hash = hash & hash; //32bit整数に変換
    }
    return Math.abs(hash).toString(16);
  }
} 