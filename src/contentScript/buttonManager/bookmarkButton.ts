/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークボタン管理
 */

/// <reference lib="dom" />

import { BaseButton, ButtonConfig } from './baseButton';
import { BookmarkApiClient } from '../../utils/bookmarkApiClient';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import type { Tweet } from '../../types';

// ログ送信関数
const sendLog = (message: string, data?: any) => {
  const logMessage = `[Comiketter] ${message}`;
  
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

export enum BookmarkButtonStatus {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

/**
 * HTML要素から取得した統計情報の型定義
 */
export interface TweetStatsFromHTML {
  favoriteCount?: number;
  retweetCount?: number;
  replyCount?: number;
  profileImageUrl?: string;
}

export class BookmarkButton extends BaseButton {
  private bookmarkSelector: HTMLElement | null = null;
  private currentTweetInfo: Tweet | null = null;
  private currentButton: HTMLElement | null = null;
  private currentArticle: HTMLElement | null = null; // 現在のツイートのarticle要素
  private initialCheckedBookmarks: Set<string> = new Set(); // 初期チェック状態を保存

  constructor() {
    const config: ButtonConfig = {
      className: 'bookmark',
      testId: 'bookmark-button',
      ariaLabel: 'Comiketter Bookmark',
      iconSVG: '', // アイコンは動的に読み込むため空文字列
      position: 'right',
    };
    super(config);
    
    // テーマ変更を監視
    this.observeThemeChanges();
  }
  
  /**
   * テーマ変更を監視
   */
  private observeThemeChanges(): void {
    // MutationObserverでhtml要素の属性変更を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // テーマが変更された可能性があるため、UIを更新
          this.updateThemeIfNeeded();
        }
      });
    });
    
    // html要素の属性変更を監視開始
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
  
  /**
   * 必要に応じてテーマを更新
   */
  private updateThemeIfNeeded(): void {
    if (this.bookmarkSelector) {
      const currentTheme = this.bookmarkSelector.getAttribute('data-theme');
      const newTheme = this.detectTheme();
      
      if (currentTheme !== newTheme) {
        this.bookmarkSelector.setAttribute('data-theme', newTheme);
      }
    }
    
    // アイコンの色も更新
    if (this.currentIconElement) {
      const theme = this.detectTheme();
      const iconColor = this.getButtonColor(theme);
      this.currentIconElement.style.color = iconColor;
    }
  }


  /**
   * ブックマークボタンの状態を取得
   */
  private getBookmarkButtonStatus(button: HTMLElement): BookmarkButtonStatus {
    for (const status of Object.values(BookmarkButtonStatus)) {
      if (button.classList.contains(status)) {
        return status;
      }
    }
    return BookmarkButtonStatus.Idle;
  }

  /**
   * アイコンを更新
   */
  private async updateIcon(iconName: string, color?: string, button?: HTMLElement): Promise<void> {
    // ボタンが指定されていない場合は、保存されたボタンまたは現在のアイコン要素を使用
    const targetButton = button || this.currentButton;
    const iconElement = targetButton 
      ? (targetButton.querySelector('svg') as HTMLElement)
      : this.currentIconElement;
    
    if (!iconElement) {
      console.warn('Comiketter: iconElement is null, cannot update icon', {
        hasTargetButton: !!targetButton,
        hasCurrentIcon: !!this.currentIconElement
      });
      return;
    }
    
    try {
      // 既存のアイコンのサイズとクラスを取得
      const existingWidth = iconElement.getAttribute('width') || 
                            iconElement.style.width || 
                            '18.75';
      const existingHeight = iconElement.getAttribute('height') || 
                             iconElement.style.height || 
                             '18.75';
      const existingClass = iconElement.className;
      
      // テーマを検出して色を決定
      const theme = this.detectTheme();
      const iconColor = color || this.getButtonColor(theme);
      
      // アイコンファイルを読み込み
      const iconSVG = await this.loadIcon(iconName);
      
      // 新しいSVG要素を作成
      const newIcon = this.createElementFromHTML(iconSVG);
      
      // 既存のクラスとスタイルをコピー
      newIcon.setAttribute('class', existingClass);
      
      // アイコンサイズを保持
      newIcon.setAttribute('width', existingWidth);
      newIcon.setAttribute('height', existingHeight);
      newIcon.style.width = existingWidth.includes('px') ? existingWidth : `${existingWidth}px`;
      newIcon.style.height = existingHeight.includes('px') ? existingHeight : `${existingHeight}px`;
      
      // 色を設定
      newIcon.style.color = iconColor;
      
      // 既存のアイコンを置き換え
      iconElement.replaceWith(newIcon);
      
      // 現在のアイコン要素も更新（存在する場合）
      if (this.currentIconElement === iconElement) {
        this.currentIconElement = newIcon;
      }
    } catch (error) {
      console.error('Comiketter: Failed to update icon:', error);
      throw error;
    }
  }

  /**
   * ボタン固有のスタイルを取得
   */
  protected getStyles(): string {
    return `
      .comiketter-bookmark-button {
        cursor: pointer;
        transition: opacity 0.2s ease;
        pointer-events: auto;
        position: relative;
        z-index: 1;
      }
      
      /* ホバー時のアイコン色（TwitterMediaHarvestを参考） */
      .comiketter-bookmark-button.photoColor:hover:not(.loading):not(.success):not(.error) svg {
        color: rgb(255, 255, 255) !important;
      }
      
      .comiketter-bookmark-button.statusColor:hover:not(.loading):not(.success):not(.error) svg,
      .comiketter-bookmark-button.streamColor:hover:not(.loading):not(.success):not(.error) svg {
        color: rgb(241, 185, 26) !important;
      }
      
      /* フォールバック: モードクラスがない場合のデフォルト色 */
      .comiketter-bookmark-button:hover:not(.loading):not(.success):not(.error):not(.photoColor):not(.statusColor):not(.streamColor) svg {
        color: rgb(241, 185, 26) !important;
      }
      
      /* ホバー時の円形背景エフェクト（TwitterMediaHarvestを参考） */
      .comiketter-bookmark-button:hover .photoBG {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .comiketter-bookmark-button:hover .statusBG,
      .comiketter-bookmark-button:hover .streamBG {
        background: rgba(241, 185, 26, 0.1);
      }
      
      .comiketter-bookmark-button:hover:active .photoBG {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .comiketter-bookmark-button:hover:active .statusBG,
      .comiketter-bookmark-button:hover:active .streamBG {
        background: rgba(241, 185, 26, 0.2);
      }
      
      .comiketter-bookmark-button.loading {
        pointer-events: none;
      }
      
      .comiketter-bookmark-button.success svg {
        color: #00ba7c !important;
      }
      
      .comiketter-bookmark-button.error svg {
        color: #f91880 !important;
      }

      /* ブックマーク選択UI */
      .comiketter-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .comiketter-bookmark-selector {
        position: relative;
        background: white;
        border-radius: 16px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        width: 400px;
        max-height: 80vh;
        overflow: hidden;
        z-index: 10000;
      }

      .comiketter-bookmark-selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e1e8ed;
      }

      .comiketter-bookmark-selector-title {
        font-weight: bold;
        font-size: 18px;
      }

      .comiketter-bookmark-selector-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #657786;
      }

      .comiketter-bookmark-selector-content {
        max-height: 400px;
        overflow-y: auto;
        padding: 16px 20px;
      }

      .comiketter-bookmark-item {
        display: flex;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f7f9fa;
      }

      .comiketter-bookmark-checkbox {
        margin-right: 12px;
      }

      .comiketter-bookmark-name {
        flex: 1;
        font-weight: 500;
      }

      .comiketter-bookmark-count {
        color: #657786;
        font-size: 14px;
      }

      .comiketter-bookmark-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid #e1e8ed;
      }

      .comiketter-bookmark-button-primary,
      .comiketter-bookmark-button-secondary {
        padding: 8px 16px;
        border-radius: 20px;
        border: none;
        font-weight: 500;
        cursor: pointer;
      }

      .comiketter-bookmark-button-primary {
        background: #1da1f2;
        color: white;
      }

      .comiketter-bookmark-button-secondary {
        background: #f7f9fa;
        color: #14171a;
      }

      /* テーマ別スタイル */
      .comiketter-bookmark-selector[data-theme="light"] {
        background: rgb(255, 255, 255);
        color: rgb(15, 20, 25);
      }
      
      .comiketter-bookmark-selector[data-theme="light"] .comiketter-bookmark-selector-header {
        border-bottom-color: #e1e8ed;
      }
      
      .comiketter-bookmark-selector[data-theme="light"] .comiketter-bookmark-item {
        border-bottom-color: #f7f9fa;
      }
      
      .comiketter-bookmark-selector[data-theme="light"] .comiketter-bookmark-actions {
        border-top-color: #e1e8ed;
      }
      
      .comiketter-bookmark-selector[data-theme="light"] .comiketter-bookmark-button-secondary {
        background: #f7f9fa;
        color: rgb(15, 20, 25);
      }
      
      .comiketter-bookmark-selector[data-theme="dark"] {
        background: rgb(21, 32, 43);
        color: rgb(247, 249, 249);
        }
        
      .comiketter-bookmark-selector[data-theme="dark"] .comiketter-bookmark-selector-header {
          border-bottom-color: #38444d;
        }
        
      .comiketter-bookmark-selector[data-theme="dark"] .comiketter-bookmark-item {
          border-bottom-color: #38444d;
        }
        
      .comiketter-bookmark-selector[data-theme="dark"] .comiketter-bookmark-actions {
          border-top-color: #38444d;
        }
        
      .comiketter-bookmark-selector[data-theme="dark"] .comiketter-bookmark-button-secondary {
          background: #38444d;
        color: rgb(247, 249, 249);
      }
    `;
  }

  /**
   * HTML要素から統計情報を取得
   * @param article ツイートのarticle要素
   * @returns 統計情報（取得できなかった項目はundefined）
   */
  private extractStatsFromHTML(article: HTMLElement | null): TweetStatsFromHTML {
    const stats: TweetStatsFromHTML = {};
    
    if (!article) {
      console.warn('Comiketter: [HTML解析] article要素がnullのため、統計情報を取得できませんでした');
      return stats;
    }
    
    // いいね数を取得
    const likeElement = article.querySelector('[data-testid="like"], [data-testid="unlike"]') as HTMLElement | null;
    if (likeElement) {
      const count = this.extractCountFromElement(likeElement);
      if (count !== null) {
        stats.favoriteCount = count;
      } else {
        console.warn('Comiketter: [HTML解析] いいね数を取得できませんでした');
      }
    } else {
      console.warn('Comiketter: [HTML解析] data-testid="like"または"unlike"要素が見つかりませんでした');
    }
    
    // RT数を取得
    const retweetElement = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]') as HTMLElement | null;
    if (retweetElement) {
      const count = this.extractCountFromElement(retweetElement);
      if (count !== null) {
        stats.retweetCount = count;
      } else {
        console.warn('Comiketter: [HTML解析] RT数を取得できませんでした');
      }
    } else {
      console.warn('Comiketter: [HTML解析] data-testid="retweet"または"unretweet"要素が見つかりませんでした');
    }
    
    // リプライ数を取得
    const replyElement = article.querySelector('[data-testid="reply"]') as HTMLElement | null;
    if (replyElement) {
      const count = this.extractCountFromElement(replyElement);
      if (count !== null) {
        stats.replyCount = count;
      } else {
        console.warn('Comiketter: [HTML解析] リプライ数を取得できませんでした');
      }
    } else {
      console.warn('Comiketter: [HTML解析] data-testid="reply"要素が見つかりませんでした');
    }
    
    // アイコン画像URLを取得
    const avatarElement = article.querySelector('[data-testid="Tweet-User-Avatar"]');
    if (avatarElement) {
      const imgElement = avatarElement.querySelector('img[src]');
      if (imgElement && imgElement instanceof HTMLImageElement) {
        const src = imgElement.src;
        if (src) {
          stats.profileImageUrl = src;
        } else {
          console.warn('Comiketter: [HTML解析] アイコン画像のsrc属性が空でした');
        }
      } else {
        console.warn('Comiketter: [HTML解析] data-testid="Tweet-User-Avatar"要素内にimg要素が見つかりませんでした');
      }
    } else {
      console.warn('Comiketter: [HTML解析] data-testid="Tweet-User-Avatar"要素が見つかりませんでした');
    }
    
    return stats;
  }

  /**
   * 要素からカウント数を取得
   * data-testid="app-text-transition-container"を持つ要素を探し、
   * その子要素の子要素にspanで囲まれた数字のみの要素を取得
   * @param parentElement 親要素（data-testid="like"など）
   * @returns カウント数（取得できない場合はnull）
   */
  private extractCountFromElement(parentElement: HTMLElement): number | null {
    // data-testid="app-text-transition-container"を持つ要素を探す
    const transitionContainer = parentElement.querySelector('[data-testid="app-text-transition-container"]') as HTMLElement | null;
    if (!transitionContainer) {
      return null;
    }
    
    // 子要素の子要素にspanで囲まれた数字のみの要素を探す
    // 再帰的にspan要素を探す
    const findNumberSpan = (element: HTMLElement): string | null => {
      // 直接の子要素を確認
      for (const child of Array.from(element.children)) {
        const childElement = child as HTMLElement;
        // span要素を確認
        if (childElement.tagName === 'SPAN') {
          const text = childElement.textContent?.trim() || '';
          const sanitizedText = text.replace(/\s/g, '');
          // 数字のみか確認（カンマ、ドット、K/M/万などの単位を含む場合がある）
          if (sanitizedText && /^[\d,.KMkm万]+$/.test(sanitizedText)) {
            return sanitizedText;
          }
        }
        // 子要素の子要素も再帰的に確認
        const result = findNumberSpan(childElement);
        if (result) {
          return result;
        }
      }
      return null;
    };
    
    const numberText = findNumberSpan(transitionContainer);
    if (!numberText) {
      return null;
    }
    
    // 数字文字列を数値に変換
    // カンマを除去し、KやM、万などの単位を処理
    const cleanedText = numberText.replace(/,/g, '').trim();
    const normalizedText = cleanedText.replace(/\s/g, '');
    const lowerText = normalizedText.toLowerCase();

    if (normalizedText.endsWith('万')) {
      const num = parseFloat(normalizedText.slice(0, -1));
      return isNaN(num) ? null : Math.round(num * 10000);
    }
    if (lowerText.endsWith('k')) {
      const num = parseFloat(lowerText.slice(0, -1));
      return isNaN(num) ? null : Math.round(num * 1000);
    }
    if (lowerText.endsWith('m')) {
      const num = parseFloat(lowerText.slice(0, -1));
      return isNaN(num) ? null : Math.round(num * 1000000);
    }

    const num = parseFloat(normalizedText);
    return isNaN(num) ? null : Math.round(num);
  }

  /**
   * ブックマークボタンを作成
   */
  async createButton(tweetInfo: Tweet, article?: HTMLElement): Promise<HTMLElement> {
    // article要素が渡されていない場合は取得を試みる
    let finalArticle: HTMLElement | undefined = article;
    if (!finalArticle) {
      // ボタンのベースを作成（一時的にDOMに追加してarticle要素を取得）
      const tempButtonWrapper = this.createButtonWrapper();
      const tempButtonElement = document.createElement('div');
      const tempInnerWrapper = tempButtonWrapper.querySelector('.comiketter-bookmark-button > div');
      if (tempInnerWrapper) {
        tempInnerWrapper.appendChild(tempButtonElement);
      }
      
      // article要素を取得
      const tempArticle = this.getArticleElement(tempButtonElement);
      if (tempArticle) {
        finalArticle = tempArticle;
      }
      
      // 一時的な要素を削除
      if (tempButtonElement.parentElement) {
        tempButtonElement.parentElement.removeChild(tempButtonElement);
      }
    }
    
    // ボタンのベースを作成
    const buttonWrapper = this.createButtonWrapper();
    
    // サンプルボタン（リプライボタン）を取得（article要素から取得）
    // TwitterMediaHarvestと同様に、article要素内から取得
    const sampleButton = this.getSampleButton(finalArticle);
    if (!sampleButton) {
      throw new Error('Failed to get sample button');
    }

    // ボタン要素を作成
    const buttonElement = this.createButtonElement(sampleButton);
    
    // ボタン要素をラッパーに追加（先に追加してからアイコンを置き換える）
    const innerWrapper = buttonWrapper.querySelector('.comiketter-bookmark-button > div');
    if (innerWrapper) {
      innerWrapper.appendChild(buttonElement);
    }
    
    // console.log('Comiketter: CBボタン作成 - article要素の確認', {
    //   hasArticle: !!finalArticle,
    //   articleTagName: finalArticle?.tagName,
    //   articleClassLength: finalArticle?.classList.length,
    //   pathname: window.location.pathname,
    //   tempArticle: !!article,
    //   finalArticle: !!finalArticle
    // });
    
    const mode = finalArticle ? this.selectArticleMode(finalArticle) : 'stream';
    
    // console.log('Comiketter: CBボタン作成 - モード判定結果', {
    //   mode,
    //   hasArticle: !!finalArticle
    // });
    
    // ツイートがブックマークされているかチェック
    const bookmarkManager = BookmarkApiClient.getInstance();
    let isBookmarked = false;
    try {
      // 拡張機能コンテキストが有効かチェック
      if (chrome?.runtime?.id) {
        isBookmarked = await bookmarkManager.isTweetBookmarked(tweetInfo.id);
      } else {
        // コンテキストが無効な場合は、デフォルト値（false）を使用
        console.debug('Comiketter: Extension context invalidated, using default bookmark state');
      }
    } catch (error) {
      // Extension context invalidatedエラーの場合は、エラーログを抑制
      if (error instanceof Error && error.message === 'Extension context invalidated') {
        console.debug('Comiketter: Extension context invalidated, bookmark check skipped');
      } else {
        console.error('Comiketter: Failed to check if tweet is bookmarked:', error);
      }
    }
    
    // アイコン名と色を決定
    const iconName = isBookmarked ? 'bookmarked' : 'bookmarks';
    const iconColor = isBookmarked ? '#35a6f1' : undefined; // undefinedの場合はテーマに応じた色を使用
    
    // 既存のアイコンを取得して置き換える（TwitterMediaHarvestのswapIconと同様）
    const existingIcon = buttonElement.querySelector('svg') as HTMLElement;
    if (existingIcon) {
      // アイコンを作成（finalArticleを渡してモードに応じたサイズを設定）
      this.currentIconElement = await this.createIconElement(iconName, sampleButton, finalArticle || undefined);
      // 色を設定（ブックマークされている場合）
      if (iconColor) {
        this.currentIconElement.style.color = iconColor;
      }
      // 既存のアイコンを置き換え（これにより、アイコンの位置とpreviousElementSiblingが保持される）
      existingIcon.replaceWith(this.currentIconElement);
    } else {
      // 既存のアイコンがない場合は追加
      this.currentIconElement = await this.createIconElement(iconName, sampleButton, finalArticle || undefined);
      // 色を設定（ブックマークされている場合）
      if (iconColor) {
        this.currentIconElement.style.color = iconColor;
      }
      buttonElement.appendChild(this.currentIconElement);
    }
    this.addBackgroundClassToIconSibling(this.currentIconElement, mode);
    
    // モードに応じた色クラスを追加（TwitterMediaHarvestを参考）
    if (mode === 'photo') {
      buttonWrapper.classList.add('photoColor');
    } else if (mode === 'status') {
      buttonWrapper.classList.add('statusColor');
    } else {
      buttonWrapper.classList.add('streamColor');
    }
    
    // クリックイベントを設定
    this.setupBookmarkClickHandler(buttonWrapper, tweetInfo);
    
    return buttonWrapper;
  }

  /**
   * ブックマークボタンのクリックハンドラーを設定
   */
  private setupBookmarkClickHandler(button: HTMLElement, tweetInfo: Tweet): void {
    button.addEventListener('click', (e: MouseEvent) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      
      this.handleBookmarkButtonClick(button, tweetInfo);
    }, true);
  }

  /**
   * ブックマークボタンクリック時の処理
   */
  private async handleBookmarkButtonClick(button: HTMLElement, tweetInfo: Tweet): Promise<void> {
    try {
      // ボタンをローディング状態に変更
      this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Loading);
      
      // 現在のボタンとツイート情報を保存
      this.currentButton = button;
      this.currentTweetInfo = tweetInfo;
      
      // article要素を取得して保存
      this.currentArticle = this.getArticleElement(button);
      
      // BookmarkApiClientを初期化
      const bookmarkManager = BookmarkApiClient.getInstance();
      
      // テーマ検出を実行
      sendLog('BookmarkSelector初期化開始');
      const theme = this.detectTheme();
      sendLog('テーマ更新:', theme);
      
      // ブックマーク選択UIを表示
      await this.showBookmarkSelector();
      
      // 成功状態に変更
      this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Success);
      
      // 3秒後に通常状態に戻す
      setTimeout(() => {
        this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Idle);
      }, 2000);
    } catch (error) {
      sendLog('ブックマークボタンクリック処理でエラー発生:', error);
      this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Error);
      
      // 3秒後に通常状態に戻す
      setTimeout(() => {
        this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Idle);
      }, 2000);
    }
  }

  /**
   * ブックマーク選択UIを表示
   */
  private async showBookmarkSelector(): Promise<void> {
    // 既存のUIを非表示
    this.hideBookmarkSelector();

    // オーバーレイを作成
    const overlay = document.createElement('div');
    overlay.className = 'comiketter-overlay';
    overlay.addEventListener('click', (e) => {
      // オーバーレイ自体がクリックされた場合のみ閉じる
      if (e.target === overlay) {
      this.hideBookmarkSelector();
      }
    });

    // セレクターを作成
    this.bookmarkSelector = await this.createBookmarkSelector();

    // セレクターをオーバーレイ内に追加
    overlay.appendChild(this.bookmarkSelector);

    // DOMに追加
    document.body.appendChild(overlay);
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
    
    // テーマを検出してdata-theme属性を設定
    const theme = this.detectTheme();
    selector.setAttribute('data-theme', theme);
    sendLog('ブックマーク選択UIにテーマ設定:', theme);
    
    // セレクター内のクリックイベントがオーバーレイに伝播しないようにする
    selector.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // ヘッダー
    const header = document.createElement('div');
    header.className = 'comiketter-bookmark-selector-header';
    
    const title = document.createElement('div');
    title.className = 'comiketter-bookmark-selector-title';
    title.textContent = 'ブックマークに追加';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'comiketter-bookmark-selector-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      this.hideBookmarkSelector();
    });
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // コンテンツ
    const content = document.createElement('div');
    content.className = 'comiketter-bookmark-selector-content';
    
    // ブックマーク一覧を表示
    await this.showBookmarkList(content);
    
    // アクション
    const actions = document.createElement('div');
    actions.className = 'comiketter-bookmark-actions';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'comiketter-bookmark-button-secondary';
    cancelButton.textContent = 'キャンセル';
    cancelButton.style.cssText = `
      background: #f7f9fa;
      color: #14171a;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid rgb(207, 217, 222);
      cursor: pointer;
      box-sizing: border-box;
    `;
    cancelButton.addEventListener('click', () => {
      this.hideBookmarkSelector();
    });
    
    const saveButton = document.createElement('button');
    saveButton.className = 'comiketter-bookmark-button-primary';
    saveButton.textContent = '保存';
    saveButton.addEventListener('click', () => {
      this.saveBookmarks();
    });
    
    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);
    
    selector.appendChild(header);
    selector.appendChild(content);
    selector.appendChild(actions);
    
    return selector;
  }

  /**
   * ブックマーク一覧を表示
   */
  private async showBookmarkList(content: HTMLElement): Promise<void> {
    // 既存のコンテンツをクリア
    content.innerHTML = '';
    
    // 初期チェック状態をリセット
    this.initialCheckedBookmarks.clear();
    
    // BookmarkApiClientからブックマーク一覧を取得
    const bookmarkManager = BookmarkApiClient.getInstance();
    const bookmarks = await bookmarkManager.getBookmarks();
    
    if (bookmarks.length === 0) {
      // ブックマークがない場合
      const noBookmarksText = document.createElement('p');
      noBookmarksText.textContent = 'ブックマークがありません。新しいブックマークを作成してください。';
      content.appendChild(noBookmarksText);
      
      // 新規作成ボタン
      const createButton = document.createElement('button');
      createButton.textContent = '新しいブックマークを作成';
      createButton.style.cssText = `
        background: #1da1f2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        margin-top: 12px;
      `;
      createButton.addEventListener('click', () => {
        this.showCreateBookmarkForm(content);
      });
      content.appendChild(createButton);
    } else {
      // ブックマーク一覧を表示
      const bookmarksList = document.createElement('div');
      
      // 現在のツイートIDを取得
      const currentTweetId = this.currentTweetInfo?.id;
      
      // 各ブックマークに対して、ツイートが既に登録されているかチェック
      for (const bookmark of bookmarks) {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'comiketter-bookmark-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'comiketter-bookmark-checkbox';
        checkbox.id = `bookmark-${bookmark.id}`;
        
        // 現在のツイートが既にこのブックマークに登録されているかチェック
        if (currentTweetId) {
          try {
            const isBookmarked = await bookmarkManager.isTweetBookmarked(currentTweetId, bookmark.id);
            if (isBookmarked) {
              checkbox.checked = true;
              // 初期チェック状態を保存
              this.initialCheckedBookmarks.add(bookmark.id);
            }
          } catch (error) {
            console.error('Comiketter: Failed to check if tweet is bookmarked:', error);
          }
        }
        
        const label = document.createElement('label');
        label.htmlFor = `bookmark-${bookmark.id}`;
        label.style.cssText = 'flex: 1; cursor: pointer;';
        
        const name = document.createElement('div');
        name.className = 'comiketter-bookmark-name';
        name.textContent = bookmark.name;
        
        const count = document.createElement('div');
        count.className = 'comiketter-bookmark-count';
        count.textContent = `更新: ${new Date(bookmark.updatedAt).toLocaleDateString('ja-JP')}`;
        
        label.appendChild(name);
        label.appendChild(count);
        
        bookmarkItem.appendChild(checkbox);
        bookmarkItem.appendChild(label);
        bookmarksList.appendChild(bookmarkItem);
      }
      
      content.appendChild(bookmarksList);
      
      // 新規作成ボタン
      const createButton = document.createElement('button');
      createButton.textContent = '＋ 新しいブックマークを作成';
      createButton.style.cssText = `
        background: none;
        border: 1px solid #1da1f2;
        color: #1da1f2;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        margin-top: 12px;
        font-size: 14px;
      `;
      createButton.addEventListener('click', () => {
        this.showCreateBookmarkForm(content);
      });
      content.appendChild(createButton);
    }
  }

  /**
   * 新規ブックマーク作成フォームを表示
   */
  private showCreateBookmarkForm(content: HTMLElement): void {
    // 既存のコンテンツをクリア
    content.innerHTML = '';
    
    // contentのパディングを考慮してフォームコンテナを作成
    // contentのパディングは左右20pxずつ（合計40px）
    // 最大横幅400pxにするため、フォームの幅 = 400px - 40px = 360px
    const formContainer = document.createElement('div');
    formContainer.style.cssText = `
      max-width: 400px;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
    `;
    
    // フォームを作成
    const form = document.createElement('div');
    form.style.cssText = `
      width: 100%;
      max-width: 360px;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
    `;
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'ブックマーク名 *';
    nameLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'ブックマーク名を入力';
    nameInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
      box-sizing: border-box;
    `;
    
    const descLabel = document.createElement('label');
    descLabel.textContent = '説明（任意）';
    descLabel.style.cssText = 'display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;';
    
    const descInput = document.createElement('textarea');
    descInput.placeholder = 'ブックマークの説明を入力';
    descInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      font-size: 14px;
      min-height: 80px;
      resize: vertical;
      margin-bottom: 16px;
      box-sizing: border-box;
    `;
    
    const createButton = document.createElement('button');
    createButton.textContent = '作成';
    createButton.style.cssText = `
      background: #1da1f2;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      margin-right: 8px;
      box-sizing: border-box;
    `;
    createButton.addEventListener('click', () => {
      this.createBookmark(nameInput.value, descInput.value);
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'キャンセル';
    cancelButton.style.cssText = `
      background: #f7f9fa;
      color: #14171a;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid rgb(207, 217, 222);
      cursor: pointer;
      box-sizing: border-box;
    `;
    cancelButton.addEventListener('click', async () => {
      await this.showBookmarkList(content);
    });
    
    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(descLabel);
    form.appendChild(descInput);
    form.appendChild(createButton);
    form.appendChild(cancelButton);
    
    formContainer.appendChild(form);
    content.appendChild(formContainer);
  }

  /**
   * 新規ブックマークを作成
   */
  private async createBookmark(name: string, description: string): Promise<void> {
    if (!name.trim()) {
      showErrorToast('ブックマーク名を入力してください');
      return;
    }
    
    try {
      const bookmarkManager = BookmarkApiClient.getInstance();
      const newBookmark = await bookmarkManager.createCb(name.trim(), description.trim());
      
      // ブックマーク一覧を再表示
      if (this.bookmarkSelector) {
        const content = this.bookmarkSelector.querySelector('.comiketter-bookmark-selector-content') as HTMLElement;
        if (content) {
          await this.showBookmarkList(content);
        }
      }
      
      console.log('Comiketter: Created new bookmark:', newBookmark);
      showSuccessToast('ブックマークを作成しました');
    } catch (error) {
      console.error('Comiketter: Failed to create bookmark:', error);
      showErrorToast('ブックマークの作成に失敗しました');
    }
  }

  /**
   * ブックマークを保存
   */
  private async saveBookmarks(): Promise<void> {
    if (!this.currentTweetInfo) {
      console.error('Comiketter: No tweet info available');
      return;
    }

    const bookmarkManager = BookmarkApiClient.getInstance();
    const currentSelectedBookmarks = new Set(this.getSelectedBookmarks());
    const initialSelectedBookmarks = this.initialCheckedBookmarks;
    
    // 初期状態と現在の状態を比較
    // チェックが外されたブックマーク（削除対象）
    const bookmarksToRemove = Array.from(initialSelectedBookmarks).filter(
      bookmarkId => !currentSelectedBookmarks.has(bookmarkId)
    );
    
    // チェックが入ったブックマーク（追加対象）
    const bookmarksToAdd = Array.from(currentSelectedBookmarks).filter(
      bookmarkId => !initialSelectedBookmarks.has(bookmarkId)
    );
    
    console.log('Comiketter: Bookmark changes detected', {
      toRemove: bookmarksToRemove,
      toAdd: bookmarksToAdd,
      initial: Array.from(initialSelectedBookmarks),
      current: Array.from(currentSelectedBookmarks)
    });
    
    let addSuccessCount = 0;
    let removeSuccessCount = 0;
    let hasError = false;
    let updateSuccessCount = 0;

    // チェックが外されたブックマークからツイートを削除
    for (const bookmarkId of bookmarksToRemove) {
      try {
        await bookmarkManager.removeTweetFromBookmark(bookmarkId, this.currentTweetInfo.id);
        removeSuccessCount++;
        console.log('Comiketter: Removed tweet from bookmark:', bookmarkId);
      } catch (error) {
        console.error('Comiketter: Failed to remove tweet from bookmark:', bookmarkId, error);
        hasError = true;
      }
    }

    // チェックが入ったブックマークにツイートを追加
    // HTMLから統計情報を取得（優先）
    const htmlStats = this.extractStatsFromHTML(this.currentArticle);
    
    // ツイート情報にHTMLから取得した統計情報をマージ
    // addTweetToBookmarkはany型を受け取るため、型アサーションを使用
    const tweetInfoWithStats: any = { ...this.currentTweetInfo };
    if (htmlStats.favoriteCount !== undefined && htmlStats.favoriteCount !== null && htmlStats.favoriteCount > 0) {
      tweetInfoWithStats.stats = {
        ...(tweetInfoWithStats.stats || {}),
        likeCount: htmlStats.favoriteCount,
      };
    }
    if (htmlStats.retweetCount !== undefined && htmlStats.retweetCount !== null && htmlStats.retweetCount > 0) {
      tweetInfoWithStats.stats = {
        ...(tweetInfoWithStats.stats || {}),
        retweetCount: htmlStats.retweetCount,
      };
    }
    if (htmlStats.replyCount !== undefined && htmlStats.replyCount !== null && htmlStats.replyCount > 0) {
      tweetInfoWithStats.stats = {
        ...(tweetInfoWithStats.stats || {}),
        replyCount: htmlStats.replyCount,
      };
    }
    if (htmlStats.profileImageUrl) {
      tweetInfoWithStats.author = {
        ...tweetInfoWithStats.author,
        profileImageUrl: htmlStats.profileImageUrl,
      };
    }
    
    for (const bookmarkId of bookmarksToAdd) {
      try {
        // HTMLから取得した統計情報を含むツイート情報を使用
        await bookmarkManager.addTweetToBookmark(bookmarkId, this.currentTweetInfo.id, tweetInfoWithStats);
        addSuccessCount++;
        console.log('Comiketter: Added tweet to bookmark:', bookmarkId);
      } catch (error) {
        console.error('Comiketter: Failed to add tweet to bookmark:', bookmarkId, error);
        hasError = true;
      }
    }
    
    // 既存のブックマーク済みツイートの情報を更新（変更がない場合でも更新）
    try {
      // HTMLから統計情報を取得（優先）
      const htmlStats = this.extractStatsFromHTML(this.currentArticle);
      
      // キャッシュから最新のツイート情報を取得（フォールバック用）
      const cachedTweet = await bookmarkManager.getCachedTweetById(this.currentTweetInfo.id);
      
      // 既存のブックマーク済みツイートを取得
      const existingBookmarkedTweets = await bookmarkManager.getBookmarkedTweetByTweetId(this.currentTweetInfo.id);
      
      // 各ブックマーク済みツイートの情報を更新
      for (const bookmarkedTweet of existingBookmarkedTweets) {
        const updates: Partial<typeof bookmarkedTweet> = {};
        
        // HTMLから取得した統計情報を優先し、取得できない場合はキャッシュから取得
        // Favorite数
        if (htmlStats.favoriteCount !== undefined && htmlStats.favoriteCount !== null && htmlStats.favoriteCount > 0) {
          updates.favoriteCount = htmlStats.favoriteCount;
        } else if (cachedTweet?.favorite_count !== undefined && cachedTweet.favorite_count !== null && cachedTweet.favorite_count > 0) {
          updates.favoriteCount = cachedTweet.favorite_count;
        }
        
        // RT数
        if (htmlStats.retweetCount !== undefined && htmlStats.retweetCount !== null && htmlStats.retweetCount > 0) {
          updates.retweetCount = htmlStats.retweetCount;
        } else if (cachedTweet?.retweet_count !== undefined && cachedTweet.retweet_count !== null && cachedTweet.retweet_count > 0) {
          updates.retweetCount = cachedTweet.retweet_count;
        }
        
        // リプライ数
        if (htmlStats.replyCount !== undefined && htmlStats.replyCount !== null && htmlStats.replyCount > 0) {
          updates.replyCount = htmlStats.replyCount;
        } else if (cachedTweet?.reply_count !== undefined && cachedTweet.reply_count !== null && cachedTweet.reply_count > 0) {
          updates.replyCount = cachedTweet.reply_count;
        }
        
        // プロフィール画像URL
        if (htmlStats.profileImageUrl) {
          updates.authorProfileImageUrl = htmlStats.profileImageUrl;
        } else if (cachedTweet?.user?.avatar_url) {
          updates.authorProfileImageUrl = cachedTweet.user.avatar_url;
        }
        
        // 更新する項目がある場合のみ更新
        if (Object.keys(updates).length > 0) {
          try {
            await bookmarkManager.updateBookmarkedTweet(bookmarkedTweet.id, updates);
            updateSuccessCount++;
            console.log('Comiketter: Updated bookmarked tweet:', bookmarkedTweet.id, updates);
          } catch (error) {
            console.error('Comiketter: Failed to update bookmarked tweet:', bookmarkedTweet.id, error);
            hasError = true;
          }
        }
      }
    } catch (error) {
      console.error('Comiketter: Failed to update bookmarked tweets:', error);
      hasError = true;
    }
    
    // 少なくとも1つのブックマークに追加できた場合、または削除が成功した場合はアイコンを更新
    const hasAnyBookmark = currentSelectedBookmarks.size > 0;
    if (hasAnyBookmark && this.currentButton) {
      try {
        // ブックマーク登録後のアイコン変更（bookmarked.svgに変更し、色を#35a6f1に設定）
        await this.updateIcon('bookmarked', '#35a6f1', this.currentButton);
      } catch (error) {
        console.error('Comiketter: Failed to update icon:', error);
      }
    } else if (!hasAnyBookmark && this.currentButton) {
      // すべてのブックマークから削除された場合は、元のアイコンに戻す
      try {
        const theme = this.detectTheme();
        const iconColor = this.getButtonColor(theme);
        await this.updateIcon('bookmarks', iconColor, this.currentButton);
      } catch (error) {
        console.error('Comiketter: Failed to update icon:', error);
      }
    }
    
    this.hideBookmarkSelector();
    
    // メッセージを表示
    const messages: string[] = [];
    if (removeSuccessCount > 0) {
      messages.push(`${removeSuccessCount}個のブックマークから削除`);
    }
    if (addSuccessCount > 0) {
      messages.push(`${addSuccessCount}個のブックマークに追加`);
    }
    if (updateSuccessCount > 0) {
      messages.push(`${updateSuccessCount}件の情報を更新`);
    }
    
    // 変更がない場合は、更新のみを行ったことを通知
    if (bookmarksToRemove.length === 0 && bookmarksToAdd.length === 0) {
      if (updateSuccessCount > 0) {
        showSuccessToast(`${updateSuccessCount}件の情報を更新しました`);
      } else {
        // 更新する情報がない場合は何も表示しない
        this.hideBookmarkSelector();
        return;
      }
    } else {
      // 変更がある場合の既存の処理
      if (hasError && removeSuccessCount === 0 && addSuccessCount === 0 && updateSuccessCount === 0) {
        showErrorToast('ブックマークの保存に失敗しました');
      } else if (hasError) {
        showErrorToast(`${messages.join('、')}しました（一部失敗しました）`);
      } else if (messages.length > 0) {
        showSuccessToast(`${messages.join('、')}しました`);
      }
    }
  }

  /**
   * 選択されたブックマークIDを取得
   */
  private getSelectedBookmarks(): string[] {
    const checkboxes = document.querySelectorAll('.comiketter-bookmark-checkbox:checked') as NodeListOf<HTMLInputElement>;
    return Array.from(checkboxes).map(checkbox => checkbox.id.replace('bookmark-', ''));
  }

  /**
   * ボタンの状態を設定（ブックマーク専用）
   */
  setBookmarkButtonStatus(button: HTMLElement, status: BookmarkButtonStatus): void {
    // 既存の状態クラスを削除
    Object.values(BookmarkButtonStatus).forEach(statusClass => {
      button.classList.remove(statusClass);
    });
    
    // 新しい状態クラスを追加
    button.classList.add(status);
  }
} 