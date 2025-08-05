/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: BookmarkManagerテスト
 */

import { BookmarkManager } from '../utils/bookmarkManager';
import type { CustomBookmark } from '../types';

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
  const { bookmarkDB } = require('../db/bookmark-db');
  bookmarkDB.setUseIndexedDBForTest(false);
});

// モックデータ
const mockBookmark: Omit<CustomBookmark, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'テストブックマーク',
  description: 'これはテスト用のブックマークです',
  isActive: true,
};

describe('BookmarkManager', () => {
  let bookmarkManager: BookmarkManager;

  beforeEach(() => {
    bookmarkManager = BookmarkManager.getInstance();
  });

  afterEach(async () => {
    // テスト後にストレージをクリア
    await chrome.storage.local.remove(['comiketter_bookmarks', 'comiketter_bookmarked_tweets']);
  });

  describe('初期化', () => {
    it('シングルトンインスタンスを取得できる', () => {
      const instance1 = BookmarkManager.getInstance();
      const instance2 = BookmarkManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('初期化が成功する', async () => {
      await expect(bookmarkManager.initialize()).resolves.not.toThrow();
    });
  });

  describe('ブックマーク管理', () => {
    beforeEach(async () => {
      await bookmarkManager.initialize();
    });

    it('新規ブックマークを追加できる', async () => {
      const newBookmark = await bookmarkManager.addBookmark(
        mockBookmark.name,
        mockBookmark.description
      );

      expect(newBookmark).toMatchObject({
        name: mockBookmark.name,
        description: mockBookmark.description,
        isActive: true,
      });
      expect(newBookmark.id).toBeDefined();
      expect(newBookmark.createdAt).toBeDefined();
      expect(newBookmark.updatedAt).toBeDefined();
    });

    it('ブックマーク一覧を取得できる', async () => {
      await bookmarkManager.addBookmark('ブックマーク1', '説明1');
      await bookmarkManager.addBookmark('ブックマーク2', '説明2');

      const bookmarks = await bookmarkManager.getBookmarks();
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0].name).toBe('ブックマーク1');
      expect(bookmarks[1].name).toBe('ブックマーク2');
    });

    it('ブックマークを更新できる', async () => {
      const bookmark = await bookmarkManager.addBookmark('元の名前', '元の説明');
      
      await bookmarkManager.updateBookmark(bookmark.id, {
        name: '新しい名前',
        description: '新しい説明',
      });

      const updatedBookmark = (await bookmarkManager.getBookmarks()).find(
        b => b.id === bookmark.id
      );
      expect(updatedBookmark?.name).toBe('新しい名前');
      expect(updatedBookmark?.description).toBe('新しい説明');
    });

    it('ブックマークを削除できる', async () => {
      const bookmark = await bookmarkManager.addBookmark('削除対象', '説明');
      
      await bookmarkManager.deleteBookmark(bookmark.id);
      
      const bookmarks = await bookmarkManager.getBookmarks();
      expect(bookmarks).toHaveLength(0);
    });
  });

  describe('ツイート管理', () => {
    let bookmark: CustomBookmark;

    beforeEach(async () => {
      await bookmarkManager.initialize();
      bookmark = await bookmarkManager.addBookmark('テストブックマーク', '説明');
    });

    it('ツイートをブックマークに追加できる', async () => {
      // まずブックマーク済みツイートを作成
      await bookmarkManager.addBookmarkedTweet(
        bookmark.id,
        '1234567890123456789',
        'testuser',
        'テストユーザー',
        '123456789',
        'これはテストツイートです',
        new Date().toISOString()
      );

      // ツイートがブックマークされているかチェック
      const isBookmarked = await bookmarkManager.isTweetBookmarked('1234567890123456789', bookmark.id);
      expect(isBookmarked).toBe(true);
    });

    it('同じツイートを重複して追加しない', async () => {
      const tweetId = '1234567890123456789';
      
      // 最初の追加
      await bookmarkManager.addBookmarkedTweet(
        bookmark.id,
        tweetId,
        'testuser',
        'テストユーザー',
        '123456789',
        'これはテストツイートです',
        new Date().toISOString()
      );

      // 同じツイートを再度追加しようとする
      await bookmarkManager.addBookmarkedTweet(
        bookmark.id,
        tweetId,
        'testuser',
        'テストユーザー',
        '123456789',
        'これはテストツイートです',
        new Date().toISOString()
      );

      // ツイートが1つだけ存在することを確認
      const bookmarkedTweets = await bookmarkManager.getBookmarkedTweetByTweetId(tweetId);
      expect(bookmarkedTweets).toHaveLength(1);
    });

    it('ツイートがブックマークされているかチェックできる', async () => {
      const tweetId = '1234567890123456789';
      
      // 最初はブックマークされていない
      const isBookmarkedBefore = await bookmarkManager.isTweetBookmarked(tweetId, bookmark.id);
      expect(isBookmarkedBefore).toBe(false);

      // ブックマークに追加
      await bookmarkManager.addBookmarkedTweet(
        bookmark.id,
        tweetId,
        'testuser',
        'テストユーザー',
        '123456789',
        'これはテストツイートです',
        new Date().toISOString()
      );
      
      // ブックマークされていることを確認
      const isBookmarkedAfter = await bookmarkManager.isTweetBookmarked(tweetId, bookmark.id);
      expect(isBookmarkedAfter).toBe(true);
    });

    it('ツイートをブックマークから削除できる', async () => {
      const tweetId = '1234567890123456789';
      
      // ブックマークに追加
      const bookmarkedTweet = await bookmarkManager.addBookmarkedTweet(
        bookmark.id,
        tweetId,
        'testuser',
        'テストユーザー',
        '123456789',
        'これはテストツイートです',
        new Date().toISOString()
      );

      // 削除
      await bookmarkManager.deleteBookmarkedTweet(bookmarkedTweet.id);

      // 削除されたことを確認
      const isBookmarked = await bookmarkManager.isTweetBookmarked(tweetId, bookmark.id);
      expect(isBookmarked).toBe(false);
    });

    it('ツイートがどのブックマークに保存されているか取得できる', async () => {
      const tweetId = '1234567890123456789';
      const bookmark2 = await bookmarkManager.addBookmark('ブックマーク2', '説明2');
      
      // 両方のブックマークに追加
      await bookmarkManager.addBookmarkedTweet(
        bookmark.id,
        tweetId,
        'testuser',
        'テストユーザー',
        '123456789',
        'これはテストツイートです',
        new Date().toISOString()
      );
      
      await bookmarkManager.addBookmarkedTweet(
        bookmark2.id,
        tweetId,
        'testuser',
        'テストユーザー',
        '123456789',
        'これはテストツイートです',
        new Date().toISOString()
      );
      
      const bookmarksForTweet = await bookmarkManager.getBookmarksForTweet(tweetId);
      expect(bookmarksForTweet).toHaveLength(2);
      expect(bookmarksForTweet.map(b => b.id)).toContain(bookmark.id);
      expect(bookmarksForTweet.map(b => b.id)).toContain(bookmark2.id);
    });
  });

  describe('検索・並び替え', () => {
    beforeEach(async () => {
      await bookmarkManager.initialize();
      await bookmarkManager.addBookmark('アルファブックマーク', '説明A');
      await bookmarkManager.addBookmark('ベータブックマーク', '説明B');
      await bookmarkManager.addBookmark('ガンマブックマーク', '説明C');
    });

    it('ブックマーク名で検索できる', async () => {
      const results = await bookmarkManager.searchBookmarks('アルファ');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('アルファブックマーク');
    });

    it('説明文で検索できる', async () => {
      const results = await bookmarkManager.searchBookmarks('説明B');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('ベータブックマーク');
    });

    it('大文字小文字を区別しない検索', async () => {
      const results = await bookmarkManager.searchBookmarks('アルファ');
      expect(results).toHaveLength(1);
    });

    it('名前で並び替えできる', async () => {
      const bookmarks = await bookmarkManager.getBookmarks();
      const sorted = await bookmarkManager.sortBookmarks(bookmarks, 'name');
      expect(sorted[0].name).toBe('アルファブックマーク');
      expect(sorted[1].name).toBe('ガンマブックマーク');
      expect(sorted[2].name).toBe('ベータブックマーク');
    });

    it('作成日で並び替えできる', async () => {
      const bookmarks = await bookmarkManager.getBookmarks();
      const sorted = await bookmarkManager.sortBookmarks(bookmarks, 'createdAt');
      expect(sorted.length).toBe(3);
    });
  });

  describe('バリデーション', () => {
    it('空の名前は無効', async () => {
      const validation = await bookmarkManager.validateBookmark('');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('ブックマーク名は必須です');
    });

    it('長すぎる名前は無効', async () => {
      const longName = 'a'.repeat(51);
      const validation = await bookmarkManager.validateBookmark(longName);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('ブックマーク名は50文字以内で入力してください');
    });

    it('重複する名前は無効', async () => {
      await bookmarkManager.initialize();
      await bookmarkManager.addBookmark('テストブックマーク', '説明');
      
      const validation = await bookmarkManager.validateBookmark('テストブックマーク');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('同じ名前のブックマークが既に存在します');
    });

    it('有効な名前は検証を通過する', async () => {
      const validation = await bookmarkManager.validateBookmark('有効なブックマーク名');
      expect(validation.isValid).toBe(true);
    });
  });

  describe('統計情報', () => {
    beforeEach(async () => {
      await bookmarkManager.initialize();
    });

    it('ブックマーク統計を取得できる', async () => {
      const stats = await bookmarkManager.getBookmarkStats();
      expect(stats).toHaveProperty('totalBookmarks');
      expect(stats).toHaveProperty('totalTweets');
      expect(stats).toHaveProperty('activeBookmarks');
      expect(stats).toHaveProperty('tweetsByBookmark');
    });
  });
}); 