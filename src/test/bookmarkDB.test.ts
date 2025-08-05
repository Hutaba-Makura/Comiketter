/**
 * CB用IndexedDBテスト
 */

import { bookmarkDB, type BookmarkDB, type BookmarkedTweetDB } from '../db/bookmark-db';

jest.setTimeout(10000);

// chrome.storage.localの完全なメモリモック
beforeAll(() => {
  const storage: Record<string, any> = {};
  global.chrome = {
    storage: {
      local: {
        get: jest.fn((keys) => Promise.resolve(typeof keys === 'string' ? { [keys]: storage[keys] } : storage)),
        set: jest.fn((items) => {
          Object.assign(storage, items);
          return Promise.resolve();
        }),
        remove: jest.fn((keys) => {
          if (Array.isArray(keys)) {
            keys.forEach((k) => delete storage[k]);
          } else {
            delete storage[keys];
          }
          return Promise.resolve();
        }),
      },
    },
  } as any;
});

// 各テストでIndexedDBを無効化
beforeEach(() => {
  bookmarkDB.setUseIndexedDBForTest(false);
});

describe('BookmarkDatabase (chrome.storage mode)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // テスト用にデータベースをリセット
    await bookmarkDB.resetForTesting();
  });

  describe('初期化', () => {
    it('データベースを正常に初期化できる', async () => {
      const result = await bookmarkDB.init();
      expect(result).toBeNull(); // chrome.storageモードではnullを返す
    });
  });

  describe('ブックマーク操作', () => {
    it('ブックマークを正常に追加できる', async () => {
      const newBookmark = { name: 'テストブックマーク', description: 'テスト用', color: '#FF0000', isActive: true };
      
      const result = await bookmarkDB.addBookmark(newBookmark);
      
      expect(result.name).toBe(newBookmark.name);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('全ブックマークを正常に取得できる', async () => {
      const bookmark1 = { name: 'ブックマーク1', description: '説明1', color: '#FF0000', isActive: true };
      const bookmark2 = { name: 'ブックマーク2', description: '説明2', color: '#00FF00', isActive: true };
      
      await bookmarkDB.addBookmark(bookmark1);
      // 少し時間を空けて2番目のブックマークを追加
      await new Promise(resolve => setTimeout(resolve, 10));
      await bookmarkDB.addBookmark(bookmark2);
      
      const result = await bookmarkDB.getAllBookmarks();
      
      expect(result).toHaveLength(2);
      // ソート順序を確認（新しい順）
      expect(result[0].name).toBe('ブックマーク2');
      expect(result[1].name).toBe('ブックマーク1');
    });

    it('アクティブなブックマークのみ取得できる', async () => {
      const activeBookmark = { name: 'アクティブブックマーク', isActive: true };
      const inactiveBookmark = { name: '非アクティブブックマーク', isActive: false };
      
      await bookmarkDB.addBookmark(activeBookmark);
      await bookmarkDB.addBookmark(inactiveBookmark);
      
      const result = await bookmarkDB.getActiveBookmarks();
      
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('ブックマークを正常に更新できる', async () => {
      const bookmark = await bookmarkDB.addBookmark({ name: '元の名前', description: '元の説明', isActive: true });
      
      await bookmarkDB.updateBookmark(bookmark.id, { name: '新しい名前' });
      
      const updatedBookmark = await bookmarkDB.getBookmarkById(bookmark.id);
      expect(updatedBookmark?.name).toBe('新しい名前');
    });

    it('ブックマークを正常に削除できる', async () => {
      const bookmark = await bookmarkDB.addBookmark({ name: '削除対象', description: '説明', isActive: true });
      
      await bookmarkDB.deleteBookmark(bookmark.id);
      
      const bookmarks = await bookmarkDB.getAllBookmarks();
      expect(bookmarks).toHaveLength(0);
    });

    it('存在しないブックマークの更新でエラーを投げる', async () => {
      await expect(bookmarkDB.updateBookmark('存在しないID', { name: '新しい名前' }))
        .rejects.toThrow('Bookmark with id 存在しないID not found');
    });
  });

  describe('ブックマーク済みツイート操作', () => {
    let bookmark: BookmarkDB;

    beforeEach(async () => {
      bookmark = await bookmarkDB.addBookmark({ name: 'テストブックマーク', isActive: true });
    });

    it('ブックマーク済みツイートを正常に追加できる', async () => {
      const tweet = {
        bookmarkId: bookmark.id,
        tweetId: '1234567890123456789',
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: '123456789',
        content: 'これはテストツイートです',
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };
      
      const result = await bookmarkDB.addBookmarkedTweet(tweet);
      
      expect(result.tweetId).toBe(tweet.tweetId);
      expect(result.id).toBeDefined();
      expect(result.savedAt).toBeDefined();
    });

    it('ブックマークIDでツイートを正常に取得できる', async () => {
      const tweet = {
        bookmarkId: bookmark.id,
        tweetId: '1234567890123456789',
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: '123456789',
        content: 'これはテストツイートです',
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };
      
      await bookmarkDB.addBookmarkedTweet(tweet);
      
      const result = await bookmarkDB.getBookmarkedTweetsByBookmarkId(bookmark.id);
      
      expect(result).toHaveLength(1);
      expect(result[0].tweetId).toBe(tweet.tweetId);
    });

    it('ツイートIDでブックマーク済みツイートを正常に取得できる', async () => {
      const tweet = {
        bookmarkId: bookmark.id,
        tweetId: '1234567890123456789',
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: '123456789',
        content: 'これはテストツイートです',
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };
      
      await bookmarkDB.addBookmarkedTweet(tweet);
      
      const result = await bookmarkDB.getBookmarkedTweetByTweetId(tweet.tweetId);
      
      expect(result).toHaveLength(1);
      expect(result[0].bookmarkId).toBe(bookmark.id);
    });

    it('ユーザー名でブックマーク済みツイートを正常に検索できる', async () => {
      const tweet = {
        bookmarkId: bookmark.id,
        tweetId: '1234567890123456789',
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: '123456789',
        content: 'これはテストツイートです',
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };
      
      await bookmarkDB.addBookmarkedTweet(tweet);
      
      const result = await bookmarkDB.getBookmarkedTweetsByUsername('testuser');
      
      expect(result).toHaveLength(1);
      expect(result[0].authorUsername).toBe('testuser');
    });
  });

  describe('統計機能', () => {
    it('ブックマーク統計を正常に取得できる', async () => {
      const bookmark1 = await bookmarkDB.addBookmark({ name: 'ブックマーク1', isActive: true });
      const bookmark2 = await bookmarkDB.addBookmark({ name: 'ブックマーク2', isActive: false });
      
      const tweet1 = {
        bookmarkId: bookmark1.id,
        tweetId: '1234567890123456789',
        authorUsername: 'testuser1',
        authorDisplayName: 'テストユーザー1',
        authorId: '123456789',
        content: 'これはテストツイート1です',
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };
      
      const tweet2 = {
        bookmarkId: bookmark1.id,
        tweetId: '1234567890123456790',
        authorUsername: 'testuser2',
        authorDisplayName: 'テストユーザー2',
        authorId: '123456790',
        content: 'これはテストツイート2です',
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };
      
      await bookmarkDB.addBookmarkedTweet(tweet1);
      await bookmarkDB.addBookmarkedTweet(tweet2);
      
      const stats = await bookmarkDB.getBookmarkStats();
      
      expect(stats.totalBookmarks).toBe(2);
      expect(stats.totalTweets).toBe(2);
      expect(stats.activeBookmarks).toBe(1);
      expect(stats.tweetsByBookmark[bookmark1.id]).toBe(2);
      expect(stats.tweetsByBookmark[bookmark2.id]).toBe(0);
    });
  });

  describe('データクリア機能', () => {
    it('全データを正常にクリアできる', async () => {
      const bookmark = await bookmarkDB.addBookmark({ name: 'テストブックマーク', isActive: true });
      
      const tweet = {
        bookmarkId: bookmark.id,
        tweetId: '1234567890123456789',
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: '123456789',
        content: 'これはテストツイートです',
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };
      
      await bookmarkDB.addBookmarkedTweet(tweet);
      
      await bookmarkDB.clearAllData();
      
      const bookmarks = await bookmarkDB.getAllBookmarks();
      const tweets = await bookmarkDB.getAllBookmarkedTweets();
      
      expect(bookmarks).toHaveLength(0);
      expect(tweets).toHaveLength(0);
    });
  });
}); 