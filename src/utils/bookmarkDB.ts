/**
 * CB（カスタムブックマーク）用IndexedDBデータベース
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
  authorProfileImageUrl?: string;
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
  // 統計情報
  favoriteCount?: number;
  retweetCount?: number;
  replyCount?: number;
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
        testRequest.result.close();
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
        console.error('Comiketter: IndexedDB init error:', error);
        this.useIndexedDB = false;
        resolve(null);
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
      
      // インデックスを作成
      bookmarkStore.createIndex('name', 'name', { unique: false });
      bookmarkStore.createIndex('createdAt', 'createdAt', { unique: false });
      bookmarkStore.createIndex('isActive', 'isActive', { unique: false });
      
      console.log('Comiketter: Bookmark store created with indexes');
    }

    // ブックマーク済みツイートストア
    if (!db.objectStoreNames.contains(this.bookmarkedTweetStoreName)) {
      const tweetStore = db.createObjectStore(this.bookmarkedTweetStoreName, { keyPath: 'id' });
      
      // インデックスを作成
      tweetStore.createIndex('bookmarkId', 'bookmarkId', { unique: false });
      tweetStore.createIndex('tweetId', 'tweetId', { unique: false });
      tweetStore.createIndex('authorUsername', 'authorUsername', { unique: false });
      tweetStore.createIndex('tweetDate', 'tweetDate', { unique: false });
      tweetStore.createIndex('savedAt', 'savedAt', { unique: false });
      tweetStore.createIndex('isRetweet', 'isRetweet', { unique: false });
      tweetStore.createIndex('isReply', 'isReply', { unique: false });
      
      console.log('Comiketter: Bookmarked tweet store created with indexes');
    }
  }

  // ===== chrome.storage フォールバック機能 =====

  /**
   * chrome.storageからブックマークを取得
   */
  private async getBookmarksFromStorage(): Promise<BookmarkDB[]> {
    try {
      const result = await chrome.storage.local.get('comiketter_bookmarks');
      return result.comiketter_bookmarks || [];
    } catch (error) {
      console.error('Comiketter: Failed to get bookmarks from storage:', error);
      return [];
    }
  }

  /**
   * chrome.storageにブックマークを保存
   */
  private async saveBookmarksToStorage(bookmarks: BookmarkDB[]): Promise<void> {
    try {
      await chrome.storage.local.set({ comiketter_bookmarks: bookmarks });
    } catch (error) {
      console.error('Comiketter: Failed to save bookmarks to storage:', error);
      throw error;
    }
  }

  /**
   * chrome.storageからブックマーク済みツイートを取得
   */
  private async getBookmarkedTweetsFromStorage(): Promise<BookmarkedTweetDB[]> {
    try {
      const result = await chrome.storage.local.get('comiketter_bookmarked_tweets');
      return result.comiketter_bookmarked_tweets || [];
    } catch (error) {
      console.error('Comiketter: Failed to get bookmarked tweets from storage:', error);
      return [];
    }
  }

  /**
   * chrome.storageにブックマーク済みツイートを保存
   */
  private async saveBookmarkedTweetsToStorage(tweets: BookmarkedTweetDB[]): Promise<void> {
    try {
      await chrome.storage.local.set({ comiketter_bookmarked_tweets: tweets });
    } catch (error) {
      console.error('Comiketter: Failed to save bookmarked tweets to storage:', error);
      throw error;
    }
  }

  // ===== ブックマーク操作 =====

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
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkStoreName);

          return new Promise((resolve, reject) => {
            const request = store.add(newBookmark);

            request.onsuccess = () => {
              console.log('Comiketter: Bookmark added to IndexedDB:', newBookmark.id);
              resolve(newBookmark);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to add bookmark to IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const bookmarks = await this.getBookmarksFromStorage();
    bookmarks.push(newBookmark);
    await this.saveBookmarksToStorage(bookmarks);
    console.log('Comiketter: Bookmark added to storage:', newBookmark.id);
    return newBookmark;
  }

  /**
   * 全ブックマークを取得
   */
  async getAllBookmarks(): Promise<BookmarkDB[]> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkStoreName);

          return new Promise((resolve, reject) => {
            const request = store.getAll();

            request.onsuccess = () => {
              const bookmarks = request.result.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              resolve(bookmarks);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to get bookmarks from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const bookmarks = await this.getBookmarksFromStorage();
    return bookmarks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * アクティブなブックマークのみ取得
   */
  async getActiveBookmarks(): Promise<BookmarkDB[]> {
    const allBookmarks = await this.getAllBookmarks();
    return allBookmarks.filter(bookmark => bookmark.isActive);
  }

  /**
   * ブックマークを取得（ID指定）
   */
  async getBookmarkById(id: string): Promise<BookmarkDB | undefined> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkStoreName);

          return new Promise((resolve, reject) => {
            const request = store.get(id);

            request.onsuccess = () => {
              resolve(request.result);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to get bookmark by ID from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const bookmarks = await this.getBookmarksFromStorage();
    return bookmarks.find(bookmark => bookmark.id === id);
  }

  /**
   * ブックマークを更新
   */
  async updateBookmark(id: string, updates: Partial<BookmarkDB>): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkStoreName);

          return new Promise((resolve, reject) => {
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
              const existingBookmark = getRequest.result;
              if (!existingBookmark) {
                reject(new Error(`Bookmark with id ${id} not found`));
                return;
              }

              const updatedBookmark = { 
                ...existingBookmark, 
                ...updates,
                updatedAt: new Date().toISOString(),
              };
              const putRequest = store.put(updatedBookmark);

              putRequest.onsuccess = () => {
                console.log('Comiketter: Bookmark updated in IndexedDB:', id);
                resolve();
              };

              putRequest.onerror = () => {
                console.error('Comiketter: Failed to update bookmark in IndexedDB:', putRequest.error);
                reject(putRequest.error);
              };
            };

            getRequest.onerror = () => {
              console.error('Comiketter: Failed to get bookmark for update from IndexedDB:', getRequest.error);
              reject(getRequest.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const bookmarks = await this.getBookmarksFromStorage();
    const index = bookmarks.findIndex(bookmark => bookmark.id === id);
    if (index === -1) {
      throw new Error(`Bookmark with id ${id} not found`);
    }

    bookmarks[index] = { 
      ...bookmarks[index], 
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.saveBookmarksToStorage(bookmarks);
    console.log('Comiketter: Bookmark updated in storage:', id);
  }

  /**
   * ブックマークを削除
   */
  async deleteBookmark(id: string): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkStoreName);

          return new Promise((resolve, reject) => {
            const request = store.delete(id);

            request.onsuccess = () => {
              console.log('Comiketter: Bookmark deleted from IndexedDB:', id);
              resolve();
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to delete bookmark from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const bookmarks = await this.getBookmarksFromStorage();
    const filteredBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    await this.saveBookmarksToStorage(filteredBookmarks);
    console.log('Comiketter: Bookmark deleted from storage:', id);
  }

  /**
   * ブックマークを完全削除（関連するツイートも削除）
   */
  async hardDeleteBookmark(id: string): Promise<void> {
    await this.deleteBookmark(id);
    await this.deleteBookmarkedTweetsByBookmarkId(id);
  }

  // ===== ブックマーク済みツイート操作 =====

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
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);

          return new Promise((resolve, reject) => {
            const request = store.add(newTweet);

            request.onsuccess = () => {
              console.log('Comiketter: Bookmarked tweet added to IndexedDB:', newTweet.id);
              resolve(newTweet);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to add bookmarked tweet to IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const tweets = await this.getBookmarkedTweetsFromStorage();
    tweets.push(newTweet);
    await this.saveBookmarkedTweetsToStorage(tweets);
    console.log('Comiketter: Bookmarked tweet added to storage:', newTweet.id);
    return newTweet;
  }

  /**
   * ブックマークIDでツイートを取得
   */
  async getBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const index = store.index('bookmarkId');

          return new Promise((resolve, reject) => {
            const request = index.getAll(IDBKeyRange.only(bookmarkId));

            request.onsuccess = () => {
              const tweets = request.result.sort((a, b) => 
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
              );
              resolve(tweets);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to get bookmarked tweets by bookmark ID from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets
      .filter(tweet => tweet.bookmarkId === bookmarkId)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  /**
   * ツイートIDでブックマーク済みツイートを取得
   */
  async getBookmarkedTweetByTweetId(tweetId: string): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const index = store.index('tweetId');

          return new Promise((resolve, reject) => {
            const request = index.getAll(IDBKeyRange.only(tweetId));

            request.onsuccess = () => {
              resolve(request.result);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to get bookmarked tweets by tweet ID from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets.filter(tweet => tweet.tweetId === tweetId);
  }

  /**
   * ユーザー名でブックマーク済みツイートを検索
   */
  async getBookmarkedTweetsByUsername(username: string): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);
          const index = store.index('authorUsername');

          return new Promise((resolve, reject) => {
            const request = index.getAll(IDBKeyRange.only(username));

            request.onsuccess = () => {
              const tweets = request.result.sort((a, b) => 
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
              );
              resolve(tweets);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to get bookmarked tweets by username from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets
      .filter(tweet => tweet.authorUsername === username)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  /**
   * ブックマーク済みツイートを更新
   */
  async updateBookmarkedTweet(id: string, updates: Partial<BookmarkedTweetDB>): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);

          return new Promise((resolve, reject) => {
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
              const existingTweet = getRequest.result;
              if (!existingTweet) {
                reject(new Error(`Bookmarked tweet with id ${id} not found`));
                return;
              }

              const updatedTweet = { ...existingTweet, ...updates };
              const putRequest = store.put(updatedTweet);

              putRequest.onsuccess = () => {
                console.log('Comiketter: Bookmarked tweet updated in IndexedDB:', id);
                resolve();
              };

              putRequest.onerror = () => {
                console.error('Comiketter: Failed to update bookmarked tweet in IndexedDB:', putRequest.error);
                reject(putRequest.error);
              };
            };

            getRequest.onerror = () => {
              console.error('Comiketter: Failed to get bookmarked tweet for update from IndexedDB:', getRequest.error);
              reject(getRequest.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const tweets = await this.getBookmarkedTweetsFromStorage();
    const index = tweets.findIndex(tweet => tweet.id === id);
    if (index === -1) {
      throw new Error(`Bookmarked tweet with id ${id} not found`);
    }

    tweets[index] = { ...tweets[index], ...updates };
    await this.saveBookmarkedTweetsToStorage(tweets);
    console.log('Comiketter: Bookmarked tweet updated in storage:', id);
  }

  /**
   * ブックマーク済みツイートを削除
   */
  async deleteBookmarkedTweet(id: string): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);

          return new Promise((resolve, reject) => {
            const request = store.delete(id);

            request.onsuccess = () => {
              console.log('Comiketter: Bookmarked tweet deleted from IndexedDB:', id);
              resolve();
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to delete bookmarked tweet from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const tweets = await this.getBookmarkedTweetsFromStorage();
    const filteredTweets = tweets.filter(tweet => tweet.id !== id);
    await this.saveBookmarkedTweetsToStorage(filteredTweets);
    console.log('Comiketter: Bookmarked tweet deleted from storage:', id);
  }

  /**
   * ブックマークIDでブックマーク済みツイートを削除
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
    const tweets = await this.getAllBookmarkedTweets();

    const tweetsByBookmark: { [bookmarkId: string]: number } = {};
    for (const bookmark of bookmarks) {
      const bookmarkTweets = tweets.filter(tweet => tweet.bookmarkId === bookmark.id);
      tweetsByBookmark[bookmark.id] = bookmarkTweets.length;
    }

    return {
      totalBookmarks: bookmarks.length,
      totalTweets: tweets.length,
      activeBookmarks: bookmarks.filter(b => b.isActive).length,
      tweetsByBookmark,
    };
  }

  /**
   * 全ブックマーク済みツイートを取得
   */
  async getAllBookmarkedTweets(): Promise<BookmarkedTweetDB[]> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
          const store = transaction.objectStore(this.bookmarkedTweetStoreName);

          return new Promise((resolve, reject) => {
            const request = store.getAll();

            request.onsuccess = () => {
              const tweets = request.result.sort((a, b) => 
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
              );
              resolve(tweets);
            };

            request.onerror = () => {
              console.error('Comiketter: Failed to get all bookmarked tweets from IndexedDB:', request.error);
              reject(request.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    const tweets = await this.getBookmarkedTweetsFromStorage();
    return tweets.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  /**
   * 全データをクリア
   */
  async clearAllData(): Promise<void> {
    if (this.useIndexedDB) {
      try {
        const db = await this.init();
        if (db) {
          const transaction = db.transaction([this.bookmarkStoreName, this.bookmarkedTweetStoreName], 'readwrite');
          const bookmarkStore = transaction.objectStore(this.bookmarkStoreName);
          const tweetStore = transaction.objectStore(this.bookmarkedTweetStoreName);

          return new Promise((resolve, reject) => {
            const bookmarkRequest = bookmarkStore.clear();
            const tweetRequest = tweetStore.clear();

            bookmarkRequest.onsuccess = () => {
              tweetRequest.onsuccess = () => {
                console.log('Comiketter: All data cleared from IndexedDB');
                resolve();
              };
              tweetRequest.onerror = () => {
                console.error('Comiketter: Failed to clear tweets from IndexedDB:', tweetRequest.error);
                reject(tweetRequest.error);
              };
            };
            bookmarkRequest.onerror = () => {
              console.error('Comiketter: Failed to clear bookmarks from IndexedDB:', bookmarkRequest.error);
              reject(bookmarkRequest.error);
            };
          });
        }
      } catch (error) {
        console.warn('Comiketter: IndexedDB failed, falling back to storage:', error);
        this.useIndexedDB = false;
      }
    }

    // chrome.storageフォールバック
    await chrome.storage.local.remove(['comiketter_bookmarks', 'comiketter_bookmarked_tweets']);
    console.log('Comiketter: All data cleared from storage');
  }

  /**
   * データベースを削除
   */
  async deleteDatabase(): Promise<void> {
    if (this.useIndexedDB) {
      try {
        return new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(this.dbName);

          request.onsuccess = () => {
            console.log('Comiketter: Database deleted successfully');
            resolve();
          };

          request.onerror = () => {
            console.error('Comiketter: Failed to delete database:', request.error);
            reject(request.error);
          };
        });
      } catch (error) {
        console.error('Comiketter: Failed to delete database:', error);
        throw error;
      }
    }

    // chrome.storageフォールバック
    await this.clearAllData();
  }

  /**
   * テスト用にリセット
   */
  async resetForTesting(): Promise<void> {
    await this.clearAllData();
    this.useIndexedDB = true;
  }

  /**
   * テスト専用：IndexedDBの使用を制御
   */
  setUseIndexedDBForTest(useIndexedDB: boolean): void {
    this.useIndexedDB = useIndexedDB;
  }

  /**
   * IDを生成
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// シングルトンインスタンス
export const bookmarkDB = new BookmarkDatabase(); 