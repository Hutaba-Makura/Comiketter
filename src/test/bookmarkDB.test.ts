/**
 * CB用IndexedDBテスト
 */

import { bookmarkDB, type BookmarkDB, type BookmarkedTweetDB } from '../utils/bookmarkDB';

// IndexedDBのモック
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// モック用のリクエストオブジェクトを作成する関数
const createMockRequest = (result?: any, error?: any) => {
  const request: any = {
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result,
    error,
  };

  // 非同期でコールバックを呼び出す
  const triggerCallback = (callbackName: 'onsuccess' | 'onerror') => {
    setTimeout(() => {
      if (request[callbackName]) {
        request[callbackName]();
      }
    }, 0);
  };

  return { request, triggerCallback };
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
};

const mockIDBObjectStore = {
  add: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
};

const mockIDBIndex = {
  getAll: jest.fn(),
};

// グローバルオブジェクトのモック
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// IDBKeyRangeのモック
Object.defineProperty(window, 'IDBKeyRange', {
  value: {
    only: jest.fn((value) => ({ value })),
  },
  writable: true,
});

describe('BookmarkDatabase', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // テスト用にデータベースをリセット
    await bookmarkDB.resetForTesting();
    
    // デフォルトのモック設定
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBObjectStore.index.mockReturnValue(mockIDBIndex);
  });

  // データベース初期化のヘルパー関数
  const setupDatabase = (mockDB: any) => {
    const { request, triggerCallback } = createMockRequest(mockDB);
    mockIndexedDB.open.mockReturnValue(request);
    return { request, triggerCallback };
  };

  // 操作リクエストのヘルパー関数
  const setupOperation = (operation: 'add' | 'get' | 'getAll' | 'put' | 'delete', result?: any, error?: any) => {
    const { request, triggerCallback } = createMockRequest(result, error);
    mockIDBObjectStore[operation].mockReturnValue(request);
    return { request, triggerCallback };
  };

  // インデックス操作のヘルパー関数
  const setupIndexOperation = (result?: any, error?: any) => {
    const { request, triggerCallback } = createMockRequest(result, error);
    mockIDBIndex.getAll.mockReturnValue(request);
    return { request, triggerCallback };
  };

  describe('初期化', () => {
    it('データベースを正常に初期化できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const { triggerCallback } = setupDatabase(mockDB);
      
      const initPromise = bookmarkDB.init();
      triggerCallback('onsuccess');
      
      const result = await initPromise;
      expect(mockIndexedDB.open).toHaveBeenCalledWith('ComiketterBookmarks', 1);
      expect(result).toBe(mockDB);
    });

    it('データベース初期化エラーを適切に処理する', async () => {
      const error = new Error('Database error');
      const { request, triggerCallback } = createMockRequest(undefined, error);
      mockIndexedDB.open.mockReturnValue(request);
      
      const initPromise = bookmarkDB.init();
      triggerCallback('onerror');
      
      await expect(initPromise).rejects.toBe(error);
    });
  });

  describe('ブックマーク操作', () => {
    it('ブックマークを正常に追加できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupOperation('add');
      
      const newBookmark = { name: 'テストブックマーク', description: 'テスト用', color: '#FF0000', isActive: true };
      
      const resultPromise = bookmarkDB.addBookmark(newBookmark);
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      const result = await resultPromise;
      
      expect(result.name).toBe(newBookmark.name);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('全ブックマークを正常に取得できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const mockBookmarks = [
        { id: '1', name: 'ブックマーク1', description: '説明1', color: '#FF0000', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', isActive: true },
        { id: '2', name: 'ブックマーク2', description: '説明2', color: '#00FF00', createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z', isActive: true },
      ];
      
      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupOperation('getAll', mockBookmarks);
      
      const resultPromise = bookmarkDB.getAllBookmarks();
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      const result = await resultPromise;
      
      expect(result).toHaveLength(2);
      // ソート順序を確認（新しい順）
      expect(result[0].name).toBe('ブックマーク2');
      expect(result[1].name).toBe('ブックマーク1');
    });

    it('アクティブなブックマークのみ取得できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const mockBookmarks = [
        { id: '1', name: 'アクティブブックマーク', isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      ];
      
      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupIndexOperation(mockBookmarks);
      
      const resultPromise = bookmarkDB.getActiveBookmarks();
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      const result = await resultPromise;
      
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('ブックマークを正常に更新できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const existingBookmark = { id: '1', name: '元の名前', description: '元の説明', color: '#FF0000', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', isActive: true };
      
      const dbSetup = setupDatabase(mockDB);
      const getSetup = setupOperation('get', existingBookmark);
      const putSetup = setupOperation('put');
      
      const updatePromise = bookmarkDB.updateBookmark('1', { name: '新しい名前' });
      dbSetup.triggerCallback('onsuccess');
      getSetup.triggerCallback('onsuccess');
      putSetup.triggerCallback('onsuccess');
      
      await expect(updatePromise).resolves.toBeUndefined();
    });

    it('ブックマークを正常に削除できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const existingBookmark = { id: '1', name: 'テスト', isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' };
      
      const dbSetup = setupDatabase(mockDB);
      const getSetup = setupOperation('get', existingBookmark);
      const putSetup = setupOperation('put');
      
      const deletePromise = bookmarkDB.deleteBookmark('1');
      dbSetup.triggerCallback('onsuccess');
      getSetup.triggerCallback('onsuccess');
      putSetup.triggerCallback('onsuccess');
      
      await expect(deletePromise).resolves.toBeUndefined();
    });
  });

  describe('ブックマーク済みツイート操作', () => {
    it('ブックマーク済みツイートを正常に追加できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const newTweet = {
        bookmarkId: 'bookmark-1',
        tweetId: 'tweet-1',
        authorUsername: 'testuser',
        authorDisplayName: 'テストユーザー',
        authorId: 'user-1',
        content: 'テストツイート',
        mediaUrls: ['http://example.com/image.jpg'],
        mediaTypes: ['image/jpeg'],
        tweetDate: '2024-01-01T00:00:00.000Z',
        isRetweet: false,
        isReply: false,
        saveType: 'url' as const,
      };

      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupOperation('add', newTweet);
      
      const resultPromise = bookmarkDB.addBookmarkedTweet(newTweet);
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      const result = await resultPromise;
      
      expect(result.bookmarkId).toBe(newTweet.bookmarkId);
      expect(result.tweetId).toBe(newTweet.tweetId);
      expect(result.id).toBeDefined();
      expect(result.savedAt).toBeDefined();
    });

    it('ブックマークIDでツイートを正常に取得できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const mockTweets = [
        {
          id: '1',
          bookmarkId: 'bookmark-1',
          tweetId: 'tweet-1',
          authorUsername: 'user1',
          content: 'ツイート1',
          tweetDate: '2024-01-01T00:00:00.000Z',
          savedAt: '2024-01-01T00:00:00.000Z',
          isRetweet: false,
          isReply: false,
          saveType: 'url' as const,
        },
      ];

      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupIndexOperation(mockTweets);
      
      const resultPromise = bookmarkDB.getBookmarkedTweetsByBookmarkId('bookmark-1');
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      const result = await resultPromise;
      
      expect(result).toHaveLength(1);
      expect(result[0].bookmarkId).toBe('bookmark-1');
    });

    it('ツイートIDでブックマーク済みツイートを正常に取得できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const mockTweets = [
        {
          id: '1',
          bookmarkId: 'bookmark-1',
          tweetId: 'tweet-1',
          authorUsername: 'user1',
          content: 'ツイート1',
          tweetDate: '2024-01-01T00:00:00.000Z',
          savedAt: '2024-01-01T00:00:00.000Z',
          isRetweet: false,
          isReply: false,
          saveType: 'url' as const,
        },
      ];

      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupIndexOperation(mockTweets);
      
      const resultPromise = bookmarkDB.getBookmarkedTweetByTweetId('tweet-1');
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      const result = await resultPromise;
      
      expect(result).toHaveLength(1);
      expect(result[0].tweetId).toBe('tweet-1');
    });

    it('ユーザー名でブックマーク済みツイートを正常に検索できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const mockTweets = [
        {
          id: '1',
          bookmarkId: 'bookmark-1',
          tweetId: 'tweet-1',
          authorUsername: 'testuser',
          content: 'ツイート1',
          tweetDate: '2024-01-01T00:00:00.000Z',
          savedAt: '2024-01-01T00:00:00.000Z',
          isRetweet: false,
          isReply: false,
          saveType: 'url' as const,
        },
      ];

      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupIndexOperation(mockTweets);
      
      const resultPromise = bookmarkDB.getBookmarkedTweetsByUsername('testuser');
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      const result = await resultPromise;
      
      expect(result).toHaveLength(1);
      expect(result[0].authorUsername).toBe('testuser');
    });
  });

  describe('統計機能', () => {
    it('統計情報を正常に取得できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const mockBookmarks = [
        { id: '1', name: 'ブックマーク1', isActive: true },
        { id: '2', name: 'ブックマーク2', isActive: false },
      ];

      const mockTweets = [
        { id: '1', bookmarkId: '1', tweetId: 'tweet-1' },
        { id: '2', bookmarkId: '1', tweetId: 'tweet-2' },
        { id: '3', bookmarkId: '2', tweetId: 'tweet-3' },
      ];

      const dbSetup = setupDatabase(mockDB);
      // 2つのgetAllリクエストを独立して管理
      const bookmarkReq = createMockRequest(mockBookmarks);
      const tweetReq = createMockRequest(mockTweets);
      let callCount = 0;
      mockIDBObjectStore.getAll.mockImplementation(() => {
        return callCount++ === 0 ? bookmarkReq.request : tweetReq.request;
      });

      const resultPromise = bookmarkDB.getBookmarkStats();
      dbSetup.triggerCallback('onsuccess');
      setTimeout(() => {
        bookmarkReq.triggerCallback('onsuccess');
        tweetReq.triggerCallback('onsuccess');
      }, 0);
      await new Promise(resolve => setTimeout(resolve, 10));
      const result = await resultPromise;
      
      expect(result.totalBookmarks).toBe(2);
      expect(result.totalTweets).toBe(3);
      expect(result.activeBookmarks).toBe(1);
      expect(result.tweetsByBookmark['1']).toBe(2);
      expect(result.tweetsByBookmark['2']).toBe(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('データベース操作エラーを適切に処理する', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const error = new Error('Operation failed');
      
      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupOperation('add', undefined, error);
      
      const addPromise = bookmarkDB.addBookmark({
        name: 'テスト',
        isActive: true,
      });
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onerror');
      
      await expect(addPromise).rejects.toBe(error);
    });

    it('存在しないブックマークの更新でエラーを投げる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      
      const dbSetup = setupDatabase(mockDB);
      const operationSetup = setupOperation('get', undefined); // 存在しない
      
      const updatePromise = bookmarkDB.updateBookmark('nonexistent', { name: 'new name' });
      dbSetup.triggerCallback('onsuccess');
      operationSetup.triggerCallback('onsuccess');
      
      await expect(updatePromise)
        .rejects.toThrow('Bookmark with id nonexistent not found');
    });
  });
}); 