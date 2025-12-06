/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: i18n utility for bookmarks page
 * 翻訳テーブルを直接importして使用（設定された言語を反映）
 * 言語設定はStorageManagerから取得
 */

import React from 'react';
import { StorageManager } from '../../utils/storage';
import jaMessages from '../../_locales/ja/messages.json';
import enMessages from '../../_locales/en/messages.json';

// 言語設定のキャッシュ
let cachedLanguage: 'ja' | 'en' | null = null;
let languageInitialized = false;

/**
 * 言語設定を取得（キャッシュ付き）
 */
export async function getLanguage(): Promise<'ja' | 'en'> {
  if (languageInitialized && cachedLanguage) {
    return cachedLanguage;
  }

  try {
    const settings = await StorageManager.getSettings();
    const lang = (settings.language || 'ja') as 'ja' | 'en';
    cachedLanguage = lang;
    languageInitialized = true;
    return lang;
  } catch (error) {
    console.error('Comiketter: Failed to get language setting:', error);
    return 'ja'; // デフォルトは日本語
  }
}

/**
 * 言語設定のキャッシュをクリア
 */
export function clearLanguageCache(): void {
  cachedLanguage = null;
  languageInitialized = false;
}

/**
 * 翻訳テーブルからメッセージを取得
 * @param messageKey メッセージキー
 * @param lang 言語
 * @returns 翻訳されたメッセージ、見つからない場合は空文字列
 */
function getMessageFromTable(messageKey: string, lang: 'ja' | 'en'): string {
  const messages = lang === 'ja' ? jaMessages : enMessages;
  const message = messages[messageKey as keyof typeof messages];
  return message?.message || '';
}

/**
 * メッセージを取得（非同期版）
 * 設定された言語に基づいて翻訳テーブルから取得
 * 
 * @param messageKey メッセージキー
 * @param placeholders プレースホルダー（オプション）
 * @returns 翻訳されたメッセージ
 */
export async function getText(
  messageKey: string,
  placeholders?: Record<string, string>
): Promise<string> {
  const lang = await getLanguage();
  let message = getMessageFromTable(messageKey, lang);
  
  // メッセージが見つからない場合は、キーをそのまま返す
  if (!message) {
    console.warn(`Comiketter: Message key not found: ${messageKey}`);
    message = messageKey;
  }
  
  // プレースホルダーを置換
  if (placeholders) {
    Object.entries(placeholders).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      message = message.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    });
  }
  
  return message;
}

/**
 * メッセージを取得（同期版）
 * 注意: 言語設定の取得が非同期のため、初回呼び出し時はデフォルト言語（日本語）を使用
 * 
 * @param messageKey メッセージキー
 * @param placeholders プレースホルダー（オプション）
 * @returns 翻訳されたメッセージ
 */
export function getTextSync(
  messageKey: string,
  placeholders?: Record<string, string>
): string {
  // キャッシュされた言語を使用、なければデフォルト（日本語）
  const lang = cachedLanguage || 'ja';
  let message = getMessageFromTable(messageKey, lang);
  
  // メッセージが見つからない場合は、キーをそのまま返す
  if (!message) {
    message = messageKey;
  }
  
  // プレースホルダーを置換
  if (placeholders) {
    Object.entries(placeholders).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      message = message.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    });
  }
  
  return message;
}

/**
 * React Hook: 言語設定を取得
 */
export function useLanguage(): 'ja' | 'en' {
  const [language, setLanguage] = React.useState<'ja' | 'en'>('ja');
  
  React.useEffect(() => {
    getLanguage().then(setLanguage);
  }, []);
  
  return language;
}

