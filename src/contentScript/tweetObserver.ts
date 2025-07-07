/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 一元的なツイート監視・ボタン管理システム
 */

import { getTweetInfoFromArticle } from './tweetInfoExtractor';
import { ButtonFactory } from './buttonManager';

const enum Query {
  Root = '#react-root',
  Stream = 'section[role="region"] > div[aria-label] > div',
  MediaBlock = 'section[role="region"] > div[aria-label] > div li',
  Modal = '[aria-labelledby="modal-header"] > div:first-child',
  ModalWrapper = '#layers',
  ModalThread = '[aria-labelledby="modal-header"] [aria-expanded="true"]',
  Timeline = '[data-testid="primaryColumn"] [aria-label]',
}

export class TweetObserver {
  private observer: MutationObserver | null = null;
  private buttonFactory: ButtonFactory;
  private rootObserver: MutationObserver | null = null;
  private isInitialized = false;
  private processedElements = new WeakSet<HTMLElement>();
  private processingTimeout: number | null = null;
  private pendingNodes: HTMLElement[] = [];

  constructor() {
    this.buttonFactory = new ButtonFactory();
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return; // 重複初期化を防ぐ
    }

    console.log('Comiketter: TweetObserver initializing...');
    
    // 初期化時に既存のツイートを処理
    this.initializeExistingTweets();
    
    // 動的コンテンツの監視を開始
    this.startObserving();
    
