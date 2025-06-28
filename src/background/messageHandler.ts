// Message Handler for Chrome extension messaging
// Handles API response messages from content script

import type { Comiketter } from '@/types/api';

interface ApiResponseMessage {
  type: 'API_RESPONSE_CAPTURED';
  path: string;
  data: unknown;
}

export class MessageHandler {
  constructor() {
    console.log('Comiketter: MessageHandler constructor called');
  }

  async init(): Promise<void> {
    console.log('Comiketter: MessageHandler initialized');
    
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });
  }

  private handleMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): void {
    console.log('Comiketter: Received message', message);

    if (this.isApiResponseMessage(message)) {
      this.handleApiResponseMessage(message, sender);
      sendResponse({ success: true });
    } else {
      console.warn('Comiketter: Unknown message type', message);
      sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  private isApiResponseMessage(message: unknown): message is ApiResponseMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'API_RESPONSE_CAPTURED' &&
      'path' in message &&
      'data' in message
    );
  }

  private handleApiResponseMessage(
    message: ApiResponseMessage,
    sender: chrome.runtime.MessageSender
  ): void {
    console.log('Comiketter: Processing API response message', {
      path: message.path,
      tabId: sender.tab?.id,
    });

    // TODO: Implement specific API response processing based on path
    // This will be expanded to handle different types of API responses
    // such as tweet data, user actions (like, retweet), etc.
    
    switch (message.path) {
      case '/i/api/graphql/HomeTimeline':
        this.processHomeTimelineResponse(message.data);
        break;
      case '/i/api/graphql/TweetDetail':
        this.processTweetDetailResponse(message.data);
        break;
      default:
        console.log('Comiketter: Unhandled API path', message.path);
    }
  }

  private processHomeTimelineResponse(data: unknown): void {
    console.log('Comiketter: Processing HomeTimeline response');
    // TODO: Extract tweet data and trigger download if conditions are met
  }

  private processTweetDetailResponse(data: unknown): void {
    console.log('Comiketter: Processing TweetDetail response');
    // TODO: Extract tweet data and trigger download if conditions are met
  }
} 