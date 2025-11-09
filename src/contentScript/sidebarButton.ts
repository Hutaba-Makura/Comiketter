/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: サイドバーにCustomBookmarksボタンを追加
 */

import { showErrorToast } from '../utils/toast';

// ログ送信関数
const sendLog = (message: string, data?: any) => {
  const logMessage = `[Comiketter Sidebar] ${message}`;
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

/**
 * サイドバーにCustomBookmarksボタンを追加するクラス
 */
export class SidebarButton {
  private static instance: SidebarButton;
  private button: HTMLElement | null = null;
  private isInitialized = false;
  private observer: MutationObserver | null = null;
  private processedElements = new WeakSet<HTMLElement>();
  private processingTimeout: number | null = null;
  private pendingNodes: HTMLElement[] = [];

  private constructor() {}

  static getInstance(): SidebarButton {
    if (!SidebarButton.instance) {
      SidebarButton.instance = new SidebarButton();
    }
    return SidebarButton.instance;
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // スタイルを注入
      this.injectStyles();
      
      // ページの読み込み状態を確認
      if (document.readyState === 'loading') {
        await new Promise<void>((resolve) => {
          document.addEventListener('DOMContentLoaded', () => resolve());
        });
      }
      
      // 少し待機してからサイドバーの検出を開始
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 既存のサイドバーにボタンを追加
      await this.initializeExistingSidebar();
      
      // 動的コンテンツの監視を開始
      this.startObserving();
      
      this.isInitialized = true;
    } catch (error) {
      sendLog('サイドバーボタン初期化エラー:', error);
    }
  }

  /**
   * 既存のサイドバーにボタンを追加
   */
  private async initializeExistingSidebar(): Promise<void> {
    const sidebar = this.findSidebar();
    if (sidebar) {
      if (this.shouldAddButton(sidebar)) {
        await this.createSidebarButton();
      } else {
        sendLog('ボタン追加条件を満たさないため、スキップ');
      }
    } else {
      sendLog('ナビゲーション要素が見つからないため、スキップ');
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

    // ナビゲーション要素を監視
    const observeTargets = [
      { selector: 'nav[role="navigation"]', name: 'navigation' },
      { selector: '[role="banner"]', name: 'banner' },
      { selector: 'body', name: 'body' },
    ];

    for (const target of observeTargets) {
      const element = document.querySelector(target.selector);
      if (element) {
        this.observer.observe(element, options);
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

    // 処理済みとしてマーク
    this.processedElements.add(node);

    // ナビゲーションセレクターを試行
    const navigationSelectors = [
      'nav[role="navigation"]',
      '[role="banner"] nav',
    ];

    // 直接ナビゲーション要素の場合
    for (const selector of navigationSelectors) {
      if (node.matches(selector)) {
        if (this.shouldAddButton(node)) {
          this.createSidebarButton().catch(error => {
            sendLog('サイドバーボタン作成エラー:', error);
          });
        }
        return;
      }
    }

    // 子要素にナビゲーションが含まれている場合
    for (const selector of navigationSelectors) {
      const navigations = node.querySelectorAll(selector);
      if (navigations.length > 0) {
        navigations.forEach((navigation) => {
          if (this.shouldAddButton(navigation as HTMLElement)) {
            this.createSidebarButton().catch(error => {
              sendLog('サイドバーボタン作成エラー:', error);
            });
          }
        });
        return;
      }
    }
  }

  /**
   * ボタンを追加すべきかどうかを判定
   */
  private shouldAddButton(sidebar: HTMLElement): boolean {
    // 既にボタンが追加されている場合はスキップ
    const existingButton = sidebar.querySelector('[data-testid="comiketter-sidebar-button"]');
    return !existingButton;
  }

  /**
   * サイドバー要素を検索
   */
  private findSidebar(): HTMLElement | null {
    // 直接ナビゲーション要素を検索
    const selectors = [
      'nav[role="navigation"]',
      '[role="banner"] nav',
      '[role="banner"] [role="navigation"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        
        // ナビゲーション要素として適切かチェック
        if (this.isValidNavigation(element)) {
          return element;
        }
      }
    }

    sendLog('有効なナビゲーション要素が見つかりません');
    return null;
  }

  /**
   * 要素が有効なナビゲーションかどうかを判定
   */
  private isValidNavigation(element: HTMLElement): boolean {
    // 要素が表示されているかチェック
    const style = window.getComputedStyle(element as Element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    
    // サイズが適切かチェック
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    // ナビゲーション要素を含んでいるかチェック
    const hasNavElements = element.querySelector('a[role="tab"], a[href], nav, [role="navigation"]');
    if (!hasNavElements) {
      return false;
    }
    
    return true;
  }

  /**
   * サンプル要素（AppTabBar_DirectMessage_Link）を取得
   */
  private getSampleElement(): HTMLElement | null {
    // まず、nav要素内から探す（より確実）
    const nav = document.querySelector('nav[role="navigation"][aria-label*="メイン"]') || 
                document.querySelector('nav[role="navigation"]');
    
    if (nav) {
      // nav要素内から探す
      const selectors = [
        'a[data-testid="AppTabBar_DirectMessage_Link"]',
        'a[href^="/messages/"][data-testid="AppTabBar_DirectMessage_Link"]',
        'a[href^="/messages/"][aria-label*="ダイレクトメッセージ"]',
        'a[href^="/messages/"]',
      ];

      for (const selector of selectors) {
        const element = nav.querySelector(selector) as HTMLElement;
        if (element) {
          return element;
        }
      }
    }

    // nav要素が見つからない場合、全体から探す
    const selectors = [
      'a[data-testid="AppTabBar_DirectMessage_Link"]',
      'a[href^="/messages/"][data-testid="AppTabBar_DirectMessage_Link"]',
      'a[href^="/messages/"][aria-label*="ダイレクトメッセージ"]',
      'a[href^="/messages/"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        return element;
      }
    }

    sendLog('サンプル要素が見つかりません');
    return null;
  }

  /**
   * サンプル要素をクローンして不要な要素を削除
   */
  private createButtonElement(sampleElement: HTMLElement): HTMLElement {
    // サンプル要素をクローン
    const button = sampleElement.cloneNode(true) as HTMLElement;
    
    // 既存のSVGアイコンをすべて削除
    const existingSvgs = button.querySelectorAll('svg');
    if (existingSvgs.length > 0) {
      existingSvgs.forEach(svg => svg.remove());
    }
    
    // テキスト要素を取得して置き換え
    // 構造: <div dir="ltr"> の中に <span> が複数ある
    const textContainer = button.querySelector('div[dir="ltr"]') || 
                         button.querySelector('div[dir]');
    
    if (textContainer) {
      // 最初のspan要素を探して置き換え
      const firstSpan = textContainer.querySelector('span');
      if (firstSpan) {
        firstSpan.textContent = 'カスタムブックマーク';
        // 2つ目以降のspan要素は削除
        const otherSpans = textContainer.querySelectorAll('span:not(:first-child)');
        otherSpans.forEach(span => span.remove());
      }
    } else {
      // フォールバック: すべてのspan要素を処理
      const textElements = button.querySelectorAll('span');
      if (textElements.length > 0) {
        textElements[0].textContent = 'カスタムブックマーク';
        // 2つ目以降のspan要素は削除
        for (let i = 1; i < textElements.length; i++) {
          textElements[i].remove();
        }
      }
    }
    
    // href属性を削除（クリックイベントで制御するため）
    if (button.tagName === 'A') {
      button.removeAttribute('href');
    }
    
    return button;
  }

  /**
   * アイコン要素を作成
   */
  private async createIconElement(sampleElement: HTMLElement): Promise<HTMLElement> {
    // アイコンファイルを読み込み
    const iconSVG = await this.loadIcon('twitterBookmark');
    
    // SVG要素を作成
    const icon = this.createElementFromHTML(iconSVG);
    
    // サンプル要素のアイコンからスタイルを取得
    const sampleIcon = sampleElement.querySelector('svg');
    if (sampleIcon) {
      // クラス名をコピー
      icon.setAttribute('class', sampleIcon.className);
      
      // サンプルアイコンのスタイルをコピー
      const sampleStyle = window.getComputedStyle(sampleIcon as Element);
      icon.style.width = sampleStyle.width || '24px';
      icon.style.height = sampleStyle.height || '24px';
      icon.style.marginRight = sampleStyle.marginRight || '16px';
      icon.style.fill = sampleStyle.fill || 'currentColor';
      icon.style.color = sampleStyle.color || 'inherit';
      icon.style.flexShrink = sampleStyle.flexShrink || '0';
      
      // その他の重要なスタイルをコピー
      if (sampleIcon.getAttribute('viewBox')) {
        icon.setAttribute('viewBox', sampleIcon.getAttribute('viewBox') || '0 0 24 24');
      }
    } else {
      // フォールバック: デフォルトスタイルを設定
      icon.style.width = '24px';
      icon.style.height = '24px';
      icon.style.marginRight = '16px';
      icon.style.fill = 'currentColor';
      icon.style.flexShrink = '0';
    }
    
    return icon;
  }

  /**
   * HTML文字列から要素を作成
   */
  private createElementFromHTML(html: string): HTMLElement {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild as HTMLElement;
  }

  /**
   * アイコンファイルを読み込み
   */
  private async loadIcon(iconName: string): Promise<string> {
    try {
      const response = await fetch(chrome.runtime.getURL(`icons/${iconName}.svg`));
      if (!response.ok) {
        throw new Error(`Failed to load icon: ${iconName}`);
      }
      return await response.text();
    } catch (error) {
      sendLog(`アイコン読み込みエラー: ${iconName}`, error);
      // フォールバック用のデフォルトアイコン
      return this.getDefaultIcon(iconName);
    }
  }

  /**
   * デフォルトアイコンを取得
   */
  private getDefaultIcon(iconName: string): string {
    const defaultIcons: Record<string, string> = {
      'twitterBookmark': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path></svg>`,
    };
    
    return defaultIcons[iconName] || defaultIcons['twitterBookmark'];
  }

  /**
   * CSSスタイルを注入
   */
  private injectStyles(): void {
    if (document.getElementById('comiketter-sidebar-button-styles')) {
      return; // 既に注入済み
    }

    const style = document.createElement('style');
    style.id = 'comiketter-sidebar-button-styles';
    style.textContent = this.getStyles();
    
    document.head.appendChild(style);
  }

  /**
   * ボタン固有のスタイルを取得
   */
  private getStyles(): string {
    return `
      .comiketter-sidebar-button {
        cursor: pointer;
        transition: opacity 0.2s ease;
        pointer-events: auto;
        position: relative;
        z-index: 1;
      }
      
      /* ホバー時の円形背景エフェクト（aria-labelが定義されている要素自体に適用） */
      .comiketter-sidebar-button:hover {
        background: rgba(15, 20, 25, 0.1) !important;
        border-radius: 9999px !important;
      }
      
      .comiketter-sidebar-button:hover:active {
        background: rgba(15, 20, 25, 0.2) !important;
        border-radius: 9999px !important;
      }
    `;
  }

  /**
   * アイコンの前の要素に背景クラスを追加（TwitterMediaHarvestのrichIconSiblingを参考）
   * ホバー時に円形の背景が明るくなるエフェクトを追加
   */
  private addBackgroundClassToIconSibling(icon: HTMLElement): void {
    const previousSibling = icon.previousElementSibling as HTMLElement;
    if (previousSibling) {
      previousSibling.classList.add('sidebarBG');
    } else {
      // デバッグ: アイコンの親要素の構造を確認
      sendLog('アイコンの前の要素が見つかりません', {
        icon,
        parent: icon.parentElement,
        parentChildren: icon.parentElement?.children,
      });
    }
  }

  /**
   * ボタンラッパーを作成
   */
  private createButtonWrapper(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'comiketter-sidebar-button';
    wrapper.setAttribute('data-testid', 'comiketter-sidebar-button');
    wrapper.setAttribute('aria-label', 'カスタムブックマーク');
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', '0');
    
    return wrapper;
  }

  /**
   * サイドバーボタンを作成
   */
  private async createSidebarButton(): Promise<void> {
    const sidebar = this.findSidebar();
    if (!sidebar) {
      sendLog('ナビゲーション要素が見つかりません');
      return;
    }

    // 既存のボタンを削除
    this.removeSidebarButton();

    // サンプル要素を取得
    const sampleElement = this.getSampleElement();
    if (!sampleElement) {
      sendLog('サンプル要素が見つかりません。ボタン作成を中止');
      return;
    }

    // ボタンラッパーを作成
    const buttonWrapper = this.createButtonWrapper();
    
    // サンプル要素をクローンして不要な要素を削除
    const buttonElement = this.createButtonElement(sampleElement);
    
    // アイコンを設定
    const iconElement = await this.createIconElement(sampleElement);
    
    // アイコンの挿入位置を決定（提供された構造に基づく）
    // 構造: <a> -> <div> -> <div> (アイコン用) + <div dir="ltr"> (テキスト用)
    // 最初のdiv（アイコン用）を探す
    // 構造: <a> -> <div> -> <div> (アイコン用、最初の子要素)
    const outerDiv = buttonElement.querySelector('div');
    if (outerDiv) {
      // 外側のdivの最初の子要素（アイコン用のdiv）を探す
      const iconContainer = outerDiv.firstElementChild as HTMLElement;
      if (iconContainer) {
        // アイコン用のdivに追加
        iconContainer.appendChild(iconElement);
      } else {
        // フォールバック: 外側のdivに直接追加
        outerDiv.insertBefore(iconElement, outerDiv.firstChild);
      }
    } else {
      // フォールバック: 直接buttonElementの最初に追加
      if (buttonElement.firstChild) {
        buttonElement.insertBefore(iconElement, buttonElement.firstChild);
      } else {
        buttonElement.appendChild(iconElement);
      }
    }
    
    // ボタン要素をラッパーに追加
    buttonWrapper.appendChild(buttonElement);
    
    // クリックイベントを設定
    buttonWrapper.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      this.handleButtonClick();
    }, true);

    this.button = buttonWrapper;

    // サイドバーに挿入
    this.insertIntoSidebar(sidebar);
  }


  /**
   * サイドバーにボタンを挿入
   */
  private insertIntoSidebar(sidebar: HTMLElement): void {
    // ブックマークリンクを探して、その直後に挿入
    const bookmarkLink = sidebar.querySelector('a[href="/i/bookmarks"]');
    if (bookmarkLink && bookmarkLink.parentElement) {
      const parent = bookmarkLink.parentElement;
      const nextSibling = bookmarkLink.nextElementSibling;
      
      if (nextSibling) {
        // ブックマークの次の要素の前に挿入
        parent.insertBefore(this.button!, nextSibling);
      } else {
        // ブックマークの後に挿入
        parent.appendChild(this.button!);
      }
    } else {
      // 挿入先を決定
      const insertTarget = this.findInsertTarget(sidebar);
      if (!insertTarget) {
        sendLog('挿入先が見つかりません');
        return;
      }
      
      // ボタンを挿入
      insertTarget.appendChild(this.button!);
    }
  }

  /**
   * 挿入先を決定
   */
  private findInsertTarget(sidebar: HTMLElement): HTMLElement | null {
    // 1. ブックマークリンクを探して、その直後に挿入
    const bookmarkLink = sidebar.querySelector('a[href="/i/bookmarks"]');
    if (bookmarkLink) {
      return sidebar; // 親要素を返して、後で挿入位置を調整
    }
    
    sendLog('ブックマークリンクが見つからないため、代替手段を試行');
    
    // 2. ナビゲーション要素を探す
    const navElements = sidebar.querySelectorAll('nav, [role="navigation"]');
    if (navElements.length > 0) {
      const nav = navElements[navElements.length - 1] as HTMLElement;
      sendLog('ナビゲーション要素を挿入先として選択');
      return nav;
    }
    
    // 3. タブ要素を探す
    const tabElements = sidebar.querySelectorAll('a[role="tab"]');
    if (tabElements.length > 0) {
      const lastTab = tabElements[tabElements.length - 1] as HTMLElement;
      const parent = lastTab.parentElement;
      if (parent) {
        sendLog('タブ要素の親を挿入先として選択');
        return parent;
      }
    }
    
    // 4. リンク要素を探す
    const linkElements = sidebar.querySelectorAll('a[href]');
    if (linkElements.length > 0) {
      const lastLink = linkElements[linkElements.length - 1] as HTMLElement;
      const parent = lastLink.parentElement;
      if (parent) {
        sendLog('リンク要素の親を挿入先として選択');
        return parent;
      }
    }
    
    // 5. 直接サイドバーに挿入
    sendLog('サイドバー自体を挿入先として選択');
    return sidebar;
  }

  /**
   * ボタンクリック時の処理
   */
  private handleButtonClick(): void {
    try {
      // 拡張機能のコンテキストが有効かチェック
      if (!chrome?.runtime?.id) {
        sendLog('拡張機能コンテキストが無効です。フォールバック処理を実行');
        this.openBookmarkPageFallback();
        return;
      }
      
      // ブックマークページを開く
      chrome.runtime.sendMessage({
        type: 'OPEN_BOOKMARK_PAGE',
      }).catch((error) => {
        sendLog('ブックマークページを開けませんでした:', error);
        // フォールバック: 新しいタブで開く
        this.openBookmarkPageFallback();
      });
    } catch (error) {
      sendLog('サイドバーボタンクリックエラー:', error);
      // エラーが発生した場合もフォールバック処理を実行
      this.openBookmarkPageFallback();
    }
  }

  /**
   * ブックマークページを開くフォールバック処理
   */
  private openBookmarkPageFallback(): void {
    try {
      // 直接URLで開く
      const bookmarkUrl = chrome?.runtime?.getURL?.('bookmarks.html') || 'bookmarks.html';
      window.open(bookmarkUrl, '_blank');
      sendLog('フォールバック処理でブックマークページを開きました');
    } catch (fallbackError) {
      sendLog('フォールバック処理も失敗しました:', fallbackError);
      // 最後の手段: トースト通知でユーザーに通知
      showErrorToast('ブックマークページを開けませんでした。手動でブックマークページにアクセスしてください。');
    }
  }

  /**
   * 既存のボタンを削除
   */
  private removeSidebarButton(): void {
    const existingButton = document.querySelector('[data-testid="comiketter-sidebar-button"]');
    if (existingButton) {
      existingButton.remove();
    }
  }

  /**
   * ボタンを削除
   */
  destroy(): void {
    this.removeSidebarButton();
    this.button = null;
    this.isInitialized = false;
    
    // MutationObserverを停止
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    this.pendingNodes = [];
    this.processedElements = new WeakSet<HTMLElement>();
  }

  /**
   * 手動でボタンを再作成（デバッグ用）
   */
  async forceRecreate(): Promise<void> {
    sendLog('手動でボタンを再作成');
    this.removeSidebarButton();
    await this.createSidebarButton();
  }

  /**
   * 現在の状態を取得（デバッグ用）
   */
  getStatus(): any {
    const existingButton = document.querySelector('[data-testid="comiketter-sidebar-button"]');
    return {
      isInitialized: this.isInitialized,
      buttonExists: !!existingButton,
      buttonVisible: existingButton ? {
        display: window.getComputedStyle(existingButton).display,
        visibility: window.getComputedStyle(existingButton).visibility,
        rect: existingButton.getBoundingClientRect()
      } : null,
      sidebarFound: !!this.findSidebar()
    };
  }
} 