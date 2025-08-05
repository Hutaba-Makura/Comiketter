/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ダウンロード履歴用IndexedDBデータベース
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

export interface DownloadHistorySearchParams {
  tweetId?: string;
  authorUsername?: string;
  status?: 'success' | 'failed' | 'pending';
  downloadMethod?: 'chrome_downloads' | 'native_messaging';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class DownloadHistoryDatabase {
  private dbName = 'ComiketterDownloadHistory';
  private dbVersion = 1;
  private storeName = 'download_history';
  private useIndexedDB = true;

  constructor() {
    this.checkIndexedDBAvailability();
  }

  /**
   * IndexedDBの利用可能性をチェック
   */
  private checkIndexedDBAvailability(): void {
    try {
      if (typeof indexedDB === 'undefined') {
        console.warn('Comiketter: IndexedDB not available, falling back to chrome.storage');
        this.useIndexedDB = false;
        return;
      }

      const testRequest = indexedDB.open('test', 1);
      testRequest.onerror = () => {
        console.warn('Comiketter: IndexedDB access failed, falling back to chrome.storage');
        this.useIndexedDB = false;
      };
      testRequest.onsuccess = () => {
        if (testRequest.result && typeof testRequest.result.close === 'function') {
          testRequest.result.close();
        }
        indexedDB.deleteDatabase('test');
      };
    } catch (error) {
      console.warn('Comiketter: IndexedDB check failed, falling back to chrome.storage:', error);
      this.useIndexedDB = false;
    }
  }

  /**
   * データベースを初期化
   */
  async init(): Promise<IDBDatabase | null> {
    if (!this.useIndexedDB) {
      return null;
    }

    return new Promise((resolve, reject) => {
      try {
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
      } catch (error) {
        console.error('Comiketter: Error initializing download history database:', error);
        reject(error);
      }
    });
  }

  /**
   * ストアを作成
   */
  private createStores(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
      store.createIndex('tweetId', 'tweetId', { unique: false });
      store.createIndex('authorUsername', 'authorUsername', { unique: false });
      store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
      store.createIndex('status', 'status', { unique: false });
      store.createIndex('downloadMethod', 'downloadMethod', { unique: false });
    }
  }

  // Chrome Storage用のフォールバック関数
  private async getDownloadHistoryFromStorage(): Promise<DownloadHistoryDB[]> {
    try {
      const result = await chrome.storage.local.get(['downloadHistory']);
      return result.downloadHistory || [];
    } catch (error) {
      console.error('Failed to get download history from storage:', error);
      return [];
    }
  }

  private async saveDownloadHistoryToStorage(history: DownloadHistoryDB[]): Promise<void> {
    try {
      await chrome.storage.local.set({ downloadHistory: history });
    } catch (error) {
      console.error('Failed to save download history to storage:', error);
      throw error;
    }
  }

  /**
   * ダウンロード履歴を追加
   */
  async addDownloadHistory(history: Omit<DownloadHistoryDB, 'id' | 'downloadedAt'>): Promise<DownloadHistoryDB> {
    const newHistory: DownloadHistoryDB = {
      ...history,
      id: this.generateId(),
      downloadedAt: new Date().toISOString(),
    };

    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.add(newHistory);

          request.onsuccess = () => resolve(newHistory);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const historyList = await this.getDownloadHistoryFromStorage();
    historyList.push(newHistory);
    await this.saveDownloadHistoryToStorage(historyList);
    return newHistory;
  }

  /**
   * 全ダウンロード履歴を取得
   */
  async getAllDownloadHistory(): Promise<DownloadHistoryDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();

          request.onsuccess = () => {
            const history = request.result.sort((a, b) => 
              new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
            );
            resolve(history);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const history = await this.getDownloadHistoryFromStorage();
    return history.sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
  }

  /**
   * ツイートIDでダウンロード履歴を取得
   */
  async getDownloadHistoryByTweetId(tweetId: string): Promise<DownloadHistoryDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const index = store.index('tweetId');
          const request = index.getAll(tweetId);

          request.onsuccess = () => {
            const history = request.result.sort((a, b) => 
              new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
            );
            resolve(history);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const history = await this.getDownloadHistoryFromStorage();
    return history
      .filter(h => h.tweetId === tweetId)
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
  }

