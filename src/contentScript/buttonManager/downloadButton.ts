/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest button.ts and Harvester.ts
 */

import type { Tweet } from '../../types';
import { BaseButton, ButtonStatus, ButtonConfig } from './baseButton';

export class DownloadButton extends BaseButton {
  constructor() {
    const config: ButtonConfig = {
      className: 'download',
      testId: 'download-button',
      ariaLabel: 'Comiketter Download',
      iconSVG: `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
             x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve">
          <g>
            <path d="M12,16l-5.7-5.7l1.4-1.4l3.3,3.3V2.6h2v9.6l3.3-3.3l1.4,1.4L12,16z M21,15l0,3.5c0,1.4-1.1,2.5-2.5,2.5h-13
              C4.1,21,3,19.9,3,18.5V15h2v3.5C5,18.8,5.2,19,5.5,19h13c0.3,0,0.5-0.2,0.5-0.5l0-3.5H21z"/>
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
      @keyframes comiketter-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .comiketter-download-button.downloading svg {
        animation: comiketter-spin 1s linear infinite;
      }
      
      .comiketter-download-button {
        cursor: pointer;
        transition: opacity 0.2s ease;
        /* 既存のボタンとの干渉を防ぐ */
        pointer-events: auto;
        position: relative;
        z-index: 1;
      }
      
      .comiketter-download-button:hover {
        opacity: 0.8;
      }
      
      .comiketter-download-button.downloading {
        pointer-events: none;
      }
      
      .comiketter-download-button.success svg {
        color: #00ba7c !important;
      }
      
      .comiketter-download-button.error svg {
        color: #f91880 !important;
      }
      
      .comiketter-download-button.downloaded svg {
        color: #00ba7c !important;
        opacity: 0.7;
      }

      /* 既存のボタンとの干渉を防ぐ */
      .comiketter-download-button * {
        pointer-events: auto;
      }

      /* 他のボタンへの影響を防ぐ */
      [data-testid="like"],
      [data-testid="reply"],
      [data-testid="retweet"],
      [data-testid="share"] {
        pointer-events: auto !important;
      }
    `;
  }

  /**
   * DLボタンを作成
   */
  createButton(tweetInfo: Tweet): HTMLElement {
    // サンプルボタン（いいねボタン等）を取得してスタイルをコピー
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
    const innerWrapper = buttonWrapper.querySelector('.comiketter-download-button > div');
    if (innerWrapper) {
      innerWrapper.appendChild(buttonElement);
    }
    
    // クリックイベントを設定
    this.setupClickHandler(buttonWrapper, tweetInfo);
    
    // 初期状態を設定
    this.setButtonStatus(buttonWrapper, ButtonStatus.Idle);
    
    return buttonWrapper;
  }

  /**
   * クリックハンドラーを設定
   */
  private setupClickHandler(button: HTMLElement, tweetInfo: Tweet): void {
    button.addEventListener('click', (e: MouseEvent) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      
      this.handleButtonClick(button, tweetInfo);
    }, true);
  }

  /**
   * ボタンクリック時の処理
   */
  private async handleButtonClick(button: HTMLElement, tweetInfo: Tweet): Promise<void> {
    try {
      // 既にダウンロード中の場合は何もしない
      if (this.getButtonStatus(button) === ButtonStatus.Downloading) {
        return;
      }

      // ボタンをダウンロード中状態に変更
      this.setButtonStatus(button, ButtonStatus.Downloading);
      
      console.log('Comiketter: Starting download for tweet:', tweetInfo.id);

      // chrome.runtimeが利用可能かチェック
      if (!chrome?.runtime?.sendMessage) {
        throw new Error('Chrome runtime is not available');
      }

      // バックグラウンドスクリプトにダウンロード要求を送信
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_TWEET_MEDIA',
        payload: {
          tweetId: tweetInfo.id,
          screenName: tweetInfo.author.username,
          mediaUrls: tweetInfo.media?.map(m => m.url) || [],
        },
      });
      console.log('Comiketter: Send message to background script:', tweetInfo.id);

      if (response && response.success) {
        console.log('Comiketter: Download completed successfully');
        this.setButtonStatus(button, ButtonStatus.Success);
        
        // 3秒後にダウンロード済み状態に変更
        setTimeout(() => {
          this.setButtonStatus(button, ButtonStatus.Downloaded);
        }, 3000);
      } else {
        const errorMessage = response?.error || 'Unknown download error';
        console.error('Comiketter: Download failed:', errorMessage);
        this.setButtonStatus(button, ButtonStatus.Error);
        
        // 3秒後に通常状態に戻す
        setTimeout(() => {
          this.setButtonStatus(button, ButtonStatus.Idle);
        }, 3000);
      }
    } catch (error) {
      console.error('Comiketter: Error during download:', error);
      
      // Extension context invalidatedエラーの場合は特別な処理
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        console.warn('Comiketter: Extension context invalidated, attempting to reload extension');
        // ページをリロードして拡張機能を再初期化
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
      this.setButtonStatus(button, ButtonStatus.Error);
      
      // 3秒後に通常状態に戻す
      setTimeout(() => {
        this.setButtonStatus(button, ButtonStatus.Idle);
      }, 3000);
    }
  }
} 