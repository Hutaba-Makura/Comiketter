/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: VideoDownloader テスト
 */

import { VideoDownloader } from '../../downloaders/video-downloader';
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
    makeFilename: jest.fn().mockReturnValue('test_filename.mp4')
  }
}));

// VideoDownloaderのgetSettingsメソッドをモック（より安全な方法）
const mockGetSettings = jest.fn().mockResolvedValue({
  downloadDirectory: 'test_dir',
  filenamePattern: '{username}_{tweet_id}_{media_id}',
  conflictAction: 'rename'
});

jest.mock('../../downloaders/video-downloader', () => {
  const originalModule = jest.requireActual('../../downloaders/video-downloader');
  const MockedVideoDownloader = jest.fn().mockImplementation(() => {
    const instance = new originalModule.VideoDownloader();
    instance.getSettings = mockGetSettings;
    return instance;
  });
  return {
    ...originalModule,
    VideoDownloader: MockedVideoDownloader
  };
});

// モックデータ
const mockVideoTweet: ProcessedTweet = {
  id_str: '1234567890',
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
      id_str: '9876543210',
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
          },
          {
            bitrate: 2560000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/test_hd.mp4'
          }
        ]
      }
    }
  ]
};

const mockGifTweet: ProcessedTweet = {
  id_str: '1234567891',
  full_text: 'テストGIFツイート',
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
      type: 'animated_gif',
      media_url_https: 'https://pbs.twimg.com/tweet_video_thumb/test.jpg',
      video_info: {
        duration_millis: 5000,
        aspect_ratio: [1, 1],
        variants: [
          {
            bitrate: 640000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/tweet_video/test.mp4'
          }
        ]
      }
    }
  ]
};

const mockImageTweet: ProcessedTweet = {
  id_str: '1234567892',
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
      id_str: '9876543212',
      type: 'photo',
      media_url_https: 'https://pbs.twimg.com/media/test_image.jpg'
    }
  ]
};

const mockTextTweet: ProcessedTweet = {
  id_str: '1234567893',
  full_text: 'テストテキストツイート',
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
  media: []
};

describe('VideoDownloader', () => {
  let videoDownloader: VideoDownloader;

  beforeEach(() => {
    videoDownloader = new VideoDownloader();
    
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
    FilenameGenerator.makeFilename.mockReturnValue('test_filename.mp4');
  });

  describe('extractVideoMedia', () => {
    it('動画メディアを正しく抽出する', () => {
      const result = (videoDownloader as any).extractVideoMedia(mockVideoTweet);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('video');
      expect(result[0].video_info).toBeDefined();
    });

    it('GIFメディアを正しく抽出する', () => {
      const result = (videoDownloader as any).extractVideoMedia(mockGifTweet);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('animated_gif');
      expect(result[0].video_info).toBeDefined();
    });

    it('画像ツイートからは動画を抽出しない', () => {
      const result = (videoDownloader as any).extractVideoMedia(mockImageTweet);
      expect(result).toHaveLength(0);
    });
  });

  describe('getBestVideoUrl', () => {
    it('最高ビットレートの動画URLを返す', () => {
      const media: ProcessedMedia = {
        id_str: '123',
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
            },
            {
              bitrate: 2560000,
              content_type: 'video/mp4',
              url: 'https://video.twimg.com/test_hd.mp4'
            }
          ]
        }
      };
      
      const result = (videoDownloader as any).getBestVideoUrl(media);
      expect(result).toBe('https://video.twimg.com/test_hd.mp4');
    });

    it('MP4以外のバリアントを除外する', () => {
      const media: ProcessedMedia = {
        id_str: '123',
        type: 'video',
        media_url_https: 'https://pbs.twimg.com/amplify_video_thumb/test.jpg',
        video_info: {
          duration_millis: 10000,
          aspect_ratio: [16, 9],
          variants: [
            {
              content_type: 'application/x-mpegURL',
              url: 'https://video.twimg.com/test.m3u8'
            }
          ]
        }
      };
      
      const result = (videoDownloader as any).getBestVideoUrl(media);
      expect(result).toBeNull();
    });

    it('ビットレートが0の場合は適切に処理する', () => {
      const media: ProcessedMedia = {
        id_str: '123',
        type: 'video',
        media_url_https: 'https://pbs.twimg.com/amplify_video_thumb/test.jpg',
        video_info: {
          duration_millis: 10000,
          aspect_ratio: [16, 9],
          variants: [
            {
              bitrate: 0,
              content_type: 'video/mp4',
              url: 'https://video.twimg.com/test.mp4'
            },
            {
              bitrate: 1280000,
              content_type: 'video/mp4',
              url: 'https://video.twimg.com/test_hd.mp4'
            }
          ]
        }
      };
      
      const result = (videoDownloader as any).getBestVideoUrl(media);
      expect(result).toBe('https://video.twimg.com/test_hd.mp4');
    });
  });

  describe('generateHash', () => {
    it('URLからハッシュを生成する', () => {
      const url = 'https://video.twimg.com/test.mp4';
      const result = (videoDownloader as any).generateHash(url);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('同じURLから同じハッシュを生成する', () => {
      const url = 'https://video.twimg.com/test.mp4';
      const hash1 = (videoDownloader as any).generateHash(url);
      const hash2 = (videoDownloader as any).generateHash(url);
      expect(hash1).toBe(hash2);
    });
  });

  describe('downloadVideo', () => {
    it('動画ダウンロードを成功させる', async () => {
      const { ApiCacheManager } = require('../../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(mockVideoTweet);

      const request = { tweetId: '1234567890' };
      const result = await videoDownloader.downloadVideo(request);

      if (!result.success) {
        console.log('VideoDownloader test error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.downloadedFiles).toBeDefined();
      expect(result.tweetInfo).toBeDefined();
    });

    it('キャッシュにツイートがない場合はエラーを返す', async () => {
      const { ApiCacheManager } = require('../../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(null);

      const request = { tweetId: 'nonexistent' };
      const result = await videoDownloader.downloadVideo(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('キャッシュにツイートが見つかりません');
    });

    it('動画がないツイートの場合はエラーを返す', async () => {
      const { ApiCacheManager } = require('../../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(mockTextTweet); // テキストのみのツイートを使用

      const request = { tweetId: '1234567893' };
      const result = await videoDownloader.downloadVideo(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('このツイートには動画が含まれていません');
    });
  });
}); 