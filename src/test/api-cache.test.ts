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

// Chrome Runtime APIのモック
const mockChromeRuntime = {
  onMessage: {
    addListener: jest.fn(),
  },
};

// Chrome Downloads APIのモック
const mockChromeDownloads = {
  onChanged: {
    addListener: jest.fn(),
  },
};

// グローバルなchromeオブジェクトをモック
global.chrome = {
  storage: mockChromeStorage,
  runtime: mockChromeRuntime,
  downloads: mockChromeDownloads,
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

  describe('findTweetById', () => {
    it('指定されたid_strでツイートを正常に検索できる', async () => {
      const currentTime = Date.now();
      const targetTweet = {
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
        cached_at: currentTime,
        api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
      };

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [targetTweet],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetById('123456789');

      expect(result).not.toBeNull();
      expect(result?.id_str).toBe('123456789');
      expect(result?.full_text).toBe('テストツイート');
      expect(result?.user.screen_name).toBe('testuser');
      expect(result?.cached_at).toBe(currentTime);
      expect(result?.api_source).toBe('https://x.com/i/api/graphql/HomeLatestTimeline');
    });

    it('存在しないid_strの場合はnullを返す', async () => {
      const currentTime = Date.now();
      const cacheEntries = [
        {
          id: 'cache1',
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
              cached_at: currentTime,
              api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            },
          ],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetById('999999999');

      expect(result).toBeNull();
    });

    it('期限切れのキャッシュからは検索しない', async () => {
      const currentTime = Date.now();
      const cacheEntries = [
        {
          id: 'expired_cache',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 24 * 60 * 60 * 1000,
          expires_at: currentTime - 1000, // 期限切れ
          tweets: [
            {
              id_str: '123456789',
              full_text: '期限切れツイート',
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
              cached_at: currentTime - 24 * 60 * 60 * 1000,
              api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            },
          ],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetById('123456789');

      expect(result).toBeNull();
    });
  });

  describe('findTweetsByIds', () => {
    it('指定されたid_strのリストでツイートを一括検索できる', async () => {
      const currentTime = Date.now();
      const tweets = [
        {
          id_str: '123456789',
          full_text: 'ツイート1',
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
            name: 'テストユーザー1',
            screen_name: 'testuser1',
            avatar_url: 'https://example.com/avatar1.jpg',
          },
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
        },
        {
          id_str: '987654321',
          full_text: 'ツイート2',
          created_at: 'Sun Jul 13 16:06:00 +0000 2025',
          favorite_count: 20,
          retweet_count: 10,
          reply_count: 5,
          quote_count: 2,
          bookmarked: true,
          favorited: false,
          retweeted: true,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー2',
            screen_name: 'testuser2',
            avatar_url: 'https://example.com/avatar2.jpg',
          },
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/UserTweets',
        },
      ];

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[0]],
        },
        {
          id: 'cache2',
          api_type: 'UserTweets' as ApiType,
          api_path: 'https://x.com/i/api/graphql/UserTweets',
          timestamp: currentTime - 500,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[1]],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetsByIds(['123456789', '987654321', '999999999']);

      expect(result).toHaveLength(2);
      expect(result[0].id_str).toBe('123456789');
      expect(result[1].id_str).toBe('987654321');
      expect(result[0].full_text).toBe('ツイート1');
      expect(result[1].full_text).toBe('ツイート2');
    });

    it('重複するid_strがある場合は重複を除去する', async () => {
      const currentTime = Date.now();
      const tweet = {
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
        cached_at: currentTime,
        api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
      };

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweet],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetsByIds(['123456789', '123456789', '999999999']);

      expect(result).toHaveLength(1);
      expect(result[0].id_str).toBe('123456789');
    });
  });

  describe('findTweetsByUsername', () => {
    it('指定されたユーザー名でツイートを検索できる（screen_name）', async () => {
      const currentTime = Date.now();
      const tweets = [
        {
          id_str: '123456789',
          full_text: 'ツイート1',
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
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
        },
        {
          id_str: '987654321',
          full_text: 'ツイート2',
          created_at: 'Sun Jul 13 16:06:00 +0000 2025',
          favorite_count: 20,
          retweet_count: 10,
          reply_count: 5,
          quote_count: 2,
          bookmarked: true,
          favorited: false,
          retweeted: true,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー',
            screen_name: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/UserTweets',
        },
      ];

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[0]],
        },
        {
          id: 'cache2',
          api_type: 'UserTweets' as ApiType,
          api_path: 'https://x.com/i/api/graphql/UserTweets',
          timestamp: currentTime - 500,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[1]],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetsByUsername('testuser');

      expect(result).toHaveLength(2);
      expect(result[0].id_str).toBe('123456789');
      expect(result[1].id_str).toBe('987654321');
      expect(result[0].user.screen_name).toBe('testuser');
      expect(result[1].user.screen_name).toBe('testuser');
    });

    it('指定されたユーザー名でツイートを検索できる（name）', async () => {
      const currentTime = Date.now();
      const tweet = {
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
        cached_at: currentTime,
        api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
      };

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweet],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetsByUsername('テストユーザー');

      expect(result).toHaveLength(1);
      expect(result[0].id_str).toBe('123456789');
      expect(result[0].user.name).toBe('テストユーザー');
    });

    it('存在しないユーザー名の場合は空配列を返す', async () => {
      const currentTime = Date.now();
      const cacheEntries = [
        {
          id: 'cache1',
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
              cached_at: currentTime,
              api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            },
          ],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      const result = await ApiCacheManager.findTweetsByUsername('nonexistentuser');

      expect(result).toHaveLength(0);
    });
  });

  describe('ApiProcessor static methods', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockChromeStorage.local.get.mockResolvedValue({});
    });

    describe('findTweetById', () => {
      it('ApiProcessor.findTweetByIdがApiCacheManager.findTweetByIdを呼び出す', async () => {
        const currentTime = Date.now();
        const targetTweet = {
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
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
        };

        const cacheEntries = [
          {
            id: 'cache1',
            api_type: 'HomeLatestTimeline' as ApiType,
            api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            timestamp: currentTime - 1000,
            expires_at: currentTime + 24 * 60 * 60 * 1000,
            tweets: [targetTweet],
          },
        ];

        mockChromeStorage.local.get.mockResolvedValue({
          comiketter_api_cache: cacheEntries,
        });

        // ApiProcessorの静的メソッドをインポート
        const { ApiProcessor } = require('../api-processor/api-processor');
        const result = await ApiProcessor.findTweetById('123456789');

        expect(result).not.toBeNull();
        expect(result?.id_str).toBe('123456789');
        expect(result?.full_text).toBe('テストツイート');
      });
    });

    describe('findTweetsByIds', () => {
      it('ApiProcessor.findTweetsByIdsがApiCacheManager.findTweetsByIdsを呼び出す', async () => {
        const currentTime = Date.now();
        const tweets = [
          {
            id_str: '123456789',
            full_text: 'ツイート1',
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
              name: 'テストユーザー1',
              screen_name: 'testuser1',
              avatar_url: 'https://example.com/avatar1.jpg',
            },
            cached_at: currentTime,
            api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          },
          {
            id_str: '987654321',
            full_text: 'ツイート2',
            created_at: 'Sun Jul 13 16:06:00 +0000 2025',
            favorite_count: 20,
            retweet_count: 10,
            reply_count: 5,
            quote_count: 2,
            bookmarked: true,
            favorited: false,
            retweeted: true,
            possibly_sensitive: false,
            user: {
              name: 'テストユーザー2',
              screen_name: 'testuser2',
              avatar_url: 'https://example.com/avatar2.jpg',
            },
            cached_at: currentTime,
            api_source: 'https://x.com/i/api/graphql/UserTweets',
          },
        ];

        const cacheEntries = [
          {
            id: 'cache1',
            api_type: 'HomeLatestTimeline' as ApiType,
            api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            timestamp: currentTime - 1000,
            expires_at: currentTime + 24 * 60 * 60 * 1000,
            tweets: [tweets[0]],
          },
          {
            id: 'cache2',
            api_type: 'UserTweets' as ApiType,
            api_path: 'https://x.com/i/api/graphql/UserTweets',
            timestamp: currentTime - 500,
            expires_at: currentTime + 24 * 60 * 60 * 1000,
            tweets: [tweets[1]],
          },
        ];

        mockChromeStorage.local.get.mockResolvedValue({
          comiketter_api_cache: cacheEntries,
        });

        // ApiProcessorの静的メソッドをインポート
        const { ApiProcessor } = require('../api-processor/api-processor');
        const result = await ApiProcessor.findTweetsByIds(['123456789', '987654321']);

        expect(result).toHaveLength(2);
        expect(result[0].id_str).toBe('123456789');
        expect(result[1].id_str).toBe('987654321');
      });
    });

    describe('findTweetsByUsername', () => {
      it('ApiProcessor.findTweetsByUsernameがApiCacheManager.findTweetsByUsernameを呼び出す', async () => {
        const currentTime = Date.now();
        const tweets = [
          {
            id_str: '123456789',
            full_text: 'ツイート1',
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
            cached_at: currentTime,
            api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          },
          {
            id_str: '987654321',
            full_text: 'ツイート2',
            created_at: 'Sun Jul 13 16:06:00 +0000 2025',
            favorite_count: 20,
            retweet_count: 10,
            reply_count: 5,
            quote_count: 2,
            bookmarked: true,
            favorited: false,
            retweeted: true,
            possibly_sensitive: false,
            user: {
              name: 'テストユーザー',
              screen_name: 'testuser',
              avatar_url: 'https://example.com/avatar.jpg',
            },
            cached_at: currentTime,
            api_source: 'https://x.com/i/api/graphql/UserTweets',
          },
        ];

        const cacheEntries = [
          {
            id: 'cache1',
            api_type: 'HomeLatestTimeline' as ApiType,
            api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
            timestamp: currentTime - 1000,
            expires_at: currentTime + 24 * 60 * 60 * 1000,
            tweets: [tweets[0]],
          },
          {
            id: 'cache2',
            api_type: 'UserTweets' as ApiType,
            api_path: 'https://x.com/i/api/graphql/UserTweets',
            timestamp: currentTime - 500,
            expires_at: currentTime + 24 * 60 * 60 * 1000,
            tweets: [tweets[1]],
          },
        ];

        mockChromeStorage.local.get.mockResolvedValue({
          comiketter_api_cache: cacheEntries,
        });

        // ApiProcessorの静的メソッドをインポート
        const { ApiProcessor } = require('../api-processor/api-processor');
        const result = await ApiProcessor.findTweetsByUsername('testuser');

        expect(result).toHaveLength(2);
        expect(result[0].user.screen_name).toBe('testuser');
        expect(result[1].user.screen_name).toBe('testuser');
      });
    });
  });

  describe('Background Message Handler Cache Actions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockChromeStorage.local.get.mockResolvedValue({});
    });

    it('findTweetByIdアクションが正常に処理される', async () => {
      const currentTime = Date.now();
      const targetTweet = {
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
        cached_at: currentTime,
        api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
      };

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [targetTweet],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      // MessageHandlerをインポート
      const { MessageHandler } = require('../background/messageHandler');
      const messageHandler = new MessageHandler();

      // メッセージハンドラーのプライベートメソッドをテスト
      const result = await messageHandler['handleCacheAction']({
        action: 'findTweetById',
        data: { id_str: '123456789' }
      });

      expect(result).not.toBeNull();
      expect(result?.id_str).toBe('123456789');
      expect(result?.full_text).toBe('テストツイート');
    });

    it('findTweetsByIdsアクションが正常に処理される', async () => {
      const currentTime = Date.now();
      const tweets = [
        {
          id_str: '123456789',
          full_text: 'ツイート1',
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
            name: 'テストユーザー1',
            screen_name: 'testuser1',
            avatar_url: 'https://example.com/avatar1.jpg',
          },
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
        },
        {
          id_str: '987654321',
          full_text: 'ツイート2',
          created_at: 'Sun Jul 13 16:06:00 +0000 2025',
          favorite_count: 20,
          retweet_count: 10,
          reply_count: 5,
          quote_count: 2,
          bookmarked: true,
          favorited: false,
          retweeted: true,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー2',
            screen_name: 'testuser2',
            avatar_url: 'https://example.com/avatar2.jpg',
          },
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/UserTweets',
        },
      ];

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[0]],
        },
        {
          id: 'cache2',
          api_type: 'UserTweets' as ApiType,
          api_path: 'https://x.com/i/api/graphql/UserTweets',
          timestamp: currentTime - 500,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[1]],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      // MessageHandlerをインポート
      const { MessageHandler } = require('../background/messageHandler');
      const messageHandler = new MessageHandler();

      // メッセージハンドラーのプライベートメソッドをテスト
      const result = await messageHandler['handleCacheAction']({
        action: 'findTweetsByIds',
        data: { id_strs: ['123456789', '987654321'] }
      });

      expect(result).toHaveLength(2);
      expect(result[0].id_str).toBe('123456789');
      expect(result[1].id_str).toBe('987654321');
    });

    it('findTweetsByUsernameアクションが正常に処理される', async () => {
      const currentTime = Date.now();
      const tweets = [
        {
          id_str: '123456789',
          full_text: 'ツイート1',
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
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/HomeLatestTimeline',
        },
        {
          id_str: '987654321',
          full_text: 'ツイート2',
          created_at: 'Sun Jul 13 16:06:00 +0000 2025',
          favorite_count: 20,
          retweet_count: 10,
          reply_count: 5,
          quote_count: 2,
          bookmarked: true,
          favorited: false,
          retweeted: true,
          possibly_sensitive: false,
          user: {
            name: 'テストユーザー',
            screen_name: 'testuser',
            avatar_url: 'https://example.com/avatar.jpg',
          },
          cached_at: currentTime,
          api_source: 'https://x.com/i/api/graphql/UserTweets',
        },
      ];

      const cacheEntries = [
        {
          id: 'cache1',
          api_type: 'HomeLatestTimeline' as ApiType,
          api_path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
          timestamp: currentTime - 1000,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[0]],
        },
        {
          id: 'cache2',
          api_type: 'UserTweets' as ApiType,
          api_path: 'https://x.com/i/api/graphql/UserTweets',
          timestamp: currentTime - 500,
          expires_at: currentTime + 24 * 60 * 60 * 1000,
          tweets: [tweets[1]],
        },
      ];

      mockChromeStorage.local.get.mockResolvedValue({
        comiketter_api_cache: cacheEntries,
      });

      // MessageHandlerをインポート
      const { MessageHandler } = require('../background/messageHandler');
      const messageHandler = new MessageHandler();

      // メッセージハンドラーのプライベートメソッドをテスト
      const result = await messageHandler['handleCacheAction']({
        action: 'findTweetsByUsername',
        data: { username: 'testuser' }
      });

      expect(result).toHaveLength(2);
      expect(result[0].user.screen_name).toBe('testuser');
      expect(result[1].user.screen_name).toBe('testuser');
    });

    it('無効なアクションの場合はエラーを投げる', async () => {
      // MessageHandlerをインポート
      const { MessageHandler } = require('../background/messageHandler');
      const messageHandler = new MessageHandler();

      // 無効なアクションでエラーが投げられることを確認
      await expect(
        messageHandler['handleCacheAction']({
          action: 'invalidAction',
          data: {}
        })
      ).rejects.toThrow('Unknown cache action: invalidAction');
    });

    it('必須パラメータが不足している場合はエラーを投げる', async () => {
      // MessageHandlerをインポート
      const { MessageHandler } = require('../background/messageHandler');
      const messageHandler = new MessageHandler();

      // id_strが不足している場合
      await expect(
        messageHandler['handleCacheAction']({
          action: 'findTweetById',
          data: {}
        })
      ).rejects.toThrow('id_str is required');

      // id_strsが不足している場合
      await expect(
        messageHandler['handleCacheAction']({
          action: 'findTweetsByIds',
          data: {}
        })
      ).rejects.toThrow('id_strs array is required');

      // usernameが不足している場合
      await expect(
        messageHandler['handleCacheAction']({
          action: 'findTweetsByUsername',
          data: {}
        })
      ).rejects.toThrow('username is required');
    });
  });
}); 