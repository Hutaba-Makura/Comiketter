/**
 * CB用IndexedDBテスト（簡略版）
 */

import { bookmarkDB, type BookmarkDB, type BookmarkedTweetDB } from '../db/bookmark-db';

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
  bookmarkDB.setUseIndexedDBForTest(false);
});

describe('BookmarkDatabase (chrome.storage mode) - 簡略版', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
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
      await bookmarkDB.addBookmark(bookmark2);
      
      const result = await bookmarkDB.getAllBookmarks();
      
      expect(result).toHaveLength(2);
    });
  });
}); 