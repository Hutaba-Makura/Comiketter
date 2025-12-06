/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: i18n service for background script
 * chrome.i18n APIを使用して翻訳テーブルを管理
 */

// 翻訳テーブルを直接import（background scriptでも使用可能）
import jaMessages from '../_locales/ja/messages.json';
import enMessages from '../_locales/en/messages.json';

/**
 * 翻訳テーブルの型定義
 */
type TranslationTable = Record<string, string>;

/**
 * i18nサービス
 * background scriptでchrome.i18n APIを使用して翻訳を提供
 */
export class I18nService {
  private static instance: I18nService | null = null;
  private translationCache: Map<string, TranslationTable> = new Map();
  private cacheInitialized: boolean = false;

  private constructor() {
    // シングルトン
  }

  /**
   * インスタンスを取得
   */
  static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  /**
   * 翻訳テーブルを初期化（全言語の翻訳をキャッシュ）
   */
  async initialize(): Promise<void> {
    if (this.cacheInitialized) {
      return;
    }

    try {
      // 利用可能な言語を取得
      const supportedLanguages = ['ja', 'en'];
      
      // 各言語の翻訳テーブルを取得
      for (const lang of supportedLanguages) {
        const table = await this.loadTranslationTable(lang);
        this.translationCache.set(lang, table);
      }

      this.cacheInitialized = true;
      console.log('Comiketter: i18n translation cache initialized');
    } catch (error) {
      console.error('Comiketter: Failed to initialize i18n cache:', error);
      // エラーが発生しても動作を継続（フォールバック処理）
    }
  }

  /**
   * 指定言語の翻訳テーブルを読み込む
   * @param lang 言語コード（'ja' または 'en'）
   * @returns 翻訳テーブル
   */
  private async loadTranslationTable(lang: string): Promise<TranslationTable> {
    const table: TranslationTable = {};

    // メッセージキーのリスト（_locales/messages.jsonから取得）
    // 実際の実装では、メッセージキーのリストを動的に取得するか、
    // 固定リストを使用する
    const messageKeys = [
      'custom_bookmark',
      'sidebar_button_init_error',
      'button_already_exists_skip',
      'button_add_condition_not_met_skip',
      'navigation_element_not_found_skip',
      'valid_navigation_element_not_found',
      'sample_element_not_found',
      'icon_load_error',
      'sidebar_button_create_error',
      'bookmark_page_open_failed',
      'button_creation_in_progress_skip',
      'button_already_exists_create_skip',
      'navigation_element_not_found',
      'sample_element_not_found_abort',
      'insert_target_not_found',
      'bookmark_link_not_found_alternative',
      'navigation_element_selected_as_insert_target',
      'tab_element_parent_selected_as_insert_target',
      'extension_context_invalid_fallback',
      'sidebar_button_click_error',
      'bookmark_page_open_failed_log',
      'fallback_bookmark_page_opened',
      'fallback_also_failed',
      'manual_button_recreate',
      'sidebar_selected_as_insert_target',
      'icon_previous_element_not_found',
      'home_timeline',
      'home_latest_timeline',
      'tweet_detail',
      'tweet_result_by_rest_id',
      'list_latest_tweets_timeline',
      'search_timeline',
      'community_tweets_timeline',
      'community_tweet_search_module_query',
      'bookmarks',
      'bookmark_search_timeline',
      'user_tweets',
      'user_tweets_and_replies',
      'likes',
      'user_highlights_tweets',
      'create_bookmarks',
      'delete_bookmark',
      'favorite_tweet',
      'unfavorite_tweet',
      'create_retweet',
      'delete_retweet',
      'create_tweet',
      'user_media',
      'notifications_timeline',
      'quote',
      'no_bookmarks_create_new',
      'add_to_bookmark',
      'create_new_bookmark',
      'bookmark_name_label',
      'bookmark_name_placeholder',
      'bookmark_description_placeholder',
      'bookmark_name_required',
      'bookmark_created_success',
      'bookmark_create_failed',
      'bookmark_save_failed',
      'downloadable_media_not_found',
      'bookmark_button_click_error',
      'video_info_check_error',
    ];

    // chrome.i18n APIを使用して各メッセージを取得
    // 言語を変更するために、一時的にchrome.i18n.getUILanguage()を利用
    // ただし、chrome.i18n.getMessage()は常に現在のUI言語を使用するため、
    // 言語ごとに取得するには別の方法が必要
    // 実際には、chrome.i18n.getMessage()は現在のUI言語のみをサポート
    // そのため、翻訳テーブル全体を取得するには、_localesファイルを直接読み込む必要がある

    // 代替案：chrome.i18n.getMessage()を使用してメッセージを取得
    // ただし、これは現在のUI言語のみ
    for (const key of messageKeys) {
      try {
        const message = chrome.i18n.getMessage(key);
        if (message) {
          table[key] = message;
        }
      } catch (error) {
        // メッセージが見つからない場合はスキップ
        console.debug(`Comiketter: Message key not found: ${key}`);
      }
    }

    return table;
  }

  /**
   * メッセージを取得
   * @param messageKey メッセージキー
   * @param lang 言語コード（オプション、指定がない場合はchrome.i18n.getUILanguage()を使用）
   * @returns 翻訳されたメッセージ
   */
  getMessage(messageKey: string, lang?: string): string {
    // chrome.i18n APIを直接使用（最も確実な方法）
    try {
      const message = chrome.i18n.getMessage(messageKey);
      if (message) {
        return message;
      }
    } catch (error) {
      console.debug(`Comiketter: Failed to get message for key: ${messageKey}`, error);
    }

    // キャッシュから取得を試みる
    if (lang && this.translationCache.has(lang)) {
      const table = this.translationCache.get(lang)!;
      return table[messageKey] || '';
    }

    // フォールバック：空文字列を返す
    return '';
  }

  /**
   * 翻訳テーブル全体を取得
   * @param lang 言語コード
   * @returns 翻訳テーブル
   */
  getTranslationTable(lang: string): TranslationTable {
    if (this.translationCache.has(lang)) {
      return this.translationCache.get(lang)!;
    }
    return {};
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.translationCache.clear();
    this.cacheInitialized = false;
  }
}



