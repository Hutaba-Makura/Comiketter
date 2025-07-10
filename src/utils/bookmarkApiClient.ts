/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークAPIクライアント（コンテンツスクリプト用）
 */

import type { CustomBookmark, BookmarkedTweet, BookmarkStats } from '../types';

/**
 * コンテンツスクリプトからbackground scriptを経由してブックマーク機能にアクセスするクライアント
 */
export class BookmarkApiClient {
  private static instance: BookmarkApiClient;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): BookmarkApiClient {
    if (!BookmarkApiClient.instance) {
      BookmarkApiClient.instance = new BookmarkApiClient();
    }
    return BookmarkApiClient.instance;
  }

  /**
   * background scriptにメッセージを送信
   */
  private async sendMessage(action: string, data?: any): Promise<any> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'BOOKMARK_ACTION',
        payload: { action, data }
      });
      
      if (response && response.success === false) {
        throw new Error(response.error || 'Unknown error');
      }
      
      return response.data || response;
    } catch (error) {
      console.error('BookmarkApiClient: Failed to send message:', error);
      throw error;
    }
  }

  /**
   * 全ブックマークを取得
   */
  async getBookmarks(): Promise<CustomBookmark[]> {
    return await this.sendMessage('getBookmarks');
  }

  /**
   * カスタムブックマークを追加
   */
  async addBookmark(name: string, description?: string, color?: string): Promise<CustomBookmark> {
    return await this.sendMessage('addBookmark', {
      name,
      description,
      color,
      isActive: true,
    });
  }

  /**
   * カスタムブックマークを更新
   */
  async updateBookmark(id: string, updates: Partial<CustomBookmark>): Promise<void> {
    return await this.sendMessage('updateBookmark', { id, updates });
  }

  /**
   * カスタムブックマークを削除
   */
  async deleteBookmark(id: string): Promise<void> {
    return await this.sendMessage('deleteBookmark', { id });
  }

  /**
   * ブックマーク統計を取得
   */
  async getBookmarkStats(): Promise<BookmarkStats> {
    return await this.sendMessage('getBookmarkStats');
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
    return await this.sendMessage('addBookmarkedTweet', {
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
  }

  /**
   * ブックマークIDでツイートを取得
   */
  async getBookmarkedTweetsByBookmarkId(bookmarkId: string): Promise<BookmarkedTweet[]> {
    return await this.sendMessage('getBookmarkedTweetsByBookmarkId', { bookmarkId });
  }

  /**
   * ツイートIDでブックマーク済みツイートを取得
   */
  async getBookmarkedTweetByTweetId(tweetId: string): Promise<BookmarkedTweet[]> {
    return await this.sendMessage('getBookmarkedTweetByTweetId', { tweetId });
  }

  /**
   * ユーザー名でブックマーク済みツイートを検索
   */
  async getBookmarkedTweetsByUsername(username: string): Promise<BookmarkedTweet[]> {
    return await this.sendMessage('getBookmarkedTweetsByUsername', { username });
  }

  /**
   * ブックマーク済みツイートを更新
   */
  async updateBookmarkedTweet(id: string, updates: Partial<BookmarkedTweet>): Promise<void> {
    return await this.sendMessage('updateBookmarkedTweet', { id, updates });
  }

  /**
   * ブックマーク済みツイートを削除
   */
  async deleteBookmarkedTweet(id: string): Promise<void> {
    return await this.sendMessage('deleteBookmarkedTweet', { id });
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
   * ツイートをブックマークに追加（簡易版）
   */
  async addTweetToBookmark(bookmarkId: string, tweetId: string, tweetInfo?: any): Promise<void> {
    // 既にブックマークされているかチェック
    const isAlreadyBookmarked = await this.isTweetBookmarked(tweetId, bookmarkId);
    if (isAlreadyBookmarked) {
      return; // 既にブックマーク済み
    }
    
    // 既存のツイート情報を取得
    const existingTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    
    if (existingTweets.length > 0) {
      // 既存のツイート情報がある場合は、それをコピーして新しいブックマークに追加
      const existingTweet = existingTweets[0];
      await this.addBookmarkedTweet(
        bookmarkId,
        tweetId,
        existingTweet.authorUsername,
        existingTweet.authorDisplayName || '',
        existingTweet.authorId || '',
        existingTweet.content,
        existingTweet.tweetDate,
        existingTweet.isRetweet,
        existingTweet.isReply,
        existingTweet.mediaUrls,
        existingTweet.mediaTypes,
        existingTweet.replyToTweetId,
        existingTweet.replyToUsername,
        existingTweet.saveType
      );
    } else if (tweetInfo) {
      // ツイート情報が提供されている場合は、それを使用して新しいブックマーク済みツイートを作成
      await this.addBookmarkedTweet(
        bookmarkId,
        tweetId,
        tweetInfo.author?.username || 'unknown',
        tweetInfo.author?.displayName || '',
        tweetInfo.author?.id || '',
        tweetInfo.text || '',
        tweetInfo.createdAt || new Date().toISOString(),
        false, // isRetweet
        false, // isReply
        tweetInfo.media?.map((m: any) => m.url) || [],
        tweetInfo.media?.map((m: any) => m.type) || [],
        undefined, // replyToTweetId
        undefined, // replyToUsername
        'url' // saveType
      );
    } else {
      // ツイート情報がない場合は、最小限の情報で作成
      await this.addBookmarkedTweet(
        bookmarkId,
        tweetId,
        'unknown',
        '',
        '',
        `Tweet ID: ${tweetId}`,
        new Date().toISOString(),
        false,
        false,
        [],
        [],
        undefined,
        undefined,
        'url'
      );
    }
  }

  /**
   * ブックマークからツイートを削除
   */
  async removeTweetFromBookmark(bookmarkId: string, tweetId: string): Promise<void> {
    const bookmarkedTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    const targetTweet = bookmarkedTweets.find(tweet => tweet.bookmarkId === bookmarkId);
    
    if (targetTweet) {
      await this.deleteBookmarkedTweet(targetTweet.id);
    }
  }

  /**
   * ツイートに関連するブックマークを取得
   */
  async getBookmarksForTweet(tweetId: string): Promise<CustomBookmark[]> {
    const bookmarkedTweets = await this.getBookmarkedTweetByTweetId(tweetId);
    const bookmarkIds = [...new Set(bookmarkedTweets.map(tweet => tweet.bookmarkId))];
    
    const allBookmarks = await this.getBookmarks();
    return allBookmarks.filter(bookmark => bookmarkIds.includes(bookmark.id));
  }

  /**
   * ブックマークを検索
   */
  async searchBookmarks(query: string): Promise<CustomBookmark[]> {
    const bookmarks = await this.getBookmarks();
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(bookmark => 
      bookmark.name.toLowerCase().includes(lowerQuery) ||
      (bookmark.description && bookmark.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * ブックマークをソート
   */
  async sortBookmarks(bookmarks: CustomBookmark[], sortBy: 'name' | 'createdAt' | 'updatedAt' = 'name'): Promise<CustomBookmark[]> {
    return [...bookmarks].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'createdAt':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updatedAt':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        default:
          return 0;
      }
    });
  }

  /**
   * ブックマーク名を検証
   */
  async validateBookmark(name: string, excludeId?: string): Promise<{ isValid: boolean; error?: string }> {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'ブックマーク名は必須です' };
    }
    
    if (name.length > 50) {
      return { isValid: false, error: 'ブックマーク名は50文字以内で入力してください' };
    }
    
    // 重複チェック
    const bookmarks = await this.getBookmarks();
    const existingBookmark = bookmarks.find(b => 
      b.name.toLowerCase() === name.toLowerCase() && b.id !== excludeId
    );
    
    if (existingBookmark) {
      return { isValid: false, error: '同じ名前のブックマークが既に存在します' };
    }
    
    return { isValid: true };
  }

  /**
   * ブックマークデータをクリア
   */
  async clearAllData(): Promise<void> {
    return await this.sendMessage('clearBookmarkData');
  }
} 