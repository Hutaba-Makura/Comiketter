/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 新しい構造のメインエントリーポイント
 */

import { TweetObserver } from './tweetObserver';
import { ApiInterceptor } from './apiInterceptor';

// グローバル変数として保持（デバッグ用）
declare global {
  interface Window {
    comiketterObserver?: TweetObserver;
    comiketterApiInterceptor?: ApiInterceptor;
  }
}

class ContentScript {
  private tweetObserver: TweetObserver;
  private apiInterceptor: ApiInterceptor;
  private isInitialized = false;

  constructor() {
    this.tweetObserver = new TweetObserver();
    this.apiInterceptor = new ApiInterceptor();
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log('Comiketter: ContentScript already initialized');
      return;
    }

    console.log('Comiketter: Initializing ContentScript...');

    try {
      // API傍受を開始
      await this.apiInterceptor.init();
      console.log('Comiketter: API interceptor initialized');

      // ツイート監視を開始
      await this.tweetObserver.init();
      console.log('Comiketter: Tweet observer initialized');

      // グローバル変数に設定（デバッグ用）
      window.comiketterObserver = this.tweetObserver;
      window.comiketterApiInterceptor = this.apiInterceptor;

      this.isInitialized = true;
      console.log('Comiketter: ContentScript initialization completed');

      // 定期的な再初期化をスケジュール
      this.schedulePeriodicReinitialization();

    } catch (error) {
      console.error('Comiketter: Failed to initialize ContentScript:', error);
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
          console.log('Comiketter: Reinitializing due to lost state');
          await this.init();
        }
      } catch (error) {
        console.error('Comiketter: Failed to reinitialize:', error);
      }
    }, 30000);
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    console.log('Comiketter: Destroying ContentScript...');
    
    if (this.tweetObserver) {
      this.tweetObserver.destroy();
    }
    
    this.isInitialized = false;
    console.log('Comiketter: ContentScript destroyed');
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
  console.error('Comiketter: Global error:', event.error);
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', (event) => {
  console.error('Comiketter: Unhandled promise rejection:', event.reason);
});

export { contentScript }; 