  /**
   * IDでダウンロード履歴を取得
   */
  async getDownloadHistoryById(id: string): Promise<DownloadHistoryDB | null> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.get(id);

          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const history = await this.getDownloadHistoryFromStorage();
    return history.find(h => h.id === id) || null;
  }

  /**
   * ユーザー名でダウンロード履歴を取得
   */
  async getDownloadHistoryByUsername(username: string): Promise<DownloadHistoryDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const index = store.index('authorUsername');
          const request = index.getAll(username);

          request.onsuccess = () => {
            const history = request.result.sort((a, b) => 
              new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
            );
            resolve(history);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const history = await this.getDownloadHistoryFromStorage();
    return history
      .filter(h => h.authorUsername === username)
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
  }

  /**
   * ステータスでダウンロード履歴を取得
   */
  async getDownloadHistoryByStatus(status: 'success' | 'failed' | 'pending'): Promise<DownloadHistoryDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const index = store.index('status');
          const request = index.getAll(status);

          request.onsuccess = () => {
            const history = request.result.sort((a, b) => 
              new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
            );
            resolve(history);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const history = await this.getDownloadHistoryFromStorage();
    return history
      .filter(h => h.status === status)
      .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
  }

  /**
   * ダウンロード履歴を検索
   */
  async searchDownloadHistory(params: DownloadHistorySearchParams): Promise<DownloadHistoryDB[]> {
    let history = await this.getAllDownloadHistory();

    if (params.tweetId) {
      history = history.filter(h => h.tweetId === params.tweetId);
    }

    if (params.authorUsername) {
      history = history.filter(h => h.authorUsername === params.authorUsername);
    }

    if (params.status) {
      history = history.filter(h => h.status === params.status);
    }

    if (params.downloadMethod) {
      history = history.filter(h => h.downloadMethod === params.downloadMethod);
    }

    if (params.startDate) {
      history = history.filter(h => new Date(h.downloadedAt) >= new Date(params.startDate!));
    }

    if (params.endDate) {
      history = history.filter(h => new Date(h.downloadedAt) <= new Date(params.endDate!));
    }

    // ページネーション
    if (params.offset) {
      history = history.slice(params.offset);
    }

    if (params.limit) {
      history = history.slice(0, params.limit);
    }

    return history;
  }

  /**
   * ダウンロード履歴を更新
   */
  async updateDownloadHistory(id: string, updates: Partial<DownloadHistoryDB>): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const getRequest = store.get(id);

          getRequest.onsuccess = () => {
            const history = getRequest.result;
            if (!history) {
              reject(new Error(`Download history with id ${id} not found`));
              return;
            }

            const updatedHistory: DownloadHistoryDB = { ...history, ...updates };
            const putRequest = store.put(updatedHistory);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          };
          getRequest.onerror = () => reject(getRequest.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const history = await this.getDownloadHistoryFromStorage();
    const index = history.findIndex(h => h.id === id);
    if (index !== -1) {
      history[index] = { ...history[index], ...updates };
      await this.saveDownloadHistoryToStorage(history);
    }
  }

  /**
   * ダウンロード履歴を削除
   */
  async deleteDownloadHistory(id: string): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.delete(id);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const history = await this.getDownloadHistoryFromStorage();
    const filteredHistory = history.filter(h => h.id !== id);
    await this.saveDownloadHistoryToStorage(filteredHistory);
  }

  /**
   * ツイートIDでダウンロード履歴を削除
   */
  async deleteDownloadHistoryByTweetId(tweetId: string): Promise<void> {
    const history = await this.getDownloadHistoryByTweetId(tweetId);
    for (const item of history) {
      await this.deleteDownloadHistory(item.id);
    }
  }

  /**
   * ダウンロード履歴統計を取得
   */
  async getDownloadHistoryStats(): Promise<DownloadHistoryStats> {
    const history = await this.getAllDownloadHistory();
    
    const stats: DownloadHistoryStats = {
      total: history.length,
      success: history.filter(h => h.status === 'success').length,
      failed: history.filter(h => h.status === 'failed').length,
      pending: history.filter(h => h.status === 'pending').length,
      totalSize: history
        .filter(h => h.status === 'success' && h.fileSize)
        .reduce((sum, h) => sum + (h.fileSize || 0), 0),
    };

    return stats;
  }

  /**
   * 全データをクリア
   */
  async clearAllData(): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    await this.saveDownloadHistoryToStorage([]);
  }

  /**
   * データベースを削除
   */
  async deleteDatabase(): Promise<void> {
    if (this.useIndexedDB) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(this.dbName);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * テスト用リセット
   */
  async resetForTesting(): Promise<void> {
    if (this.useIndexedDB) {
      await this.clearAllData();
      await this.deleteDatabase();
    } else {
      // Chrome Storageモードでは直接ストレージをクリア
      if (chrome?.storage?.local?.clear) {
        await chrome.storage.local.clear();
      } else {
        await this.saveDownloadHistoryToStorage([]);
      }
    }
  }

  /**
   * テスト用IndexedDB設定
   */
  setUseIndexedDBForTest(useIndexedDB: boolean): void {
    this.useIndexedDB = useIndexedDB;
  }

  /**
   * UUID生成
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// シングルトンインスタンス
export const downloadHistoryDB = new DownloadHistoryDatabase(); 