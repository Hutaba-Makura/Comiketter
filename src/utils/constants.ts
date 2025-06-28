// Constants for Comiketter extension

export const EXTENSION_NAME = 'Comiketter';
export const EXTENSION_VERSION = '1.0.0';

// Twitter/X API endpoints
export const TWITTER_API_ENDPOINTS = {
  GRAPHQL: 'https://api.twitter.com/graphql',
  REST_API: 'https://api.twitter.com/2',
} as const;

// Chrome extension message types
export const MESSAGE_TYPES = {
  // API interception
  CAPTURE_RESPONSE: 'CAPTURE_RESPONSE',
  
  // Download operations
  DOWNLOAD_MEDIA: 'DOWNLOAD_MEDIA',
  DOWNLOAD_COMPLETE: 'DOWNLOAD_COMPLETE',
  DOWNLOAD_ERROR: 'DOWNLOAD_ERROR',
  
  // Bookmark operations
  SAVE_BOOKMARK: 'SAVE_BOOKMARK',
  DELETE_BOOKMARK: 'DELETE_BOOKMARK',
  GET_BOOKMARKS: 'GET_BOOKMARKS',
  
  // Settings operations
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  
  // UI operations
  SHOW_CB_SELECTOR: 'SHOW_CB_SELECTOR',
  HIDE_CB_SELECTOR: 'HIDE_CB_SELECTOR',
} as const;

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  CUSTOM_BOOKMARKS: 'customBookmarks',
  BOOKMARKED_TWEETS: 'bookmarkedTweets',
  DOWNLOAD_HISTORY: 'downloadHistory',
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  tlAutoUpdateDisabled: false,
  saveFormat: 'url' as const,
  autoDownloadConditions: {
    retweet: false,
    like: false,
    both: false,
  },
  downloadMethod: 'chrome-api' as const,
  saveDirectory: '',
} as const;

// File extensions for media
export const MEDIA_EXTENSIONS = {
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  VIDEO: ['.mp4', '.mov', '.avi', '.webm'],
} as const;

// CSS classes for UI elements
export const CSS_CLASSES = {
  CB_BUTTON: 'comiketter-cb-button',
  CB_SELECTOR: 'comiketter-cb-selector',
  CB_SELECTOR_OVERLAY: 'comiketter-cb-selector-overlay',
  CB_SELECTOR_LIST: 'comiketter-cb-selector-list',
  CB_SELECTOR_ITEM: 'comiketter-cb-selector-item',
  CB_SELECTOR_CHECKBOX: 'comiketter-cb-selector-checkbox',
} as const;

// Event names for custom events
export const CUSTOM_EVENTS = {
  TWEET_LOADED: 'comiketter:tweet-loaded',
  CB_SELECTED: 'comiketter:cb-selected',
  DOWNLOAD_STARTED: 'comiketter:download-started',
  DOWNLOAD_COMPLETED: 'comiketter:download-completed',
} as const; 