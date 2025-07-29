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