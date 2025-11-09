/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 基本ボタンクラス
 */

import type { Tweet } from '../../types';

export enum ButtonStatus {
  Idle = 'idle',
  Loading = 'loading',
  Downloading = 'downloading',
  Success = 'success',
  Error = 'error',
  Downloaded = 'downloaded',
}

export interface ButtonConfig {
  className: string;
  testId: string;
  ariaLabel: string;
  iconSVG: string;
  position: 'left' | 'right';
}

export type Theme = 'light' | 'dark';
export type TweetMode = 'photo' | 'status' | 'stream';

export abstract class BaseButton {
  protected config: ButtonConfig;
  protected currentIconElement: HTMLElement | null = null;
  
  // サンプルボタンをキャッシュ（TwitterMediaHarvestを参考）
  private static cachedSampleButton: HTMLElement | null = null;
  private static headObserver: MutationObserver | null = null;
  private static isObserving = false;
  private static lastPathname: string = window.location.pathname;
  private static updateTimeout: number | null = null;

  constructor(config: ButtonConfig) {
    this.config = config;
    this.injectStyles();
    this.observePageNavigation();
  }

  /**
   * テーマを検出
   */
  protected detectTheme(): Theme {
    // html要素のcolor-schemeスタイルから判定
    const htmlElement = document.documentElement;
    const computedStyle = getComputedStyle(htmlElement as Element);
    const colorScheme = computedStyle.getPropertyValue('color-scheme').trim();
    
    if (colorScheme === 'dark') {
      return 'dark';
    } else {
      return 'light';
    }
  }

  /**
   * テーマに応じたボタン色を取得
   */
  protected getButtonColor(theme: Theme): string {
    return theme === 'dark' ? '#72777c' : '#536471';
  }

