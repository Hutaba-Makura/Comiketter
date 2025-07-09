/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: カスタムブックマーク管理サービス
 */

import type { CustomBookmark, BookmarkedTweet, Tweet } from '../types';
import { StorageManager } from './storage';

/**
 * カスタムブックマーク管理クラス
 */
export class BookmarkManager {
  private static instance: BookmarkManager;
  private bookmarks: CustomBookmark[] = [];
  private bookmarkedTweets: BookmarkedTweet[] = [];

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): BookmarkManager {
    if (!BookmarkManager.instance) {
      BookmarkManager.instance = new BookmarkManager();
    }
    return BookmarkManager.instance;
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    try {
      this.bookmarks = await StorageManager.getCustomBookmarks();
      // TODO: ブックマークされたツイートの読み込み機能を実装
      console.log('BookmarkManager initialized with', this.bookmarks.length, 'bookmarks');
    } catch (error) {
      console.error('Failed to initialize BookmarkManager:', error);
    }
  }

  /**
   * カスタムブックマーク一覧を取得
   */
  async getBookmarks(): Promise<CustomBookmark[]> {
    return this.bookmarks;
  }

  /**
   * カスタムブックマークを追加
   */
  async addBookmark(name: string, description?: string): Promise<CustomBookmark> {
    const newBookmark = await StorageManager.addCustomBookmark({
      name,
      description,
      tweetIds: [],
    });

    this.bookmarks.push(newBookmark);
    return newBookmark;
  }

  /**
   * カスタムブックマークを更新
   */
  async updateBookmark(id: string, updates: Partial<CustomBookmark>): Promise<void> {
    await StorageManager.updateCustomBookmark(id, updates);
    
    const index = this.bookmarks.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bookmarks[index] = { ...this.bookmarks[index], ...updates };
    }
  }

  /**
   * カスタムブックマークを削除
   */
  async deleteBookmark(id: string): Promise<void> {
    await StorageManager.deleteCustomBookmark(id);
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
  }

  /**
   * ツイートをブックマークに追加
   */
  async addTweetToBookmark(tweet: Tweet, bookmarkIds: string[]): Promise<void> {
    const tweetId = tweet.id;
    const now = new Date().toISOString();

    // 各ブックマークにツイートを追加
    for (const bookmarkId of bookmarkIds) {
      const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
      if (!bookmark) continue;

      // 既に追加済みでないかチェック
      if (!bookmark.tweetIds.includes(tweetId)) {
        bookmark.tweetIds.push(tweetId);
        bookmark.tweetCount = bookmark.tweetIds.length;
        bookmark.updatedAt = now;

        await this.updateBookmark(bookmarkId, {
          tweetIds: bookmark.tweetIds,
          tweetCount: bookmark.tweetCount,
          updatedAt: bookmark.updatedAt,
        });
      }
    }
  }

  /**
   * ツイートをブックマークから削除
   */
  async removeTweetFromBookmark(tweetId: string, bookmarkId: string): Promise<void> {
    const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    const index = bookmark.tweetIds.indexOf(tweetId);
    if (index !== -1) {
      bookmark.tweetIds.splice(index, 1);
      bookmark.tweetCount = bookmark.tweetIds.length;
      bookmark.updatedAt = new Date().toISOString();

      await this.updateBookmark(bookmarkId, {
        tweetIds: bookmark.tweetIds,
        tweetCount: bookmark.tweetCount,
        updatedAt: bookmark.updatedAt,
      });
    }
  }

  /**
   * ツイートがブックマークされているかチェック
   */
  isTweetBookmarked(tweetId: string, bookmarkId: string): boolean {
    const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
    return bookmark ? bookmark.tweetIds.includes(tweetId) : false;
  }

  /**
   * ツイートがどのブックマークに保存されているか取得
   */
  getBookmarksForTweet(tweetId: string): CustomBookmark[] {
    return this.bookmarks.filter(bookmark => 
      bookmark.tweetIds.includes(tweetId)
    );
  }

  /**
   * ブックマークに保存されたツイート一覧を取得
   */
  async getBookmarkedTweets(bookmarkId: string): Promise<BookmarkedTweet[]> {
    const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) {
      return [];
    }

    // TODO: 実際のツイートデータを取得する実装
    // 現在は仮のデータを返す
    return bookmark.tweetIds.map((tweetId, index) => ({
      id: `bookmarked-${tweetId}-${index}`,
      tweetId,
      bookmarkId,
      savedAt: new Date().toISOString(),
      tweet: {
        id: tweetId,
        text: `ツイート ${tweetId} の内容`,
        author: {
          username: 'username',
          displayName: 'ユーザー名',
        },
        createdAt: new Date().toISOString(),
        media: [],
        url: `https://twitter.com/i/status/${tweetId}`,
      },
      saveType: 'url' as const,
    }));
  }

  /**
   * ブックマーク内のツイート数を取得
   */
  getBookmarkTweetCount(bookmarkId: string): number {
    const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
    return bookmark ? bookmark.tweetCount : 0;
  }

  /**
   * ブックマーク名で検索
   */
  searchBookmarks(query: string): CustomBookmark[] {
    const lowerQuery = query.toLowerCase();
    return this.bookmarks.filter(bookmark =>
      bookmark.name.toLowerCase().includes(lowerQuery) ||
      (bookmark.description && bookmark.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * ブックマークを並び替え
   */
  sortBookmarks(sortBy: 'name' | 'createdAt' | 'updatedAt' | 'tweetCount', order: 'asc' | 'desc' = 'desc'): CustomBookmark[] {
    return [...this.bookmarks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'tweetCount':
          aValue = a.tweetCount;
          bValue = b.tweetCount;
          break;
        default:
          return 0;
      }

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  /**
   * ブックマークの重複チェック
   */
  isBookmarkNameDuplicate(name: string, excludeId?: string): boolean {
    return this.bookmarks.some(bookmark => 
      bookmark.name.toLowerCase() === name.toLowerCase() && 
      bookmark.id !== excludeId
    );
  }

  /**
   * ブックマークの検証
   */
  validateBookmark(name: string, description?: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('ブックマーク名は必須です');
    } else if (name.trim().length > 50) {
      errors.push('ブックマーク名は50文字以内で入力してください');
    }

    if (description && description.length > 200) {
      errors.push('説明は200文字以内で入力してください');
    }

    if (this.isBookmarkNameDuplicate(name)) {
      errors.push('同じ名前のブックマークが既に存在します');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
} 