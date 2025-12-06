/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: i18n utility for contentScript
 * 
 * 注意: このファイルはMAIN worldとISOLATED worldの両方で使用される可能性があります。
 * - ISOLATED world: chrome.i18n APIが利用可能
 * - MAIN world: chrome.i18n APIは利用不可（翻訳テーブルを直接使用）
 * 
 * 実装方針:
 * - 翻訳テーブルを直接importして使用（MAIN worldでも動作するように）
 * - chrome.i18n APIは使用しない（MAIN worldとの互換性のため）
 * - 常に翻訳テーブルから直接取得（一貫性と互換性のため）
 */

// 翻訳テーブルを直接import（main worldでも動作するように）
import jaMessages from '../_locales/ja/messages.json';
import enMessages from '../_locales/en/messages.json';

/**
 * HTMLのlang属性から言語を取得
 * @returns 'ja' または 'en'
 */
function getLanguageFromHTML(): 'ja' | 'en' {
  const htmlLang = document.documentElement.getAttribute('lang');
  if (htmlLang && htmlLang.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
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
 * 日本語テキストからメッセージキーを取得するマッピング
 * 実際の実装では、テキストから直接キーを生成するか、マッピングテーブルを使用
 */
const textToKeyMap: Record<string, string> = {
  'カスタムブックマーク': 'custom_bookmark',
  'サイドバーボタン初期化エラー': 'sidebar_button_init_error',
  '既にボタンが存在するため、初期化をスキップ': 'button_already_exists_skip',
  'ボタン追加条件を満たさないため、スキップ': 'button_add_condition_not_met_skip',
  'ナビゲーション要素が見つからないため、スキップ': 'navigation_element_not_found_skip',
  '有効なナビゲーション要素が見つかりません': 'valid_navigation_element_not_found',
  'サンプル要素が見つかりません': 'sample_element_not_found',
  'アイコン読み込みエラー': 'icon_load_error',
  'サイドバーボタン作成エラー': 'sidebar_button_create_error',
  'ブックマークページを開けませんでした。手動でブックマークページにアクセスしてください。': 'bookmark_page_open_failed',
  'ボタン作成処理中のため、作成をスキップ': 'button_creation_in_progress_skip',
  '既にボタンが存在するため、作成をスキップ': 'button_already_exists_create_skip',
  'ナビゲーション要素が見つかりません': 'navigation_element_not_found',
  'サンプル要素が見つかりません。ボタン作成を中止': 'sample_element_not_found_abort',
  '挿入先が見つかりません': 'insert_target_not_found',
  'ブックマークリンクが見つからないため、代替手段を試行': 'bookmark_link_not_found_alternative',
  'ナビゲーション要素を挿入先として選択': 'navigation_element_selected_as_insert_target',
  'タブ要素の親を挿入先として選択': 'tab_element_parent_selected_as_insert_target',
  '拡張機能コンテキストが無効です。フォールバック処理を実行': 'extension_context_invalid_fallback',
  'サイドバーボタンクリックエラー': 'sidebar_button_click_error',
  'ブックマークページを開けませんでした': 'bookmark_page_open_failed_log',
  'フォールバック処理でブックマークページを開きました': 'fallback_bookmark_page_opened',
  'フォールバック処理も失敗しました': 'fallback_also_failed',
  '手動でボタンを再作成': 'manual_button_recreate',
  'サイドバー自体を挿入先として選択': 'sidebar_selected_as_insert_target',
  'アイコンの前の要素が見つかりません': 'icon_previous_element_not_found',
  'ホームタイムライン': 'home_timeline',
  'ホーム最新タイムライン': 'home_latest_timeline',
  'ツイート詳細': 'tweet_detail',
  'ツイート結果（ID指定）': 'tweet_result_by_rest_id',
  'リスト最新ツイートタイムライン': 'list_latest_tweets_timeline',
  '検索タイムライン': 'search_timeline',
  'コミュニティタイムライン': 'community_tweets_timeline',
  'コミュニティ検索タイムライン': 'community_tweet_search_module_query',
  'ブックマークタイムライン': 'bookmarks',
  'ブックマーク検索タイムライン': 'bookmark_search_timeline',
  'ユーザーツイート': 'user_tweets',
  'ユーザー返信': 'user_tweets_and_replies',
  'ユーザーいいね': 'likes',
  'ユーザーハイライトツイート': 'user_highlights_tweets',
  'ブックマーク作成': 'create_bookmarks',
  'ブックマーク削除': 'delete_bookmark',
  'ツイートいいね': 'favorite_tweet',
  'ツイートいいね解除': 'unfavorite_tweet',
  'リツイート作成': 'create_retweet',
  'リツイート削除': 'delete_retweet',
  'ツイート作成': 'create_tweet',
  'ユーザーメディア': 'user_media',
  '通知タイムライン': 'notifications_timeline',
  '引用': 'quote',
  'ブックマークがありません。新しいブックマークを作成してください。': 'no_bookmarks_create_new',
  'ブックマークに追加': 'add_to_bookmark',
  '新しいブックマークを作成': 'create_new_bookmark',
  'ブックマーク名 *': 'bookmark_name_label',
  'ブックマーク名を入力': 'bookmark_name_placeholder',
  'ブックマークの説明を入力': 'bookmark_description_placeholder',
  'ブックマーク名を入力してください': 'bookmark_name_required',
  'ブックマークを作成しました': 'bookmark_created_success',
  'ブックマークの作成に失敗しました': 'bookmark_create_failed',
  'ブックマークの保存に失敗しました': 'bookmark_save_failed',
  'ダウンロード可能なメディアが見つかりません': 'downloadable_media_not_found',
  'ブックマークボタンクリック処理でエラー発生': 'bookmark_button_click_error',
  '動画情報チェック中にエラーが発生しました': 'video_info_check_error',
  '保存': 'save',
  'キャンセル': 'cancel',
  '作成': 'create',
  '説明（任意）': 'description_optional',
};

/**
 * メッセージキーを生成（webextension-polyfillの命名規則に準拠）
 * @param text テキスト
 * @param context コンテキスト（オプション）
 * @returns メッセージキー
 */
function makeMessageKey(text: string, context?: string): string {
  // マッピングテーブルからキーを取得
  const key = textToKeyMap[text] || text;
  return context ? `${context}_${key}` : key;
}

/**
 * メッセージを取得
 * 
 * 実装方針:
 * - MAIN worldでは常に翻訳テーブルを使用（chrome.i18n APIは利用不可）
 * - ISOLATED worldでは翻訳テーブルを優先的に使用（一貫性のため）
 * - chrome.i18n APIは使用しない（MAIN worldとの互換性のため）
 * 
 * @param text テキスト
 * @param context コンテキスト（オプション）
 * @param placeholders プレースホルダー（オプション）
 * @returns 翻訳されたメッセージ
 */
export function getText(
  text: string,
  context?: string,
  placeholders?: Record<string, string>
): string {
  const lang = getLanguageFromHTML();
  const messageKey = makeMessageKey(text, context);
  
  // 常に翻訳テーブルから取得（MAIN worldとISOLATED worldの両方で動作）
  // 注意: MAIN worldではchrome.i18n APIは利用できないため、
  // 翻訳テーブルを直接使用する実装が必須
  let message = getMessageFromTable(messageKey, lang) || text;
  
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
 * 複数形対応のメッセージを取得
 * @param count 数
 * @param text 単数形テキスト
 * @param pluralText 複数形テキスト
 * @param context コンテキスト（オプション）
 * @param placeholders プレースホルダー（オプション）
 * @returns 翻訳されたメッセージ
 */
export function getTextPlural(
  count: number,
  text: string,
  pluralText: string,
  context?: string,
  placeholders?: Record<string, string>
): string {
  const targetText = count === 1 ? text : pluralText;
  return getText(targetText, context, { ...placeholders, count: count.toString() });
}

