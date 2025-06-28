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
      
      console.log('Comiketter: Background script initialized successfully');
    } catch (error) {
      console.error('Comiketter: Failed to initialize Background script', error);
    }
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