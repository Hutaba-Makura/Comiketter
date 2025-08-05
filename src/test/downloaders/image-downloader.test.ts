/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ImageDownloader テスト
 */

import { ImageDownloader } from '../../downloaders/image-downloader';
import type { ProcessedTweet, ProcessedMedia } from '../../api-processor/types';

// モック設定
jest.mock('../../utils/api-cache', () => ({
  ApiCacheManager: {
    findTweetById: jest.fn()
  }
}));

jest.mock('../../utils/storage', () => ({
  StorageManager: {
    addDownloadHistory: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../../utils/filenameGenerator', () => ({
  FilenameGenerator: {
    makeFilename: jest.fn().mockReturnValue('test_filename.jpg')
  }
}));

// ImageDownloaderのgetSettingsメソッドをモック（より安全な方法）
const mockGetSettings = jest.fn().mockResolvedValue({
  downloadDirectory: 'test_dir',
  filenamePattern: '{username}_{tweet_id}_{media_id}',
  conflictAction: 'rename'
});

jest.mock('../../downloaders/image-downloader', () => {
  const originalModule = jest.requireActual('../../downloaders/image-downloader');
  const MockedImageDownloader = jest.fn().mockImplementation(() => {
    const instance = new originalModule.ImageDownloader();
    instance.getSettings = mockGetSettings;
    return instance;
  });
  return {
    ...originalModule,
    ImageDownloader: MockedImageDownloader
  };
});

// モックデータ
const mockImageTweet: ProcessedTweet = {
  id_str: '1234567890',
  full_text: 'テスト画像ツイート',
  created_at: 'Wed Oct 10 20:19:24 +0000 2018',
  favorite_count: 10,
  retweet_count: 5,
  reply_count: 2,
  quote_count: 1,
  bookmarked: false,
  favorited: false,
  retweeted: false,
  possibly_sensitive: false,
  user: {
    name: 'テストユーザー',
    screen_name: 'testuser',
    avatar_url: 'https://pbs.twimg.com/profile_images/test.jpg'
  },
  media: [
    {
      id_str: '9876543210',
      type: 'photo',
      media_url_https: 'https://pbs.twimg.com/media/test_image.jpg'
    }
  ]
};

const mockVideoTweet: ProcessedTweet = {
  id_str: '1234567891',
  full_text: 'テスト動画ツイート',
  created_at: 'Wed Oct 10 20:19:24 +0000 2018',
  favorite_count: 10,
  retweet_count: 5,
  reply_count: 2,
  quote_count: 1,
  bookmarked: false,
  favorited: false,
  retweeted: false,
  possibly_sensitive: false,
  user: {
    name: 'テストユーザー',
    screen_name: 'testuser',
    avatar_url: 'https://pbs.twimg.com/profile_images/test.jpg'
  },
  media: [
    {
      id_str: '9876543211',
      type: 'video',
      media_url_https: 'https://pbs.twimg.com/amplify_video_thumb/test.jpg',
      video_info: {
        duration_millis: 10000,
        aspect_ratio: [16, 9],
        variants: [
          {
            bitrate: 1280000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/test.mp4'
          }
        ]
      }
    }
  ]
};

const mockTextTweet: ProcessedTweet = {
  id_str: '1234567892',
  full_text: 'テキストのみのツイート',
  created_at: 'Wed Oct 10 20:19:24 +0000 2018',
  favorite_count: 10,
  retweet_count: 5,
  reply_count: 2,
  quote_count: 1,
  bookmarked: false,
  favorited: false,
  retweeted: false,
  possibly_sensitive: false,
  user: {
    name: 'テストユーザー',
    screen_name: 'testuser',
    avatar_url: 'https://pbs.twimg.com/profile_images/test.jpg'
  }
};

describe('ImageDownloader', () => {
  let imageDownloader: ImageDownloader;

  beforeEach(() => {
    imageDownloader = new ImageDownloader();
    
    // Chrome API のモック
    global.chrome = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({
            comiketter_settings: {
              filenameSettings: {
                pattern: '{author}_{date}_{tweetId}',
                directory: 'Comiketter'
              },
              downloadMethod: 'chrome_downloads'
            }
          })
        }
      } as any,
      downloads: {
        download: jest.fn().mockImplementation((options, callback) => {
          callback(12345); // ダウンロードID
        })
      } as any,
      runtime: {
        lastError: null
      } as any
    } as any;

    // ApiCacheManager のモックをリセット
    const { ApiCacheManager } = require('../../utils/api-cache');
    ApiCacheManager.findTweetById.mockClear();

    // StorageManager のモックをリセット
    const { StorageManager } = require('../../utils/storage');
    StorageManager.addDownloadHistory.mockClear();

    // FilenameGenerator のモックをリセット
    const { FilenameGenerator } = require('../../utils/filenameGenerator');
    FilenameGenerator.makeFilename.mockClear();
    FilenameGenerator.makeFilename.mockReturnValue('test_filename.jpg');
  });

  describe('extractImageMedia', () => {
    it('画像メディアを正しく抽出する', () => {
      const result = (imageDownloader as any).extractImageMedia(mockImageTweet);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('photo');
      expect(result[0].media_url_https).toBe('https://pbs.twimg.com/media/test_image.jpg');
    });

    it('動画ツイートからは画像を抽出しない', () => {
      const result = (imageDownloader as any).extractImageMedia(mockVideoTweet);
      expect(result).toHaveLength(0);
    });

    it('テキストツイートからは画像を抽出しない', () => {
      const result = (imageDownloader as any).extractImageMedia(mockTextTweet);
      expect(result).toHaveLength(0);
    });
  });

  describe('getBestImageUrl', () => {
    it('有効な画像URLを返す', () => {
      const media: ProcessedMedia = {
        id_str: '123',
        type: 'photo',
        media_url_https: 'https://pbs.twimg.com/media/test.jpg'
      };
      
      const result = (imageDownloader as any).getBestImageUrl(media);
      expect(result).toBe('https://pbs.twimg.com/media/test.jpg');
    });

    it('サムネイル画像を除外する', () => {
      const media: ProcessedMedia = {
        id_str: '123',
        type: 'photo',
        media_url_https: 'https://pbs.twimg.com/media/test_thumb.jpg'
      };
      
      const result = (imageDownloader as any).getBestImageUrl(media);
      expect(result).toBeNull();
    });

    it('プロフィール画像を除外する', () => {
      const media: ProcessedMedia = {
        id_str: '123',
        type: 'photo',
        media_url_https: 'https://pbs.twimg.com/profile_images/test.jpg'
      };
      
      const result = (imageDownloader as any).getBestImageUrl(media);
      expect(result).toBeNull();
    });
  });

  describe('generateHash', () => {
    it('URLからハッシュを生成する', () => {
      const url = 'https://pbs.twimg.com/media/test.jpg';
      const result = (imageDownloader as any).generateHash(url);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('同じURLから同じハッシュを生成する', () => {
      const url = 'https://pbs.twimg.com/media/test.jpg';
      const hash1 = (imageDownloader as any).generateHash(url);
      const hash2 = (imageDownloader as any).generateHash(url);
      expect(hash1).toBe(hash2);
    });
  });

  describe('downloadImages', () => {
    it('画像ダウンロードを成功させる', async () => {
      const { ApiCacheManager } = require('../../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(mockImageTweet);

      const request = { tweetId: '1234567890' };
      const result = await imageDownloader.downloadImages(request);

      if (!result.success) {
        console.log('ImageDownloader test error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.downloadedFiles).toBeDefined();
      expect(result.tweetInfo).toBeDefined();
    });

    it('キャッシュにツイートがない場合はエラーを返す', async () => {
      const { ApiCacheManager } = require('../../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(null);

      const request = { tweetId: 'nonexistent' };
      const result = await imageDownloader.downloadImages(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ツイートが見つかりません');
    });

    it('画像がないツイートの場合はエラーを返す', async () => {
      const { ApiCacheManager } = require('../../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(mockTextTweet); // テキストのみのツイート

      const request = { tweetId: '1234567892' };
      const result = await imageDownloader.downloadImages(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('このツイートには画像が含まれていません');
    });
  });
}); 