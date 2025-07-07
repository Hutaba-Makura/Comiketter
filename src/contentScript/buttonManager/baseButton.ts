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

export abstract class BaseButton {
  protected config: ButtonConfig;

  constructor(config: ButtonConfig) {
    this.config = config;
    this.injectStyles();
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
  abstract createButton(tweetInfo: Tweet): HTMLElement;

  /**
   * サンプルボタン（いいねボタン等）を取得
   */
  protected getSampleButton(): HTMLElement | null {
    const selectors = [
      '[data-testid="like"] > div',
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
  protected createButtonWrapper(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `comiketter-${this.config.className}-button`;
    wrapper.setAttribute('data-testid', `comiketter-${this.config.testId}`);
    wrapper.setAttribute('aria-label', this.config.ariaLabel);
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', '0');
    
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
   * ボタン要素を作成
   */
  protected createButtonElement(sampleButton: HTMLElement): HTMLElement {
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
  protected createIconElement(sampleButton: HTMLElement): HTMLElement {
    const icon = this.createElementFromHTML(this.config.iconSVG);
    
    // サンプルボタンのアイコンからスタイルを取得
    const sampleIcon = sampleButton.querySelector('svg');
    if (sampleIcon) {
      icon.setAttribute('class', sampleIcon.className || 'r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi');
    }
    
    return icon;
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