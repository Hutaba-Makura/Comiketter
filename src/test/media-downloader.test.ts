/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 統合メディアダウンローダーのテスト
 */

import { MediaDownloader } from '../downloaders/media-downloader';
import type { ProcessedTweet, ProcessedMedia } from '../api-processor/types';

// モック設定
jest.mock('../utils/api-cache', () => ({
  ApiCacheManager: {
    findTweetById: jest.fn()
  }
}));

jest.mock('../utils/storage', () => ({
  StorageManager: {
    getSettings: jest.fn(),
    addDownloadHistory: jest.fn()
  }
}));

jest.mock('../utils/filenameGenerator', () => ({
  FilenameGenerator: {
    makeFilename: jest.fn().mockReturnValue('test-filename.jpg')
  }
}));

// Chrome APIのモック
global.chrome = {
  downloads: {
    download: jest.fn().mockImplementation((options, callback) => {
      callback(123); // ダウンロードID
    })
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1 }]),
    sendMessage: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'test-tweet-id',
        text: 'Test tweet',
        createdAt: '2024-01-01T00:00:00Z',
        author: {
          username: 'testuser',
          displayName: 'Test User',
          profileImageUrl: 'https://example.com/avatar.jpg'
        },
        media: [
          {
            type: 'image',
            url: 'https://example.com/image.jpg',
            media_url_https: 'https://example.com/image.jpg'
          },
          {
            type: 'video',
            url: 'https://example.com/video.mp4',
            media_url_https: 'https://example.com/video.mp4',
            video_info: {
              variants: [
                {
                  bitrate: 1000000,
                  content_type: 'video/mp4',
                  url: 'https://example.com/video.mp4'
                }
              ]
            }
          }
        ]
      }
    })
  },
  runtime: {
    lastError: null
  }
} as any;

