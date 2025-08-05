/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: データベース関連の関数をまとめたインデックスファイル
 */

// ブックマーク関連のDB関数
export { BookmarkDatabase, bookmarkDB } from './bookmark-db';
export type { BookmarkDB, BookmarkedTweetDB, BookmarkStats } from './bookmark-db';

// ダウンロード履歴関連のDB関数
export { DownloadHistoryDatabase, downloadHistoryDB } from './download-history-db';
export type { DownloadHistoryDB } from './download-history-db';

// 設定関連のDB関数
export { SettingsDatabase, settingsDB } from './settings-db';
export type { SettingsDB } from './settings-db';

// 統合DB管理クラス
export { DatabaseManager } from './database-manager'; 