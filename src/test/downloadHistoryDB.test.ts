/**
 * DL履歴データベースのテスト
 */

import { DownloadHistoryDatabase, type DownloadHistoryDB } from '../db/download-history-db';

// IndexedDBのモック
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// グローバルオブジェクトにモックを設定
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('DownloadHistoryDatabase', () => {
  let db: DownloadHistoryDatabase;
  let mockDB: any;
  let mockStore: any;
  let mockTransaction: any;

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // モックオブジェクトを作成
    mockStore = {
      add: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      createIndex: jest.fn(),
    };

    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockStore),
    };

    mockDB = {
      createObjectStore: jest.fn().mockReturnValue(mockStore),
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(false),
      },
      transaction: jest.fn().mockReturnValue(mockTransaction),
    };

    // IndexedDB.openのモック
    const mockRequest = {
      onerror: null as any,
      onsuccess: null as any,
      onupgradeneeded: null as any,
      result: mockDB,
    };

    mockIndexedDB.open.mockReturnValue(mockRequest);

    // 非同期処理を同期的に処理するためのヘルパー
    const processAsync = () => {
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest });
        }
      }, 0);
    };

    // データベース初期化をモック
    mockIndexedDB.open.mockImplementation(() => {
      processAsync();
      return mockRequest;
    });

    db = new DownloadHistoryDatabase();
  });

  describe('init', () => {
    it('データベースを正常に初期化できる', async () => {
      const result = await db.init();
      expect(result).toBe(mockDB);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('ComiketterDownloadHistory', 1);
    });

    it('データベース初期化エラーを適切に処理する', async () => {
      const error = new Error('Database error');
      mockIndexedDB.open.mockImplementation(() => {
        const mockRequest = {
          onerror: null as any,
          onsuccess: null as any,
          onupgradeneeded: null as any,
          error,
        };

        setTimeout(() => {
          if (mockRequest.onerror) {
            mockRequest.onerror({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      await expect(db.init()).rejects.toThrow('Database error');
    });
  });

  describe('addDownloadHistory', () => {
    it('ダウンロード履歴を正常に追加できる', async () => {
      const history: Omit<DownloadHistoryDB, 'id'> = {
        tweetId: '123456789',
        authorUsername: 'testuser',
        filename: 'test.jpg',
        filepath: '/test/test.jpg',
        originalUrl: 'https://example.com/test.jpg',
        downloadMethod: 'chrome_downloads',
        fileType: 'image/jpeg',
        downloadedAt: '2024-01-01T00:00:00Z',
        status: 'success',
      };

      mockStore.add.mockImplementation(() => {
        const mockRequest = {
          onsuccess: null as any,
          onerror: null as any,
          result: { ...history, id: 'generated-id' },
        };

        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      const result = await db.addDownloadHistory(history);
      expect(result).toEqual(expect.objectContaining({
        ...history,
        id: expect.any(String),
        downloadedAt: expect.any(String), // 動的な値なのでany(String)を使用
      }));
      expect(mockStore.add).toHaveBeenCalledWith(expect.objectContaining({
        ...history,
        id: expect.any(String),
        downloadedAt: expect.any(String), // 動的な値なのでany(String)を使用
      }));
    });
  });

  describe('getAllDownloadHistory', () => {
    it('全ダウンロード履歴を取得できる', async () => {
      const mockHistories = [
        {
          id: '1',
          tweetId: '123',
          authorUsername: 'user1',
          filename: 'test1.jpg',
          filepath: '/test1.jpg',
          originalUrl: 'https://example.com/test1.jpg',
          downloadMethod: 'chrome_downloads' as const,
          fileType: 'image/jpeg',
          downloadedAt: '2024-01-01T00:00:00Z',
          status: 'success' as const,
        },
        {
          id: '2',
          tweetId: '456',
          authorUsername: 'user2',
          filename: 'test2.jpg',
          filepath: '/test2.jpg',
          originalUrl: 'https://example.com/test2.jpg',
          downloadMethod: 'chrome_downloads' as const,
          fileType: 'image/jpeg',
          downloadedAt: '2024-01-02T00:00:00Z',
          status: 'success' as const,
        },
      ];

      mockStore.getAll.mockImplementation(() => {
        const mockRequest = {
          onsuccess: null as any,
          onerror: null as any,
          result: mockHistories,
        };

        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      const result = await db.getAllDownloadHistory();
      expect(result).toEqual(mockHistories);
      expect(mockStore.getAll).toHaveBeenCalled();
    });
  });

  describe('getDownloadHistoryById', () => {
    it('IDでダウンロード履歴を取得できる', async () => {
      const mockHistory = {
        id: '1',
        tweetId: '123',
        authorUsername: 'user1',
        filename: 'test.jpg',
        filepath: '/test.jpg',
        originalUrl: 'https://example.com/test.jpg',
        downloadMethod: 'chrome_downloads' as const,
        fileType: 'image/jpeg',
        downloadedAt: '2024-01-01T00:00:00Z',
        status: 'success' as const,
      };

      mockStore.get.mockImplementation(() => {
        const mockRequest = {
          onsuccess: null as any,
          onerror: null as any,
          result: mockHistory,
        };

        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      const result = await db.getDownloadHistoryById('1');
      expect(result).toEqual(mockHistory);
      expect(mockStore.get).toHaveBeenCalledWith('1');
    });
  });

  describe('updateDownloadHistory', () => {
    it('ダウンロード履歴を正常に更新できる', async () => {
      const existingHistory = {
        id: '1',
        tweetId: '123',
        authorUsername: 'user1',
        filename: 'test.jpg',
        filepath: '/test.jpg',
        originalUrl: 'https://example.com/test.jpg',
        downloadMethod: 'chrome_downloads' as const,
        fileType: 'image/jpeg',
        downloadedAt: '2024-01-01T00:00:00Z',
        status: 'pending' as const,
      };

      const updates = { status: 'success' as const };

      // getリクエストのモック
      mockStore.get.mockImplementation(() => {
        const mockRequest = {
          onsuccess: null as any,
          onerror: null as any,
          result: existingHistory,
        };

        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      // putリクエストのモック
      mockStore.put.mockImplementation(() => {
        const mockRequest = {
          onsuccess: null as any,
          onerror: null as any,
        };

        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      await db.updateDownloadHistory('1', updates);
      expect(mockStore.get).toHaveBeenCalledWith('1');
      expect(mockStore.put).toHaveBeenCalledWith({
        ...existingHistory,
        ...updates,
      });
    });
  });

  describe('deleteDownloadHistory', () => {
    it('ダウンロード履歴を正常に削除できる', async () => {
      mockStore.delete.mockImplementation(() => {
        const mockRequest = {
          onsuccess: null as any,
          onerror: null as any,
        };

        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      await db.deleteDownloadHistory('1');
      expect(mockStore.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('getDownloadHistoryStats', () => {
    it('統計情報を正常に取得できる', async () => {
      const mockHistories = [
        {
          id: '1',
          tweetId: '123',
          authorUsername: 'user1',
          filename: 'test1.jpg',
          filepath: '/test1.jpg',
          originalUrl: 'https://example.com/test1.jpg',
          downloadMethod: 'chrome_downloads' as const,
          fileType: 'image/jpeg',
          downloadedAt: '2024-01-01T00:00:00Z',
          status: 'success' as const,
          fileSize: 1024,
        },
        {
          id: '2',
          tweetId: '456',
          authorUsername: 'user2',
          filename: 'test2.jpg',
          filepath: '/test2.jpg',
          originalUrl: 'https://example.com/test2.jpg',
          downloadMethod: 'chrome_downloads' as const,
          fileType: 'image/jpeg',
          downloadedAt: '2024-01-02T00:00:00Z',
          status: 'failed' as const,
          fileSize: 2048,
        },
      ];

      mockStore.getAll.mockImplementation(() => {
        const mockRequest = {
          onsuccess: null as any,
          onerror: null as any,
          result: mockHistories,
        };

        setTimeout(() => {
          if (mockRequest.onsuccess) {
            mockRequest.onsuccess({ target: mockRequest });
          }
        }, 0);

        return mockRequest;
      });

      const result = await db.getDownloadHistoryStats();
      expect(result).toEqual({
        total: 2,
        success: 1,
        failed: 1,
        pending: 0,
        totalSize: 1024, // 成功したダウンロードのfileSizeのみ合計
      });
    });
  });
}); 