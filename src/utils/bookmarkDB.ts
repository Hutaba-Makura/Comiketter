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

  /**
   * データベースを初期化
   */
  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
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

  // ===== ブックマーク操作 =====

  /**
   * ブックマークを追加
   */
  async addBookmark(bookmark: Omit<BookmarkDB, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookmarkDB> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
    const store = transaction.objectStore(this.bookmarkStoreName);

    const newBookmark: BookmarkDB = {
      ...bookmark,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newBookmark);

      request.onsuccess = () => {
        console.log('Comiketter: Bookmark added:', newBookmark.id);
        resolve(newBookmark);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to add bookmark:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 全ブックマークを取得
   */
  async getAllBookmarks(): Promise<BookmarkDB[]> {
    const db = await this.init();
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
        console.error('Comiketter: Failed to get bookmarks:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * アクティブなブックマークのみ取得
   */
  async getActiveBookmarks(): Promise<BookmarkDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkStoreName], 'readonly');
    const store = transaction.objectStore(this.bookmarkStoreName);
    const index = store.index('isActive');

    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(true));

      request.onsuccess = () => {
        const bookmarks = request.result.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(bookmarks);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get active bookmarks:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ブックマークを取得（ID指定）
   */
  async getBookmarkById(id: string): Promise<BookmarkDB | undefined> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkStoreName], 'readonly');
    const store = transaction.objectStore(this.bookmarkStoreName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get bookmark by ID:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ブックマークを更新
   */
  async updateBookmark(id: string, updates: Partial<BookmarkDB>): Promise<void> {
    const db = await this.init();
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
          console.log('Comiketter: Bookmark updated:', id);
          resolve();
        };

        putRequest.onerror = () => {
          console.error('Comiketter: Failed to update bookmark:', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('Comiketter: Failed to get bookmark for update:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * ブックマークを削除（論理削除）
   */
  async deleteBookmark(id: string): Promise<void> {
    return this.updateBookmark(id, { isActive: false });
  }

  /**
   * ブックマークを物理削除
   */
  async hardDeleteBookmark(id: string): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkStoreName], 'readwrite');
    const store = transaction.objectStore(this.bookmarkStoreName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Comiketter: Bookmark deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to delete bookmark:', request.error);
        reject(request.error);
      };
    });
  }

  // ===== ブックマーク済みツイート操作 =====

  /**
   * ブックマーク済みツイートを追加
   */
  async addBookmarkedTweet(tweet: Omit<BookmarkedTweetDB, 'id' | 'savedAt'>): Promise<BookmarkedTweetDB> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
    const store = transaction.objectStore(this.bookmarkedTweetStoreName);

    const newTweet: BookmarkedTweetDB = {
      ...tweet,
      id: this.generateId(),
      savedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newTweet);

      request.onsuccess = () => {
        console.log('Comiketter: Bookmarked tweet added:', newTweet.id);
        resolve(newTweet);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to add bookmarked tweet:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ブックマークIDでツイートを取得
   */
  async getBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<BookmarkedTweetDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
    const store = transaction.objectStore(this.bookmarkedTweetStoreName);
    const index = store.index('bookmarkId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(bookmarkId);

      request.onsuccess = () => {
        const tweets = request.result.sort((a, b) => 
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        resolve(tweets);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get bookmarked tweets by bookmark ID:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ツイートIDでブックマーク済みツイートを取得
   */
  async getBookmarkedTweetByTweetId(tweetId: string): Promise<BookmarkedTweetDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
    const store = transaction.objectStore(this.bookmarkedTweetStoreName);
    const index = store.index('tweetId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(tweetId);

      request.onsuccess = () => {
        const tweets = request.result.sort((a, b) => 
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        resolve(tweets);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get bookmarked tweet by tweet ID:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ユーザー名でブックマーク済みツイートを検索
   */
  async getBookmarkedTweetsByUsername(username: string): Promise<BookmarkedTweetDB[]> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readonly');
    const store = transaction.objectStore(this.bookmarkedTweetStoreName);
    const index = store.index('authorUsername');

    return new Promise((resolve, reject) => {
      const request = index.getAll(username);

      request.onsuccess = () => {
        const tweets = request.result.sort((a, b) => 
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        resolve(tweets);
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to get bookmarked tweets by username:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ブックマーク済みツイートを更新
   */
  async updateBookmarkedTweet(id: string, updates: Partial<BookmarkedTweetDB>): Promise<void> {
    const db = await this.init();
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
          console.log('Comiketter: Bookmarked tweet updated:', id);
          resolve();
        };

        putRequest.onerror = () => {
          console.error('Comiketter: Failed to update bookmarked tweet:', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        console.error('Comiketter: Failed to get bookmarked tweet for update:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * ブックマーク済みツイートを削除
   */
  async deleteBookmarkedTweet(id: string): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkedTweetStoreName], 'readwrite');
    const store = transaction.objectStore(this.bookmarkedTweetStoreName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Comiketter: Bookmarked tweet deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to delete bookmarked tweet:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * ブックマークIDでツイートを一括削除
   */
  async deleteBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<void> {
    const tweets = await this.getBookmarkedTweetsByBookmarkId(bookmarkId);
    const deletePromises = tweets.map(tweet => this.deleteBookmarkedTweet(tweet.id));
    await Promise.all(deletePromises);
  }

  // ===== 統計・検索機能 =====

  /**
   * 統計情報を取得
   */
  async getBookmarkStats(): Promise<BookmarkStats> {
    const [bookmarks, tweets] = await Promise.all([
      this.getAllBookmarks(),
      this.getAllBookmarkedTweets()
    ]);

    const activeBookmarks = bookmarks.filter(b => b.isActive);
    const tweetsByBookmark: { [bookmarkId: string]: number } = {};

    // ブックマーク別ツイート数を計算
    for (const tweet of tweets) {
      tweetsByBookmark[tweet.bookmarkId] = (tweetsByBookmark[tweet.bookmarkId] || 0) + 1;
    }

    return {
      totalBookmarks: bookmarks.length,
      totalTweets: tweets.length,
      activeBookmarks: activeBookmarks.length,
      tweetsByBookmark,
    };
  }

  /**
   * 全ブックマーク済みツイートを取得
   */
  async getAllBookmarkedTweets(): Promise<BookmarkedTweetDB[]> {
    const db = await this.init();
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
        console.error('Comiketter: Failed to get all bookmarked tweets:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * データベースをクリア
   */
  async clearAllData(): Promise<void> {
    const db = await this.init();
    const transaction = db.transaction([this.bookmarkStoreName, this.bookmarkedTweetStoreName], 'readwrite');
    const bookmarkStore = transaction.objectStore(this.bookmarkStoreName);
    const tweetStore = transaction.objectStore(this.bookmarkedTweetStoreName);

    return new Promise((resolve, reject) => {
      const bookmarkRequest = bookmarkStore.clear();
      const tweetRequest = tweetStore.clear();

      bookmarkRequest.onsuccess = () => {
        tweetRequest.onsuccess = () => {
          console.log('Comiketter: All bookmark data cleared');
          resolve();
        };
        tweetRequest.onerror = () => {
          console.error('Comiketter: Failed to clear bookmarked tweets:', tweetRequest.error);
          reject(tweetRequest.error);
        };
      };

      bookmarkRequest.onerror = () => {
        console.error('Comiketter: Failed to clear bookmarks:', bookmarkRequest.error);
        reject(bookmarkRequest.error);
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
        console.log('Comiketter: Bookmark database deleted');
        resolve();
      };

      request.onerror = () => {
        console.error('Comiketter: Failed to delete bookmark database:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * テスト用：データベース接続をリセット
   */
  async resetForTesting(): Promise<void> {
    try {
      await this.deleteDatabase();
    } catch (error) {
      // データベースが存在しない場合は無視
    }
  }

  /**
   * ID生成
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// シングルトンインスタンス
export const bookmarkDB = new BookmarkDatabase(); 