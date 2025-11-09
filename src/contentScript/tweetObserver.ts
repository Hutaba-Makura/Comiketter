/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 一元的なツイート監視・ボタン管理システム
 */

import { getTweetInfoFromArticle } from './tweetInfoExtractor';
import { ButtonFactory } from './buttonManager';

// ログ送信関数
const sendLog = (message: string, data?: any) => {
  const logMessage = `[Comiketter] ${message}`;
  console.log(logMessage, data);
  
  // バックグラウンドスクリプトにログを送信
  try {
    chrome.runtime.sendMessage({
      type: 'LOG',
      message: logMessage,
      data: data,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // 送信に失敗しても無視（バックグラウンドが利用できない場合など）
    });
  } catch (error) {
    // chrome.runtimeが利用できない場合は無視
  }
};

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
  private lastPathname: string = window.location.pathname;

  constructor() {
    this.buttonFactory = new ButtonFactory();
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return; // 重複初期化を防ぐ
    }
    
    // 初期化時に既存のツイートを処理
    this.initializeExistingTweets();
    
    // 動的コンテンツの監視を開始
    this.startObserving();
    
    // ページ遷移を監視（TwitterMediaHarvestを参考）
    this.observePageNavigation();
    
    this.isInitialized = true;
  }

  /**
   * ページ遷移を監視（TwitterMediaHarvestのobserveHeadを参考）
   */
  private observePageNavigation(): void {
    // ページ遷移イベントをリッスン
    window.addEventListener('comiketter:page-navigation', () => {
      console.log('Comiketter: ページ遷移イベントを受信、ボタンを再作成');
      // 処理済み要素をクリア
      this.processedElements = new WeakSet<HTMLElement>();
      // 既存のツイートを再処理（遅延を長くしてDOMが完全に更新されるのを待つ）
      setTimeout(() => {
        this.initializeExistingTweets();
      }, 1000); // 1000ms後に再処理（DOMが完全に更新されるのを待つ）
    });

    // head要素の変更も監視（フォールバック）
    const headElement = document.querySelector('head');
    if (headElement) {
      const headObserver = new MutationObserver(() => {
        const currentPathname = window.location.pathname;
        if (currentPathname !== this.lastPathname) {
          console.log('Comiketter: head要素の変更でページ遷移を検知', {
            from: this.lastPathname,
            to: currentPathname
          });
          this.lastPathname = currentPathname;
          // 処理済み要素をクリア
          this.processedElements = new WeakSet<HTMLElement>();
          // 既存のツイートを再処理（遅延を長くしてDOMが完全に更新されるのを待つ）
          setTimeout(() => {
            this.initializeExistingTweets();
          }, 1000); // 1000ms後に再処理（DOMが完全に更新されるのを待つ）
        }
      });
      headObserver.observe(headElement, {
        childList: true,
        subtree: false,
      });
    }
  }

  /**
   * 既存のツイートにボタンを追加
   */
  private initializeExistingTweets(): void {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    
    if (articles && articles.length > 0) {
      articles.forEach((article) => {
        if (this.shouldAddButtons(article as HTMLElement)) {
          this.addButtonsToTweet(article as HTMLElement).catch(error => {
            console.error('Comiketter: Failed to add buttons to existing tweet:', error);
          });
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
        this.observer.observe(element, options);
        observed = true;
        break;
      }
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

    // 各ノードを処理
    this.pendingNodes.forEach(node => {
      this.processAddedNode(node);
    });

    // 処理済みノードをクリア
    this.pendingNodes = [];
  }

  /**
   * 追加されたノードを処理
   */
  private processAddedNode(node: HTMLElement): void {
    // 既に処理済みの場合はスキップ
    if (this.processedElements.has(node)) {
      return;
    }

    // ツイート要素のセレクター
    const tweetSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]',
    ];

    // 直接ツイート要素の場合
    for (const selector of tweetSelectors) {
      if (node.matches(selector)) {
        // 処理済みとしてマーク（判定前にマーク）
        this.processedElements.add(node);
        
        if (this.shouldAddButtons(node)) {
          this.addButtonsToTweet(node).catch(error => {
            console.error('Comiketter: Failed to add buttons to tweet:', error);
          });
        }
        return;
      }
    }

    // 子要素にツイートが含まれている場合
    for (const selector of tweetSelectors) {
      const tweets = node.querySelectorAll(selector);
      if (tweets.length > 0) {
        tweets.forEach((tweet) => {
          const tweetElement = tweet as HTMLElement;
          
          // 各ツイート要素を個別に処理済みとしてマーク
          if (!this.processedElements.has(tweetElement)) {
            this.processedElements.add(tweetElement);
            
            if (this.shouldAddButtons(tweetElement)) {
              this.addButtonsToTweet(tweetElement).catch(error => {
                console.error('Comiketter: Failed to add buttons to tweet:', error);
              });
            }
          }
        });
        return;
      }
    }
    
    // ツイート要素でない場合も処理済みとしてマーク
    this.processedElements.add(node);
  }

  /**
   * ボタンを追加すべきかどうかを判定
   */
  private shouldAddButtons(article: HTMLElement): boolean {
    // 既にボタンが追加されている場合はスキップ
    const hasBookmarkButton = !!article.querySelector('.comiketter-bookmark-button');
    const hasDownloadButton = !!article.querySelector('.comiketter-download-button');
    
    // どちらかのボタンが既に存在する場合は追加しない
    if (hasBookmarkButton || hasDownloadButton) {
      console.log('Comiketter: 既にボタンが存在するためスキップ', {
        hasBookmarkButton,
        hasDownloadButton,
        article: article.tagName,
        tweetId: article.getAttribute('data-testid')
      });
      return false;
    }
    
    return true;
  }

  /**
   * ツイートにボタンを追加
   */
  private async addButtonsToTweet(article: HTMLElement): Promise<void> {
    try {
      // 最終チェック：既にボタンが存在する場合は処理を中止
      if (!this.shouldAddButtons(article)) {
        console.log('Comiketter: 最終チェックでボタン追加を中止', {
          article: article.tagName,
          tweetId: article.getAttribute('data-testid')
        });
        return;
      }

      // ツイート情報を取得
      const tweetInfo = getTweetInfoFromArticle(article);
      if (!tweetInfo) {
        return;
      }

      // アクションバー（いいね、RT等のボタン群）を取得
      const actionBar = this.getActionBar(article);
      if (!actionBar) {
        return;
      }

      // ボタンを作成（article要素を渡す）
      const buttons = await this.buttonFactory.createButtonsForTweet(tweetInfo, article);

      // 最終チェック：ボタン作成後に再度チェック
      if (!this.shouldAddButtons(article)) {
        console.log('Comiketter: ボタン作成後の最終チェックで中止', {
          article: article.tagName,
          tweetId: article.getAttribute('data-testid')
        });
        return;
      }

      // アクションバーに挿入（順序を制御）
      this.buttonFactory.insertButtonsToActionBar(actionBar, buttons);
      
    } catch (error) {
      console.error('Comiketter: Failed to add buttons:', error);
      sendLog('Failed to add buttons:', error);
    }
  }

  /**
   * アクションバーを取得
   */
  private getActionBar(article: HTMLElement): HTMLElement | null {
    // 最も確実なセレクターから試行
    const selectors = [
      '[role="group"]:has([data-testid="like"], [data-testid="retweet"], [data-testid="reply"])',
      '[role="group"]',
      '[data-testid="tweet"] [role="group"]',
      'div[role="group"]',
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
   * クリーンアップ
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.processedElements = new WeakSet<HTMLElement>();
    this.isInitialized = false;
  }
} 