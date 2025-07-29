/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Message handler for background script
 */

import { DownloadManager, DownloadRequest } from './downloadManager';
import { StorageManager } from '../utils/storage';
import { ApiProcessor } from '../api-processor/api-processor';
import type { ApiResponseMessage } from '../api-processor/types';

export class MessageHandler {
  private downloadManager: DownloadManager;
  private apiProcessor: ApiProcessor;
  private recentApiCalls: Map<string, number> = new Map(); // API重複防止用
  private readonly API_CALL_COOLDOWN = 1000; // 1秒間のクールダウン

  constructor() {
    this.downloadManager = new DownloadManager();
    this.apiProcessor = new ApiProcessor();
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
      // メッセージの基本検証
      if (!message || typeof message !== 'object') {
        console.error('Comiketter: 無効なメッセージ形式:', message);
        sendResponse({ success: false, error: 'Invalid message format' });
        return;
      }

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

        case 'TEST_DOWNLOAD':
          await this.handleTestDownload(message.payload, sendResponse);
          break;

        case 'BOOKMARK_ACTION':
          try {
            const result = await this.handleBookmarkMessage(message.payload);
            sendResponse({ success: true, data: result });
          } catch (error) {
            console.error('Comiketter: Bookmark action error:', error);
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Bookmark action failed' 
            });
          }
          break;

        case 'CACHE_ACTION':
          try {
            const result = await this.handleCacheAction(message.payload);
            sendResponse({ success: true, data: result });
          } catch (error) {
            console.error('Comiketter: Cache action error:', error);
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Cache action failed' 
            });
          }
          break;

        case 'OPEN_BOOKMARK_PAGE':
          await this.handleOpenBookmarkPage(sendResponse);
          break;

        default:
          console.warn('Comiketter: 未対応のメッセージタイプ:', message.type);
          sendResponse({ 
            success: false, 
            error: `Unsupported message type: ${message.type}` 
          });
          break;
      }
    } catch (error) {
      console.error('Comiketter: Message handler error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * テストダウンロード要求を処理
   */
  private async handleTestDownload(
    payload: { url: string }, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      const result = await this.downloadManager.testDownload(payload.url);
      sendResponse(result);
    } catch (error) {
      console.error('Comiketter: Test download request failed:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Test download failed' 
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
   * キャッシュ関連のメッセージを処理
   */
  private async handleCacheAction(message: any): Promise<any> {
    const { action, data } = message;

    try {
      switch (action) {
        case 'getCacheStats':
          return await ApiProcessor.getCacheStats();

        case 'cleanupExpiredCache':
          await ApiProcessor.cleanupExpiredCache();
          return { success: true, message: '期限切れキャッシュを削除しました' };

        case 'clearAllCache':
          await ApiProcessor.clearAllCache();
          return { success: true, message: '全キャッシュを削除しました' };

        case 'findTweetById':
          if (!data?.id_str) {
            throw new Error('id_str is required');
          }
          return await ApiProcessor.findTweetById(data.id_str);

        case 'findTweetsByIds':
          if (!data?.id_strs || !Array.isArray(data.id_strs)) {
            throw new Error('id_strs array is required');
          }
          return await ApiProcessor.findTweetsByIds(data.id_strs);

        case 'findTweetsByUsername':
          if (!data?.username) {
            throw new Error('username is required');
          }
          return await ApiProcessor.findTweetsByUsername(data.username);

        default:
          throw new Error(`Unknown cache action: ${action}`);
      }
    } catch (error) {
      console.error('Cache action handler error:', error);
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
        let status: 'pending' | 'failed' | 'success';
        
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

        await this.downloadManager.updateDownloadStatus(id, status);
        console.log('Comiketter: Download status updated:', { id, status });
      }
    } catch (error) {
      console.error('Comiketter: Failed to handle download change:', error);
    }
  }

  /**
   * 古いAPI呼び出し記録をクリーンアップ
   */
  private cleanupOldApiCalls(currentTime: number): void {
    const cutoffTime = currentTime - (this.API_CALL_COOLDOWN * 5); // 5倍の時間を保持（より効率的）
    let cleanedCount = 0;
    for (const [key, timestamp] of this.recentApiCalls.entries()) {
      if (timestamp < cutoffTime) {
        this.recentApiCalls.delete(key);
        cleanedCount++;
      }
    }
    
    // クリーンアップした場合はログ出力（デバッグ用）
    if (cleanedCount > 0) {
      console.log(`Comiketter: API呼び出し記録をクリーンアップ - ${cleanedCount}件削除`);
    }
  }

  /**
   * APIレスポンスキャプチャを処理（キャッシュ機能付き）
   */
  private async handleApiResponseCaptured(payload: ApiResponseMessage): Promise<void> {
    const title = this.extractApiTitle(payload.path);
    const apiKey = payload.path; // パスのみで重複を判定
    const currentTime = Date.now();
    
    // 重複チェック
    const lastCallTime = this.recentApiCalls.get(apiKey);
    if (lastCallTime && (currentTime - lastCallTime) < this.API_CALL_COOLDOWN) {
      console.log(`Comiketter: API重複呼び出しをスキップ - ${title}`);
      return;
    }
    
    // 重複防止用のタイムスタンプを記録
    this.recentApiCalls.set(apiKey, currentTime);
    
    // 古いエントリをクリーンアップ（メモリリーク防止）
    this.cleanupOldApiCalls(currentTime);
    
    console.log(`Comiketter: API傍受 - ${title}`);
    
    try {
      // APIプロセッサーでキャッシュ機能付き処理
      const result = await this.apiProcessor.processApiResponse(payload);
      
      // エラーがある場合はログ出力
      if (result.errors.length > 0) {
        console.error('Comiketter: API処理エラー:', result.errors);
      }

      // 操作系APIの場合はダウンロードマネージャーへの処理委譲もスキップ
      const apiType = this.extractApiType(payload.path);
      if (!this.isOperationApi(apiType)) {
        // ダウンロードマネージャーにも処理を委譲（既存の機能との互換性）
        await this.downloadManager.processApiResponse(payload);
      }
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  /**
   * 処理済みAPIレスポンスを処理
   */
  private async handleApiResponseProcessed(payload: ApiResponseMessage): Promise<void> {
    const title = this.extractApiTitle(payload.path);
    const apiKey = payload.path; // パスのみで重複を判定
    const currentTime = Date.now();
    
    // 重複チェック
    const lastCallTime = this.recentApiCalls.get(apiKey);
    if (lastCallTime && (currentTime - lastCallTime) < this.API_CALL_COOLDOWN) {
      console.log(`Comiketter: API処理済み重複呼び出しをスキップ - ${title}`);
      return;
    }
    
    // 重複防止用のタイムスタンプを記録
    this.recentApiCalls.set(apiKey, currentTime);
    
    console.log(`Comiketter: API処理済み - ${title}`);
    
    try {
      // 既に処理済みの場合はダウンロードマネージャーのみ実行
      await this.downloadManager.processApiResponse(payload);
    } catch (error) {
      console.error('Comiketter: Failed to process API response:', error);
    }
  }

  /**
   * APIパスからタイトルを抽出
   */
  private extractApiTitle(path: string): string {
    // GraphQLエンドポイントの場合は操作名を抽出
    if (path.includes('/graphql/')) {
      const match = path.match(/\/graphql\/([^/]+)/);
      if (match) {
        return match[1];
      }
      return 'GraphQL';
    }
    
    // その他のAPIエンドポイント
    if (path.includes('/tweet/')) return 'ツイート詳細';
    if (path.includes('/user/')) return 'ユーザー情報';
    if (path.includes('/timeline/')) return 'タイムライン';
    if (path.includes('/search/')) return '検索結果';
    if (path.includes('/media/')) return 'メディア情報';
    if (path.includes('/bookmark/')) return 'ブックマーク';
    if (path.includes('/favorite/')) return 'いいね';
    if (path.includes('/retweet/')) return 'リツイート';
    
    // デフォルト
    return 'API';
  }

  /**
   * APIパスからタイプを抽出
   */
  private extractApiType(path: string): string {
    if (path.includes('/graphql/')) {
      // GraphQLエンドポイントの場合は操作名を抽出
      if (path.includes('HomeLatestTimeline')) return 'HomeLatestTimeline';
      if (path.includes('HomeTimeline')) return 'HomeTimeline';
      if (path.includes('TweetDetail')) return 'TweetDetail';
      if (path.includes('ListLatestTweetsTimeline')) return 'ListLatestTweetsTimeline';
      if (path.includes('SearchTimeline')) return 'SearchTimeline';
      if (path.includes('CommunityTweetsTimeline')) return 'CommunityTweetsTimeline';
      if (path.includes('CommunityTweetSearchModuleQuery')) return 'CommunityTweetSearchModuleQuery';
      if (path.includes('Bookmarks')) return 'Bookmarks';
      if (path.includes('BookmarkSearchTimeline')) return 'BookmarkSearchTimeline';
      if (path.includes('UserTweets')) return 'UserTweets';
      if (path.includes('UserTweetsAndReplies')) return 'UserTweetsAndReplies';
      if (path.includes('CreateBookmarks')) return 'CreateBookmarks';
      if (path.includes('DeleteBookmark')) return 'DeleteBookmark';
      if (path.includes('FavoriteTweet')) return 'FavoriteTweet';
      if (path.includes('UnfavoriteTweet')) return 'UnfavoriteTweet';
      if (path.includes('CreateRetweet')) return 'CreateRetweet';
      if (path.includes('DeleteRetweet')) return 'DeleteRetweet';
      if (path.includes('CreateTweet')) return 'CreateTweet';
      if (path.includes('useUpsellTrackingMutation')) return 'useUpsellTrackingMutation';
      return 'GraphQL';
    }
    
    if (path.includes('/favorites/create')) return 'FavoriteTweet';
    if (path.includes('/favorites/destroy')) return 'UnfavoriteTweet';
    if (path.includes('/retweet/create')) return 'CreateRetweet';
    
    return 'Other';
  }

  /**
   * 操作系APIかどうかを判定
   */
  private isOperationApi(apiType: string): boolean {
    return [
      'FavoriteTweet',
      'UnfavoriteTweet',
      'CreateRetweet',
      'DeleteRetweet',
      'CreateTweet',
      'useUpsellTrackingMutation'
    ].includes(apiType);
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