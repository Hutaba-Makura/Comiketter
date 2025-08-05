/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 設定用IndexedDBデータベース
 */

export interface SettingsDB {
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
  category: string;
}

export class SettingsDatabase {
  private dbName = 'ComiketterSettings';
  private dbVersion = 1;
  private storeName = 'settings';
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
          console.error('Comiketter: Failed to open settings database:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('Comiketter: Settings database opened successfully');
          resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          this.createStores(db);
        };
      } catch (error) {
        console.error('Comiketter: Error initializing settings database:', error);
        reject(error);
      }
    });
  }

  /**
   * ストアを作成
   */
  private createStores(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(this.storeName)) {
      const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
      store.createIndex('category', 'category', { unique: false });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
    }
  }

  // Chrome Storage用のフォールバック関数
  private async getSettingsFromStorage(): Promise<SettingsDB[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        resolve(result.settings || []);
      });
    });
  }

  private async saveSettingsToStorage(settings: SettingsDB[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ settings }, resolve);
    });
  }

  /**
   * 設定を取得
   */
  async getSetting(key: string): Promise<string | null> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.get(key);

          request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const settings = await this.getSettingsFromStorage();
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : null;
  }

  /**
   * 設定を保存
   */
  async setSetting(key: string, value: string, description?: string, category: string = 'general'): Promise<void> {
    const setting: SettingsDB = {
      key,
      value,
      description,
      category,
      updatedAt: new Date().toISOString(),
    };

    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.put(setting);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const settings = await this.getSettingsFromStorage();
    const index = settings.findIndex(s => s.key === key);
    if (index !== -1) {
      settings[index] = setting;
    } else {
      settings.push(setting);
    }
    await this.saveSettingsToStorage(settings);
  }

  /**
   * 設定を削除
   */
  async deleteSetting(key: string): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.delete(key);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const settings = await this.getSettingsFromStorage();
    const filteredSettings = settings.filter(s => s.key !== key);
    await this.saveSettingsToStorage(filteredSettings);
  }

  /**
   * カテゴリ別設定を取得
   */
  async getSettingsByCategory(category: string): Promise<SettingsDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const index = store.index('category');
          const request = index.getAll(category);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const settings = await this.getSettingsFromStorage();
    return settings.filter(s => s.category === category);
  }

  /**
   * 全設定を取得
   */
  async getAllSettings(): Promise<SettingsDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    return this.getSettingsFromStorage();
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
    await this.saveSettingsToStorage([]);
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
    await this.clearAllData();
    // IndexedDBを使用していない場合は削除をスキップ
    if (this.useIndexedDB) {
      await this.deleteDatabase();
    }
  }

  /**
   * テスト用IndexedDB設定
   */
  setUseIndexedDBForTest(useIndexedDB: boolean): void {
    this.useIndexedDB = useIndexedDB;
  }
}

// シングルトンインスタンス
export const settingsDB = new SettingsDatabase(); 