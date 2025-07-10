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
  private reinitInterval: NodeJS.Timeout | null = null;

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
      
      // サイドバーの検出を待機
      await this.waitForSidebar();
      
      // ボタンを作成・追加
      this.createSidebarButton();
      
      this.isInitialized = true;
      sendLog('サイドバーボタン初期化完了');
      
      // 定期的な再初期化を開始
      this.startPeriodicReinitialization();
    } catch (error) {
      sendLog('サイドバーボタン初期化エラー:', error);
    }
  }

  /**
   * 定期的な再初期化を開始
   */
  private startPeriodicReinitialization(): void {
    if (this.reinitInterval) {
      clearInterval(this.reinitInterval);
    }
    
    this.reinitInterval = setInterval(() => {
      // ボタンが存在するかチェック
      const existingButton = document.querySelector('[data-testid="comiketter-sidebar-button"]');
      if (!existingButton && this.isInitialized) {
        sendLog('ボタンが見つからないため再作成');
        this.createSidebarButton();
      }
    }, 5000); // 5秒ごとにチェック
  }

  /**
   * サイドバーの検出を待機
   */
  private async waitForSidebar(): Promise<void> {
    return new Promise((resolve) => {
      const checkSidebar = () => {
        const sidebar = this.findSidebar();
        if (sidebar) {
          resolve();
        } else {
          setTimeout(checkSidebar, 1000);
        }
      };
      checkSidebar();
    });
  }

  /**
   * サイドバー要素を検索
   */
  private findSidebar(): HTMLElement | null {
    // 複数のセレクターでサイドバーを検索
    const selectors = [
      '[data-testid="sidebarColumn"]',
      '[role="complementary"]',
      'nav[role="navigation"]',
      '[data-testid="primaryColumn"] + div',
      // Xの新しいUI構造に対応
      '[role="banner"] nav',
      '[role="banner"] [role="navigation"]',
      '[data-testid="sidebarColumn"] nav',
      '[data-testid="sidebarColumn"] [role="navigation"]',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        sendLog(`サイドバー要素を発見: ${selector}`);
        return element;
      }
    }

    // より詳細な検索
    const banner = document.querySelector('[role="banner"]');
    if (banner) {
      const navInBanner = banner.querySelector('nav, [role="navigation"]');
      if (navInBanner) {
        sendLog('banner内のナビゲーション要素を発見');
        return navInBanner as HTMLElement;
      }
    }

    // サイドバーカラムを直接検索
    const sidebarColumn = document.querySelector('[data-testid="sidebarColumn"]');
    if (sidebarColumn) {
      sendLog('サイドバーカラムを発見');
      return sidebarColumn as HTMLElement;
    }

    sendLog('サイドバー要素が見つかりません');
    return null;
  }

  /**
   * サイドバーボタンを作成
   */
  private createSidebarButton(): void {
    const sidebar = this.findSidebar();
    if (!sidebar) {
      sendLog('サイドバーが見つかりません');
      return;
    }

    // 既存のボタンを削除
    this.removeSidebarButton();

    // ボタンを作成
    this.button = document.createElement('div');
    this.button.className = 'comiketter-sidebar-button';
    this.button.setAttribute('data-testid', 'comiketter-sidebar-button');
    
    // ボタンのHTML
    this.button.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        border-radius: 9999px;
        transition: background-color 0.2s;
        margin: 4px 0;
      ">
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; margin-right: 16px; fill: currentColor;">
          <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path>
        </svg>
        <span style="font-size: 20px; font-weight: 400;">カスタムブックマーク</span>
      </div>
    `;

    // クリックイベントを設定
    this.button.addEventListener('click', this.handleButtonClick.bind(this));

    // ホバー効果を追加
    this.button.addEventListener('mouseenter', () => {
      if (this.button) {
        this.button.style.backgroundColor = 'rgba(29, 161, 242, 0.1)';
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
    sendLog('サイドバーへの挿入開始', { sidebarTagName: sidebar.tagName, sidebarRole: sidebar.getAttribute('role') });
    
    // ナビゲーション要素を探す
    const navElements = sidebar.querySelectorAll('nav, [role="navigation"], [data-testid="sidebarColumn"] > div, a[role="tab"]');
    
    if (navElements.length > 0) {
      // ナビゲーション要素の最後に挿入
      const nav = navElements[navElements.length - 1] as HTMLElement;
      nav.appendChild(this.button!);
      sendLog('ナビゲーション要素に挿入完了', { navTagName: nav.tagName });
    } else {
      // ナビゲーション要素が見つからない場合はサイドバーに直接挿入
      sidebar.appendChild(this.button!);
      sendLog('サイドバーに直接挿入完了');
    }
    
    // 挿入後の確認
    const insertedButton = document.querySelector('[data-testid="comiketter-sidebar-button"]');
    if (insertedButton) {
      sendLog('ボタンの挿入を確認');
    } else {
      sendLog('ボタンの挿入に失敗');
    }
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
    
    // 定期的な再初期化を停止
    if (this.reinitInterval) {
      clearInterval(this.reinitInterval);
      this.reinitInterval = null;
    }
    
    sendLog('サイドバーボタン削除完了');
  }
} 