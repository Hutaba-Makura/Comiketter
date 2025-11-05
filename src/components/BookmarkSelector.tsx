/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマーク選択UIコンポーネント
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { CustomBookmark, Tweet } from '../types';
import { BookmarkManager } from '../utils/bookmarkManager';

// ログ送信関数
const sendLog = (message: string, data?: any) => {
  const logMessage = `[Comiketter] ${message}`;
  console.log(logMessage, data);
  
  // バックグラウンドスクリプトにログを送信
  try {
    chrome.runtime.sendMessage({
      type: 'LOG',
      message: logMessage,
      data: data,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // 送信に失敗しても無視（バックグラウンドが利用できない場合など）
    });
  } catch (error) {
    // chrome.runtimeが利用できない場合は無視
  }
};

interface BookmarkSelectorProps {
  tweet: Tweet;
  onClose: () => void;
  onBookmarkAdded: (bookmarkIds: string[]) => void;
}

interface BookmarkSelectorState {
  bookmarks: CustomBookmark[];
  selectedBookmarks: string[];
  isLoading: boolean;
  showCreateForm: boolean;
  newBookmarkName: string;
  newBookmarkDescription: string;
  errorMessage: string;
  searchQuery: string;
  sortBy: 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  theme: 'light' | 'darkBlue' | 'black';
}

// テーマ検出関数
const detectTheme = (): 'light' | 'darkBlue' | 'black' => {
  sendLog('テーマ検出開始');
  
  // body要素のbackground-colorを計算されたスタイルから取得
  const computedStyle = getComputedStyle(document.body);
  const backgroundColor = computedStyle.backgroundColor;
  sendLog('body background-color (computed):', backgroundColor);
  
  // 直接スタイル属性も確認
  const inlineStyle = document.body.style.backgroundColor;
  sendLog('body background-color (inline):', inlineStyle);
  
  // 両方の値をチェック
  const colorToCheck = backgroundColor || inlineStyle;
  
  if (colorToCheck === 'rgb(255, 255, 255)') {
    sendLog('ライトテーマと判定');
    return 'light';
  } else if (colorToCheck === 'rgb(21, 32, 43)') {
    sendLog('ダークブルーテーマと判定');
    return 'darkBlue';
  } else if (colorToCheck === 'rgb(0, 0, 0)') {
    sendLog('ブラックテーマと判定');
    return 'black';
  }
  
  sendLog('不明なテーマ、デフォルトでライトテーマと判定');
  sendLog('検出された色:', colorToCheck);
  return 'light';
};

// テーマに応じたスタイルを取得
const getThemeStyles = (theme: 'light' | 'darkBlue' | 'black') => {
  switch (theme) {
    case 'light':
      return {
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        },
        container: {
          backgroundColor: '#ffffff',
          border: '1px solid #e1e8ed',
          color: '#14171a',
        },
        header: {
          borderBottom: '1px solid #e1e8ed',
        },
        input: {
          backgroundColor: '#ffffff',
          border: '1px solid #e1e8ed',
          color: '#14171a',
        },
        select: {
          backgroundColor: '#ffffff',
          border: '1px solid #e1e8ed',
          color: '#14171a',
        },
        textarea: {
          backgroundColor: '#ffffff',
          border: '1px solid #e1e8ed',
          color: '#14171a',
        },
        divider: {
          borderColor: '#e1e8ed',
        },
        secondaryText: {
          color: '#657786',
        },
        errorText: {
          color: '#e0245e',
        },
        primaryButton: {
          backgroundColor: '#1da1f2',
          color: '#ffffff',
        },
        secondaryButton: {
          backgroundColor: 'transparent',
          border: '1px solid #rgb(207, 217, 222)',
          color: '#14171a',
        },
        createButton: {
          border: '1px solid #1da1f2',
          color: '#1da1f2',
          backgroundColor: 'transparent',
        },
      };
    case 'darkBlue':
      return {
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
        },
        container: {
          backgroundColor: '#15202b',
          border: '1px solid #38444d',
          color: '#ffffff',
        },
        header: {
          borderBottom: '1px solid #38444d',
        },
        input: {
          backgroundColor: '#253341',
          border: '1px solid #38444d',
          color: '#ffffff',
        },
        select: {
          backgroundColor: '#253341',
          border: '1px solid #38444d',
          color: '#ffffff',
        },
        textarea: {
          backgroundColor: '#253341',
          border: '1px solid #38444d',
          color: '#ffffff',
        },
        divider: {
          borderColor: '#38444d',
        },
        secondaryText: {
          color: '#8899a6',
        },
        errorText: {
          color: '#e0245e',
        },
        primaryButton: {
          backgroundColor: '#1da1f2',
          color: '#ffffff',
        },
        secondaryButton: {
          backgroundColor: 'transparent',
          border: '1px solid #38444d',
          color: '#ffffff',
        },
        createButton: {
          border: '1px solid #1da1f2',
          color: '#1da1f2',
          backgroundColor: 'transparent',
        },
      };
    case 'black':
      return {
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        },
        container: {
          backgroundColor: '#000000',
          border: '1px solid #2f3336',
          color: '#ffffff',
        },
        header: {
          borderBottom: '1px solid #2f3336',
        },
        input: {
          backgroundColor: '#000000',
          border: '1px solid #2f3336',
          color: '#ffffff',
        },
        select: {
          backgroundColor: '#000000',
          border: '1px solid #2f3336',
          color: '#ffffff',
        },
        textarea: {
          backgroundColor: '#000000',
          border: '1px solid #2f3336',
          color: '#ffffff',
        },
        divider: {
          borderColor: '#2f3336',
        },
        secondaryText: {
          color: '#6e767d',
        },
        errorText: {
          color: '#e0245e',
        },
        primaryButton: {
          backgroundColor: '#1da1f2',
          color: '#ffffff',
        },
        secondaryButton: {
          backgroundColor: 'transparent',
          border: '1px solid #2f3336',
          color: '#ffffff',
        },
        createButton: {
          border: '1px solid #1da1f2',
          color: '#1da1f2',
          backgroundColor: 'transparent',
        },
      };
  }
};

