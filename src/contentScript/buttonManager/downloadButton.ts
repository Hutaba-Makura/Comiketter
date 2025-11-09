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
      iconSVG: '', // アイコンは動的に読み込むため空文字列
      position: 'right',
    };
    super(config);
    
    // テーマ変更を監視
    this.observeThemeChanges();
  }
  
  /**
   * テーマ変更を監視
   */
  private observeThemeChanges(): void {
    // MutationObserverでhtml要素の属性変更を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          // テーマが変更された可能性があるため、UIを更新
          this.updateThemeIfNeeded();
        }
      });
    });
    
    // html要素の属性変更を監視開始
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
  
  /**
   * 必要に応じてテーマを更新
   */
  private updateThemeIfNeeded(): void {
    // アイコンの色も更新
    if (this.currentIconElement) {
      const theme = this.detectTheme();
      const iconColor = this.getButtonColor(theme);
      this.currentIconElement.style.color = iconColor;
    }
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
      
      .comiketter-download-button {
        cursor: pointer;
        transition: opacity 0.2s ease;
        pointer-events: auto;
        position: relative;
        z-index: 1;
      }
      
      /* ホバー時のアイコン色（TwitterMediaHarvestを参考） */
      .comiketter-download-button.photoColor:hover:not(.downloading):not(.success):not(.error):not(.downloaded) svg {
        color: rgb(255, 255, 255) !important;
      }
      
      .comiketter-download-button.statusColor:hover:not(.downloading):not(.success):not(.error):not(.downloaded) svg,
      .comiketter-download-button.streamColor:hover:not(.downloading):not(.success):not(.error):not(.downloaded) svg {
        color: rgb(241, 185, 26) !important;
      }
      
      /* フォールバック: モードクラスがない場合のデフォルト色 */
      .comiketter-download-button:hover:not(.downloading):not(.success):not(.error):not(.downloaded):not(.photoColor):not(.statusColor):not(.streamColor) svg {
        color: rgb(241, 185, 26) !important;
      }
      
      /* ホバー時の円形背景エフェクト（TwitterMediaHarvestを参考） */
      .comiketter-download-button:hover .photoBG {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .comiketter-download-button:hover .statusBG,
      .comiketter-download-button:hover .streamBG {
        background: rgba(241, 185, 26, 0.1);
      }
      
      .comiketter-download-button:hover:active .photoBG {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .comiketter-download-button:hover:active .statusBG,
      .comiketter-download-button:hover:active .streamBG {
        background: rgba(241, 185, 26, 0.2);
      }
      
      .comiketter-download-button.downloading {
        pointer-events: none;
      }
      
      .comiketter-download-button.downloading svg {
        animation: comiketter-spin 1s linear infinite;
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
  }

  /**
   * DLボタンを作成
   */
  async createButton(tweetInfo: Tweet): Promise<HTMLElement> {
    console.log('Comiketter: DLボタン作成開始');
    
    // サンプルボタン（いいねボタン等）を取得してスタイルをコピー
    const sampleButton = this.getSampleButton();
    if (!sampleButton) {
      throw new Error('Failed to get sample button');
    }

    // ボタンのベースを作成
    const buttonWrapper = this.createButtonWrapper();
    const buttonElement = this.createButtonElement(sampleButton);
    
    // ボタン要素をラッパーに追加（先に追加してからアイコンを置き換える）
    const innerWrapper = buttonWrapper.querySelector('.comiketter-download-button > div');
    if (innerWrapper) {
      innerWrapper.appendChild(buttonElement);
    }
    
    // 既存のアイコンを取得して置き換える（TwitterMediaHarvestのswapIconと同様）
    const existingIcon = buttonElement.querySelector('svg') as HTMLElement;
    if (existingIcon) {
      // アイコンを作成
      this.currentIconElement = await this.createIconElement('download', sampleButton);
      // 既存のアイコンを置き換え（これにより、アイコンの位置とpreviousElementSiblingが保持される）
      existingIcon.replaceWith(this.currentIconElement);
    } else {
      // 既存のアイコンがない場合は追加
      this.currentIconElement = await this.createIconElement('download', sampleButton);
      buttonElement.appendChild(this.currentIconElement);
    }
    
    // モードを判定して適切な背景クラスと色クラスを追加
    // TwitterMediaHarvestと同様に、ボタンがDOMに追加された後に呼ぶ
    const article = this.getArticleElement(buttonElement);
    const mode = article ? this.selectArticleMode(article) : 'stream';
    this.addBackgroundClassToIconSibling(this.currentIconElement, mode);
    
    // モードに応じた色クラスを追加（TwitterMediaHarvestを参考）
    if (mode === 'photo') {
      buttonWrapper.classList.add('photoColor');
    } else if (mode === 'status') {
      buttonWrapper.classList.add('statusColor');
    } else {
      buttonWrapper.classList.add('streamColor');
    }
    
    // クリックイベントを設定
    this.setupClickHandler(buttonWrapper, tweetInfo);
    
    console.log('Comiketter: DLボタン作成完了');
    
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

      // chrome.runtimeが利用可能かチェック
      if (!chrome?.runtime?.sendMessage) {
        throw new Error('Chrome runtime is not available');
      }

      // メディアタイプをチェック
      const hasVideo = tweetInfo.media?.some(m => m.type === 'video');
      const hasImage = tweetInfo.media?.some(m => m.type === 'image');
      
      if (!hasVideo && !hasImage) {
        throw new Error('ダウンロード可能なメディアが見つかりません');
      }

      // 統合メディアダウンロード要求を送信（画像・動画同時ダウンロード）
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_MEDIA',
        payload: {
          tweetId: tweetInfo.id,
          screenName: tweetInfo.author.username,
        },
      });

      if (response && response.success) {
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