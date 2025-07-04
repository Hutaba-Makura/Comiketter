// ContentScript entry point for Comiketter (ISOLATED world)
// This file will be injected into Twitter/X pages in ISOLATED environment

import { TweetObserver } from './tweetObserver';
import { CustomBookmarkManager } from './customBookmarkManager';

console.log('Comiketter: ContentScript loaded in ISOLATED world');

class ContentScript {
  private tweetObserver: TweetObserver;
  private customBookmarkManager: CustomBookmarkManager;

  constructor() {
    this.tweetObserver = new TweetObserver();
    this.customBookmarkManager = new CustomBookmarkManager();
  }

  async init(): Promise<void> {
    try {
      // Initialize tweet observation
      await this.tweetObserver.init();
      
      // Initialize custom bookmark functionality
      await this.customBookmarkManager.init();
      
      // Listen for API responses from MAIN world
      this.setupApiResponseListener();
      
      console.log('Comiketter: ContentScript initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize ContentScript', error);
    }
  }

  /**
   * MAIN環境からのAPIレスポンスイベントを受信し、Service Workerに送信する
   */
  private setupApiResponseListener(): void {
    document.addEventListener('comiketter:api-response-processed', (event: Event) => {
      const customEvent = event as CustomEvent<{
        path: string;
        data: unknown;
        timestamp: number;
      }>;
      
      console.log('Comiketter: API response received from MAIN world:', customEvent.detail.path);
      
      // Service Workerにメッセージ送信
      chrome.runtime.sendMessage({
        type: 'API_RESPONSE_CAPTURED',
        path: customEvent.detail.path,
        data: customEvent.detail.data,
        timestamp: customEvent.detail.timestamp,
      }).catch(error => {
        console.error('Comiketter: Failed to send message to background script', error);
      });
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      new ContentScript().init();
    }, 100); // 少し遅延させて他のスクリプトの読み込みを待つ
  });
} else {
  setTimeout(() => {
    new ContentScript().init();
  }, 100);
} 