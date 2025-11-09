/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Background script main entry point
 */

import { MessageHandler } from './messageHandler';
import { ApiCacheManager } from '../utils/api-cache';

class BackgroundScript {
  private messageHandler: MessageHandler;

  constructor() {
    this.messageHandler = new MessageHandler();
    
    this.initialize();
    this.setupPeriodicCleanup();
  }

  private async initialize(): Promise<void> {
    try {
      // Service Worker環境ではAPI傍受は不要
      // API傍受はコンテンツスクリプトで実行される
      
      // 初期化時に期限切れキャッシュを削除
      await ApiCacheManager.cleanupExpiredCache();
      console.log('Comiketter: Background script initialized, expired cache cleaned up');
    } catch (error) {
      console.error('Comiketter: Failed to initialize background script:', error);
    }
  }

  /**
   * 定期的なキャッシュクリーンアップを設定
   */
  private setupPeriodicCleanup(): void {
    // chrome.alarmsが利用可能かチェック
    if (!chrome.alarms) {
      console.warn('Comiketter: chrome.alarms API is not available. Periodic cleanup will not be set up.');
      return;
    }

    try {
      // アラームが既に設定されているかチェック
      chrome.alarms.get('cacheCleanup', (alarm) => {
        if (chrome.runtime.lastError) {
          console.error('Comiketter: Error checking alarm:', chrome.runtime.lastError);
          return;
        }

        if (!alarm) {
          // アラームが設定されていない場合、6時間ごとにクリーンアップを実行
          chrome.alarms.create('cacheCleanup', {
            periodInMinutes: 6 * 60 // 6時間ごと
          }, () => {
            if (chrome.runtime.lastError) {
              console.error('Comiketter: Error creating alarm:', chrome.runtime.lastError);
            } else {
              console.log('Comiketter: Periodic cache cleanup alarm created (every 6 hours)');
            }
          });
        }
      });

      // アラームイベントリスナーを設定
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'cacheCleanup') {
          ApiCacheManager.cleanupExpiredCache().catch((error) => {
            console.error('Comiketter: Periodic cache cleanup failed:', error);
          });
        }
      });
    } catch (error) {
      console.error('Comiketter: Failed to setup periodic cleanup:', error);
    }
  }
}

// バックグラウンドスクリプトを開始
new BackgroundScript();

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First time installation
    console.log('Comiketter: Extension installed');
    // 初回インストール時にも期限切れキャッシュを削除（念のため）
    await ApiCacheManager.cleanupExpiredCache();
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Comiketter: Extension updated');
    // アップデート時にも期限切れキャッシュを削除
    await ApiCacheManager.cleanupExpiredCache();
  }
});

// コンテンツスクリプトからのログメッセージを受信
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'LOG') {
    console.log(`${message.message}`, message.data || '');
    console.log(`[${message.timestamp}] From: ${sender.tab?.url || 'unknown'}`);
  }
  
  // 他のメッセージはMessageHandlerに委譲
  return false; // 非同期処理を示す
});

// ダウンロードイベントリスナー
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.state) {
    const newState = downloadDelta.state.current;
    
    if (newState === 'interrupted') {
      console.error('Comiketter: Download interrupted');
      
      // エラー情報がある場合は詳細をログ出力
      if (downloadDelta.error) {
        const errorType = downloadDelta.error.current;
        console.error('Comiketter: Download error type:', errorType);
        
        // SERVER_BAD_CONTENTエラーの場合は特別な処理
        if (errorType === 'SERVER_BAD_CONTENT') {
          console.error('Comiketter: SERVER_BAD_CONTENT error detected');
          console.error('Comiketter: This usually indicates the video URL is invalid or expired');
          console.error('Comiketter: Consider implementing retry logic with different video quality');
        }
      }
    }
  }
  
  if (downloadDelta.error) {
    console.error('Comiketter: Download error:', downloadDelta.error.current);
  }
}); 