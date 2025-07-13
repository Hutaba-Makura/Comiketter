/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: Download config mapper for browser download options
 * Modified and adapted from TwitterMediaHarvest downloadConfig.ts
 */

import type { DownloadConfig } from '../types';
import { ConflictAction } from '../types';

/**
 * ダウンロード設定をブラウザダウンロードオプションに変換
 * TwitterMediaHarvest準拠の実装
 */
export const downloadConfigToBrowserDownloadOptions = (
  config: DownloadConfig
): chrome.downloads.DownloadOptions => {
  const options: chrome.downloads.DownloadOptions = {
    filename: config.filename,
    conflictAction: config.conflictAction,
    url: config.url,
    saveAs: config.saveAs,
  };

  // Firefoxではpromptが実装されていないため除外
  if (options.conflictAction === ConflictAction.Prompt) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { conflictAction, ...rest } = options;
    return rest;
  }

  return options;
};

/**
 * ダウンロード設定を作成
 * TwitterMediaHarvest準拠の実装
 */
export const createDownloadConfig = (
  url: string,
  filename: string,
  saveAs: boolean = false,
  conflictAction: ConflictAction = ConflictAction.Uniquify
): DownloadConfig => {
  return {
    url,
    filename,
    saveAs,
    conflictAction,
  };
}; 