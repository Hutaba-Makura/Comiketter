/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Modified and adapted from TwitterMediaHarvest button.ts and Harvester.ts
 */

import { TweetInfo } from './tweetInfoExtractor';

export enum ButtonStatus {
  Idle = 'idle',
  Downloading = 'downloading',
  Success = 'success',
  Error = 'error',
  Downloaded = 'downloaded',
}

export class DownloadButton {
  private readonly downloadIconSVG = `
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
         x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve">
      <g>
        <path d="M12,16l-5.7-5.7l1.4-1.4l3.3,3.3V2.6h2v9.6l3.3-3.3l1.4,1.4L12,16z M21,15l0,3.5c0,1.4-1.1,2.5-2.5,2.5h-13
          C4.1,21,3,19.9,3,18.5V15h2v3.5C5,18.8,5.2,19,5.5,19h13c0.3,0,0.5-0.2,0.5-0.5l0-3.5H21z"/>
      </g>
    </svg>
  `;

  constructor() {
    this.injectStyles();
  }

  /**
   * CSSスタイルを注入
   */
  private injectStyles(): void {
    if (document.getElementById('comiketter-styles')) {
      return; // 既に注入済み
    }

    const style = document.createElement('style');
    style.id = 'comiketter-styles';
    style.textContent = `
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
    `;
    
    document.head.appendChild(style);
  }

  /**
   * DLボタンを作成
   */
  createButton(tweetInfo: TweetInfo): HTMLElement {
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
   * サンプルボタン（いいねボタン等）を取得
   */
  private getSampleButton(): HTMLElement | null {
    const selectors = [
      '[data-testid="like"] > div',
      '[data-testid="reply"] > div',
      '[data-testid="retweet"] > div',
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
   * ボタンラッパーを作成
   */
  private createButtonWrapper(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'comiketter-download-button';
    wrapper.setAttribute('data-testid', 'comiketter-download-button');
    wrapper.setAttribute('data-harvest-ref', 'U2FsdGVkX18434vXoO+1oS21I0YQm8zFX6xy775AvdCpmSEOQHO9ns7wa518zD8t');
    
    const innerDiv = document.createElement('div');
    innerDiv.setAttribute('aria-haspopup', 'true');
    innerDiv.setAttribute('aria-label', 'Comiketter Download');
    innerDiv.setAttribute('role', 'button');
    innerDiv.setAttribute('data-focusable', 'true');
    innerDiv.setAttribute('tabindex', '0');
    innerDiv.style.cssText = 'display: flex; justify-content: center;';
    
    wrapper.appendChild(innerDiv);
    return wrapper;
  }

  /**
   * ボタン要素を作成
   */
  private createButtonElement(sampleButton: HTMLElement): HTMLElement {
    // サンプルボタンをクローンして不要な要素を削除
    const button = sampleButton.cloneNode(true) as HTMLElement;
    
    // テキスト要素を削除
    const textContainer = button.querySelector('[data-testid="app-text-transition-container"] > span > span');
    if (textContainer) {
      textContainer.remove();
    }
    
    return button;
  }

  /**
   * アイコン要素を作成
   */
  private createIconElement(sampleButton: HTMLElement): HTMLElement {
    const icon = this.createElementFromHTML(this.downloadIconSVG);
    
    // サンプルボタンのアイコンからスタイルを取得
    const sampleIcon = sampleButton.querySelector('svg');
    if (sampleIcon) {
      icon.setAttribute('class', sampleIcon.className || 'r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi');
    }
    
    // 透明度を固定（返信制限時の見た目変更を防ぐ）
    icon.setAttribute('style', 'opacity: unset !important;');
    
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
   * クリックハンドラーを設定
   */
  private setupClickHandler(button: HTMLElement, tweetInfo: TweetInfo): void {
    button.addEventListener('click', (e: MouseEvent) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      
      this.handleButtonClick(button, tweetInfo);
    });
  }

  /**
   * ボタンクリック時の処理
   */
  private async handleButtonClick(button: HTMLElement, tweetInfo: TweetInfo): Promise<void> {
    // ダウンロード中は重複クリックを防ぐ
    if (this.getButtonStatus(button) === ButtonStatus.Downloading) {
      return;
    }

    try {
      // ダウンロード中状態に変更
      this.setButtonStatus(button, ButtonStatus.Downloading);
      
      // バックグラウンドスクリプトにダウンロード要求を送信
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_TWEET_MEDIA',
        payload: {
          tweetId: tweetInfo.tweetId,
          screenName: tweetInfo.screenName,
          mediaUrls: tweetInfo.mediaUrls,
        },
      });

      if (response.success) {
        this.setButtonStatus(button, ButtonStatus.Success);
        console.log('Comiketter: Download started successfully');
        
        // 3秒後にダウンロード済み状態に変更
        setTimeout(() => {
          this.setButtonStatus(button, ButtonStatus.Downloaded);
        }, 3000);
      } else {
        this.setButtonStatus(button, ButtonStatus.Error);
        console.error('Comiketter: Download failed:', response.error);
        
        // 3秒後にエラー状態をクリア
        setTimeout(() => {
          this.setButtonStatus(button, ButtonStatus.Idle);
        }, 3000);
      }
    } catch (error) {
      this.setButtonStatus(button, ButtonStatus.Error);
      console.error('Comiketter: Download error:', error);
      
      // 3秒後にエラー状態をクリア
      setTimeout(() => {
        this.setButtonStatus(button, ButtonStatus.Idle);
      }, 3000);
    }
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
   * ボタンの現在の状態を取得
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