/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Comiketter: 一元的なツイート監視・ボタン管理システム
 * X Score - Tweet Engagement Analyzer の監視・ボタン追加方式を採用
 * （document.body の MutationObserver + 全ツイート走査 + スクロールデバウンス + DOM 再利用対応）
 */

import { getTweetInfoFromArticle } from './tweetInfoExtractor';
import { ButtonFactory } from './buttonManager';

/** 処理済みツイート要素の識別用 data 属性名（dataset では comiketterTweetId） */
const TWEET_ID_ATTR = 'comiketterTweetId';

// ログ送信関数
const sendLog = (message: string, data?: unknown) => {
  const logMessage = `[Comiketter] ${message}`;
  console.log(logMessage, data);

  try {
    chrome.runtime.sendMessage({
      type: 'LOG',
      message: logMessage,
      data: data,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } catch {
    // chrome.runtime が利用できない場合は無視
  }
};

/**
 * ツイート要素からツイート ID を取得（X Score と同様の方式）
 */
function getTweetIdFromElement(element: HTMLElement): string {
  const statusLink = element.querySelector('a[href*="/status/"]');
  const href = statusLink?.getAttribute('href') ?? '';
  const match = href.match(/\/status\/(\d+)/);
  return match ? match[1] : '';
}

export class TweetObserver {
  private observer: MutationObserver | null = null;
  private buttonFactory: ButtonFactory;
  private isInitialized = false;
  private processedTweets = new WeakSet<HTMLElement>();
  private scrollTimeout: number | null = null;
  private scrollListener: (() => void) | null = null;

  constructor() {
    this.buttonFactory = new ButtonFactory();
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 既存のツイートを処理
    this.processAllTweets();

    // document.body を監視（X Score 方式）
    this.startObserving();

    // 仮想スクロール対策: スクロールで全ツイートを再走査（X Score 方式）
    this.attachScrollListener();

    this.isInitialized = true;
  }

  /**
   * 全ツイートを走査してボタンを追加（X Score の processAllTweets に相当）
   */
  private processAllTweets(): void {
    const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
    tweetElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        this.processTweet(el);
      }
    });
  }

  /**
   * 1 件のツイートを処理（X Score の processTweet に相当）
   * DOM 再利用時は既存ボタンを削除してから再処理する
   */
  private processTweet(tweetElement: HTMLElement): void {
    const tweetId = getTweetIdFromElement(tweetElement);
    const previousId = tweetElement.dataset[TWEET_ID_ATTR] ?? '';

    // DOM 再利用: 同じ要素が別ツイートに使われた場合は既存ボタンを削除して再処理対象に戻す
    if (previousId && (tweetId === '' || previousId !== tweetId)) {
      this.removeComiketterButtons(tweetElement);
      this.processedTweets.delete(tweetElement);
    }

    if (this.processedTweets.has(tweetElement)) {
      return;
    }

    this.processedTweets.add(tweetElement);
    tweetElement.dataset[TWEET_ID_ATTR] = tweetId;

    // ツイート ID が取れない要素はスキップ
    if (!tweetId) {
      return;
    }

    if (!this.shouldAddButtons(tweetElement)) {
      return;
    }

    this.addButtonsToTweet(tweetElement).catch((error) => {
      console.error('Comiketter: Failed to add buttons to tweet:', error);
    });
  }

  /**
   * Comiketter が追加したボタン要素を削除（DOM 再利用時用）
   */
  private removeComiketterButtons(article: HTMLElement): void {
    const bookmarkBtn = article.querySelector('.comiketter-bookmark-button');
    const downloadBtn = article.querySelector('.comiketter-download-button');
    bookmarkBtn?.remove();
    downloadBtn?.remove();
  }

  /**
   * document.body を MutationObserver で監視（X Score 方式）
   */
  private startObserving(): void {
    const options: MutationObserverInit = {
      childList: true,
      subtree: true,
    };

    this.observer = new MutationObserver((mutations) => {
      const hasAddedNodes = mutations.some((m) => m.addedNodes.length > 0);
      if (hasAddedNodes) {
        requestAnimationFrame(() => {
          this.processAllTweets();
        });
      }
    });

    const body = document.body;
    if (body) {
      this.observer.observe(body, options);
    }
  }

  /**
   * スクロール時にデバウンスで全ツイート再走査（X Score 方式・仮想スクロール対策）
   */
  private attachScrollListener(): void {
    this.scrollListener = () => {
      if (this.scrollTimeout !== null) {
        clearTimeout(this.scrollTimeout);
      }
      this.scrollTimeout = window.setTimeout(() => {
        this.processAllTweets();
        this.scrollTimeout = null;
      }, 200);
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  private removeScrollListener(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
    if (this.scrollTimeout !== null) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
  }

  /**
   * ボタンを追加すべきかどうかを判定
   */
  private shouldAddButtons(article: HTMLElement): boolean {
    const hasBookmarkButton = !!article.querySelector('.comiketter-bookmark-button');
    const hasDownloadButton = !!article.querySelector('.comiketter-download-button');
    if (hasBookmarkButton || hasDownloadButton) {
      return false;
    }
    return true;
  }

  /**
   * ツイートにボタンを追加
   */
  private async addButtonsToTweet(article: HTMLElement): Promise<void> {
    try {
      if (!this.shouldAddButtons(article)) {
        return;
      }

      const tweetInfo = getTweetInfoFromArticle(article);
      if (!tweetInfo) {
        return;
      }

      const actionBar = this.getActionBar(article);
      if (!actionBar) {
        return;
      }

      const buttons = await this.buttonFactory.createButtonsForTweet(tweetInfo, article);

      if (!this.shouldAddButtons(article)) {
        return;
      }

      this.buttonFactory.insertButtonsToActionBar(actionBar, buttons);
    } catch (error) {
      console.error('Comiketter: Failed to add buttons:', error);
      sendLog('Failed to add buttons:', error);
    }
  }

  /**
   * アクションバーを取得（Comiketter の既存セレクタを維持）
   */
  private getActionBar(article: HTMLElement): HTMLElement | null {
    const selectors = [
      '[role="group"]:has([data-testid="like"], [data-testid="retweet"], [data-testid="reply"])',
      '[role="group"]',
      '[data-testid="tweet"] [role="group"]',
      'div[role="group"]',
    ];

    for (const selector of selectors) {
      const actionBar = article.querySelector(selector);
      if (actionBar instanceof HTMLElement) {
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
    this.removeScrollListener();
    this.processedTweets = new WeakSet();
    this.isInitialized = false;
  }
}