export const BookmarkSelector: React.FC<BookmarkSelectorProps> = ({
  tweet,
  onClose,
  onBookmarkAdded,
}) => {
  const [state, setState] = useState<BookmarkSelectorState>({
    bookmarks: [],
    selectedBookmarks: [],
    isLoading: true,
    showCreateForm: false,
    newBookmarkName: '',
    newBookmarkDescription: '',
    errorMessage: '',
    searchQuery: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    theme: 'light',
  });

  const bookmarkManager = BookmarkManager.getInstance();
  const themeStyles = getThemeStyles(state.theme);

  // 初期化
  useEffect(() => {
    sendLog('BookmarkSelector初期化開始');
    initializeBookmarks();
    detectAndUpdateTheme();
    
    // テーマ変更を監視
    const observer = new MutationObserver((mutations) => {
      sendLog(`DOM変更を検出: ${mutations.length}件`);
      detectAndUpdateTheme();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    
    return () => observer.disconnect();
  }, []);

  // テーマ検出と更新
  const detectAndUpdateTheme = useCallback(() => {
    const theme = detectTheme();
    sendLog('テーマ更新:', theme);
    setState(prev => ({
      ...prev,
      theme,
    }));
  }, []);

  // ブックマーク初期化
  const initializeBookmarks = async () => {
    try {
      await bookmarkManager.initialize();
      const bookmarks = await bookmarkManager.getBookmarks();
      const sortedBookmarks = await bookmarkManager.sortBookmarks(bookmarks, state.sortBy);
      
      // 既にブックマークされているものを選択状態にする
      const bookmarkedIds = (await bookmarkManager.getBookmarksForTweet(tweet.id)).map(b => b.id);
      
      setState(prev => ({
        ...prev,
        bookmarks: sortedBookmarks,
        selectedBookmarks: bookmarkedIds,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to initialize bookmarks:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        errorMessage: 'ブックマークの読み込みに失敗しました',
      }));
    }
  };

  // ブックマーク選択状態を切り替え
  const toggleBookmarkSelection = useCallback((bookmarkId: string) => {
    setState(prev => ({
      ...prev,
      selectedBookmarks: prev.selectedBookmarks.includes(bookmarkId)
        ? prev.selectedBookmarks.filter(id => id !== bookmarkId)
        : [...prev.selectedBookmarks, bookmarkId],
    }));
  }, []);

  // 新規ブックマーク作成フォームを表示
  const showCreateBookmarkForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCreateForm: true,
      errorMessage: '',
    }));
  }, []);

  // 新規ブックマーク作成フォームを非表示
  const hideCreateBookmarkForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCreateForm: false,
      newBookmarkName: '',
      newBookmarkDescription: '',
      errorMessage: '',
    }));
  }, []);

  // 新規ブックマークを作成
  const createBookmark = async () => {
    const { newBookmarkName, newBookmarkDescription } = state;
    
    // バリデーション
    const validation = await bookmarkManager.validateBookmark(newBookmarkName);
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        errorMessage: validation.error || 'バリデーションエラー',
      }));
      return;
    }

    try {
      const newBookmark = await bookmarkManager.addBookmark(newBookmarkName, newBookmarkDescription);
      
      setState(prev => ({
        ...prev,
        bookmarks: [...prev.bookmarks, newBookmark],
        selectedBookmarks: [...prev.selectedBookmarks, newBookmark.id],
        showCreateForm: false,
        newBookmarkName: '',
        newBookmarkDescription: '',
        errorMessage: '',
      }));
    } catch (error) {
      console.error('Failed to create bookmark:', error);
      setState(prev => ({
        ...prev,
        errorMessage: 'ブックマークの作成に失敗しました',
      }));
    }
  };

  // ブックマークを保存
  const saveBookmarks = async () => {
    try {
      // 各ブックマークにツイートを追加
      for (const bookmarkId of state.selectedBookmarks) {
        await bookmarkManager.addTweetToBookmark(bookmarkId, tweet.id);
      }
      onBookmarkAdded(state.selectedBookmarks);
      onClose();
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
      setState(prev => ({
        ...prev,
        errorMessage: 'ブックマークの保存に失敗しました',
      }));
    }
  };

  // 検索クエリを更新
  const updateSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
    }));
  }, []);

  // 並び替えを更新
  const updateSort = useCallback(async (sortBy: 'name' | 'createdAt' | 'updatedAt', order: 'asc' | 'desc') => {
    const sortedBookmarks = await bookmarkManager.sortBookmarks(state.bookmarks, sortBy);
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: order,
      bookmarks: sortedBookmarks,
    }));
  }, [bookmarkManager, state.bookmarks]);

  // フィルタリングされたブックマークを取得
  const filteredBookmarks = state.bookmarks.filter(bookmark =>
    bookmark.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
    (bookmark.description && bookmark.description.toLowerCase().includes(state.searchQuery.toLowerCase()))
  );

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (state.isLoading) {
    return (
      <div className="comiketter-overlay" style={themeStyles.overlay}>
        <div className="comiketter-bookmark-selector" style={themeStyles.container}>
          <div className="comiketter-bookmark-selector-content">
            <div style={{ textAlign: 'center', padding: '20px', color: themeStyles.container.color }}>
              読み込み中...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comiketter-overlay" style={themeStyles.overlay} onClick={onClose}>
      <div className="comiketter-bookmark-selector" style={themeStyles.container} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="comiketter-bookmark-selector-header" style={themeStyles.header}>
          <div className="comiketter-bookmark-selector-title" style={{ color: themeStyles.container.color }}>
            ブックマークに追加
          </div>
          <button
            className="comiketter-bookmark-selector-close"
            onClick={onClose}
            aria-label="閉じる"
            style={{ color: themeStyles.container.color }}
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="comiketter-bookmark-selector-content">
          {/* エラーメッセージ */}
          {state.errorMessage && (
            <div style={{ 
              color: themeStyles.errorText.color, 
              padding: '8px 0', 
              fontSize: '14px',
              borderBottom: `1px solid ${themeStyles.divider.borderColor}`,
              marginBottom: '12px'
            }}>
              {state.errorMessage}
            </div>
          )}

          {/* 検索・並び替え */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="ブックマークを検索..."
              value={state.searchQuery}
              onChange={(e) => updateSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                marginBottom: '8px',
                ...themeStyles.input,
              }}
            />
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
              <select
                value={`${state.sortBy}-${state.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as ['name' | 'createdAt' | 'updatedAt', 'asc' | 'desc'];
                  updateSort(sortBy, sortOrder);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  ...themeStyles.select,
                }}
              >
                <option value="updatedAt-desc">更新日時（新しい順）</option>
                <option value="updatedAt-asc">更新日時（古い順）</option>
                <option value="name-asc">名前（A-Z）</option>
                <option value="name-desc">名前（Z-A）</option>

                <option value="createdAt-desc">作成日時（新しい順）</option>
                <option value="createdAt-asc">作成日時（古い順）</option>
              </select>
            </div>
          </div>

          {/* ブックマーク一覧 */}
          {filteredBookmarks.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: themeStyles.secondaryText.color,
              fontSize: '14px'
            }}>
              {state.searchQuery ? '検索結果がありません' : 'ブックマークがありません'}
            </div>
          ) : (
            <div>
              {filteredBookmarks.map((bookmark) => (
                <div key={bookmark.id} className="comiketter-bookmark-item">
                  <input
                    type="checkbox"
                    className="comiketter-bookmark-checkbox"
                    checked={state.selectedBookmarks.includes(bookmark.id)}
                    onChange={() => toggleBookmarkSelection(bookmark.id)}
                    id={`bookmark-${bookmark.id}`}
                  />
                  <label
                    htmlFor={`bookmark-${bookmark.id}`}
                    style={{ flex: 1, cursor: 'pointer' }}
                  >
                    <div className="comiketter-bookmark-name" style={{ color: themeStyles.container.color }}>
                      {bookmark.name}
                    </div>
                    {bookmark.description && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: themeStyles.secondaryText.color, 
                        marginTop: '2px' 
                      }}>
                        {bookmark.description}
                      </div>
                    )}
                    <div className="comiketter-bookmark-count" style={{ color: themeStyles.secondaryText.color }}>
                      {formatDate(bookmark.updatedAt)}更新
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* 新規ブックマーク作成ボタン */}
          <div style={{ 
            padding: '12px 0', 
            borderTop: `1px solid ${themeStyles.divider.borderColor}`, 
            marginTop: '12px' 
          }}>
            <button
              onClick={showCreateBookmarkForm}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                ...themeStyles.createButton,
              }}
            >
              ＋ 新しいブックマークを作成
            </button>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="comiketter-bookmark-actions">
          <button
            className="comiketter-bookmark-button-secondary"
            onClick={onClose}
            style={themeStyles.secondaryButton}
          >
            キャンセル
          </button>
          <button
            className="comiketter-bookmark-button-primary"
            onClick={saveBookmarks}
            disabled={state.selectedBookmarks.length === 0}
            style={{
              ...themeStyles.primaryButton,
              opacity: state.selectedBookmarks.length === 0 ? 0.5 : 1,
              cursor: state.selectedBookmarks.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            保存 ({state.selectedBookmarks.length})
          </button>
        </div>

        {/* 新規ブックマーク作成フォーム */}
        {state.showCreateForm && (
          <div className="comiketter-overlay" style={{ ...themeStyles.overlay, zIndex: 10001 }}>
            <div 
              className="comiketter-bookmark-selector" 
              style={{ width: '350px', ...themeStyles.container }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="comiketter-bookmark-selector-header" style={themeStyles.header}>
                <div className="comiketter-bookmark-selector-title" style={{ color: themeStyles.container.color }}>
                  新しいブックマーク
                </div>
                <button
                  className="comiketter-bookmark-selector-close"
                  onClick={hideCreateBookmarkForm}
                  style={{ color: themeStyles.container.color }}
                >
                  ×
                </button>
              </div>
              
              <div className="comiketter-bookmark-selector-content">
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: themeStyles.container.color
                  }}>
                    名前 *
                  </label>
                  <input
                    type="text"
                    value={state.newBookmarkName}
                    onChange={(e) => setState(prev => ({ ...prev, newBookmarkName: e.target.value }))}
                    placeholder="ブックマーク名を入力"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      ...themeStyles.input,
                    }}
                    maxLength={50}
                  />
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: themeStyles.container.color
                  }}>
                    説明（任意）
                  </label>
                  <textarea
                    value={state.newBookmarkDescription}
                    onChange={(e) => setState(prev => ({ ...prev, newBookmarkDescription: e.target.value }))}
                    placeholder="ブックマークの説明を入力"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      minHeight: '80px',
                      resize: 'vertical',
                      ...themeStyles.textarea,
                    }}
                    maxLength={200}
                  />
                </div>
              </div>
              
              <div className="comiketter-bookmark-actions">
                <button
                  className="comiketter-bookmark-button-secondary"
                  onClick={hideCreateBookmarkForm}
                  style={themeStyles.secondaryButton}
                >
                  キャンセル
                </button>
                <button
                  className="comiketter-bookmark-button-primary"
                  onClick={createBookmark}
                  disabled={!state.newBookmarkName.trim()}
                  style={{
                    ...themeStyles.primaryButton,
                    opacity: !state.newBookmarkName.trim() ? 0.5 : 1,
                    cursor: !state.newBookmarkName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 