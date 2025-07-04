/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest observer.ts and TwitterMediaObserver.ts
 */

import { DownloadButton } from './downloadButton';
import { getTweetInfoFromArticle } from './tweetInfoExtractor';

export class TweetObserver {
  private observer: MutationObserver | null = null;
  private downloadButton: DownloadButton;

  constructor() {
    this.downloadButton = new DownloadButton();
  }

  async init(): Promise<void> {
    console.log('Comiketter: TweetObserver initializing...');
    
    // 初期化時に既存のツイートを処理
    this.initializeExistingTweets();
    
    // 動的コンテンツの監視を開始
    this.startObserving();
    
    console.log('Comiketter: TweetObserver initialized');
  }

  /**
   * 既存のツイートにDLボタンを追加
   */
  private initializeExistingTweets(): void {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    articles.forEach(article => {
      if (this.shouldAddDownloadButton(article as HTMLElement)) {
        this.addDownloadButtonToTweet(article as HTMLElement);
      }
    });
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
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            this.processAddedNode(node);
          }
        });
      });
    });

    // メインコンテンツエリアを監視
    const mainContent = document.querySelector('[data-testid="primaryColumn"]');
    if (mainContent) {
      this.observer.observe(mainContent, options);
    }

    // モーダル（ツイート詳細）を監視
    const modalWrapper = document.querySelector('#layers');
    if (modalWrapper) {
      this.observer.observe(modalWrapper, options);
    }
  }

  /**
   * 追加されたノードを処理
   */
  private processAddedNode(node: HTMLElement): void {
    // 直接追加されたツイート
    if (node.matches('article[data-testid="tweet"]')) {
      if (this.shouldAddDownloadButton(node)) {
        this.addDownloadButtonToTweet(node);
      }
      return;
    }

    // 子要素にツイートが含まれている場合
    const tweets = node.querySelectorAll('article[data-testid="tweet"]');
    tweets.forEach(tweet => {
      if (this.shouldAddDownloadButton(tweet as HTMLElement)) {
        this.addDownloadButtonToTweet(tweet as HTMLElement);
      }
    });
  }

  /**
   * ツイートにDLボタンを追加すべきか判定
   */
  private shouldAddDownloadButton(article: HTMLElement): boolean {
    // 既にDLボタンが存在する場合は追加しない
    if (article.querySelector('.comiketter-download-button')) {
      return false;
    }

    // メディア（画像・動画）が存在するかチェック
    return this.hasMedia(article);
  }

  /**
   * ツイートにメディアが含まれているかチェック
   */
  private hasMedia(article: HTMLElement): boolean {
    // 画像の存在チェック
    const hasImage = article.querySelector('[data-testid="tweetPhoto"]') !== null;
    
    // 動画の存在チェック
    const hasVideo = article.querySelector('[data-testid="videoPlayer"]') !== null ||
                    article.querySelector('[data-testid="playButton"]') !== null;
    
    // 引用ツイート内のメディアは除外
    const isInQuotedTweet = article.closest('[role="link"]') !== null;
    
    return (hasImage || hasVideo) && !isInQuotedTweet;
  }

  /**
   * ツイートにDLボタンを追加
   */
  private addDownloadButtonToTweet(article: HTMLElement): void {
    try {
      // ツイート情報を取得
      const tweetInfo = getTweetInfoFromArticle(article);
      if (!tweetInfo) {
        console.warn('Comiketter: Failed to extract tweet info');
        return;
      }

      // アクションバー（いいね、RT等のボタン群）を取得
      const actionBar = this.getActionBar(article);
      if (!actionBar) {
        console.warn('Comiketter: Failed to find action bar');
        return;
      }

      // DLボタンを作成して挿入
      const downloadButtonElement = this.downloadButton.createButton(tweetInfo);
      actionBar.appendChild(downloadButtonElement);

      console.log('Comiketter: Download button added to tweet:', tweetInfo.tweetId);
    } catch (error) {
      console.error('Comiketter: Failed to add download button:', error);
    }
  }

  /**
   * アクションバー（いいね、RT等のボタン群）を取得
   */
  private getActionBar(article: HTMLElement): HTMLElement | null {
    // 複数のセレクターを試行
    const selectors = [
      '[role="group"][aria-label]',
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
   * 監視を停止
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    console.log('Comiketter: TweetObserver destroyed');
  }
} 