  /**
   * アイコンファイルを読み込み
   */
  protected async loadIcon(iconName: string): Promise<string> {
    try {
      const response = await fetch(chrome.runtime.getURL(`icons/${iconName}.svg`));
      if (!response.ok) {
        throw new Error(`Failed to load icon: ${iconName}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Comiketter: Failed to load icon ${iconName}:`, error);
      // フォールバック用のデフォルトアイコン
      return this.getDefaultIcon(iconName);
    }
  }

  /**
   * デフォルトアイコンを取得
   */
  protected getDefaultIcon(iconName: string): string {
    const defaultIcons: Record<string, string> = {
      'download': `<svg xmlns="http://www.w3.org/2000/svg" width="18.75" height="18.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>`,
      'bookmarks': `<svg xmlns="http://www.w3.org/2000/svg" width="18.75" height="18.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10v11l-5 -3l-5 3v-11a3 3 0 0 1 3 -3h4a3 3 0 0 1 3 3z" /><path d="M11 3h5a3 3 0 0 1 3 3v11" /></svg>`,
      'bookmarked': `<svg xmlns="http://www.w3.org/2000/svg" width="18.75" height="18.75" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6a4 4 0 0 1 4 4v11a1 1 0 0 1 -1.514 .857l-4.486 -2.691l-4.486 2.691a1 1 0 0 1 -1.508 -.743l-.006 -.114v-11a4 4 0 0 1 4 -4h4z" /><path d="M16 2a4 4 0 0 1 4 4v11a1 1 0 0 1 -2 0v-11a2 2 0 0 0 -2 -2h-5a1 1 0 0 1 0 -2h5z" /></svg>`,
    };
    
    return defaultIcons[iconName] || defaultIcons['download'];
  }

  /**
   * CSSスタイルを注入
   */
  protected injectStyles(): void {
    if (document.getElementById(`comiketter-${this.config.className}-styles`)) {
      return; // 既に注入済み
    }

    const style = document.createElement('style');
    style.id = `comiketter-${this.config.className}-styles`;
    style.textContent = this.getStyles();
    
    document.head.appendChild(style);
  }

  /**
   * ボタン固有のスタイルを取得
   */
  protected abstract getStyles(): string;

  /**
   * ボタンを作成
   */
  abstract createButton(tweetInfo: Tweet, article?: HTMLElement): Promise<HTMLElement>;

  /**
   * ページ遷移を監視（TwitterMediaHarvestのobserveHeadを参考）
   */
  private observePageNavigation(): void {
    // 既に監視中の場合はスキップ
    if (BaseButton.isObserving) {
      return;
    }

    BaseButton.isObserving = true;

    const options: MutationObserverInit = {
      childList: true,
      subtree: false,
    };

    const titleMutationCallback: MutationCallback = () => {
      // URLが実際に変更された場合のみ更新（SPAのため）
      const currentPathname = window.location.pathname;
      if (currentPathname === BaseButton.lastPathname) {
        return; // URLが変わっていない場合はスキップ
      }
      
      console.log('Comiketter: ページ遷移を検知、サンプルボタンを再取得', {
        from: BaseButton.lastPathname,
        to: currentPathname
      });
      
      BaseButton.lastPathname = currentPathname;
      
      // キャッシュをクリア
      BaseButton.cachedSampleButton = null;
      
      // 既存の更新処理をキャンセル
      if (BaseButton.updateTimeout !== null) {
        clearTimeout(BaseButton.updateTimeout);
      }
      
      // ページ遷移イベントを発火（TweetObserverが検知してボタンを再作成）
      window.dispatchEvent(new CustomEvent('comiketter:page-navigation', {
        detail: { pathname: currentPathname }
      }));
      
      // 遅延して更新（ボタンが完全に作成された後に更新）
      // 注意: 更新処理はボタンを削除する可能性があるため、無効化
      // BaseButton.updateTimeout = window.setTimeout(() => {
      //   BaseButton.updateAllButtons();
      //   BaseButton.updateTimeout = null;
      // }, 1000); // 1000ms後に更新（ボタンが再作成されるのを待つ）
    };

    const headElement = document.querySelector('head');
    if (headElement) {
      BaseButton.headObserver = new MutationObserver(titleMutationCallback);
      BaseButton.headObserver.observe(headElement, options);
      console.log('Comiketter: ページ遷移監視を開始');
    }
  }

  /**
   * 全てのComiketterボタンの構造を更新（静的メソッド）
   * 注意: 現在は無効化されています。ボタンが削除される問題を回避するため
   */
  private static updateAllButtons(): void {
    // 更新処理は無効化（ボタンが削除される問題を回避）
    console.log('Comiketter: ボタン更新処理は無効化されています');
    return;
    
    // 以下のコードは将来の実装用に保持
    /*
    // 全てのComiketterボタンを取得（downloadとbookmarkの両方）
    const downloadButtons = document.querySelectorAll(
      '.comiketter-download-button'
    ) as NodeListOf<HTMLElement>;
    const bookmarkButtons = document.querySelectorAll(
      '.comiketter-bookmark-button'
    ) as NodeListOf<HTMLElement>;

    if (downloadButtons.length === 0 && bookmarkButtons.length === 0) {
      console.log('Comiketter: 更新するボタンがありません');
      return;
    }

    // 新しいサンプルボタンを取得
    const newSampleButton = BaseButton.getSampleButtonFromDOMStatic(null);
    if (!newSampleButton) {
      console.warn('Comiketter: 新しいサンプルボタンを取得できませんでした');
      return;
    }

    console.log('Comiketter: ボタンを更新します', {
      downloadButtons: downloadButtons.length,
      bookmarkButtons: bookmarkButtons.length
    });

    // 各ボタンを更新
    downloadButtons.forEach((buttonWrapper) => {
      // ボタンがまだDOMに存在することを確認
      if (buttonWrapper.isConnected) {
        BaseButton.updateButtonStructureStatic(buttonWrapper, newSampleButton);
      }
    });
    bookmarkButtons.forEach((buttonWrapper) => {
      // ボタンがまだDOMに存在することを確認
      if (buttonWrapper.isConnected) {
        BaseButton.updateButtonStructureStatic(buttonWrapper, newSampleButton);
      }
    });
    */
  }

  /**
   * ボタンの構造を更新（静的メソッド）
   * 注意: 現在はアイコンサイズのみ更新（ボタンが削除される問題を回避）
   */
  private static updateButtonStructureStatic(
    buttonWrapper: HTMLElement,
    newSampleButton: HTMLElement
  ): void {
    // ボタンがまだDOMに存在することを確認
    if (!buttonWrapper.isConnected) {
      console.warn('Comiketter: ボタンがDOMから削除されています', buttonWrapper);
      return;
    }

    // ボタン要素を取得
    const buttonElement = buttonWrapper.querySelector('div > div') as HTMLElement;
    if (!buttonElement) {
      console.warn('Comiketter: ボタン要素が見つかりません', buttonWrapper);
      return;
    }

    // 既存のアイコンを取得し、サイズのみ更新（構造は変更しない）
    const existingIcon = buttonElement.querySelector('svg') as HTMLElement;
    if (existingIcon) {
      // モードを判定してアイコンサイズを更新
      const article = buttonWrapper.closest('article[role="article"]') as HTMLElement ||
                      buttonWrapper.closest('[data-testid="tweet"]')?.closest('article[role="article"]') as HTMLElement ||
                      null;
      if (article) {
        // モードを判定
        let mode: TweetMode = 'stream';
        if (article instanceof HTMLDivElement) {
          mode = 'photo';
        } else {
          const articleClassLength = article.classList.length;
          const isMagicLength = articleClassLength === 3 || articleClassLength === 7 || articleClassLength === 6;
          const isInStatus = /\/.*\/status\/\d+/.test(window.location.pathname);
          if (isInStatus && isMagicLength) {
            mode = 'status';
          }
        }
        
        const iconSize = mode === 'status' ? '22.5' : '18.75';
        
        // アイコンサイズのみ更新（構造は変更しない）
        existingIcon.setAttribute('width', iconSize);
        existingIcon.setAttribute('height', iconSize);
        existingIcon.style.width = `${iconSize}px`;
        existingIcon.style.height = `${iconSize}px`;
        
        console.log('Comiketter: アイコンサイズを更新しました', {
          buttonWrapper,
          mode,
          iconSize
        });
      }
    }
  }

  /**
   * DOMからサンプルボタンを取得（キャッシュを使用しない、静的メソッド）
   * TwitterMediaHarvestのgetSampleButtonを参考に、article要素から取得
   */
  private static getSampleButtonFromDOMStatic(article: HTMLElement | null): HTMLElement | null {
    // article要素が指定されている場合は、そのarticle内から取得
    if (article) {
      const replyButton = article.querySelector('[data-testid="reply"] > div') as HTMLElement;
      if (replyButton) {
        // ボタンが実際に表示されているか確認
        const rect = replyButton.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return replyButton;
        }
      }
    }

    // フォールバック: グローバルに検索（articleが指定されていない場合）
    const tweetElement = document.querySelector('[data-testid="tweet"]') as HTMLElement;
    if (!tweetElement) {
      return null;
    }

    // ツイート要素内からリプライボタンを検索
    const replyButton = tweetElement.querySelector('[data-testid="reply"] > div') as HTMLElement;
    if (!replyButton) {
      return null;
    }

    // ボタンが実際に表示されているか確認
    const rect = replyButton.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return replyButton;
    }