describe('MediaDownloader', () => {
  let mediaDownloader: MediaDownloader;
  let mockTweet: ProcessedTweet;

  beforeEach(() => {
    mediaDownloader = new MediaDownloader();
    
    // テスト用のツイートデータ（画像と動画が混在）
    mockTweet = {
      id_str: '1868309123504497016',
      full_text: 'テストツイート',
      created_at: 'Sun Dec 15 14:56:21 +0000 2024',
      favorite_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0,
      bookmarked: false,
      favorited: false,
      retweeted: false,
      possibly_sensitive: false,
      user: {
        name: 'テストユーザー',
        screen_name: 'testuser',
        avatar_url: 'https://example.com/avatar.jpg'
      },
      media: [
        {
          id_str: '1868307618101678080',
          type: 'photo',
          media_url_https: 'https://pbs.twimg.com/media/Ge2P4UQbUAAjc1O.jpg'
        } as ProcessedMedia,
        {
          id_str: '1868307680361926656',
          type: 'video',
          media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/1868307680361926656/pu/img/KaJzZSCrekayN8C8.jpg',
          video_info: {
            aspect_ratio: [16, 9],
            duration_millis: 17002,
            variants: [
              {
                content_type: 'application/x-mpegURL',
                url: 'https://video.twimg.com/ext_tw_video/1868307680361926656/pu/pl/qhNdaZTFFdI7M4zl.m3u8?tag=12'
              },
              {
                bitrate: 256000,
                content_type: 'video/mp4',
                url: 'https://video.twimg.com/ext_tw_video/1868307680361926656/pu/vid/avc1/480x270/GZX5-w5dJSWOhn8S.mp4?tag=12'
              },
              {
                bitrate: 832000,
                content_type: 'video/mp4',
                url: 'https://video.twimg.com/ext_tw_video/1868307680361926656/pu/vid/avc1/640x360/z6crUCahfhVydo3C.mp4?tag=12'
              },
              {
                bitrate: 2176000,
                content_type: 'video/mp4',
                url: 'https://video.twimg.com/ext_tw_video/1868307680361926656/pu/vid/avc1/1280x720/L_yt54vuhk9sh3HA.mp4?tag=12'
              }
            ]
          }
        } as ProcessedMedia
      ]
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadMedia', () => {
    it('画像と動画が混在したツイートを正常にダウンロードできる', async () => {
      // キャッシュからツイートを取得するモック
      const { ApiCacheManager } = require('../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(mockTweet);

      // 設定を取得するモック
      const { StorageManager } = require('../utils/storage');
      StorageManager.getSettings.mockResolvedValue({
        filenameSettings: {
          directory: '{account}',
          filenamePattern: ['{tweetId}', '{serial}']
        }
      });

      const result = await mediaDownloader.downloadMedia({
        tweetId: '1868309123504497016',
        screenName: 'testuser'
      });

      expect(result.success).toBe(true);
      expect(result.downloadedFiles).toBeDefined();
      expect(result.downloadedFiles?.images).toHaveLength(1);
      expect(result.downloadedFiles?.videos).toHaveLength(1);
      expect(result.mediaCount?.images).toBe(1);
      expect(result.mediaCount?.videos).toBe(1);
    });

    it('画像のみのツイートを正常にダウンロードできる', async () => {
      const imageOnlyTweet = {
        ...mockTweet,
        media: [
          {
            id_str: '1868307618101678080',
            type: 'photo',
            media_url_https: 'https://pbs.twimg.com/media/Ge2P4UQbUAAjc1O.jpg'
          } as ProcessedMedia
        ]
      };

      const { ApiCacheManager } = require('../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(imageOnlyTweet);

      const { StorageManager } = require('../utils/storage');
      StorageManager.getSettings.mockResolvedValue({
        filenameSettings: {
          directory: '{account}',
          filenamePattern: ['{tweetId}', '{serial}']
        }
      });

      const result = await mediaDownloader.downloadMedia({
        tweetId: '1868309123504497016',
        screenName: 'testuser'
      });

      expect(result.success).toBe(true);
      expect(result.downloadedFiles?.images).toHaveLength(1);
      expect(result.downloadedFiles?.videos).toHaveLength(0);
      expect(result.mediaCount?.images).toBe(1);
      expect(result.mediaCount?.videos).toBe(0);
    });

    it('動画のみのツイートを正常にダウンロードできる', async () => {
      const videoOnlyTweet = {
        ...mockTweet,
        media: [
          {
            id_str: '1868307680361926656',
            type: 'video',
            media_url_https: 'https://pbs.twimg.com/ext_tw_video_thumb/1868307680361926656/pu/img/KaJzZSCrekayN8C8.jpg',
            video_info: {
              aspect_ratio: [16, 9],
              duration_millis: 17002,
              variants: [
                {
                  bitrate: 2176000,
                  content_type: 'video/mp4',
                  url: 'https://video.twimg.com/ext_tw_video/1868307680361926656/pu/vid/avc1/1280x720/L_yt54vuhk9sh3HA.mp4?tag=12'
                }
              ]
            }
          } as ProcessedMedia
        ]
      };

      const { ApiCacheManager } = require('../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(videoOnlyTweet);

      const { StorageManager } = require('../utils/storage');
      StorageManager.getSettings.mockResolvedValue({
        filenameSettings: {
          directory: '{account}',
          filenamePattern: ['{tweetId}', '{serial}']
        }
      });

      const result = await mediaDownloader.downloadMedia({
        tweetId: '1868309123504497016',
        screenName: 'testuser'
      });

      expect(result.success).toBe(true);
      expect(result.downloadedFiles?.images).toHaveLength(0);
      expect(result.downloadedFiles?.videos).toHaveLength(1);
      expect(result.mediaCount?.images).toBe(0);
      expect(result.mediaCount?.videos).toBe(1);
    });

    it('メディアがないツイートの場合はエラーを返す', async () => {
      const noMediaTweet = {
        ...mockTweet,
        media: []
      };

      const { ApiCacheManager } = require('../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(noMediaTweet);

      const result = await mediaDownloader.downloadMedia({
        tweetId: '1868309123504497016',
        screenName: 'testuser'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('ダウンロード可能なメディアが含まれていません');
    });

    it('キャッシュにツイートがない場合はDOMから取得を試行する', async () => {
      const { ApiCacheManager } = require('../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(null);

      const { StorageManager } = require('../utils/storage');
      StorageManager.getSettings.mockResolvedValue({
        filenameSettings: {
          directory: '{account}',
          filenamePattern: ['{tweetId}', '{serial}']
        }
      });

      const result = await mediaDownloader.downloadMedia({
        tweetId: '1868309123504497016',
        screenName: 'testuser'
      });

      expect(result.success).toBe(true);
      expect(result.downloadedFiles).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('設定取得に失敗した場合はエラーを返す', async () => {
      const { ApiCacheManager } = require('../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(mockTweet);

      const { StorageManager } = require('../utils/storage');
      StorageManager.getSettings.mockRejectedValue(new Error('設定取得エラー'));

      const result = await mediaDownloader.downloadMedia({
        tweetId: '1868309123504497016',
        screenName: 'testuser'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('設定を取得できませんでした');
    });

    it('ダウンロードAPIが失敗した場合はエラーを返す', async () => {
      // Chrome download APIを失敗させる
      (global.chrome as any).downloads.download = jest.fn().mockImplementation((options, callback) => {
        callback(undefined); // ダウンロードIDがundefined
      });

      const { ApiCacheManager } = require('../utils/api-cache');
      ApiCacheManager.findTweetById.mockResolvedValue(mockTweet);

      const { StorageManager } = require('../utils/storage');
      StorageManager.getSettings.mockResolvedValue({
        filenameSettings: {
          directory: '{account}',
          filenamePattern: ['{tweetId}', '{serial}']
        }
      });

      const result = await mediaDownloader.downloadMedia({
        tweetId: '1868309123504497016',
        screenName: 'testuser'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('すべてのメディアダウンロードが失敗しました');
    });
  });
}); 