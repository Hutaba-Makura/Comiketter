/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Content script main entry point
 */

import { TweetObserver } from './tweetObserver';
import { ApiInterceptor } from './apiInterceptor';
import { CustomBookmarkManager } from './customBookmarkManager';

class ContentScript {
  private tweetObserver: TweetObserver;
  private apiInterceptor: ApiInterceptor;
  private customBookmarkManager: CustomBookmarkManager;
  private isInitialized = false;

  constructor() {
    console.log('Comiketter: Content script starting...');
    
    this.tweetObserver = new TweetObserver();
    this.apiInterceptor = new ApiInterceptor();
    this.customBookmarkManager = new CustomBookmarkManager();
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Comiketter: Already initialized, skipping');
      return; // 重複初期化を防ぐ
    }

    try {
      console.log('Comiketter: Starting initialization...');
      
      // API傍受機能を初期化
      console.log('Comiketter: Initializing API interceptor...');
      await this.apiInterceptor.init();
      
      // APIレスポンスイベントリスナーを設定
      console.log('Comiketter: Setting up API response listeners...');
      this.setupApiResponseListener();
      
      // ツイート監視を初期化
      console.log('Comiketter: Initializing tweet observer...');
      await this.tweetObserver.init();
      
      // カスタムブックマーク機能を初期化
      console.log('Comiketter: Initializing custom bookmark manager...');
      await this.customBookmarkManager.init();
      
      this.isInitialized = true;
      console.log('Comiketter: Content script initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize content script:', error);
    }
  }

  /**
   * APIレスポンスイベントリスナーを設定
   */
  private setupApiResponseListener(): void {
    // API傍受でキャプチャされたレスポンスをバックグラウンドに送信
    document.addEventListener('comiketter:api-response', (e: Event) => {
      const event = e as CustomEvent<Comiketter.ApiResponseDetail>;
      const { path, status, body } = event.detail;
      
      if (status === 200) {
        try {
          const data = JSON.parse(body);
          chrome.runtime.sendMessage({
            type: 'API_RESPONSE_CAPTURED',
            payload: {
              path,
              data,
              timestamp: Date.now(),
            },
          }).catch(error => {
            console.error('Comiketter: Failed to send API response to background:', error);
          });
        } catch (error) {
          console.error('Comiketter: Failed to parse API response:', error);
        }
      }
    });

    // 処理済みAPIレスポンスイベントリスナー
    document.addEventListener('comiketter:api-response-processed', (e: Event) => {
      const event = e as CustomEvent<{
        path: string;
        data: unknown;
        timestamp: number;
      }>;
      
      chrome.runtime.sendMessage({
        type: 'API_RESPONSE_PROCESSED',
        payload: event.detail,
      }).catch(error => {
        console.error('Comiketter: Failed to send processed API response to background:', error);
      });
    });
  }
}

// ページ読み込み完了後にコンテンツスクリプトを開始
let contentScript: ContentScript | null = null;

function initializeContentScript() {
  if (contentScript) {
    console.log('Comiketter: Content script already exists, skipping initialization');
    return;
  }
  
  console.log('Comiketter: Creating new content script instance');
  contentScript = new ContentScript();
}

// 遅延初期化関数（複数回実行）
function delayedInitialization(attempt: number = 1) {
  const delays = [1000, 2000, 5000]; // 1秒、2秒、5秒後に再試行
  
  if (attempt <= delays.length) {
    setTimeout(() => {
      console.log('Comiketter: Attempting delayed initialization (attempt', attempt, ')');
      if (!contentScript) {
        initializeContentScript();
      } else {
        // 既に初期化済みの場合は、ツイート監視を再実行
        console.log('Comiketter: Re-running tweet observer initialization');
        contentScript['tweetObserver']?.init();
      }
      
      // 次の遅延初期化をスケジュール
      if (attempt < delays.length) {
        delayedInitialization(attempt + 1);
      }
    }, delays[attempt - 1]);
  }
}

// 即座に初期化を試行
console.log('Comiketter: Attempting immediate initialization');
initializeContentScript();

// DOMContentLoadedでも初期化
if (document.readyState === 'loading') {
  console.log('Comiketter: Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Comiketter: DOMContentLoaded fired, initializing content script');
    initializeContentScript();
  });
} else {
  console.log('Comiketter: Document already loaded, initializing content script');
  initializeContentScript();
}

// window.onloadでも初期化（念のため）
window.addEventListener('load', () => {
  console.log('Comiketter: Window load fired, ensuring content script is initialized');
  if (!contentScript) {
    initializeContentScript();
  }
});

// 遅延初期化も実行
delayedInitialization(); 