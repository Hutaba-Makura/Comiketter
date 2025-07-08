/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: BookmarkManagerテスト
 */

import { BookmarkManager } from '../utils/bookmarkManager';
import type { Tweet, CustomBookmark } from '../types';

// モックデータ
const mockTweet: Tweet = {
  id: '1234567890123456789',
  text: 'これはテストツイートです #Comiketter',
  author: {
    username: 'testuser',
    displayName: 'テストユーザー',
    profileImageUrl: 'https://example.com/avatar.jpg',
  },
  createdAt: new Date().toISOString(),
  url: 'https://twitter.com/testuser/status/1234567890123456789',
};

const mockBookmark: Omit<CustomBookmark, 'id' | 'createdAt' | 'updatedAt' | 'tweetCount'> = {
  name: 'テストブックマーク',
  description: 'これはテスト用のブックマークです',
  tweetIds: [],
};

describe('BookmarkManager', () => {
  let bookmarkManager: BookmarkManager;

  beforeEach(() => {
    bookmarkManager = BookmarkManager.getInstance();
  });

  afterEach(async () => {
    // テスト後にストレージをクリア
    await chrome.storage.local.clear();
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
        tweetCount: 0,
        tweetIds: [],
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
      await bookmarkManager.addTweetToBookmark(mockTweet, [bookmark.id]);

      const updatedBookmark = (await bookmarkManager.getBookmarks()).find(
        b => b.id === bookmark.id
      );
      expect(updatedBookmark?.tweetIds).toContain(mockTweet.id);
      expect(updatedBookmark?.tweetCount).toBe(1);
    });

    it('同じツイートを重複して追加しない', async () => {
      await bookmarkManager.addTweetToBookmark(mockTweet, [bookmark.id]);
      await bookmarkManager.addTweetToBookmark(mockTweet, [bookmark.id]);

      const updatedBookmark = (await bookmarkManager.getBookmarks()).find(
        b => b.id === bookmark.id
      );
      expect(updatedBookmark?.tweetIds).toHaveLength(1);
      expect(updatedBookmark?.tweetCount).toBe(1);
    });

    it('ツイートがブックマークされているかチェックできる', async () => {
      expect(bookmarkManager.isTweetBookmarked(mockTweet.id, bookmark.id)).toBe(false);

      await bookmarkManager.addTweetToBookmark(mockTweet, [bookmark.id]);
      
      expect(bookmarkManager.isTweetBookmarked(mockTweet.id, bookmark.id)).toBe(true);
    });

    it('ツイートをブックマークから削除できる', async () => {
      await bookmarkManager.addTweetToBookmark(mockTweet, [bookmark.id]);
      await bookmarkManager.removeTweetFromBookmark(mockTweet.id, bookmark.id);

      const updatedBookmark = (await bookmarkManager.getBookmarks()).find(
        b => b.id === bookmark.id
      );
      expect(updatedBookmark?.tweetIds).not.toContain(mockTweet.id);
      expect(updatedBookmark?.tweetCount).toBe(0);
    });

    it('ツイートがどのブックマークに保存されているか取得できる', async () => {
      const bookmark2 = await bookmarkManager.addBookmark('ブックマーク2', '説明2');
      
      await bookmarkManager.addTweetToBookmark(mockTweet, [bookmark.id, bookmark2.id]);
      
      const bookmarksForTweet = bookmarkManager.getBookmarksForTweet(mockTweet.id);
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

    it('ブックマーク名で検索できる', () => {
      const results = bookmarkManager.searchBookmarks('アルファ');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('アルファブックマーク');
    });

    it('説明文で検索できる', () => {
      const results = bookmarkManager.searchBookmarks('説明B');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('ベータブックマーク');
    });

    it('大文字小文字を区別しない検索', () => {
      const results = bookmarkManager.searchBookmarks('アルファ');
      expect(results).toHaveLength(1);
    });

    it('名前で並び替えできる（昇順）', () => {
      const sorted = bookmarkManager.sortBookmarks('name', 'asc');
      expect(sorted[0].name).toBe('アルファブックマーク');
      expect(sorted[1].name).toBe('ガンマブックマーク');
      expect(sorted[2].name).toBe('ベータブックマーク');
    });

    it('名前で並び替えできる（降順）', () => {
      const sorted = bookmarkManager.sortBookmarks('name', 'desc');
      expect(sorted[0].name).toBe('ベータブックマーク');
      expect(sorted[1].name).toBe('ガンマブックマーク');
      expect(sorted[2].name).toBe('アルファブックマーク');
    });
  });

  describe('バリデーション', () => {
    it('空の名前は無効', () => {
      const validation = bookmarkManager.validateBookmark('');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('ブックマーク名は必須です');
    });

    it('長すぎる名前は無効', () => {
      const longName = 'a'.repeat(51);
      const validation = bookmarkManager.validateBookmark(longName);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('ブックマーク名は50文字以内で入力してください');
    });

    it('長すぎる説明は無効', () => {
      const longDescription = 'a'.repeat(201);
      const validation = bookmarkManager.validateBookmark('テスト', longDescription);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('説明は200文字以内で入力してください');
    });

    it('重複する名前は無効', async () => {
      await bookmarkManager.initialize();
      await bookmarkManager.addBookmark('重複テスト', '説明');
      
      const validation = bookmarkManager.validateBookmark('重複テスト');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('同じ名前のブックマークが既に存在します');
    });

    it('有効なブックマークは検証を通過', () => {
      const validation = bookmarkManager.validateBookmark('有効な名前', '有効な説明');
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
}); 