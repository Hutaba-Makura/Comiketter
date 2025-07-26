/**
 * APIキャッシュ機能のテスト
 */

import { ApiCacheManager } from '../utils/api-cache';
import type { ProcessedTweet, ApiType } from '../api-processor/types';

// Chrome APIのモック
const mockChromeStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
};

// グローバルなchromeオブジェクトをモック
global.chrome = {
  storage: mockChromeStorage,
} as any;

describe('ApiCacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeStorage.local.get.mockResolvedValue({});
  });

  describe('saveCache', () => {
    it('キャッシュを正常に保存できる', async () => {
      const apiType: ApiType = 'HomeLatestTimeline';
      const apiPath = 'https://x.com/i/api/graphql/HomeLatestTimeline';
      const tweets: ProcessedTweet[] = [
        {
          id_str: '123456789',
          full_text: 'テストツイート',
          created_at: 'Sun Jul 13 16:05:00 +0000 2025',
          favorite_count: 10,
          retweet_count: 5,
          reply_count: 2,
          quote_count: 1,
          bookmarked: false,
          favorited: true,
          retweeted: false,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー',
            screen_name: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ];
      const timestamp = Date.now();

      await ApiCacheManager.saveCache(apiType, apiPath, tweets, timestamp);

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          comiketter_api_cache: expect.arrayContaining([
            expect.objectContaining({
              api_type: apiType,
              api_path: apiPath,
              timestamp,
              tweets: expect.arrayContaining([
                expect.objectContaining({
                  id_str: '123456789',
                  cached_at: timestamp,
                  api_source: apiPath,
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('同じAPIタイプとパスの古いキャッシュを削除して新しいキャッシュを保存する', async () => {
      const existingCache = [
        {
          id: 'old_cache',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: Date.now() - 1000,
          expires_at: Date.now() + 24 * 60 * 60 * 1000,
          tweets: [],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: existingCache,
      });

      const newTweets: ProcessedTweet[] = [
        {
          id_str: '123456789',
          full_text: '新しいツイート',
          created_at: 'Sun Jul 13 16:05:00 +0000 2025',
          favorite_count: 10,
          retweet_count: 5,
          reply_count: 2,
          quote_count: 1,
          bookmarked: false,
          favorited: true,
          retweeted: false,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー',
            screen_name: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
      ];

      await ApiCacheManager.saveCache(
        'HomeLatestTimeline',
        'https://x.com/i/api/graphql/HomeLatestTimeline',
        newTweets,
        Date.now()
      );

      // 古いキャッシュが削除され、新しいキャッシュのみが保存されることを確認
      const savedCache = mockChromeStorage.local.set.mock.calls[0][0].comiketter_api_cache;
      expect(savedCache).toHaveLength(1);
      expect(savedCache[0].tweets).toHaveLength(1);
      expect(savedCache[0].tweets[0].id_str).toBe('123456789');
    });
  });

  describe('getCachedTweets', () => {
    it('有効期限が切れていないキャッシュからツイートを取得できる', async () => {
      const currentTime = Date.now();
      const validCache = [
        {
          id: 'valid_cache',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [
            {
              id_str: '123456789',
              full_text: 'テストツイート',
              created_at: 'Sun Jul 13 16:05:00 +0000 2025',
              favorite_count: 10,
              retweet_count: 5,
              reply_count: 2,
              quote_count: 1,
              bookmarked: false,
              favorited: true,
              retweeted: false,
              possibly_sensitive: false,
              user: {
                name: 'テストユーザー',
                screen_name: 'testuser',
                avatar_url: 'https://example.com/avatar.jpg',
              },
              cached_at: currentTime - 1000,
              api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            },
          ],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: validCache,
      });

      const result = await ApiCacheManager.getCachedTweets(
        'HomeLatestTimeline',
        'https://x.com/i/api/graphql/HomeLatestTimeline',
        currentTime
      );

      expect(result).toHaveLength(1);
      expect(result[0].id_str).toBe('123456789');
    });

    it('有効期限が切れたキャッシュは取得しない', async () => {
      const currentTime = Date.now();
      const expiredCache = [
        {
          id: 'expired_cache',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 24 * 60 * 60 * 1000,
          expires_at: currentTime - 1000, // 期限切れ
          tweets: [],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: expiredCache,
      });

      const result = await ApiCacheManager.getCachedTweets(
        'HomeLatestTimeline',
        'https://x.com/i/api/graphql/HomeLatestTimeline',
        currentTime
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('processWithCache', () => {
    it('新しいツイートのみを抽出してキャッシュを更新する', async () => {
      const currentTime = Date.now();
      const cachedTweets = [
        {
          id_str: '123456789',
          full_text: '既存のツイート',
          created_at: 'Sun Jul 13 16:05:00 +0000 2025',
          favorite_count: 10,
          retweet_count: 5,
          reply_count: 2,
          quote_count: 1,
          bookmarked: false,
          favorited: true,
          retweeted: false,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー',
            screen_name: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          cached_at: currentTime - 1000,
          api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: [
          {
            id: 'existing_cache',
            api_type: 'HomeLatestTimeline' as ApiType,
            api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            timestamp: currentTime - 1000,
            expires_at: currentTime + 24 * 60 * 60 * 1000,
            tweets: cachedTweets,
          },
        ],
      });

      const newTweets: ProcessedTweet[] = [
        {
          id_str: '123456789', // 既存のツイート
          full_text: '既存のツイート（更新）',
          created_at: 'Sun Jul 13 16:05:00 +0000 2025',
          favorite_count: 15,
          retweet_count: 8,
          reply_count: 3,
          quote_count: 2,
          bookmarked: false,
          favorited: true,
          retweeted: false,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー',
            screen_name: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
        },
        {
          id_str: '987654321', // 新しいツイート
          full_text: '新しいツイート',
          created_at: 'Sun Jul 13 16:06:00 +0000 2025',
          favorite_count: 5,
          retweet_count: 2,
          reply_count: 1,
          quote_count: 0,
          bookmarked: false,
          favorited: false,
          retweeted: false,
          possibly_sensitive: false,
          user: {
            name: '新しいユーザー',
            screen_name: 'newuser',
            avatar_url: 'https://example.com/newavatar.jpg',
          },
        },
      ];

      const result = await ApiCacheManager.processWithCache(
        'HomeLatestTimeline',
        'https://x.com/i/api/graphql/HomeLatestTimeline',
        newTweets,
        currentTime
      );

      expect(result.cached_tweets).toHaveLength(1);
      expect(result.new_tweets).toHaveLength(1);
      expect(result.new_tweets[0].id_str).toBe('987654321');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('cleanupExpiredCache', () => {
    it('期限切れのキャッシュを削除する', async () => {
      const currentTime = Date.now();
      const cacheEntries = [
        {
          id: 'valid_cache',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [],
        },
        {
          id: 'expired_cache',
          api_type: 'TweetDetail' as ApiType,
          api_path: 'https://x.com/i/api/graphql/TweetDetail',
          timestamp: currentTime - 24 * 60 * 60 * 1000,
          expires_at: currentTime - 1000, // 期限切れ
          tweets: [],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      await ApiCacheManager.cleanupExpiredCache();

      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          comiketter_api_cache: expect.arrayContaining([
            expect.objectContaining({ id: 'valid_cache' }),
          ]),
        })
      );

      const savedCache = mockChromeStorage.local.set.mock.calls[0][0].comiketter_api_cache;
      expect(savedCache).toHaveLength(1);
      expect(savedCache[0].id).toBe('valid_cache');
    });
  });

  describe('getCacheStats', () => {
    it('キャッシュ統計を正しく取得する', async () => {
      const currentTime = Date.now();
      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [{ id_str: '1' }, { id_str: '2' }],
        },
        {
          id: 'cache2',
          api_type: 'TweetDetail' as ApiType,
          api_path: 'https://x.com/i/api/graphql/TweetDetail',
          timestamp: currentTime - 500,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [{ id_str: '3' }],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const stats = await ApiCacheManager.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalTweets).toBe(3);
      expect(stats.oldestEntry).toBe(currentTime - 1000);
      expect(stats.newestEntry).toBe(currentTime - 500);
    });

    it('キャッシュが空の場合は適切な統計を返す', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: [],
      });

      const stats = await ApiCacheManager.getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalTweets).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });
}); 