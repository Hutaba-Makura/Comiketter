/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Content script main entry point
 */

import { TweetObserver } from './tweetObserver';

class ContentScript {
  private tweetObserver: TweetObserver;

  constructor() {
    console.log('Comiketter: Content script starting...');
    
    this.tweetObserver = new TweetObserver();
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // ツイート監視を初期化
      await this.tweetObserver.init();
      
      console.log('Comiketter: Content script initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize content script:', error);
    }
  }
}

// ページ読み込み完了後にコンテンツスクリプトを開始
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScript();
  });
} else {
  new ContentScript();
} 