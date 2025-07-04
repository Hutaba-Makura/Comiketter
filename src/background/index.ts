// Background script entry point for Comiketter
// This file runs as a service worker in Manifest v3

import { MessageHandler } from './messageHandler';
import { DownloadManager } from './downloadManager';

console.log('Comiketter: Background script loaded');

class BackgroundScript {
  private messageHandler: MessageHandler;
  private downloadManager: DownloadManager;

  constructor() {
    this.messageHandler = new MessageHandler();
    this.downloadManager = new DownloadManager();
  }

  async init(): Promise<void> {
    try {
      // Initialize message handling
      await this.messageHandler.init();
      
      // Initialize download management
      await this.downloadManager.init();
      
      // Setup API response listener
      this.setupApiResponseListener();
      
      console.log('Comiketter: Background script initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize Background script', error);
    }
  }

  /**
   * ISOLATED環境からのAPIレスポンスメッセージを受信する
   */
  private setupApiResponseListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'API_RESPONSE_CAPTURED') {
        console.log('Comiketter: API response received in Service Worker:', message.path);
        
        // APIレスポンスを処理
        this.handleApiResponse(message);
        
        // レスポンスを送信
        sendResponse({ success: true });
      }
    });
  }

  /**
   * APIレスポンスを処理する
   * @param message APIレスポンスメッセージ
   */
  private handleApiResponse(message: {
    path: string;
    data: unknown;
    timestamp: number;
  }): void {
    // TODO: 特定のAPIパスに対する処理を実装
    // 例: ツイート情報の抽出、メディアURLの取得など
    
    console.log('Comiketter: Processing API response for path:', message.path);
    
    // ダウンロードマネージャーに処理を委譲
    this.downloadManager.processApiResponse(message);
  }
}

// Initialize background script
new BackgroundScript().init();

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