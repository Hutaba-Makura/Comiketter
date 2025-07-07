/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest observer.ts and TwitterMediaObserver.ts
 */

import { DownloadButton } from './downloadButton';
import { getTweetInfoFromArticle } from './tweetInfoExtractor';

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
  private downloadButton: DownloadButton;
  private rootObserver: MutationObserver | null = null;
  private isInitialized = false;
  private processedElements = new WeakSet<HTMLElement>();
  private processingTimeout: number | null = null;
  private pendingNodes: HTMLElement[] = [];

  constructor() {
    this.downloadButton = new DownloadButton();
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
   * 既存のツイートにDLボタンを追加
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
    
    // DOM構造の調査
    this.investigateDOMStructure();
    
    if (articles && articles.length > 0) {
      articles.forEach((article, index) => {
        console.log('Comiketter: Processing tweet', index + 1, 'of', articles!.length);
        if (this.shouldAddDownloadButton(article as HTMLElement)) {
          console.log('Comiketter: Adding download button to tweet', index + 1);
          this.addDownloadButtonToTweet(article as HTMLElement);
        } else {
          console.log('Comiketter: Skipping tweet', index + 1, '- no media or already has button');
        }
      });
    }
  }

  /**
   * DOM構造を調査してデバッグ情報を出力
   */
  private investigateDOMStructure(): void {
    console.log('Comiketter: Investigating DOM structure...');
    
    // メインコンテンツエリアの調査
    const mainSelectors = [
      '[data-testid="primaryColumn"]',
      '[role="main"]',
      'main',
      '[data-testid="main"]',
    ];

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Comiketter: Found main content with selector:', selector, element);
        break;
      }
    }

    // ツイート関連の要素を調査
    const tweetRelatedSelectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]',
      'article',
      '[role="article"]',
    ];

    for (const selector of tweetRelatedSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log('Comiketter: Found', elements.length, 'elements with selector:', selector);
        if (elements.length <= 5) {
          elements.forEach((el, index) => {
            console.log('Comiketter: Element', index + 1, ':', el.tagName, el.className, el.getAttribute('data-testid'));
          });
        }
        break;
      }
    }

    // アクションバーの調査
    const actionBarSelectors = [
      '[role="group"][aria-label]',
      '[role="group"]',
      '[data-testid="like"]',
      '[data-testid="reply"]',
      '[data-testid="retweet"]',
    ];

    for (const selector of actionBarSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log('Comiketter: Found', elements.length, 'action bar elements with selector:', selector);
        break;
      }
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
   * 重複ノードを除去
   */
  private deduplicateNodes(nodes: HTMLElement[]): HTMLElement[] {
    const uniqueNodes: HTMLElement[] = [];
    const seen = new Set<HTMLElement>();

    for (const node of nodes) {
      if (!seen.has(node)) {
        seen.add(node);
        uniqueNodes.push(node);
      }else{
        console.log('Comiketter: Skipping duplicate node:', node);
      }
    }

    return uniqueNodes;
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
        if (this.shouldAddDownloadButton(node)) {
          console.log('Comiketter: Adding download button to direct tweet');
          this.addDownloadButtonToTweet(node);
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
          if (this.shouldAddDownloadButton(tweet as HTMLElement)) {
            console.log('Comiketter: Adding download button to tweet', index + 1);
            this.addDownloadButtonToTweet(tweet as HTMLElement);
          }
        });
        break;
      }
    }

    this.processedElements.add(node);
  }

  /**
   * ツイートにDLボタンを追加すべきか判定
   */
  private shouldAddDownloadButton(article: HTMLElement): boolean {
    // 既にDLボタンが存在する場合は追加しない
    if (article.querySelector('.comiketter-download-button')) {
      console.log('Comiketter: Tweet already has download button');
      return false;
    }

    // メディア（画像・動画）が存在するかチェック
    const hasMedia = this.hasMedia(article);
    console.log('Comiketter: Tweet has media:', hasMedia);
    
    return hasMedia;
  }



  /**
   * ツイートからメディアURLを抽出
   */
  private extractMediaUrls(article: HTMLElement): string[] {
    const urls: string[] = [];

    // 画像URLの抽出
    const images = article.querySelectorAll('img[src*="twimg.com"]');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && (
        src.includes('pbs.twimg.com/media') ||
        src.includes('twimg.com/media') ||
        src.includes('twimg.com/ext_tw_video_thumb')
      )) {
        urls.push(src);
      }
    });

    // 動画URLの抽出
    const videos = article.querySelectorAll('video[src*="twimg.com"]');
    videos.forEach(video => {
      const src = video.getAttribute('src');
      if (src && (
        src.includes('video.twimg.com') ||
        src.includes('twimg.com/ext_tw_video')
      )) {
        urls.push(src);
      }
    });

    // 背景画像の抽出
    const elementsWithBg = article.querySelectorAll('[style*="background-image"]');
    elementsWithBg.forEach(element => {
      const style = element.getAttribute('style');
      if (style) {
        const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]*twimg\.com[^'"]*)['"]?\)/);
        if (bgMatch) {
          urls.push(bgMatch[1]);
        }
      }
    });

    return urls;
  }

  /**
   * ツイートにDLボタンを追加
   */
  private addDownloadButtonToTweet(article: HTMLElement): void {
    try {
      console.log('Comiketter: Starting to add download button to tweet');
      
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

      // DLボタンを作成して挿入
      const downloadButtonElement = this.downloadButton.createButton(tweetInfo);
      console.log('Comiketter: Created download button element:', downloadButtonElement);
      
      // 既存のボタンとの干渉を防ぐため、最後に挿入
      actionBar.appendChild(downloadButtonElement);
      console.log('Comiketter: Successfully added download button to action bar');

      console.log('Comiketter: Download button added to tweet:', tweetInfo.tweetId);
    } catch (error) {
      console.error('Comiketter: Failed to add download button:', error);
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
   * ツイートにメディアが含まれているかチェック（厳密版）
   */
  private hasMedia(article: HTMLElement): boolean {
    // 画像の存在チェック（複数のセレクターを試行）
    const imageSelectors = [
      '[data-testid="tweetPhoto"]',
      '[data-testid="tweetPhoto"] img',
      'img[src*="pbs.twimg.com/media"]',
      'img[src*="twimg.com/media"]',
      '[data-testid="tweet"] img[src*="twimg.com"]',
      'img[alt*="画像"]',
      'img[alt*="Image"]',
      '[role="img"]',
    ];

    let hasImage = false;
    let foundImageSelector = '';
    let imageElement: Element | null = null;

    for (const selector of imageSelectors) {
      imageElement = article.querySelector(selector);
      if (imageElement) {
        // 追加の検証：実際に画像URLが含まれているかチェック
        if (this.isValidImageElement(imageElement)) {
          hasImage = true;
          foundImageSelector = selector;
          break;
        }
      }
    }

    // 動画の存在チェック
    const videoSelectors = [
      '[data-testid="videoPlayer"]',
      '[data-testid="playButton"]',
      '[data-testid="videoComponent"]',
      'video',
      '[role="application"]',
    ];

    let hasVideo = false;
    let foundVideoSelector = '';
    let videoElement: Element | null = null;

    for (const selector of videoSelectors) {
      videoElement = article.querySelector(selector);
      if (videoElement) {
        // 追加の検証：実際に動画要素かチェック
        if (this.isValidVideoElement(videoElement)) {
          hasVideo = true;
          foundVideoSelector = selector;
          break;
        }
      }
    }

    // 引用ツイート内のメディアは除外
    const isInQuotedTweet = article.closest('[role="link"]') !== null;
    
    const result = (hasImage || hasVideo) && !isInQuotedTweet;
    
    // 詳細なデバッグ情報
    console.log('Comiketter: Media check details:', {
      hasImage,
      foundImageSelector,
      hasVideo,
      foundVideoSelector,
      isInQuotedTweet,
      result,
      articleClasses: article.className,
      articleTestId: article.getAttribute('data-testid'),
    });

    // 画像が見つかった場合、画像要素の詳細をログ出力
    if (hasImage && imageElement) {
      console.log('Comiketter: Found image element:', {
        tagName: imageElement.tagName,
        src: imageElement.getAttribute('src'),
        alt: imageElement.getAttribute('alt'),
        className: imageElement.className,
        testId: imageElement.getAttribute('data-testid'),
      });
    }

    // 動画が見つかった場合、動画要素の詳細をログ出力
    if (hasVideo && videoElement) {
      console.log('Comiketter: Found video element:', {
        tagName: videoElement.tagName,
        className: videoElement.className,
        testId: videoElement.getAttribute('data-testid'),
      });
    }
    
    return result;
  }

  /**
   * 有効な画像要素かどうかを検証
   */
  private isValidImageElement(element: Element): boolean {
    // imgタグの場合
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src');
      const alt = element.getAttribute('alt');
      
      // src属性が存在し、Twitterの画像URLパターンに一致するかチェック
      if (src && (
        src.includes('pbs.twimg.com/media') ||
        src.includes('twimg.com/media') ||
        src.includes('twimg.com/ext_tw_video_thumb')
      )) {
        return true;
      }
      
      // alt属性に画像関連のテキストが含まれているかチェック
      if (alt && (
        alt.includes('画像') ||
        alt.includes('Image') ||
        alt.includes('photo') ||
        alt.includes('media')
      )) {
        return true;
      }
    }
    
    // data-testid="tweetPhoto"の場合
    if (element.getAttribute('data-testid') === 'tweetPhoto') {
      // 子要素にimgタグがあるかチェック
      const imgChild = element.querySelector('img');
      if (imgChild) {
        return this.isValidImageElement(imgChild);
      }
      
      // 背景画像として設定されているかチェック
      const style = element.getAttribute('style');
      if (style && style.includes('background-image')) {
        return true;
      }
    }
    
    // role="img"の場合
    if (element.getAttribute('role') === 'img') {
      // aria-labelに画像関連のテキストが含まれているかチェック
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel && (
        ariaLabel.includes('画像') ||
        ariaLabel.includes('Image') ||
        ariaLabel.includes('photo') ||
        ariaLabel.includes('media')
      )) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 有効な動画要素かどうかを検証
   */
  private isValidVideoElement(element: Element): boolean {
    // videoタグの場合
    if (element.tagName === 'VIDEO') {
      const src = element.getAttribute('src');
      if (src && (
        src.includes('video.twimg.com') ||
        src.includes('twimg.com/ext_tw_video')
      )) {
        return true;
      }
    }
    
    // data-testid="videoPlayer"の場合
    if (element.getAttribute('data-testid') === 'videoPlayer') {
      // 子要素にvideoタグがあるかチェック
      const videoChild = element.querySelector('video');
      if (videoChild) {
        return this.isValidVideoElement(videoChild);
      }
      
      // プレイボタンがあるかチェック
      const playButton = element.querySelector('[data-testid="playButton"]');
      if (playButton) {
        return true;
      }
    }
    
    // data-testid="playButton"の場合
    if (element.getAttribute('data-testid') === 'playButton') {
      return true;
    }
    
    // role="application"の場合（動画プレイヤー）
    if (element.getAttribute('role') === 'application') {
      // aria-labelに動画関連のテキストが含まれているかチェック
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel && (
        ariaLabel.includes('動画') ||
        ariaLabel.includes('Video') ||
        ariaLabel.includes('play')
      )) {
        return true;
      }
    }
    
    return false;
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