/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ボタンファクトリ
 */

import type { Tweet } from '../../types';
import { DownloadButton } from './downloadButton';
import { BookmarkButton } from './bookmarkButton';

export interface ButtonInfo {
  element: HTMLElement;
  position: 'left' | 'right';
}

export class ButtonFactory {
  private downloadButton: DownloadButton;
  private bookmarkButton: BookmarkButton;

  constructor() {
    this.downloadButton = new DownloadButton();
    this.bookmarkButton = new BookmarkButton();
  }

  /**
   * ツイートに必要なボタンを全て作成
   */
  createButtonsForTweet(tweetInfo: Tweet): ButtonInfo[] {
    const buttons: ButtonInfo[] = [];

    // DLボタンを作成（メディアがある場合のみ）
    if (this.shouldCreateDownloadButton(tweetInfo)) {
      const downloadButtonElement = this.downloadButton.createButton(tweetInfo);
      buttons.push({
        element: downloadButtonElement,
        position: 'left',
      });
    }

    // CBボタンを作成（常に作成）
    const bookmarkButtonElement = this.bookmarkButton.createButton(tweetInfo);
    buttons.push({
      element: bookmarkButtonElement,
      position: 'right',
    });

    return buttons;
  }

  /**
   * DLボタンを作成すべきか判定
   */
  private shouldCreateDownloadButton(tweetInfo: Tweet): boolean {
    // メディアが含まれているかチェック
    return !!(tweetInfo.media && tweetInfo.media.length > 0);
  }

  /**
   * ボタンをアクションバーに挿入（順序を制御）
   */
  insertButtonsToActionBar(actionBar: HTMLElement, buttons: ButtonInfo[]): void {
    // 左側のボタン（DLボタン）を最初に挿入
    const leftButtons = buttons.filter(btn => btn.position === 'left');
    const rightButtons = buttons.filter(btn => btn.position === 'right');

    // 左側のボタンを最初に挿入
    leftButtons.forEach(buttonInfo => {
      if (actionBar.firstChild) {
        actionBar.insertBefore(buttonInfo.element, actionBar.firstChild);
      } else {
        actionBar.appendChild(buttonInfo.element);
      }
    });

    // 右側のボタンを最後に挿入
    rightButtons.forEach(buttonInfo => {
      actionBar.appendChild(buttonInfo.element);
    });
  }

  /**
   * 既存のボタンをチェックして重複を防ぐ
   */
  shouldAddButtons(article: HTMLElement): boolean {
    // 既にDLボタンが存在する場合は追加しない
    if (article.querySelector('.comiketter-download-button')) {
      return false;
    }

    // 既にCBボタンが存在する場合は追加しない
    if (article.querySelector('.comiketter-bookmark-button')) {
      return false;
    }

    return true;
  }
} 