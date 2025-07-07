/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークボタン実装
 */

import type { Tweet } from '../../types';
import { BaseButton, ButtonStatus, ButtonConfig } from './baseButton';

export enum BookmarkButtonStatus {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

export class BookmarkButton extends BaseButton {
  private bookmarkSelector: HTMLElement | null = null;
  private currentTweetInfo: Tweet | null = null;

  constructor() {
    const config: ButtonConfig = {
      className: 'bookmark',
      testId: 'bookmark-button',
      ariaLabel: 'Comiketter Bookmark',
      iconSVG: `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
             x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve">
          <g>
            <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path>
          </g>
        </svg>
      `,
      position: 'right',
    };
    super(config);
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
      
      .comiketter-bookmark-button:hover {
        opacity: 0.8;
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
      }

      .comiketter-bookmark-selector {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 16px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        width: 400px;
        max-height: 80vh;
        z-index: 10000;
        overflow: hidden;
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

      /* ダークモード対応 */
      @media (prefers-color-scheme: dark) {
        .comiketter-bookmark-selector {
          background: #15202b;
          color: white;
        }
        
        .comiketter-bookmark-selector-header {
          border-bottom-color: #38444d;
        }
        
        .comiketter-bookmark-item {
          border-bottom-color: #38444d;
        }
        
        .comiketter-bookmark-actions {
          border-top-color: #38444d;
        }
        
        .comiketter-bookmark-button-secondary {
          background: #38444d;
          color: white;
        }
      }
    `;
  }

  /**
   * サンプルボタン（ブックマークボタン）を取得
   */
  protected getSampleButton(): HTMLElement | null {
    const selectors = [
      '[data-testid="bookmark"] > div',
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector) as HTMLElement;
      if (button) {
        return button;
      }
    }

    return null;
  }

  /**
   * ブックマークボタンを作成
   */
  createButton(tweetInfo: Tweet): HTMLElement {
    // サンプルボタン（ブックマークボタン等）を取得してスタイルをコピー
    const sampleButton = this.getSampleButton();
    if (!sampleButton) {
      throw new Error('Failed to get sample button');
    }

    // ボタンのベースを作成
    const buttonWrapper = this.createButtonWrapper();
    const buttonElement = this.createButtonElement(sampleButton);
    
    // アイコンを設定
    const iconElement = this.createIconElement(sampleButton);
    buttonElement.appendChild(iconElement);
    
    // ボタン要素をラッパーに追加
    const innerWrapper = buttonWrapper.querySelector('.comiketter-bookmark-button > div');
    if (innerWrapper) {
      innerWrapper.appendChild(buttonElement);
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
      
      this.currentTweetInfo = tweetInfo;
      
      // ブックマーク選択UIを表示
      await this.showBookmarkSelector();
      
      // 成功状態に変更
      this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Success);
      
      // 3秒後に通常状態に戻す
      setTimeout(() => {
        this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Idle);
      }, 3000);
    } catch (error) {
      console.error('Comiketter: Failed to handle bookmark button click:', error);
      this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Error);
      
      // 3秒後に通常状態に戻す
      setTimeout(() => {
        this.setBookmarkButtonStatus(button, BookmarkButtonStatus.Idle);
      }, 3000);
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
    overlay.addEventListener('click', () => {
      this.hideBookmarkSelector();
    });

    // セレクターを作成
    this.bookmarkSelector = await this.createBookmarkSelector();

    // DOMに追加
    document.body.appendChild(overlay);
    document.body.appendChild(this.bookmarkSelector);
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
    
    const noBookmarksText = document.createElement('p');
    noBookmarksText.textContent = 'ブックマーク機能は準備中です。';
    content.appendChild(noBookmarksText);
    
    // アクション
    const actions = document.createElement('div');
    actions.className = 'comiketter-bookmark-actions';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'comiketter-bookmark-button-secondary';
    cancelButton.textContent = 'キャンセル';
    cancelButton.addEventListener('click', () => {
      this.hideBookmarkSelector();
    });
    
    actions.appendChild(cancelButton);
    
    selector.appendChild(header);
    selector.appendChild(content);
    selector.appendChild(actions);
    
    return selector;
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