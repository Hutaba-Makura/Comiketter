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

    console.log('Comiketter: Creating buttons for tweet:', {
      id: tweetInfo.id,
      hasMedia: !!tweetInfo.media,
      mediaLength: tweetInfo.media?.length || 0,
      shouldCreateDownload: this.shouldCreateDownloadButton(tweetInfo)
    });

    // DLボタンを作成（メディアがある場合のみ）
    if (this.shouldCreateDownloadButton(tweetInfo)) {
      console.log('Comiketter: Creating download button');
      const downloadButtonElement = this.downloadButton.createButton(tweetInfo);
      buttons.push({
        element: downloadButtonElement,
        position: 'right',
      });
    } else {
      console.log('Comiketter: Skipping download button - no media');
    }

    // CBボタンを作成（常に作成）
    console.log('Comiketter: Creating bookmark button');
    const bookmarkButtonElement = this.bookmarkButton.createButton(tweetInfo);
    buttons.push({
      element: bookmarkButtonElement,
      position: 'left',
    });

    console.log('Comiketter: Created buttons:', buttons.length);
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
    console.log('Comiketter: Inserting buttons to action bar:', {
      totalButtons: buttons.length,
      leftButtons: buttons.filter(btn => btn.position === 'left').length,
      rightButtons: buttons.filter(btn => btn.position === 'right').length,
      actionBarChildren: actionBar.children.length
    });

    const leftButtons = buttons.filter(btn => btn.position === 'left');
    const rightButtons = buttons.filter(btn => btn.position === 'right');

    // 右側のボタン（DLボタン）を最初に挿入（一番右端）
    rightButtons.forEach((buttonInfo, index) => {
      console.log(`Comiketter: Inserting right button ${index + 1}:`, buttonInfo.element);
      actionBar.appendChild(buttonInfo.element);
    });

    // 左側のボタン（CBボタン）を最後に挿入
    leftButtons.forEach((buttonInfo, index) => {
      console.log(`Comiketter: Inserting left button ${index + 1}:`, buttonInfo.element);
      if (actionBar.firstChild) {
        actionBar.insertBefore(buttonInfo.element, actionBar.firstChild);
      } else {
        actionBar.appendChild(buttonInfo.element);
      }
    });

    console.log('Comiketter: Action bar after insertion:', {
      children: actionBar.children.length,
      hasDownloadButton: !!actionBar.querySelector('.comiketter-download-button'),
      hasBookmarkButton: !!actionBar.querySelector('.comiketter-bookmark-button')
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