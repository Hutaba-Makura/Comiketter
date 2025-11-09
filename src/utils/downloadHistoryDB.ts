/**
 * DL履歴用IndexedDBデータベース
 * ER図で設計したDOWNLOAD_HISTORYテーブルを実装
 */

export interface DownloadHistoryDB {
  id: string;
  tweetId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorId?: string;
  filename: string;
  filepath: string;
  originalUrl: string;
  downloadMethod: 'chrome_downloads' | 'native_messaging';
  fileSize?: number;
  fileType: string;
  downloadedAt: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  tweetContent?: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  tweetDate?: string;
}

export interface DownloadHistoryStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  totalSize: number;
}

export class DownloadHistoryDatabase {
  private dbName = 'ComiketterDownloadHistory';
  private dbVersion = 1;
  private storeName = 'download_history';

  /**
   * データベースを初期化
   */
  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Comiketter: Failed to open download history database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('Comiketter: Download history database opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  /**
   * ストアを作成
   */
  private createStores(db: IDBDatabase): void {
    // ダウンロード履歴ストア
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
      
      // インデックスを作成
      store.createIndex('tweetId', 'tweetId', { unique: false });
      store.createIndex('authorUsername', 'authorUsername', { unique: false });
      store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
      store.createIndex('status', 'status', { unique: false });
      store.createIndex('downloadMethod', 'downloadMethod', { unique: false });
      store.createIndex('fileType', 'fileType', { unique: false });
      
      console.log('Comiketter: Download history store created with indexes');
    }
  }

  /**
   * ダウンロード履歴を追加
   * @param history ダウンロード履歴（IDはオプショナル、指定されていない場合は自動生成）
   */
  async addDownloadHistory(history: Omit<DownloadHistoryDB, 'id'> & { id?: string }): Promise<DownloadHistoryDB> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    const newHistory: DownloadHistoryDB = {
      ...history,
      id: history.id || this.generateId(), // IDが指定されている場合はそれを使用、なければ自動生成
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newHistory);

      request.onsuccess = () => {
        console.log('Comiketter: Download history added:', newHistory.id);
        resolve(newHistory);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to add download history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ダウンロード履歴を取得（全件）
   */
  async getAllDownloadHistory(): Promise<DownloadHistoryDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const histories = request.result.sort((a, b) => 
          new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
        );
        resolve(histories);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get download history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ダウンロード履歴を取得（ID指定）
   */
  async getDownloadHistoryById(id: string): Promise<DownloadHistoryDB | undefined> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get download history by ID:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ダウンロード履歴を更新
   */
  async updateDownloadHistory(id: string, updates: Partial<DownloadHistoryDB>): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingHistory = getRequest.result;
        if (!existingHistory) {
          // 存在しないIDの場合は警告を出すだけで、エラーを投げない
          console.warn(`Comiketter: Download history with id ${id} not found, update skipped`);
          resolve();
          return;
        }

        const updatedHistory = { ...existingHistory, ...updates };
        const putRequest = store.put(updatedHistory);

        putRequest.onsuccess = () => {
          console.log('Comiketter: Download history updated:', id);
          resolve();
        };

        putRequest.onerror = () => {
          console.error('Comiketter: Failed to update download history:', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('Comiketter: Failed to get download history for update:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * ダウンロード履歴を削除
   */
  async deleteDownloadHistory(id: string): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Comiketter: Download history deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to delete download history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ツイートIDでダウンロード履歴を検索
   */
  async getDownloadHistoryByTweetId(tweetId: string): Promise<DownloadHistoryDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('tweetId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(tweetId);

      request.onsuccess = () => {
        const histories = request.result.sort((a, b) => 
          new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
        );
        resolve(histories);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get download history by tweet ID:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ユーザー名でダウンロード履歴を検索
   */
  async getDownloadHistoryByUsername(username: string): Promise<DownloadHistoryDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('authorUsername');

    return new Promise((resolve, reject) => {
      const request = index.getAll(username);

      request.onsuccess = () => {
        const histories = request.result.sort((a, b) => 
          new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
        );
        resolve(histories);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get download history by username:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ステータスでダウンロード履歴を検索
   */
  async getDownloadHistoryByStatus(status: 'success' | 'failed' | 'pending'): Promise<DownloadHistoryDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll(status);

      request.onsuccess = () => {
        const histories = request.result.sort((a, b) => 
          new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
        );
        resolve(histories);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get download history by status:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 日付範囲でダウンロード履歴を検索
   */
  async getDownloadHistoryByDateRange(startDate: string, endDate: string): Promise<DownloadHistoryDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('downloadedAt');

    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);

      request.onsuccess = () => {
        const histories = request.result.sort((a, b) => 
          new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
        );
        resolve(histories);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get download history by date range:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 統計情報を取得
   */
  async getDownloadHistoryStats(): Promise<DownloadHistoryStats> {
    const histories = await this.getAllDownloadHistory();
    
    const stats: DownloadHistoryStats = {
      total: histories.length,
      success: histories.filter(h => h.status === 'success').length,
      failed: histories.filter(h => h.status === 'failed').length,
      pending: histories.filter(h => h.status === 'pending').length,
      totalSize: histories.reduce((sum, h) => sum + (h.fileSize || 0), 0),
    };

    return stats;
  }

  /**
   * データベースをクリア
   */
  async clearAllData(): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Comiketter: All download history cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to clear download history:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * データベースを削除
   */
  async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => {
        console.log('Comiketter: Download history database deleted');
        resolve();
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to delete download history database:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ID生成
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// シングルトンインスタンス
export const downloadHistoryDB = new DownloadHistoryDatabase(); 