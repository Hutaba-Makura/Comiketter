/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: サイドバーにCustomBookmarksボタンを追加
 */

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
      sendLog('サイドバーボタン初期化開始');
      
      // ページの読み込み状態を確認
      if (document.readyState === 'loading') {
        sendLog('ページ読み込み中、DOMContentLoadedを待機');
        await new Promise<void>((resolve) => {
          document.addEventListener('DOMContentLoaded', () => resolve());
        });
      }
      
      // 少し待機してからサイドバーの検出を開始
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 既存のサイドバーにボタンを追加
      this.initializeExistingSidebar();
      
      // 動的コンテンツの監視を開始
      this.startObserving();
      
      this.isInitialized = true;
      sendLog('サイドバーボタン初期化完了');
    } catch (error) {
      sendLog('サイドバーボタン初期化エラー:', error);
    }
  }

  /**
   * 既存のサイドバーにボタンを追加
   */
  private initializeExistingSidebar(): void {
    sendLog('既存ナビゲーションの初期化開始');
    
    const sidebar = this.findSidebar();
    if (sidebar) {
      sendLog('ナビゲーション要素を発見、ボタン追加を試行');
      if (this.shouldAddButton(sidebar)) {
        sendLog('ボタン追加条件を満たしたため、createSidebarButtonを実行');
        this.createSidebarButton();
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
        sendLog(`監視開始: ${target.name}`);
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
          this.createSidebarButton();
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
            this.createSidebarButton();
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
    const shouldAdd = !existingButton;
    
    sendLog('shouldAddButton判定:', {
      sidebarTagName: sidebar.tagName,
      sidebarRole: sidebar.getAttribute('role'),
      existingButton: !!existingButton,
      shouldAdd: shouldAdd
    });
    
    return shouldAdd;
  }

  /**
   * サイドバー要素を検索
   */
  private findSidebar(): HTMLElement | null {
    sendLog('サイドバー要素の検索開始');
    
    // 現在のページのURLを確認
    const currentUrl = window.location.href;
    sendLog('現在のURL:', currentUrl);
    
    // 直接ナビゲーション要素を検索
    const selectors = [
      'nav[role="navigation"]',
      '[role="banner"] nav',
      '[role="banner"] [role="navigation"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      sendLog(`セレクター "${selector}" で ${elements.length} 個の要素を発見`);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        sendLog(`要素 ${i + 1}:`, {
          tagName: element.tagName,
          role: element.getAttribute('role'),
          className: element.className,
          childrenCount: element.children.length
        });
        
        // ナビゲーション要素として適切かチェック
        if (this.isValidNavigation(element)) {
          sendLog(`有効なナビゲーション要素を発見: ${selector} (${i + 1}番目)`);
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
    const style = window.getComputedStyle(element);
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
   * サイドバーボタンを作成
   */
  private createSidebarButton(): void {
    sendLog('createSidebarButton開始');
    
    const sidebar = this.findSidebar();
    if (!sidebar) {
      sendLog('ナビゲーション要素が見つかりません');
      return;
    }

    sendLog('ナビゲーション要素を発見、ボタン作成を開始');

    // 既存のボタンを削除
    this.removeSidebarButton();

    // ボタンを作成
    this.button = document.createElement('div');
    this.button.className = 'comiketter-sidebar-button';
    this.button.setAttribute('data-testid', 'comiketter-sidebar-button');
    
    // ボタンのHTML（XのUIに合わせて調整）
    this.button.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        border-radius: 9999px;
        transition: background-color 0.2s;
        margin: 4px 0;
        color: rgb(231, 233, 234);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 20px;
        font-weight: 400;
        line-height: 24px;
        text-decoration: none;
        min-height: 48px;
        box-sizing: border-box;
      ">
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; margin-right: 16px; fill: currentColor; flex-shrink: 0;">
          <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path>
        </svg>
        <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">カスタムブックマーク</span>
      </div>
    `;

    // クリックイベントを設定
    this.button.addEventListener('click', this.handleButtonClick.bind(this));

    // ホバー効果を追加（XのUIに合わせて）
    this.button.addEventListener('mouseenter', () => {
      if (this.button) {
        this.button.style.backgroundColor = 'rgba(239, 243, 244, 0.1)';
      }
    });

    this.button.addEventListener('mouseleave', () => {
      if (this.button) {
        this.button.style.backgroundColor = 'transparent';
      }
    });

    // サイドバーに挿入
    this.insertIntoSidebar(sidebar);
    
    sendLog('サイドバーボタン作成完了');
  }

  /**
   * サイドバーにボタンを挿入
   */
  private insertIntoSidebar(sidebar: HTMLElement): void {
    sendLog('insertIntoSidebar開始');
    
    sendLog('ナビゲーション要素への挿入開始', { 
      sidebarTagName: sidebar.tagName, 
      sidebarRole: sidebar.getAttribute('role'),
      sidebarChildrenCount: sidebar.children.length
    });
    
    // ブックマークリンクを探して、その直後に挿入
    const bookmarkLink = sidebar.querySelector('a[href="/i/bookmarks"]');
    if (bookmarkLink && bookmarkLink.parentElement) {
      const parent = bookmarkLink.parentElement;
      const nextSibling = bookmarkLink.nextElementSibling;
      
      if (nextSibling) {
        // ブックマークの次の要素の前に挿入
        parent.insertBefore(this.button!, nextSibling);
        sendLog('ブックマークの直後に挿入完了');
      } else {
        // ブックマークの後に挿入
        parent.appendChild(this.button!);
        sendLog('ブックマークの後に挿入完了');
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
      sendLog('ボタンの挿入完了', { 
        targetTagName: insertTarget.tagName,
        targetRole: insertTarget.getAttribute('role')
      });
    }
    
    // 挿入後の確認
    const insertedButton = document.querySelector('[data-testid="comiketter-sidebar-button"]');
    if (insertedButton) {
      sendLog('ボタンの挿入を確認');
      
      // ボタンの位置を確認
      const buttonRect = insertedButton.getBoundingClientRect();
      sendLog('ボタンの位置:', {
        top: buttonRect.top,
        left: buttonRect.left,
        width: buttonRect.width,
        height: buttonRect.height,
        visible: buttonRect.width > 0 && buttonRect.height > 0
      });
    } else {
      sendLog('ボタンの挿入に失敗');
    }
  }

  /**
   * 挿入先を決定
   */
  private findInsertTarget(sidebar: HTMLElement): HTMLElement | null {
    sendLog('findInsertTarget開始');
    
    // 1. ブックマークリンクを探して、その直後に挿入
    const bookmarkLink = sidebar.querySelector('a[href="/i/bookmarks"]');
    if (bookmarkLink) {
      sendLog('ブックマークリンクを発見、その直後に挿入');
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
    sendLog('サイドバーボタンクリック');
    
    // ブックマークページを開く
    chrome.runtime.sendMessage({
      type: 'OPEN_BOOKMARK_PAGE',
    }).catch((error) => {
      sendLog('ブックマークページを開けませんでした:', error);
      // フォールバック: 新しいタブで開く
      window.open(chrome.runtime.getURL('bookmarks.html'), '_blank');
    });
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
    
    sendLog('サイドバーボタン削除完了');
  }

  /**
   * 手動でボタンを再作成（デバッグ用）
   */
  forceRecreate(): void {
    sendLog('手動でボタンを再作成');
    this.removeSidebarButton();
    this.createSidebarButton();
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