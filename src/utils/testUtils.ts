/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Test utilities for development and debugging
 */

// グローバル型定義
declare global {
  var setTimeout: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => number;
}

import { logger } from './logger';
import { TweetMediaFileProps } from '../types';

/**
 * テスト用のメディアファイルを作成
 */
export function createTestMediaFile(
  tweetId: string = '1234567890',
  type: 'image' | 'video' = 'image',
  url?: string
): TweetMediaFileProps {
  const defaultUrls = {
    image: 'https://pbs.twimg.com/media/test_image.jpg',
    video: 'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/1280x720/video.mp4',
  };

  return {
    tweetId,
    source: url || defaultUrls[type],
    tweetUser: {
      screenName: 'testuser',
      userId: '123456',
      displayName: 'Test User',
      isProtected: false,
    },
    type,
    ext: type === 'image' ? 'jpg' : 'mp4',
    serial: 1,
    hash: 'testhash123',
    createdAt: new Date(),
    tweetContent: 'This is a test tweet with media',
    mediaUrls: [url || defaultUrls[type]],
    mediaTypes: [type === 'image' ? 'image/jpeg' : 'video/mp4'],
    tweetDate: new Date().toISOString(),
  };
}

/**
 * テスト用のツイート情報を作成
 */
export function createTestTweetInfo(
  tweetId: string = '1234567890',
  hasMedia: boolean = true
) {
  const mediaUrls = hasMedia ? [
    'https://pbs.twimg.com/media/test_image.jpg',
    'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/1280x720/video.mp4',
  ] : [];

  return {
    tweetId,
    authorUsername: 'testuser',
    authorDisplayName: 'Test User',
    authorId: '123456',
    content: 'This is a test tweet with media content',
    mediaUrls,
    mediaTypes: hasMedia ? ['image/jpeg', 'video/mp4'] : [],
    tweetDate: new Date().toISOString(),
    url: `https://twitter.com/testuser/status/${tweetId}`,
  };
}

/**
 * テスト用のAPIレスポンスを作成
 */
export function createTestApiResponse(
  tweetId: string = '1234567890',
  hasMedia: boolean = true
) {
  const media = hasMedia ? [
    {
      type: 'photo',
      media_url_https: 'https://pbs.twimg.com/media/test_image.jpg',
    },
    {
      type: 'video',
      video_info: {
        variants: [
          {
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/1280x720/video.mp4',
            bitrate: 1000000,
          },
        ],
      },
    },
  ] : [];

  return {
    data: {
      tweet_results: {
        result: {
          legacy: {
            id_str: tweetId,
            extended_entities: {
              media,
            },
          },
          core: {
            user_results: {
              result: {
                legacy: {
                  screen_name: 'testuser',
                  id_str: '123456',
                  name: 'Test User',
                  protected: false,
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * テスト用のダウンロード要求を作成
 */
export function createTestDownloadRequest(
  tweetId: string = '1234567890',
  mediaUrls?: string[]
) {
  return {
    tweetId,
    screenName: 'testuser',
    mediaUrls: mediaUrls || [
      'https://pbs.twimg.com/media/test_image.jpg',
      'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/1280x720/video.mp4',
    ],
  };
}

/**
 * テスト用の設定を作成
 */
export function createTestSettings() {
  return {
    tlAutoUpdateDisabled: false,
    downloadMethod: 'chrome_downloads' as const,
    saveFormat: 'url' as const,
    saveDirectory: 'Comiketter',
    autoDownloadConditions: {
      retweet: false,
      like: false,
      both: false,
    },
    autoSaveTriggers: {
      retweet: false,
      like: false,
      retweetAndLike: false,
    },
    filenameSettings: {
      directory: 'Comiketter',
      noSubDirectory: false,
      filenamePattern: ['{account}', '{tweetId}', '{serial}'],
      fileAggregation: false,
      groupBy: '{account}',
    },
    mediaDownloadSettings: {
      includeVideoThumbnail: false,
      excludeProfileImages: true,
      excludeBannerImages: true,
    },
    timelineAutoUpdate: true,
    showCustomBookmarks: true,
  };
}

/**
 * テスト用のURLを検証
 */
export function validateTestUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && 
           (urlObj.hostname.includes('twimg.com') || urlObj.hostname.includes('twitter.com'));
  } catch {
    return false;
  }
}

/**
 * テスト用のメディアタイプを検出
 */
export function detectTestMediaType(url: string): 'image' | 'video' | 'unknown' {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('pbs.twimg.com/media/')) {
    return 'image';
  }
  
  if (urlLower.includes('video.twimg.com/')) {
    return 'video';
  }
  
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || 
      urlLower.includes('.png') || urlLower.includes('.gif') || 
      urlLower.includes('.webp')) {
    return 'image';
  }
  
  if (urlLower.includes('.mp4') || urlLower.includes('.mov') || 
      urlLower.includes('.avi') || urlLower.includes('.webm')) {
    return 'video';
  }
  
  return 'unknown';
}

/**
 * テスト用のファイル拡張子を取得
 */
export function getTestFileExtension(url: string): string {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpg';
  if (urlLower.includes('.png')) return 'png';
  if (urlLower.includes('.gif')) return 'gif';
  if (urlLower.includes('.webp')) return 'webp';
  if (urlLower.includes('.mp4')) return 'mp4';
  if (urlLower.includes('.mov')) return 'mov';
  if (urlLower.includes('.avi')) return 'avi';
  if (urlLower.includes('.webm')) return 'webm';
  
  return 'jpg'; // デフォルト
}

/**
 * テスト用のハッシュ値を生成
 */
export function generateTestHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash).toString(16);
}

/**
 * テスト用のログ出力
 */
export function logTestInfo(message: string, data?: any): void {
  logger.info(`[TEST] ${message}`, data, 'TestUtils');
}

/**
 * テスト用のエラーログ出力
 */
export function logTestError(message: string, error?: any): void {
  logger.error(`[TEST] ${message}`, error, 'TestUtils');
}

/**
 * テスト用の待機関数
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * テスト用のリトライ関数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      logTestInfo(`Attempt ${attempt} failed, retrying in ${delay}ms...`, lastError.message);
      await wait(delay);
    }
  }
  
  throw lastError!;
} 