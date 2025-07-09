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
      
      // サイドバーの検出を待機
      await this.waitForSidebar();
      
      // ボタンを作成・追加
      this.createSidebarButton();
      
      this.isInitialized = true;
      sendLog('サイドバーボタン初期化完了');
    } catch (error) {
      sendLog('サイドバーボタン初期化エラー:', error);
    }
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
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        return element;
      }
    }

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
    // ナビゲーション要素を探す
    const navElements = sidebar.querySelectorAll('nav, [role="navigation"], [data-testid="sidebarColumn"] > div');
    
    if (navElements.length > 0) {
      // 最初のナビゲーション要素の最後に挿入
      const nav = navElements[0] as HTMLElement;
      nav.appendChild(this.button!);
    } else {
      // ナビゲーション要素が見つからない場合はサイドバーに直接挿入
      sidebar.appendChild(this.button!);
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
    sendLog('サイドバーボタン削除完了');
  }
} 