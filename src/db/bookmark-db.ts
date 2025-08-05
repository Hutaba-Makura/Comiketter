/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: CB（カスタムブックマーク）用IndexedDBデータベース
 * ER図で設計したBOOKMARKSとBOOKMARKED_TWEETSテーブルを実装
 */

export interface BookmarkDB {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface BookmarkedTweetDB {
  id: string;
  bookmarkId: string;
  tweetId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorId?: string;
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  tweetDate: string;
  savedAt: string;
  isRetweet: boolean;
  isReply: boolean;
  replyToTweetId?: string;
  replyToUsername?: string;
  saveType: 'url' | 'blob' | 'mixed';
}

export interface BookmarkStats {
  totalBookmarks: number;
  totalTweets: number;
  activeBookmarks: number;
  tweetsByBookmark: { [bookmarkId: string]: number };
}

export class BookmarkDatabase {
  private dbName = 'ComiketterBookmarks';
  private dbVersion = 1;
  private bookmarkStoreName = 'bookmarks';
  private bookmarkedTweetStoreName = 'bookmarked_tweets';
  private useIndexedDB = true;

  constructor() {
    // IndexedDBが利用可能かチェック
    this.checkIndexedDBAvailability();
  }

  /**
   * IndexedDBの利用可能性をチェック
   */
  private checkIndexedDBAvailability(): void {
    try {
      // IndexedDBが利用可能かチェック
      if (typeof indexedDB === 'undefined') {
        console.warn('Comiketter: IndexedDB not available, falling back to chrome.storage');
        this.useIndexedDB = false;
        return;
      }

      // テスト用のリクエストを作成
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
          console.error('Comiketter: Failed to open bookmark database:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('Comiketter: Bookmark database opened successfully');
          resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          this.createStores(db);
        };
      } catch (error) {
        console.error('Comiketter: Error initializing bookmark database:', error);
        reject(error);
      }
    });
  }

  /**
   * ストアを作成
   */
  private createStores(db: IDBDatabase): void {
    // ブックマークストア
    if (!db.objectStoreNames.contains(this.bookmarkStoreName)) {
      const bookmarkStore = db.createObjectStore(this.bookmarkStoreName, { keyPath: 'id' });
      bookmarkStore.createIndex('name', 'name', { unique: false });
      bookmarkStore.createIndex('createdAt', 'createdAt', { unique: false });
      bookmarkStore.createIndex('isActive', 'isActive', { unique: false });
    }

    // ブックマーク済みツイートストア
    if (!db.objectStoreNames.contains(this.bookmarkedTweetStoreName)) {
      const tweetStore = db.createObjectStore(this.bookmarkedTweetStoreName, { keyPath: 'id' });
      tweetStore.createIndex('bookmarkId', 'bookmarkId', { unique: false });
      tweetStore.createIndex('tweetId', 'tweetId', { unique: false });
      tweetStore.createIndex('authorUsername', 'authorUsername', { unique: false });
      tweetStore.createIndex('tweetDate', 'tweetDate', { unique: false });
      tweetStore.createIndex('savedAt', 'savedAt', { unique: false });
    }
  }

  // Chrome Storage用のフォールバック関数
  private async getBookmarksFromStorage(): Promise<BookmarkDB[]> {
    try {
      const result = await chrome.storage.local.get(['bookmarks']);
      return result.bookmarks || [];
    } catch (error) {
      console.error('Failed to get bookmarks from storage:', error);
      return [];
    }
  }

  private async saveBookmarksToStorage(bookmarks: BookmarkDB[]): Promise<void> {
    try {
      await chrome.storage.local.set({ bookmarks });
    } catch (error) {
      console.error('Failed to save bookmarks to storage:', error);
      throw error;
    }
  }

  private async getBookmarkedTweetsFromStorage(): Promise<BookmarkedTweetDB[]> {
    try {
      const result = await chrome.storage.local.get(['bookmarkedTweets']);
      return result.bookmarkedTweets || [];
    } catch (error) {
      console.error('Failed to get bookmarked tweets from storage:', error);
      return [];
    }
  }

  private async saveBookmarkedTweetsToStorage(tweets: BookmarkedTweetDB[]): Promise<void> {
    try {
      await chrome.storage.local.set({ bookmarkedTweets: tweets });
    } catch (error) {
      console.error('Failed to save bookmarked tweets to storage:', error);
      throw error;
    }
  }

  /**
   * ブックマークを追加
   */
  async addBookmark(bookmark: Omit<BookmarkDB, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookmarkDB> {
    const newBookmark: BookmarkDB = {
      ...bookmark,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkStoreName);
          const request = store.add(newBookmark);

          request.onsuccess = () => resolve(newBookmark);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const bookmarks = await this.getBookmarksFromStorage();
    bookmarks.push(newBookmark);
    await this.saveBookmarksToStorage(bookmarks);
    return newBookmark;
  }

  /**
   * 全ブックマークを取得
   */
  async getAllBookmarks(): Promise<BookmarkDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkStoreName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    return this.getBookmarksFromStorage();
  }

  /**
   * アクティブなブックマークを取得
   */
  async getActiveBookmarks(): Promise<BookmarkDB[]> {
    const allBookmarks = await this.getAllBookmarks();
    return allBookmarks.filter(bookmark => bookmark.isActive);
  }

  /**
   * IDでブックマークを取得
   */
  async getBookmarkById(id: string): Promise<BookmarkDB | undefined> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkStoreName);
          const request = store.get(id);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const bookmarks = await this.getBookmarksFromStorage();
    return bookmarks.find(bookmark => bookmark.id === id);
  }

  /**
   * ブックマークを更新
   */
  async updateBookmark(id: string, updates: Partial<BookmarkDB>): Promise<void> {
    const bookmark = await this.getBookmarkById(id);
    if (!bookmark) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    const updatedBookmark: BookmarkDB = {
      ...bookmark,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkStoreName);
          const request = store.put(updatedBookmark);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const bookmarks = await this.getBookmarksFromStorage();
    const index = bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
      bookmarks[index] = updatedBookmark;
      await this.saveBookmarksToStorage(bookmarks);
    }
  }

  /**
   * ブックマークを削除（論理削除）
   */
  async deleteBookmark(id: string): Promise<void> {
    await this.updateBookmark(id, { isActive: false });
  }

  /**
   * ブックマークを完全削除
   */
  async hardDeleteBookmark(id: string): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkStoreName);
          const request = store.delete(id);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const bookmarks = await this.getBookmarksFromStorage();
    const filteredBookmarks = bookmarks.filter(b => b.id !== id);
    await this.saveBookmarksToStorage(filteredBookmarks);
  }

  /**
   * ブックマーク済みツイートを追加
   */
  async addBookmarkedTweet(tweet: Omit<BookmarkedTweetDB, 'id' | 'savedAt'>): Promise<BookmarkedTweetDB> {
    const newTweet: BookmarkedTweetDB = {
      ...tweet,
      id: this.generateId(),
      savedAt: new Date().toISOString(),
    };

    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const request = store.add(newTweet);

          request.onsuccess = () => resolve(newTweet);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const tweets = await this.getBookmarkedTweetsFromStorage();
    tweets.push(newTweet);
    await this.saveBookmarkedTweetsToStorage(tweets);
    return newTweet;
  }

  /**
   * ブックマークIDでツイートを取得
   */
  async getBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const index = store.index('bookmarkId');
          const request = index.getAll(bookmarkId);

          request.onsuccess = () => {
            const tweets = request.result.sort((a, b) => 
              new Date(b.tweetDate).getTime() - new Date(a.tweetDate).getTime()
            );
            resolve(tweets);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets
      .filter(tweet => tweet.bookmarkId === bookmarkId)
      .sort((a, b) => new Date(b.tweetDate).getTime() - new Date(a.tweetDate).getTime());
  }

  /**
   * ツイートIDでブックマーク済みツイートを取得
   */
  async getBookmarkedTweetByTweetId(tweetId: string): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const index = store.index('tweetId');
          const request = index.getAll(tweetId);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets.filter(tweet => tweet.tweetId === tweetId);
  }

  /**
   * ユーザー名でブックマーク済みツイートを取得
   */
  async getBookmarkedTweetsByUsername(username: string): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const index = store.index('authorUsername');
          const request = index.getAll(username);

          request.onsuccess = () => {
            const tweets = request.result.sort((a, b) => 
              new Date(b.tweetDate).getTime() - new Date(a.tweetDate).getTime()
            );
            resolve(tweets);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets
      .filter(tweet => tweet.authorUsername === username)
      .sort((a, b) => new Date(b.tweetDate).getTime() - new Date(a.tweetDate).getTime());
  }

  /**
   * ブックマーク済みツイートを更新
   */
  async updateBookmarkedTweet(id: string, updates: Partial<BookmarkedTweetDB>): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const getRequest = store.get(id);

          getRequest.onsuccess = () => {
            const tweet = getRequest.result;
            if (!tweet) {
              reject(new Error(`Tweet with id ${id} not found`));
              return;
            }

            const updatedTweet: BookmarkedTweetDB = { ...tweet, ...updates };
            const putRequest = store.put(updatedTweet);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          };
          getRequest.onerror = () => reject(getRequest.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const tweets = await this.getBookmarkedTweetsFromStorage();
    const index = tweets.findIndex(t => t.id === id);
    if (index !== -1) {
      tweets[index] = { ...tweets[index], ...updates };
      await this.saveBookmarkedTweetsToStorage(tweets);
    }
  }

  /**
   * ブックマーク済みツイートを削除
   */
  async deleteBookmarkedTweet(id: string): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const request = store.delete(id);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const tweets = await this.getBookmarkedTweetsFromStorage();
    const filteredTweets = tweets.filter(t => t.id !== id);
    await this.saveBookmarkedTweetsToStorage(filteredTweets);
  }

  /**
   * ブックマークIDでツイートを削除
   */
  async deleteBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<void> {
    const tweets = await this.getBookmarkedTweetsByBookmarkId(bookmarkId);
    for (const tweet of tweets) {
      await this.deleteBookmarkedTweet(tweet.id);
    }
  }

  /**
   * ブックマーク統計を取得
   */
  async getBookmarkStats(): Promise<BookmarkStats> {
    const bookmarks = await this.getAllBookmarks();
    const allTweets = await this.getAllBookmarkedTweets();

    const tweetsByBookmark: { [bookmarkId: string]: number } = {};
    for (const bookmark of bookmarks) {
      const tweets = await this.getBookmarkedTweetsByBookmarkId(bookmark.id);
      tweetsByBookmark[bookmark.id] = tweets.length;
    }

    return {
      totalBookmarks: bookmarks.length,
      totalTweets: allTweets.length,
      activeBookmarks: bookmarks.filter(b => b.isActive).length,
      tweetsByBookmark,
    };
  }

  /**
   * 全ブックマーク済みツイートを取得
   */
  async getAllBookmarkedTweets(): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const request = store.getAll();

          request.onsuccess = () => {
            const tweets = request.result.sort((a, b) => 
              new Date(b.tweetDate).getTime() - new Date(a.tweetDate).getTime()
            );
            resolve(tweets);
          };
          request.onerror = () => reject(request.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets.sort((a, b) => new Date(b.tweetDate).getTime() - new Date(a.tweetDate).getTime());
  }

  /**
   * 全データをクリア
   */
  async clearAllData(): Promise<void> {
    if (this.useIndexedDB) {
      const db = await this.init();
      if (db) {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(
            [this.bookmarkStoreName, this.bookmarkedTweetStoreName], 
            'readwrite'
          );
          
          const bookmarkStore = transaction.objectStore(this.bookmarkStoreName);
          const tweetStore = transaction.objectStore(this.bookmarkedTweetStoreName);
          
          const bookmarkRequest = bookmarkStore.clear();
          const tweetRequest = tweetStore.clear();
          
          let completed = 0;
          const checkComplete = () => {
            completed++;
            if (completed === 2) resolve();
          };
          
          bookmarkRequest.onsuccess = checkComplete;
          bookmarkRequest.onerror = () => reject(bookmarkRequest.error);
          tweetRequest.onsuccess = checkComplete;
          tweetRequest.onerror = () => reject(tweetRequest.error);
        });
      }
    }

    // フォールバック: Chrome Storage
    await this.saveBookmarksToStorage([]);
    await this.saveBookmarkedTweetsToStorage([]);
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
        await this.saveBookmarksToStorage([]);
        await this.saveBookmarkedTweetsToStorage([]);
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
export const bookmarkDB = new BookmarkDatabase(); 