    this.isInitialized = true;
    console.log('Comiketter: TweetObserver initialized');
  }

  /**
   * 既存のツイートにボタンを追加
   */
  private initializeExistingTweets(): void {
    // 複数のセレクターを試行
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]',
      'article',
    ];

    let articles: NodeListOf<Element> | null = null;
    let usedSelector = '';

    for (const selector of tweetSelectors) {
      articles = document.querySelectorAll(selector);
      if (articles.length > 0) {
        usedSelector = selector;
        break;
      }
    }

    console.log('Comiketter: Found', articles?.length || 0, 'existing tweets using selector:', usedSelector);
    
    if (articles && articles.length > 0) {
      articles.forEach((article, index) => {
        console.log('Comiketter: Processing tweet', index + 1, 'of', articles!.length);
        if (this.shouldAddButtons(article as HTMLElement)) {
          console.log('Comiketter: Adding buttons to tweet', index + 1);
          this.addButtonsToTweet(article as HTMLElement);
        } else {
          console.log('Comiketter: Skipping tweet', index + 1, '- already has buttons');
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
      // パフォーマンス向上のため、バッチ処理
      const addedNodes: HTMLElement[] = [];
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            addedNodes.push(node);
          }
        });
      });

      if (addedNodes.length > 0) {
        // デバウンス処理でパフォーマンスを改善
        this.debouncedProcessNodes(addedNodes);
      }
    });

    // 複数の監視対象を試行
    const observeTargets = [
      { selector: '[data-testid="primaryColumn"]', name: 'primary column' },
      { selector: '[role="main"]', name: 'main role' },
      { selector: 'main', name: 'main element' },
      { selector: 'body', name: 'body' },
    ];

    let observed = false;
    for (const target of observeTargets) {
      const element = document.querySelector(target.selector);
      if (element) {
        console.log('Comiketter: Observing', target.name, 'with selector:', target.selector);
        this.observer.observe(element, options);
        observed = true;
        break;
      }
    }

    if (!observed) {
      console.warn('Comiketter: No suitable observation target found');
    }

    // モーダル（ツイート詳細）を監視
    const modalSelectors = [
      '#layers',
      '[data-testid="layers"]',
      '[role="dialog"]',
    ];

    for (const selector of modalSelectors) {
      const modalWrapper = document.querySelector(selector);
      if (modalWrapper) {
        console.log('Comiketter: Observing modal wrapper with selector:', selector);
        this.observer.observe(modalWrapper, options);
        break;
      }
    }
  }

  /**
   * デバウンス処理でノードを処理
   */
  private debouncedProcessNodes(nodes: HTMLElement[]): void {
    // 既存のタイムアウトをクリア
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }

    // 新しいノードを追加
    this.pendingNodes.push(...nodes);

    // 100ms後にバッチ処理を実行
    this.processingTimeout = window.setTimeout(() => {
      this.processBatchNodes();
    }, 100);
  }

  /**
   * バッチでノードを処理
   */
  private processBatchNodes(): void {
    if (this.pendingNodes.length === 0) return;

    console.log('Comiketter: Processing batch of', this.pendingNodes.length, 'nodes');

    // 各ノードを処理
    this.pendingNodes.forEach(node => {
      this.processAddedNode(node);
    });

    // 処理済みノードをクリア
    this.pendingNodes = [];
    this.processingTimeout = null;
  }

  /**
   * 追加されたノードを処理
   */
  private processAddedNode(node: HTMLElement): void {
    // 既に処理済みの場合はスキップ
    if (this.processedElements.has(node)) {
      return;
    }

    // 複数のツイートセレクターを試行
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]',
      'article',
    ];

    // 直接追加されたツイート
    for (const selector of tweetSelectors) {
      if (node.matches(selector)) {
        console.log('Comiketter: Processing direct tweet node with selector:', selector);
        if (this.shouldAddButtons(node)) {
          console.log('Comiketter: Adding buttons to direct tweet');
          this.addButtonsToTweet(node);
        }
        this.processedElements.add(node);
        return;
      }
    }

    // 子要素にツイートが含まれている場合
    for (const selector of tweetSelectors) {
      const tweets = node.querySelectorAll(selector);
      if (tweets.length > 0) {
        console.log('Comiketter: Found', tweets.length, 'tweets in node with selector:', selector);
        tweets.forEach((tweet, index) => {
          if (this.shouldAddButtons(tweet as HTMLElement)) {
            console.log('Comiketter: Adding buttons to tweet', index + 1);
            this.addButtonsToTweet(tweet as HTMLElement);
          }
        });
        break;
      }
    }

    this.processedElements.add(node);
  }

  /**
   * ツイートにボタンを追加すべきか判定
   */
  private shouldAddButtons(article: HTMLElement): boolean {
    return this.buttonFactory.shouldAddButtons(article);
  }

  /**
   * ツイートにボタンを追加
   */
  private addButtonsToTweet(article: HTMLElement): void {
    try {
      console.log('Comiketter: Starting to add buttons to tweet');
      
      // ツイート情報を取得
      const tweetInfo = getTweetInfoFromArticle(article);
      if (!tweetInfo) {
        console.warn('Comiketter: Failed to extract tweet info');
        return;
      }
      console.log('Comiketter: Extracted tweet info:', tweetInfo);

      // アクションバー（いいね、RT等のボタン群）を取得
      const actionBar = this.getActionBar(article);
      if (!actionBar) {
        console.warn('Comiketter: Failed to find action bar');
        return;
      }
      console.log('Comiketter: Found action bar:', actionBar);

      // ボタンを作成
      const buttons = this.buttonFactory.createButtonsForTweet(tweetInfo);
      console.log('Comiketter: Created buttons:', buttons.length);

      // アクションバーに挿入（順序を制御）
      this.buttonFactory.insertButtonsToActionBar(actionBar, buttons);
      console.log('Comiketter: Successfully added buttons to action bar');

      console.log('Comiketter: Buttons added to tweet:', tweetInfo.id);
    } catch (error) {
      console.error('Comiketter: Failed to add buttons:', error);
    }
  }

  /**
   * アクションバー（いいね、RT等のボタン群）を取得
   */
  private getActionBar(article: HTMLElement): HTMLElement | null {
    console.log('Comiketter: Searching for action bar in article');
    
    // 最も確実なセレクターから試行
    const selectors = [
      '[role="group"][aria-label]',
      '[data-testid="tweet"] [role="group"][aria-label]',
      '.r-18u37iz[role="group"][id^="id__"]',
      '[data-testid="tweet"] [role="group"]',
    ];

    for (const selector of selectors) {
      console.log('Comiketter: Trying selector:', selector);
      const actionBar = article.querySelector(selector) as HTMLElement;
      if (actionBar) {
        console.log('Comiketter: Found action bar with selector:', selector);
        return actionBar;
      }
    }

    console.warn('Comiketter: No action bar found with any selector');
    return null;
  }

  /**
   * 監視を停止
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.rootObserver) {
      this.rootObserver.disconnect();
      this.rootObserver = null;
    }
    this.processedElements = new WeakSet<HTMLElement>();
    this.isInitialized = false;
    console.log('Comiketter: TweetObserver destroyed');
  }
} 