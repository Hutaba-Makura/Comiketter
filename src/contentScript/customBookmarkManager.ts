/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Custom Bookmark Manager for CB functionality
 */

import { StorageManager } from '../utils/storage';
import { getTweetInfoFromArticle } from './tweetInfoExtractor';
import type { CustomBookmark, Tweet } from '../types';

export enum BookmarkButtonStatus {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export class CustomBookmarkManager {
  private observer: MutationObserver | null = null;
  private isInitialized = false;
  private processedElements = new WeakSet<HTMLElement>();
  private bookmarkSelector: HTMLElement | null = null;
  private currentTweetInfo: Tweet | null = null;

  constructor() {
    this.injectStyles();
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return; // 重複初期化を防ぐ
    }

    console.log('Comiketter: CustomBookmarkManager initializing...');
    
    // 初期化時に既存のツイートを処理
    this.initializeExistingTweets();
    
    // 動的コンテンツの監視を開始
    this.startObserving();
    
    this.isInitialized = true;
    console.log('Comiketter: CustomBookmarkManager initialized');
  }

  /**
   * CSSスタイルを注入
   */
  private injectStyles(): void {
    if (document.getElementById('comiketter-bookmark-styles')) {
      return; // 既に注入済み
    }

    const style = document.createElement('style');
    style.id = 'comiketter-bookmark-styles';
    style.textContent = `
      .comiketter-bookmark-button {
        cursor: pointer;
        transition: opacity 0.2s ease;
        pointer-events: auto;
        position: relative;
        z-index: 1;
      }
      
      .comiketter-bookmark-button:hover {
        opacity: 0.8;
      }
      
      .comiketter-bookmark-button.loading {
        pointer-events: none;
        opacity: 0.6;
      }
      
      .comiketter-bookmark-button.success svg {
        color: #00ba7c !important;
      }
      
      .comiketter-bookmark-button.error svg {
        color: #f91880 !important;
      }

      .comiketter-bookmark-selector {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
      }

      .comiketter-bookmark-selector-header {
        padding: 16px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .comiketter-bookmark-selector-title {
        font-weight: bold;
        font-size: 16px;
      }

      .comiketter-bookmark-selector-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        color: #666;
      }

      .comiketter-bookmark-selector-content {
        padding: 16px;
      }

      .comiketter-bookmark-item {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .comiketter-bookmark-item:last-child {
        border-bottom: none;
      }

      .comiketter-bookmark-checkbox {
        margin-right: 12px;
      }

      .comiketter-bookmark-name {
        flex: 1;
        font-size: 14px;
      }

      .comiketter-bookmark-count {
        color: #666;
        font-size: 12px;
      }

      .comiketter-bookmark-actions {
        padding: 16px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .comiketter-bookmark-button-primary {
        background: #1da1f2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .comiketter-bookmark-button-secondary {
        background: none;
        border: 1px solid #ccc;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .comiketter-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 既存のツイートにブックマークボタンを追加
   */
  private initializeExistingTweets(): void {
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]',
      'article',
    ];

    let articles: NodeListOf<Element> | null = null;

    for (const selector of tweetSelectors) {
      articles = document.querySelectorAll(selector);
      if (articles.length > 0) {
        break;
      }
    }

    if (articles && articles.length > 0) {
      articles.forEach((article) => {
        if (this.shouldAddBookmarkButton(article as HTMLElement)) {
          this.addBookmarkButtonToTweet(article as HTMLElement);
        }
      });
    }
  }

  /**
   * MutationObserverを開始して動的コンテンツを監視
   */
  private startObserving(): void {
    const options: MutationObserverInit = {
      childList: true,
      subtree: true,
    };

    this.observer = new MutationObserver((mutations) => {
      const addedNodes: HTMLElement[] = [];
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            addedNodes.push(node);
          }
        });
      });

      if (addedNodes.length > 0) {
        this.processAddedNodes(addedNodes);
      }
    });

    // 監視対象を設定
    const observeTargets = [
      '[data-testid="primaryColumn"]',
      '[role="main"]',
      'main',
      'body',
    ];

    for (const selector of observeTargets) {
      const element = document.querySelector(selector);
      if (element) {
        this.observer.observe(element, options);
        break;
      }
    }
  }

  /**
   * 追加されたノードを処理
   */
  private processAddedNodes(nodes: HTMLElement[]): void {
    nodes.forEach(node => {
      if (this.processedElements.has(node)) {
        return;
      }

      const tweetSelectors = [
        'article[data-testid="tweet"]',
        'article[role="article"]',
        '[data-testid="tweet"]',
        'article',
      ];

      // 直接追加されたツイート
      for (const selector of tweetSelectors) {
        if (node.matches(selector)) {
          if (this.shouldAddBookmarkButton(node)) {
            this.addBookmarkButtonToTweet(node);
          }
          this.processedElements.add(node);
          return;
        }
      }

      // 子要素にツイートが含まれている場合
      for (const selector of tweetSelectors) {
        const tweets = node.querySelectorAll(selector);
        if (tweets.length > 0) {
          tweets.forEach((tweet) => {
            if (this.shouldAddBookmarkButton(tweet as HTMLElement)) {
              this.addBookmarkButtonToTweet(tweet as HTMLElement);
            }
          });
          break;
        }
      }

      this.processedElements.add(node);
    });
  }

  /**
   * ツイートにブックマークボタンを追加すべきか判定
   */
  private shouldAddBookmarkButton(article: HTMLElement): boolean {
    // 既にブックマークボタンが存在する場合は追加しない
    if (article.querySelector('.comiketter-bookmark-button')) {
      return false;
    }

    // 引用ツイート内の場合は除外
    const isInQuotedTweet = article.closest('[role="link"]') !== null;
    if (isInQuotedTweet) {
      return false;
    }

    return true;
  }

  /**
   * ツイートにブックマークボタンを追加
   */
  private addBookmarkButtonToTweet(article: HTMLElement): void {
    try {
      // アクションバーを取得
      const actionBar = this.getActionBar(article);
      if (!actionBar) {
        return;
      }

      // ブックマークボタンを作成
      const bookmarkButton = this.createBookmarkButton();
      
      // アクションバーに追加
      actionBar.appendChild(bookmarkButton);

      // クリックイベントを設定
      this.setupBookmarkClickHandler(bookmarkButton, article);
    } catch (error) {
      console.error('Comiketter: Failed to add bookmark button:', error);
    }
  }

  /**
   * アクションバー（いいね、RT等のボタン群）を取得
   */
  private getActionBar(article: HTMLElement): HTMLElement | null {
    const selectors = [
      '[role="group"][aria-label]',
      '[data-testid="tweet"] [role="group"][aria-label]',
      '.r-18u37iz[role="group"][id^="id__"]',
      '[data-testid="tweet"] [role="group"]',
    ];

    for (const selector of selectors) {
      const actionBar = article.querySelector(selector) as HTMLElement;
      if (actionBar) {
        return actionBar;
      }
    }

    return null;
  }

  /**
   * ブックマークボタンを作成
   */
  private createBookmarkButton(): HTMLElement {
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'comiketter-bookmark-button';
    buttonWrapper.setAttribute('data-testid', 'comiketter-bookmark-button');
    buttonWrapper.setAttribute('aria-label', 'Comiketter Bookmark');
    buttonWrapper.setAttribute('role', 'button');
    buttonWrapper.setAttribute('tabindex', '0');
    
    const innerDiv = document.createElement('div');
    innerDiv.setAttribute('aria-haspopup', 'true');
    innerDiv.setAttribute('role', 'button');
    innerDiv.setAttribute('data-focusable', 'true');
    innerDiv.style.cssText = 'display: flex; justify-content: center;';
    
    // ブックマークアイコン
    const icon = document.createElement('svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('class', 'r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi');
    icon.innerHTML = `
      <g>
        <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"/>
      </g>
    `;
    
    innerDiv.appendChild(icon);
    buttonWrapper.appendChild(innerDiv);
    
    return buttonWrapper;
  }

  /**
   * ブックマークボタンのクリックハンドラーを設定
   */
  private setupBookmarkClickHandler(button: HTMLElement, article: HTMLElement): void {
    button.addEventListener('click', (e: MouseEvent) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      
      this.handleBookmarkButtonClick(button, article);
    }, true);
  }

  /**
   * ブックマークボタンクリック時の処理
   */
  private async handleBookmarkButtonClick(button: HTMLElement, article: HTMLElement): Promise<void> {
    try {
      // ボタンをローディング状態に変更
      this.setButtonStatus(button, BookmarkButtonStatus.Loading);
      
      // ツイート情報を取得
      const tweetInfo = getTweetInfoFromArticle(article);
      if (!tweetInfo) {
        throw new Error('Failed to extract tweet info');
      }

      this.currentTweetInfo = tweetInfo;
      
      // ブックマーク選択UIを表示
      await this.showBookmarkSelector();
      
      // 成功状態に変更
      this.setButtonStatus(button, BookmarkButtonStatus.Success);
      
      // 3秒後に通常状態に戻す
      setTimeout(() => {
        this.setButtonStatus(button, BookmarkButtonStatus.Idle);
      }, 3000);
      
    } catch (error) {
      console.error('Comiketter: Bookmark button click failed:', error);
      this.setButtonStatus(button, BookmarkButtonStatus.Error);
      
      // 3秒後に通常状態に戻す
      setTimeout(() => {
        this.setButtonStatus(button, BookmarkButtonStatus.Idle);
      }, 3000);
    }
  }

  /**
   * ブックマーク選択UIを表示
   */
  private async showBookmarkSelector(): Promise<void> {
    try {
      // 既存のセレクターを削除
      this.hideBookmarkSelector();
      
      // オーバーレイを作成
      const overlay = document.createElement('div');
      overlay.className = 'comiketter-overlay';
      
      // セレクターを作成
      const selector = await this.createBookmarkSelector();
      
      // DOMに追加
      document.body.appendChild(overlay);
      document.body.appendChild(selector);
      
      this.bookmarkSelector = selector;
      
      // オーバーレイクリックで閉じる
      overlay.addEventListener('click', () => {
        this.hideBookmarkSelector();
      });
      
    } catch (error) {
      console.error('Comiketter: Failed to show bookmark selector:', error);
    }
  }

  /**
   * ブックマーク選択UIを非表示
   */
  private hideBookmarkSelector(): void {
    const overlay = document.querySelector('.comiketter-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    if (this.bookmarkSelector) {
      this.bookmarkSelector.remove();
      this.bookmarkSelector = null;
    }
  }

  /**
   * ブックマーク選択UIを作成
   */
  private async createBookmarkSelector(): Promise<HTMLElement> {
    const selector = document.createElement('div');
    selector.className = 'comiketter-bookmark-selector';
    
    // ブックマーク一覧を取得
    const bookmarks = await StorageManager.getCustomBookmarks();
    
    // ヘッダー
    const header = document.createElement('div');
    header.className = 'comiketter-bookmark-selector-header';
    header.innerHTML = `
      <div class="comiketter-bookmark-selector-title">ブックマークに追加</div>
      <button class="comiketter-bookmark-selector-close" onclick="this.closest('.comiketter-bookmark-selector').remove()">×</button>
    `;
    
    // コンテンツ
    const content = document.createElement('div');
    content.className = 'comiketter-bookmark-selector-content';
    
    if (bookmarks.length === 0) {
      content.innerHTML = '<p>ブックマークがありません。オプションページでブックマークを作成してください。</p>';
    } else {
      bookmarks.forEach(bookmark => {
        const item = document.createElement('div');
        item.className = 'comiketter-bookmark-item';
        item.innerHTML = `
          <input type="checkbox" class="comiketter-bookmark-checkbox" data-bookmark-id="${bookmark.id}">
          <div class="comiketter-bookmark-name">${bookmark.name}</div>
          <div class="comiketter-bookmark-count">${bookmark.tweetCount}件</div>
        `;
        content.appendChild(item);
      });
    }
    
    // アクション
    const actions = document.createElement('div');
    actions.className = 'comiketter-bookmark-actions';
    actions.innerHTML = `
      <button class="comiketter-bookmark-button-secondary" onclick="this.closest('.comiketter-bookmark-selector').remove()">キャンセル</button>
      <button class="comiketter-bookmark-button-primary" onclick="this.closest('.comiketter-bookmark-selector').dispatchEvent(new CustomEvent('save-bookmarks'))">保存</button>
    `;
    
    // 保存イベントリスナー
    selector.addEventListener('save-bookmarks', async () => {
      await this.saveSelectedBookmarks(selector);
      this.hideBookmarkSelector();
    });
    
    selector.appendChild(header);
    selector.appendChild(content);
    selector.appendChild(actions);
    
    return selector;
  }

  /**
   * 選択されたブックマークに保存
   */
  private async saveSelectedBookmarks(selector: HTMLElement): Promise<void> {
    if (!this.currentTweetInfo) {
      return;
    }

    const checkboxes = selector.querySelectorAll('.comiketter-bookmark-checkbox:checked');
    const selectedBookmarkIds = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).dataset.bookmarkId);

    if (selectedBookmarkIds.length === 0) {
      return;
    }

    try {
      // 各ブックマークにツイートを追加
      for (const bookmarkId of selectedBookmarkIds) {
        if (bookmarkId) {
          await this.addTweetToBookmark(bookmarkId, this.currentTweetInfo);
        }
      }
      
      console.log('Comiketter: Tweet added to bookmarks:', selectedBookmarkIds);
    } catch (error) {
      console.error('Comiketter: Failed to save to bookmarks:', error);
    }
  }

  /**
   * ブックマークにツイートを追加
   */
  private async addTweetToBookmark(bookmarkId: string, tweetInfo: Tweet): Promise<void> {
    try {
      const bookmarks = await StorageManager.getCustomBookmarks();
      const bookmarkIndex = bookmarks.findIndex(b => b.id === bookmarkId);
      
      if (bookmarkIndex === -1) {
        throw new Error(`Bookmark with id ${bookmarkId} not found`);
      }

      const bookmark = bookmarks[bookmarkIndex];
      
      // 既にツイートが含まれているかチェック
      if (bookmark.tweetIds.includes(tweetInfo.id)) {
        console.log('Comiketter: Tweet already in bookmark:', tweetInfo.id);
        return;
      }

      // ツイートを追加
      bookmark.tweetIds.push(tweetInfo.id);
      bookmark.tweetCount = bookmark.tweetIds.length;
      bookmark.updatedAt = new Date().toISOString();

      // ブックマークを更新
      await StorageManager.updateCustomBookmark(bookmarkId, {
        tweetIds: bookmark.tweetIds,
        tweetCount: bookmark.tweetCount,
        updatedAt: bookmark.updatedAt,
      });

      console.log('Comiketter: Tweet added to bookmark:', bookmark.name);
    } catch (error) {
      console.error('Comiketter: Failed to add tweet to bookmark:', error);
      throw error;
    }
  }

  /**
   * ボタンの状態を設定
   */
  private setButtonStatus(button: HTMLElement, status: BookmarkButtonStatus): void {
    // 既存の状態クラスを削除
    Object.values(BookmarkButtonStatus).forEach(statusClass => {
      button.classList.remove(statusClass);
    });
    
    // 新しい状態クラスを追加
    button.classList.add(status);
  }

  /**
   * 監視を停止
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.processedElements = new WeakSet<HTMLElement>();
    this.isInitialized = false;
    this.hideBookmarkSelector();
    console.log('Comiketter: CustomBookmarkManager destroyed');
  }
} 