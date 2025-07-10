/**
 * CB用IndexedDBテスト
 */

import { bookmarkDB, type BookmarkDB, type BookmarkedTweetDB } from '../utils/bookmarkDB';

// IndexedDBのモック
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockIDBRequest = {
  onerror: null as any,
  onsuccess: null as any,
  onupgradeneeded: null as any,
  result: null as any,
  error: null as any,
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
    const mockDB = {
      objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
      createObjectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
      transaction: jest.fn().mockReturnValue(mockIDBTransaction),
    };
    
    mockIDBRequest.result = mockDB;
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBObjectStore.index.mockReturnValue(mockIDBIndex);
    
    mockIndexedDB.open.mockReturnValue(mockIDBRequest);
  });

  describe('初期化', () => {
    it('データベースを正常に初期化できる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      mockIDBRequest.result = mockDB;
      
      const initPromise = bookmarkDB.init();
      
      // 非同期でonsuccessを呼び出し
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess();
        }
      }, 0);
      
      const result = await initPromise;
      expect(mockIndexedDB.open).toHaveBeenCalledWith('ComiketterBookmarks', 1);
      expect(result).toBe(mockDB);
    });

    it('データベース初期化エラーを適切に処理する', async () => {
      const error = new Error('Database error');
      mockIDBRequest.error = error;
      
      const initPromise = bookmarkDB.init();
      
      // 非同期でonerrorを呼び出し
      setTimeout(() => {
        if (mockIDBRequest.onerror) {
          mockIDBRequest.onerror();
        }
      }, 0);
      
      await expect(initPromise).rejects.toBe(error);
    });
  });

  describe('ブックマーク操作', () => {
    beforeEach(async () => {
      // データベースを初期化済みの状態にする
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      mockIDBRequest.result = mockDB;
      
      const initPromise = bookmarkDB.init();
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess();
        }
      }, 0);
      await initPromise;
    });

    it('ブックマークを正常に追加できる', async () => {
      const newBookmark = { name: 'テストブックマーク', description: 'テスト用', color: '#FF0000', isActive: true };
      
      mockIDBObjectStore.add.mockImplementation((bookmark) => {
        const request = { ...mockIDBRequest };
        request.result = bookmark;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      const result = await bookmarkDB.addBookmark(newBookmark);
      expect(result.name).toBe(newBookmark.name);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('全ブックマークを正常に取得できる', async () => {
      const mockBookmarks = [
        { id: '1', name: 'ブックマーク1', description: '説明1', color: '#FF0000', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', isActive: true },
        { id: '2', name: 'ブックマーク2', description: '説明2', color: '#00FF00', createdAt: '2024-01-02T00:00:00.000Z', updatedAt: '2024-01-02T00:00:00.000Z', isActive: true },
      ];
      
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.result = mockBookmarks;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      const result = await bookmarkDB.getAllBookmarks();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('ブックマーク1');
      expect(result[1].name).toBe('ブックマーク2');
    });

    it('アクティブなブックマークのみ取得できる', async () => {
      const mockBookmarks = [
        { id: '1', name: 'アクティブブックマーク', isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
      ];
      
      mockIDBIndex.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.result = mockBookmarks;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      const result = await bookmarkDB.getActiveBookmarks();
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('ブックマークを正常に更新できる', async () => {
      const existingBookmark = { id: '1', name: '元の名前', description: '元の説明', color: '#FF0000', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z', isActive: true };
      
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.result = existingBookmark;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      await expect(bookmarkDB.updateBookmark('1', { name: '新しい名前' })).resolves.toBeUndefined();
    });

    it('ブックマークを正常に削除できる', async () => {
      mockIDBObjectStore.delete.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      await expect(bookmarkDB.deleteBookmark('1')).resolves.toBeUndefined();
    });
  });

  describe('ブックマーク済みツイート操作', () => {
    beforeEach(async () => {
      // データベースを初期化済みの状態にする
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      mockIDBRequest.result = mockDB;
      
      const initPromise = bookmarkDB.init();
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess();
        }
      }, 0);
      await initPromise;
    });

    it('ブックマーク済みツイートを正常に追加できる', async () => {
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

      mockIDBObjectStore.add.mockImplementation((tweet) => {
        const request = { ...mockIDBRequest };
        request.result = tweet;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      const result = await bookmarkDB.addBookmarkedTweet(newTweet);
      expect(result.bookmarkId).toBe(newTweet.bookmarkId);
      expect(result.tweetId).toBe(newTweet.tweetId);
      expect(result.id).toBeDefined();
      expect(result.savedAt).toBeDefined();
    });

    it('ブックマークIDでツイートを正常に取得できる', async () => {
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

      mockIDBIndex.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.result = mockTweets;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      const result = await bookmarkDB.getBookmarkedTweetsByBookmarkId('bookmark-1');
      expect(result).toHaveLength(1);
      expect(result[0].bookmarkId).toBe('bookmark-1');
    });

    it('ツイートIDでブックマーク済みツイートを正常に取得できる', async () => {
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

      mockIDBIndex.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.result = mockTweets;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      const result = await bookmarkDB.getBookmarkedTweetByTweetId('tweet-1');
      expect(result).toHaveLength(1);
      expect(result[0].tweetId).toBe('tweet-1');
    });

    it('ユーザー名でブックマーク済みツイートを正常に検索できる', async () => {
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

      mockIDBIndex.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.result = mockTweets;
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      const result = await bookmarkDB.getBookmarkedTweetsByUsername('testuser');
      expect(result).toHaveLength(1);
      expect(result[0].authorUsername).toBe('testuser');
    });
  });

  describe('統計機能', () => {
    beforeEach(async () => {
      // データベースを初期化済みの状態にする
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      mockIDBRequest.result = mockDB;
      
      const initPromise = bookmarkDB.init();
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess();
        }
      }, 0);
      await initPromise;
    });

    it('統計情報を正常に取得できる', async () => {
      const mockBookmarks = [
        { id: '1', name: 'ブックマーク1', isActive: true },
        { id: '2', name: 'ブックマーク2', isActive: false },
      ];

      const mockTweets = [
        { id: '1', bookmarkId: '1', tweetId: 'tweet-1' },
        { id: '2', bookmarkId: '1', tweetId: 'tweet-2' },
        { id: '3', bookmarkId: '2', tweetId: 'tweet-3' },
      ];

      mockIDBObjectStore.getAll
        .mockImplementationOnce(() => { 
          const request = { ...mockIDBRequest }; 
          request.result = mockBookmarks; 
          setTimeout(() => request.onsuccess?.(), 0); 
          return request; 
        })
        .mockImplementationOnce(() => { 
          const request = { ...mockIDBRequest }; 
          request.result = mockTweets; 
          setTimeout(() => request.onsuccess?.(), 0); 
          return request; 
        });
      
      const result = await bookmarkDB.getBookmarkStats();
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
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      mockIDBRequest.result = mockDB;
      
      const initPromise = bookmarkDB.init();
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess();
        }
      }, 0);
      await initPromise;

      const error = new Error('Operation failed');
      mockIDBObjectStore.add.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.error = error;
        
        setTimeout(() => {
          if (request.onerror) {
            request.onerror();
          }
        }, 0);
        
        return request;
      });
      
      await expect(bookmarkDB.addBookmark({
        name: 'テスト',
        isActive: true,
      })).rejects.toBe(error);
    });

    it('存在しないブックマークの更新でエラーを投げる', async () => {
      const mockDB = { 
        objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
        transaction: jest.fn().mockReturnValue(mockIDBTransaction)
      };
      mockIDBRequest.result = mockDB;
      
      const initPromise = bookmarkDB.init();
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess();
        }
      }, 0);
      await initPromise;

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        request.result = undefined; // 存在しない
        
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess();
          }
        }, 0);
        
        return request;
      });
      
      await expect(bookmarkDB.updateBookmark('nonexistent', { name: 'new name' }))
        .rejects.toThrow('Bookmark with id nonexistent not found');
    });
  });
}); 