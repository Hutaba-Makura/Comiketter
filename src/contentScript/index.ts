/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 新しい構造のメインエントリーポイント
 */

import { TweetObserver } from './tweetObserver';
import { ApiInterceptor } from './apiInterceptor';
import { SidebarButton } from './sidebarButton';
import { extractTweetInfoFromDOM } from './tweetInfoExtractor';

// ログ送信関数
const sendLog = (message: string, data?: any) => {
  const logMessage = `[Comiketter] ${message}`;
  console.log(logMessage, data);
  
  // バックグラウンドスクリプトにログを送信
  try {
    chrome.runtime.sendMessage({
      type: 'LOG',
      message: logMessage,
      data: data,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // 送信に失敗しても無視（バックグラウンドが利用できない場合など）
    });
  } catch (error) {
    // chrome.runtimeが利用できない場合は無視
  }
};

// グローバル変数として保持（デバッグ用）
declare global {
  interface Window {
    comiketterObserver?: TweetObserver;
    comiketterApiInterceptor?: ApiInterceptor;
    comiketterSidebarButton?: SidebarButton;
  }
}

class ContentScript {
  private tweetObserver: TweetObserver;
  private apiInterceptor: ApiInterceptor;
  private sidebarButton: SidebarButton;
  private isInitialized = false;

  constructor() {
    this.tweetObserver = new TweetObserver();
    this.apiInterceptor = ApiInterceptor.getInstance(); // シングルトンインスタンスを取得
    this.sidebarButton = SidebarButton.getInstance();
    
    // メッセージリスナーを設定
    this.setupMessageListener();
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // API傍受を開始
      await this.apiInterceptor.init();

      // ツイート監視を開始
      await this.tweetObserver.init();

      // サイドバーボタンを初期化
      await this.sidebarButton.initialize();

      // グローバル変数に設定（デバッグ用）
      window.comiketterObserver = this.tweetObserver;
      window.comiketterApiInterceptor = this.apiInterceptor;
      window.comiketterSidebarButton = this.sidebarButton;

      this.isInitialized = true;

      // 定期的な再初期化をスケジュール
      this.schedulePeriodicReinitialization();

    } catch (error) {
      sendLog('Failed to initialize ContentScript:', error);
    }
  }

  /**
   * メッセージリスナーを設定
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスのためtrueを返す
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
      if (!message || typeof message !== 'object') {
        sendResponse({ success: false, error: 'Invalid message format' });
        return;
      }

      switch (message.type) {
        case 'EXTRACT_TWEET_FROM_DOM':
          await this.handleExtractTweetFromDOM(message.payload, sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Comiketter: Error handling message:', error);
      sendResponse({ success: false, error: 'Internal error' });
    }
  }

  /**
   * Web要素からツイート情報を抽出
   */
  private async handleExtractTweetFromDOM(
    payload: { tweetId: string },
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      console.log('Comiketter: Web要素からツイート情報を抽出開始:', payload.tweetId);
      
      const tweet = extractTweetInfoFromDOM(payload.tweetId);
      if (tweet) {
        console.log('Comiketter: ツイート情報を抽出成功:', tweet);
        
        // メディア情報をより詳細に取得
        if (tweet.media && tweet.media.length > 0) {
          console.log('Comiketter: メディア情報を詳細化:', tweet.media);
          
          // 各メディアの詳細情報を取得
          const detailedMedia = tweet.media.map((media, index) => {
            console.log(`Comiketter: メディア${index + 1}の詳細化:`, media);
            return {
              ...media,
              // 確実にmedia_url_httpsを設定
              media_url_https: (media as any).media_url_https || media.url,
              // 追加のデバッグ情報
              debug_info: {
                original_type: media.type,
                has_url: !!media.url,
                has_media_url_https: !!(media as any).media_url_https,
                url_value: media.url,
                media_url_https_value: (media as any).media_url_https
              }
            };
          });
          
          tweet.media = detailedMedia;
          console.log('Comiketter: 詳細化されたメディア情報:', detailedMedia);
        }
        
        sendResponse({ success: true, data: tweet });
      } else {
        console.warn('Comiketter: ツイートが見つかりません:', payload.tweetId);
        sendResponse({ success: false, error: 'Tweet not found in DOM' });
      }
    } catch (error) {
      console.error('Comiketter: Error extracting tweet from DOM:', error);
      sendResponse({ success: false, error: 'Failed to extract tweet' });
    }
  }

  /**
   * 定期的な再初期化をスケジュール
   */
  private schedulePeriodicReinitialization(): void {
    // 30秒ごとに再初期化をチェック
    setInterval(async () => {
      try {
        if (!this.isInitialized) {
          await this.init();
        }
      } catch (error) {
        sendLog('Failed to reinitialize:', error);
      }
    }, 30000);
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.tweetObserver) {
      this.tweetObserver.destroy();
    }
    
    if (this.sidebarButton) {
      this.sidebarButton.destroy();
    }
    
    this.isInitialized = false;
  }
}

// インスタンスを作成
const contentScript = new ContentScript();

// DOMContentLoadedまたはloadイベントで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript.init();
  });
} else {
  // 既にDOMが読み込まれている場合
  contentScript.init();
}

// ページアンロード時のクリーンアップ
window.addEventListener('beforeunload', () => {
  contentScript.destroy();
});

// エラーハンドリング
window.addEventListener('error', (event) => {
  sendLog('Global error:', event.error);
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', (event) => {
  sendLog('Unhandled promise rejection:', event.reason);
});

export { contentScript }; 