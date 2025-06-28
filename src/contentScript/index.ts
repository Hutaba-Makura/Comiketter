// ContentScript entry point for Comiketter
// This file will be injected into Twitter/X pages

import { ApiInterceptor } from './apiInterceptor';
import { TweetObserver } from './tweetObserver';
import { CustomBookmarkManager } from './customBookmarkManager';

console.log('Comiketter: ContentScript loaded');

class ContentScript {
  private apiInterceptor: ApiInterceptor;
  private tweetObserver: TweetObserver;
  private customBookmarkManager: CustomBookmarkManager;

  constructor() {
    this.apiInterceptor = new ApiInterceptor();
    this.tweetObserver = new TweetObserver();
    this.customBookmarkManager = new CustomBookmarkManager();
  }

  async init(): Promise<void> {
    try {
      // Initialize API interception
      await this.apiInterceptor.init();
      
      // Initialize tweet observation
      await this.tweetObserver.init();
      
      // Initialize custom bookmark functionality
      await this.customBookmarkManager.init();
      
      console.log('Comiketter: ContentScript initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize ContentScript', error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScript().init();
  });
} else {
  new ContentScript().init();
} 