    return null;
  }

  /**
   * サンプルボタン（リプライボタン）を取得
   * TwitterMediaHarvestのgetSampleButtonを参考に実装
   * article要素を引数として受け取り、そのarticle内から取得
   */
  protected getSampleButton(article: HTMLElement | null = null): HTMLElement | null {
    // article要素が指定されている場合は、そのarticle内から取得（キャッシュを使用しない）
    if (article) {
      const sampleButton = BaseButton.getSampleButtonFromDOMStatic(article);
      return sampleButton;
    }

    // article要素が指定されていない場合は、キャッシュを使用
    if (BaseButton.cachedSampleButton) {
      // キャッシュされたボタンがまだ有効か確認
      const rect = BaseButton.cachedSampleButton.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return BaseButton.cachedSampleButton;
      }
      // 無効な場合はキャッシュをクリア
      BaseButton.cachedSampleButton = null;
    }

    // DOMから取得
    const sampleButton = BaseButton.getSampleButtonFromDOMStatic(null);
    if (sampleButton) {
      // キャッシュに保存
      BaseButton.cachedSampleButton = sampleButton;
    }

    return sampleButton;
  }

  /**
   * DOMからサンプルボタンを取得（キャッシュを使用しない、インスタンスメソッド）
   */
  private getSampleButtonFromDOM(): HTMLElement | null {
    return BaseButton.getSampleButtonFromDOMStatic(null);
  }

  /**
   * ボタンラッパーを作成
   */
  protected createButtonWrapper(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `comiketter-${this.config.className}-button`;
    wrapper.setAttribute('data-testid', `comiketter-${this.config.testId}`);
    wrapper.setAttribute('aria-label', this.config.ariaLabel);
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', '0');
    // Replyから取得したサンプル要素の親要素（wrapper）にdisplay: flexとalign-items: centerを設定
    wrapper.style.cssText = 'display: flex; align-items: center;';
    
    const innerDiv = document.createElement('div');
    innerDiv.setAttribute('aria-haspopup', 'true');
    innerDiv.setAttribute('aria-label', this.config.ariaLabel);
    innerDiv.setAttribute('role', 'button');
    innerDiv.setAttribute('data-focusable', 'true');
    innerDiv.setAttribute('tabindex', '0');
    innerDiv.style.cssText = 'display: flex; justify-content: center;';
    
    wrapper.appendChild(innerDiv);
    return wrapper;
  }

  /**
   * ボタン要素を作成（TwitterMediaHarvestのbleachButtonを参考）
   */
  protected createButtonElement(sampleButton: HTMLElement): HTMLElement {
    // サンプルボタンをクローン（TwitterMediaHarvestのbleachButtonと同様）
    const button = sampleButton.cloneNode(true) as HTMLElement;
    
    // テキスト要素を削除（TwitterMediaHarvestのremoveButtonStatsTextと同様）
    const textContainer = button.querySelector('[data-testid="app-text-transition-container"] > span > span');
    if (textContainer) {
      textContainer.remove();
    }
    
    // アイコンは削除せず、後で置き換える（TwitterMediaHarvestのswapIconと同様）
    // これにより、アイコンの位置とpreviousElementSiblingが保持される
    
    return button;
  }

  /**
   * アイコン要素を作成
   */
  protected async createIconElement(iconName: string, sampleButton: HTMLElement, article?: HTMLElement): Promise<HTMLElement> {
    const theme = this.detectTheme();
    const iconColor = this.getButtonColor(theme);
    
    // モードを判定してアイコンサイズを決定
    let iconSize = '18.75'; // デフォルト（stream/photoモード）
    if (article) {
      const mode = this.selectArticleMode(article);
      if (mode === 'status') {
        iconSize = '22.5'; // statusモードは22.5
      }
    }
    
    console.log(`Comiketter: アイコン作成開始 - ${iconName} (テーマ: ${theme}, 色: ${iconColor}, サイズ: ${iconSize})`);
    
    // アイコンファイルを読み込み
    const iconSVG = await this.loadIcon(iconName);
    
    // SVG要素を作成
    const icon = this.createElementFromHTML(iconSVG);
    
    // サンプルボタンのアイコンからスタイルを取得
    const sampleIcon = sampleButton.querySelector('svg');
    if (sampleIcon) {
      icon.setAttribute('class', sampleIcon.className || 'r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi');
    }
    
    // アイコンサイズをモードに応じて設定
    icon.setAttribute('width', iconSize);
    icon.setAttribute('height', iconSize);
    icon.style.width = `${iconSize}px`;
    icon.style.height = `${iconSize}px`;

    // 色を設定
    icon.style.color = iconColor;
    
    console.log(`Comiketter: アイコン作成完了 - ${iconName}`);
    
    return icon;
  }

  /**
   * 現在のページがツイート詳細ページかどうかを判定（TwitterMediaHarvestのisInTweetStatusを参考）
   */
  protected isInTweetStatus(): boolean {
    const tweetStatusRegEx = /\/.*\/status\/\d+/;
    return Boolean(window.location.pathname.match(tweetStatusRegEx));
  }

  /**
   * ツイートが写真モードかどうかを判定（TwitterMediaHarvestのisArticlePhotoModeを参考）
   */
  protected isArticlePhotoMode(article: HTMLElement): boolean {
    return article instanceof HTMLDivElement;
  }

  /**
   * ツイートがステータスモードかどうかを判定（TwitterMediaHarvestのisArticleInStatusを参考）
   */
  protected isArticleInStatus(article: HTMLElement): boolean {
    if (article instanceof HTMLDivElement) return false;
    const articleClassLength = article.classList.length;
    const isMagicLength =
      articleClassLength === 3 ||
      articleClassLength === 7 ||
      articleClassLength === 6;
    return this.isInTweetStatus() && isMagicLength;
  }

  /**
   * ツイートがストリームモードかどうかを判定（TwitterMediaHarvestのisArticleInStreamを参考）
   */
  protected isArticleInStream(article: HTMLElement): boolean {
    const articleClassLength = article.classList.length;
    return (
      articleClassLength === 5 ||
      articleClassLength === 9 ||
      articleClassLength === 10
    );
  }

  /**
   * ツイートのモードを判定（TwitterMediaHarvestのselectArtcleModeを参考）
   */
  protected selectArticleMode(article: HTMLElement): TweetMode {
    const isPhoto = this.isArticlePhotoMode(article);
    const isStatus = this.isArticleInStatus(article);
    const isStream = !isPhoto && !isStatus;
    
    let mode: TweetMode;
    if (isPhoto) {
      mode = 'photo';
    } else if (isStatus) {
      mode = 'status';
    } else {
      mode = 'stream';
    }
    
    // モード判定の結果をログに出力
    const pathname = window.location.pathname;
    const isInStatusPage = /\/.*\/status\/\d+/.test(pathname);
    console.log('Comiketter: モード判定', {
      mode,
      pathname,
      isInStatusPage,
      articleTagName: article.tagName,
      articleClassLength: article.classList.length,
      isPhoto,
      isStatus,
      isStream
    });
    
    return mode;
  }

  /**
   * ツイート要素（article）を取得
   */
  protected getArticleElement(buttonElement: HTMLElement): HTMLElement | null {
    // ボタンから最も近いarticle要素を取得
    const article = buttonElement.closest('article[role="article"]') as HTMLElement;
    if (article) {
      return article;
    }
    
    // フォールバック: data-testid="tweet"から取得
    const tweetElement = buttonElement.closest('[data-testid="tweet"]') as HTMLElement;
    if (tweetElement) {
      // tweet要素の親要素からarticleを探す
      const parentArticle = tweetElement.closest('article[role="article"]') as HTMLElement;
      if (parentArticle) {
        return parentArticle;
      }
      return tweetElement;
    }
    
    return null;
  }

  /**
   * アイコンの前の要素に背景クラスを追加（TwitterMediaHarvestのrichIconSiblingを参考）
   * ホバー時に円形の背景が明るくなるエフェクトを追加
   */
  protected addBackgroundClassToIconSibling(icon: HTMLElement, mode: TweetMode = 'stream'): void {
    const previousSibling = icon.previousElementSibling as HTMLElement;
    if (previousSibling) {
      previousSibling.classList.add(`${mode}BG`);
      console.log(`Comiketter: 背景クラス ${mode}BG を追加しました`, previousSibling);
    } else {
      // デバッグ: アイコンの親要素の構造を確認
      console.warn('Comiketter: アイコンの前の要素が見つかりません', {
        icon,
        parent: icon.parentElement,
        parentChildren: icon.parentElement?.children,
      });
    }
  }

  /**
   * HTML文字列から要素を作成
   */
  protected createElementFromHTML(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild as HTMLElement;
  }

  /**
   * ボタンの状態を設定
   */
  setButtonStatus(button: HTMLElement, status: ButtonStatus): void {
    // 既存の状態クラスを削除
    Object.values(ButtonStatus).forEach(statusClass => {
      button.classList.remove(statusClass);
    });
    
    // 新しい状態クラスを追加
    button.classList.add(status);
  }

  /**
   * ボタンの状態を取得
   */
  getButtonStatus(button: HTMLElement): ButtonStatus {
    for (const status of Object.values(ButtonStatus)) {
      if (button.classList.contains(status)) {
        return status;
      }
    }
    return ButtonStatus.Idle;
  }

  /**
   * ボタンの状態をクリア
   */
  clearButtonStatus(button: HTMLElement): void {
    Object.values(ButtonStatus).forEach(statusClass => {
      button.classList.remove(statusClass);
    });
  }

} 