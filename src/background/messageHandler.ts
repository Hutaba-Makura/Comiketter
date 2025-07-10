/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Message handler for background script
 */

import { DownloadManager, DownloadRequest } from './downloadManager';
import { StorageManager } from '../utils/storage';

export class MessageHandler {
  private downloadManager: DownloadManager;

  constructor() {
    this.downloadManager = new DownloadManager();
    this.setupMessageListeners();
  }

  /**
   * メッセージリスナーを設定
   */
  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスのためtrueを返す
    });

    // ダウンロード状態変更の監視
    chrome.downloads.onChanged.addListener((downloadDelta) => {
      this.handleDownloadChange(downloadDelta);
    });
  }

  /**
   * メッセージを処理
   */
  private async handleMessage(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      console.log('Comiketter: Received message:', message);

      switch (message.type) {
        case 'LOG':
          // ログメッセージは既にバックグラウンドスクリプトで処理されているため、
          // ここでは何もしない（警告を出さない）
          sendResponse({ success: true });
          break;

        case 'DOWNLOAD_TWEET_MEDIA':
          await this.handleDownloadTweetMedia(message.payload, sendResponse);
          break;

        case 'API_RESPONSE_CAPTURED':
          await this.handleApiResponseCaptured(message.payload);
          sendResponse({ success: true });
          break;

        case 'API_RESPONSE_PROCESSED':
          await this.handleApiResponseProcessed(message.payload);
          sendResponse({ success: true });
          break;

        case 'GET_SETTINGS':
          await this.handleGetSettings(sendResponse);
          break;

        case 'SAVE_SETTINGS':
          await this.handleSaveSettings(message.payload, sendResponse);
          break;

        case 'GET_DOWNLOAD_HISTORY':
          await this.handleGetDownloadHistory(sendResponse);
          break;

        case 'GET_DOWNLOAD_HISTORY_STATS':
          await this.handleGetDownloadHistoryStats(sendResponse);
          break;

        case 'GET_DOWNLOAD_HISTORY_BY_TWEET_ID':
          await this.handleGetDownloadHistoryByTweetId(message.payload, sendResponse);
          break;

        case 'GET_DOWNLOAD_HISTORY_BY_USERNAME':
          await this.handleGetDownloadHistoryByUsername(message.payload, sendResponse);
          break;

        case 'GET_DOWNLOAD_HISTORY_BY_STATUS':
          await this.handleGetDownloadHistoryByStatus(message.payload, sendResponse);
          break;

        case 'GET_DOWNLOAD_HISTORY_BY_DATE_RANGE':
          await this.handleGetDownloadHistoryByDateRange(message.payload, sendResponse);
          break;

        case 'DELETE_DOWNLOAD_HISTORY':
          await this.handleDeleteDownloadHistory(message.payload, sendResponse);
          break;

        case 'CLEAR_DOWNLOAD_HISTORY':
          await this.handleClearDownloadHistory(sendResponse);
          break;

        case 'OPEN_BOOKMARK_PAGE':
          await this.handleOpenBookmarkPage(sendResponse);
          break;

        case 'BOOKMARK_ACTION':
          try {
            const result = await this.handleBookmarkMessage(message.payload);
            sendResponse({ success: true, data: result });
          } catch (error) {
            console.error('Bookmark action failed:', error);
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
          break;

        default:
          console.warn('Comiketter: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Comiketter: Message handling error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * ツイートメディアダウンロード要求を処理
   */
  private async handleDownloadTweetMedia(
    payload: DownloadRequest, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      const result = await this.downloadManager.downloadTweetMedia(payload);
      sendResponse(result);
    } catch (error) {
      console.error('Comiketter: Download request failed:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Download failed' 
      });
    }
  }

  /**
   * 設定取得要求を処理
   */
  private async handleGetSettings(sendResponse: (response: any) => void): Promise<void> {
    try {
      const settings = await StorageManager.getSettings();
      sendResponse({ success: true, data: settings });
    } catch (error) {
      console.error('Comiketter: Failed to get settings:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get settings' 
      });
    }
  }

  /**
   * 設定保存要求を処理
   */
  private async handleSaveSettings(
    payload: any, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      await StorageManager.saveSettings(payload);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Comiketter: Failed to save settings:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    }
  }

  /**
   * ダウンロード履歴取得要求を処理
   */
  private async handleGetDownloadHistory(sendResponse: (response: any) => void): Promise<void> {
    try {
      const history = await this.downloadManager.getDownloadHistory();
      sendResponse({ success: true, data: history });
    } catch (error) {
      console.error('Comiketter: Failed to get download history:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get download history' 
      });
    }
  }

  /**
   * ダウンロード履歴統計取得要求を処理
   */
  private async handleGetDownloadHistoryStats(sendResponse: (response: any) => void): Promise<void> {
    try {
      const stats = await this.downloadManager.getDownloadHistoryStats();
      sendResponse({ success: true, data: stats });
    } catch (error) {
      console.error('Comiketter: Failed to get download history stats:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get download history stats' 
      });
    }
  }

  /**
   * ツイートIDでダウンロード履歴検索要求を処理
   */
  private async handleGetDownloadHistoryByTweetId(
    message: { tweetId: string }, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      const history = await this.downloadManager.getDownloadHistoryByTweetId(message.tweetId);
      sendResponse({ success: true, data: history });
    } catch (error) {
      console.error('Comiketter: Failed to get download history by tweet ID:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get download history by tweet ID' 
      });
    }
  }

  /**
   * ユーザー名でダウンロード履歴検索要求を処理
   */
  private async handleGetDownloadHistoryByUsername(
    message: { username: string }, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      const history = await this.downloadManager.getDownloadHistoryByUsername(message.username);
      sendResponse({ success: true, data: history });
    } catch (error) {
      console.error('Comiketter: Failed to get download history by username:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get download history by username' 
      });
    }
  }

  /**
   * ステータスでダウンロード履歴検索要求を処理
   */
  private async handleGetDownloadHistoryByStatus(
    message: { status: 'success' | 'failed' | 'pending' }, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      const history = await this.downloadManager.getDownloadHistoryByStatus(message.status);
      sendResponse({ success: true, data: history });
    } catch (error) {
      console.error('Comiketter: Failed to get download history by status:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get download history by status' 
      });
    }
  }

  /**
   * 日付範囲でダウンロード履歴検索要求を処理
   */
  private async handleGetDownloadHistoryByDateRange(
    message: { startDate: string; endDate: string }, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      const history = await this.downloadManager.getDownloadHistoryByDateRange(
        message.startDate, 
        message.endDate
      );
      sendResponse({ success: true, data: history });
    } catch (error) {
      console.error('Comiketter: Failed to get download history by date range:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get download history by date range' 
      });
    }
  }

  /**
   * ダウンロード履歴削除要求を処理
   */
  private async handleDeleteDownloadHistory(
    message: { id: string }, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      await this.downloadManager.deleteDownloadHistory(message.id);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Comiketter: Failed to delete download history:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete download history' 
      });
    }
  }

  /**
   * ダウンロード履歴クリア要求を処理
   */
  private async handleClearDownloadHistory(sendResponse: (response: any) => void): Promise<void> {
    try {
      await this.downloadManager.clearDownloadHistory();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Comiketter: Failed to clear download history:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to clear download history' 
      });
    }
  }

  /**
   * ブックマーク関連のメッセージを処理
   */
  private async handleBookmarkMessage(message: any): Promise<any> {
    const { action, data } = message;

    try {
      switch (action) {
        case 'getBookmarks':
          return await StorageManager.getCustomBookmarks();

        case 'addBookmark':
          return await StorageManager.addCustomBookmark(data);

        case 'updateBookmark':
          return await StorageManager.updateCustomBookmark(data.id, data.updates);

        case 'deleteBookmark':
          return await StorageManager.deleteCustomBookmark(data.id);

        case 'getBookmarkStats':
          return await StorageManager.getBookmarkStats();

        case 'addBookmarkedTweet':
          return await StorageManager.addBookmarkedTweet(data);

        case 'getBookmarkedTweetsByBookmarkId':
          return await StorageManager.getBookmarkedTweetsByBookmarkId(data.bookmarkId);

        case 'getBookmarkedTweetByTweetId':
          return await StorageManager.getBookmarkedTweetByTweetId(data.tweetId);

        case 'getBookmarkedTweetsByUsername':
          return await StorageManager.getBookmarkedTweetsByUsername(data.username);

        case 'updateBookmarkedTweet':
          return await StorageManager.updateBookmarkedTweet(data.id, data.updates);

        case 'deleteBookmarkedTweet':
          return await StorageManager.deleteBookmarkedTweet(data.id);

        case 'clearBookmarkData':
          return await StorageManager.clearBookmarkData();

        default:
          throw new Error(`Unknown bookmark action: ${action}`);
      }
    } catch (error) {
      console.error('Bookmark message handler error:', error);
      throw error;
    }
  }

  /**
   * ダウンロード状態変更を処理
   */
  private async handleDownloadChange(downloadDelta: chrome.downloads.DownloadDelta): Promise<void> {
    try {
      const { id, state } = downloadDelta;
      
      if (id && state) {
        let status: string;
        
        switch (state.current) {
          case 'complete':
            status = 'success';
            break;
          case 'interrupted':
            status = 'failed';
            break;
          case 'in_progress':
            status = 'pending';
            break;
          default:
            return;
        }

        await this.downloadManager.updateDownloadStatus(id, status as any);
        console.log('Comiketter: Download status updated:', { id, status });
      }
    } catch (error) {
      console.error('Comiketter: Failed to handle download change:', error);
    }
  }

  /**
   * APIレスポンスキャプチャを処理
   */
  private async handleApiResponseCaptured(payload: {
    path: string;
    data: unknown;
    timestamp: number;
  }): Promise<void> {
    try {
      console.log('Comiketter: API response captured:', payload.path);
      this.downloadManager.processApiResponse(payload);
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  /**
   * 処理済みAPIレスポンスを処理
   */
  private async handleApiResponseProcessed(payload: {
    path: string;
    data: unknown;
    timestamp: number;
  }): Promise<void> {
    try {
      console.log('Comiketter: Processed API response:', payload.path);
      this.downloadManager.processApiResponse(payload);
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  /**
   * ブックマークページを開く要求を処理
   */
  private async handleOpenBookmarkPage(sendResponse: (response: any) => void): Promise<void> {
    try {
      const url = chrome.runtime.getURL('bookmarks.html');
      await chrome.tabs.create({ url });
      sendResponse({ success: true });
    } catch (error) {
      console.error('Comiketter: Failed to open bookmark page:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to open bookmark page' 
      });
    }
  }
} 