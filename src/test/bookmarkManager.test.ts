/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: BookmarkManagerテスト（簡略版）
 */

import { BookmarkManager } from '../utils/bookmarkManager';
import type { CustomBookmark } from '../types';

// chrome.storage.localの完全なメモリモック
beforeAll(() => {
  const storage: Record<string, any> = {};
  global.chrome = {
    storage: {
      local: {
        get: jest.fn((keys) => {
          const result = typeof keys === 'string' ? { [keys]: storage[keys] } : storage;
          return Promise.resolve(result);
        }),
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
        clear: jest.fn(() => {
          Object.keys(storage).forEach(key => delete storage[key]);
          return Promise.resolve();
        }),
      },
    },
  } as any;
});

// 各テストの前にストレージをクリア
beforeEach(() => {
  if (chrome?.storage?.local?.clear) {
    chrome.storage.local.clear();
  }
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

describe('BookmarkManager - 簡略版', () => {
  let bookmarkManager: BookmarkManager;

  beforeEach(() => {
    bookmarkManager = BookmarkManager.getInstance();
  });

  afterEach(async () => {
    // テスト後にストレージをクリア
    if (chrome?.storage?.local?.clear) {
      await chrome.storage.local.clear();
    }
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
    });
  });
}); 