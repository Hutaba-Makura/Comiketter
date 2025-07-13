/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Background script main entry point
 */

import { MessageHandler } from './messageHandler';

class BackgroundScript {
  private messageHandler: MessageHandler;

  constructor() {
    console.log('Comiketter: Background script starting...');
    
    this.messageHandler = new MessageHandler();
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Service Worker環境ではAPI傍受は不要
      // API傍受はコンテンツスクリプトで実行される
      
      console.log('Comiketter: Background script initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize background script:', error);
    }
  }
}

// バックグラウンドスクリプトを開始
new BackgroundScript();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Comiketter: Extension installed/updated', details);
  
  if (details.reason === 'install') {
    // First time installation
    console.log('Comiketter: First time installation');
  } else if (details.reason === 'update') {
    // Extension updated
    console.log('Comiketter: Extension updated');
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
  console.log('Comiketter: Download changed:', downloadDelta);
  
  if (downloadDelta.state) {
    const newState = downloadDelta.state.current;
    console.log('Comiketter: Download state changed to:', newState);
    
    if (newState === 'complete') {
      console.log('Comiketter: Download completed successfully');
    } else if (newState === 'interrupted') {
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

chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('Comiketter: Download created:', downloadItem);
}); 