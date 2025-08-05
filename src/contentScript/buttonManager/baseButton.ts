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

export abstract class BaseButton {
  protected config: ButtonConfig;

  constructor(config: ButtonConfig) {
    this.config = config;
    this.injectStyles();
  }

  /**
   * テーマを検出
   */
  protected detectTheme(): Theme {
    // html要素のcolor-schemeスタイルから判定
    const htmlElement = document.documentElement;
    const computedStyle = getComputedStyle(htmlElement);
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
      'download': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>`,
      'bookmarks': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10v11l-5 -3l-5 3v-11a3 3 0 0 1 3 -3h4a3 3 0 0 1 3 3z" /><path d="M11 3h5a3 3 0 0 1 3 3v11" /></svg>`,
      'bookmarked': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6a4 4 0 0 1 4 4v11a1 1 0 0 1 -1.514 .857l-4.486 -2.691l-4.486 2.691a1 1 0 0 1 -1.508 -.743l-.006 -.114v-11a4 4 0 0 1 4 -4h4z" /><path d="M16 2a4 4 0 0 1 4 4v11a1 1 0 0 1 -2 0v-11a2 2 0 0 0 -2 -2h-5a1 1 0 0 1 0 -2h5z" /></svg>`,
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
  abstract createButton(tweetInfo: Tweet): Promise<HTMLElement>;

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
    
    // 既存のSVGアイコンをすべて削除
    const existingSvgs = button.querySelectorAll('svg');
    if (existingSvgs.length > 0) {
      console.log(`Comiketter: ${existingSvgs.length}個の既存SVGアイコンを削除`);
      existingSvgs.forEach(svg => svg.remove());
    }
    
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
  protected async createIconElement(iconName: string, sampleButton: HTMLElement): Promise<HTMLElement> {
    const theme = this.detectTheme();
    const iconColor = this.getButtonColor(theme);
    
    console.log(`Comiketter: アイコン作成開始 - ${iconName} (テーマ: ${theme}, 色: ${iconColor})`);
    
    // アイコンファイルを読み込み
    const iconSVG = await this.loadIcon(iconName);
    
    // SVG要素を作成
    const icon = this.createElementFromHTML(iconSVG);
    
    // サンプルボタンのアイコンからスタイルを取得
    const sampleIcon = sampleButton.querySelector('svg');
    if (sampleIcon) {
      icon.setAttribute('class', sampleIcon.className || 'r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi');
    }
    
    // 色を設定
    icon.style.color = iconColor;
    
    console.log(`Comiketter: アイコン作成完了 - ${iconName}`);
    
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