/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: カスタムブックマーク管理サービス
 */

import type { CustomBookmark, BookmarkedTweet, BookmarkStats } from '../types';
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
      console.log('BookmarkManager initialized with', this.bookmarks.length, 'bookmarks');
    } catch (error) {
      console.error('Failed to initialize BookmarkManager:', error);
    }
  }

  /**
   * 全ブックマークを取得
   */
  async getBookmarks(): Promise<CustomBookmark[]> {
    return this.bookmarks;
  }

  /**
   * カスタムブックマークを追加
   */
  async addBookmark(name: string, description?: string, color?: string): Promise<CustomBookmark> {
    const newBookmark = await StorageManager.addCustomBookmark({
      name,
      description,
      color,
      isActive: true,
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
   * ブックマーク統計を取得
   */
  async getBookmarkStats(): Promise<BookmarkStats> {
    return await StorageManager.getBookmarkStats();
  }

  /**
   * ブックマーク済みツイートを追加
   */
  async addBookmarkedTweet(
    bookmarkId: string,
    tweetId: string,
    authorUsername: string,
    authorDisplayName: string,
    authorId: string,
    content: string,
    tweetDate: string,
    isRetweet: boolean = false,
    isReply: boolean = false,
    mediaUrls?: string[],
    mediaTypes?: string[],
    replyToTweetId?: string,
    replyToUsername?: string,
    saveType: 'url' | 'blob' | 'mixed' = 'url'
  ): Promise<BookmarkedTweet> {
    const newTweet = await StorageManager.addBookmarkedTweet({
      bookmarkId,
      tweetId,
      authorUsername,
      authorDisplayName,
      authorId,
      content,
      mediaUrls,
      mediaTypes,
      tweetDate,
      isRetweet,
      isReply,
      replyToTweetId,
      replyToUsername,
      saveType,
    });

    this.bookmarkedTweets.push(newTweet);
    return newTweet;
  }

  /**
   * ブックマークIDでツイートを取得
   */
  async getBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<BookmarkedTweet[]> {
    return await StorageManager.getBookmarkedTweetsByBookmarkId(bookmarkId);
  }

  /**
   * ツイートIDでブックマーク済みツイートを取得
   */
  async getBookmarkedTweetByTweetId(tweetId: string): Promise<BookmarkedTweet[]> {
    return await StorageManager.getBookmarkedTweetByTweetId(tweetId);
  }

  /**
   * ユーザー名でブックマーク済みツイートを検索
   */
  async getBookmarkedTweetsByUsername(username: string): Promise<BookmarkedTweet[]> {
    return await StorageManager.getBookmarkedTweetsByUsername(username);
  }

  /**
   * ブックマーク済みツイートを更新
   */
  async updateBookmarkedTweet(id: string, updates: Partial<BookmarkedTweet>): Promise<void> {
    await StorageManager.updateBookmarkedTweet(id, updates);
    
    const index = this.bookmarkedTweets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.bookmarkedTweets[index] = { ...this.bookmarkedTweets[index], ...updates };
    }
  }

  /**
   * ブックマーク済みツイートを削除
   */
  async deleteBookmarkedTweet(id: string): Promise<void> {
    await StorageManager.deleteBookmarkedTweet(id);
    this.bookmarkedTweets = this.bookmarkedTweets.filter(t => t.id !== id);
  }

  /**
   * ツイートが既にブックマークされているかチェック
   */
  async isTweetBookmarked(tweetId: string, bookmarkId?: string): Promise<boolean> {
    const bookmarkedTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    
    if (bookmarkId) {
      return bookmarkedTweets.some(tweet => tweet.bookmarkId === bookmarkId);
    }
    
    return bookmarkedTweets.length > 0;
  }

  /**
   * ブックマークデータをクリア
   */
  async clearAllData(): Promise<void> {
    await StorageManager.clearBookmarkData();
    this.bookmarks = [];
    this.bookmarkedTweets = [];
  }
} 