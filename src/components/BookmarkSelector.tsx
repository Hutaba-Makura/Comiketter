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
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'tweetCount';
  sortOrder: 'asc' | 'desc';
}

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
  });

  const bookmarkManager = BookmarkManager.getInstance();

  // 初期化
  useEffect(() => {
    initializeBookmarks();
  }, []);

  // ブックマーク初期化
  const initializeBookmarks = async () => {
    try {
      await bookmarkManager.initialize();
      const bookmarks = await bookmarkManager.getBookmarks();
      const sortedBookmarks = bookmarkManager.sortBookmarks(state.sortBy, state.sortOrder);
      
      // 既にブックマークされているものを選択状態にする
      const bookmarkedIds = bookmarkManager.getBookmarksForTweet(tweet.id).map(b => b.id);
      
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
    const validation = bookmarkManager.validateBookmark(newBookmarkName, newBookmarkDescription);
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        errorMessage: validation.errors.join(', '),
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
      await bookmarkManager.addTweetToBookmark(tweet, state.selectedBookmarks);
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
  const updateSort = useCallback((sortBy: 'name' | 'createdAt' | 'updatedAt' | 'tweetCount', order: 'asc' | 'desc') => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: order,
      bookmarks: bookmarkManager.sortBookmarks(sortBy, order),
    }));
  }, [bookmarkManager]);

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
      <div className="comiketter-overlay">
        <div className="comiketter-bookmark-selector">
          <div className="comiketter-bookmark-selector-content">
            <div style={{ textAlign: 'center', padding: '20px' }}>
              読み込み中...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comiketter-overlay" onClick={onClose}>
      <div className="comiketter-bookmark-selector" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="comiketter-bookmark-selector-header">
          <div className="comiketter-bookmark-selector-title">
            ブックマークに追加
          </div>
          <button
            className="comiketter-bookmark-selector-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="comiketter-bookmark-selector-content">
          {/* エラーメッセージ */}
          {state.errorMessage && (
            <div style={{ 
              color: '#e0245e', 
              padding: '8px 0', 
              fontSize: '14px',
              borderBottom: '1px solid #e1e8ed',
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
                border: '1px solid #e1e8ed',
                borderRadius: '20px',
                fontSize: '14px',
                marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
              <select
                value={`${state.sortBy}-${state.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as ['name' | 'createdAt' | 'updatedAt' | 'tweetCount', 'asc' | 'desc'];
                  updateSort(sortBy, sortOrder);
                }}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #e1e8ed',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <option value="updatedAt-desc">更新日時（新しい順）</option>
                <option value="updatedAt-asc">更新日時（古い順）</option>
                <option value="name-asc">名前（A-Z）</option>
                <option value="name-desc">名前（Z-A）</option>
                <option value="tweetCount-desc">ツイート数（多い順）</option>
                <option value="tweetCount-asc">ツイート数（少ない順）</option>
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
              color: '#657786',
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
                    <div className="comiketter-bookmark-name">{bookmark.name}</div>
                    {bookmark.description && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#657786', 
                        marginTop: '2px' 
                      }}>
                        {bookmark.description}
                      </div>
                    )}
                    <div className="comiketter-bookmark-count">
                      {bookmark.tweetCount}件のツイート • {formatDate(bookmark.updatedAt)}更新
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* 新規ブックマーク作成ボタン */}
          <div style={{ 
            padding: '12px 0', 
            borderTop: '1px solid #e1e8ed', 
            marginTop: '12px' 
          }}>
            <button
              onClick={showCreateBookmarkForm}
              style={{
                background: 'none',
                border: '1px solid #1da1f2',
                color: '#1da1f2',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
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
          >
            キャンセル
          </button>
          <button
            className="comiketter-bookmark-button-primary"
            onClick={saveBookmarks}
            disabled={state.selectedBookmarks.length === 0}
            style={{
              opacity: state.selectedBookmarks.length === 0 ? 0.5 : 1,
              cursor: state.selectedBookmarks.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            保存 ({state.selectedBookmarks.length})
          </button>
        </div>

        {/* 新規ブックマーク作成フォーム */}
        {state.showCreateForm && (
          <div className="comiketter-overlay" style={{ zIndex: 10001 }}>
            <div 
              className="comiketter-bookmark-selector" 
              style={{ width: '350px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="comiketter-bookmark-selector-header">
                <div className="comiketter-bookmark-selector-title">
                  新しいブックマーク
                </div>
                <button
                  className="comiketter-bookmark-selector-close"
                  onClick={hideCreateBookmarkForm}
                >
                  ×
                </button>
              </div>
              
              <div className="comiketter-bookmark-selector-content">
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
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
                      border: '1px solid #e1e8ed',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                    maxLength={50}
                  />
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                    説明（任意）
                  </label>
                  <textarea
                    value={state.newBookmarkDescription}
                    onChange={(e) => setState(prev => ({ ...prev, newBookmarkDescription: e.target.value }))}
                    placeholder="ブックマークの説明を入力"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e1e8ed',
                      borderRadius: '8px',
                      fontSize: '14px',
                      minHeight: '80px',
                      resize: 'vertical',
                    }}
                    maxLength={200}
                  />
                </div>
              </div>
              
              <div className="comiketter-bookmark-actions">
                <button
                  className="comiketter-bookmark-button-secondary"
                  onClick={hideCreateBookmarkForm}
                >
                  キャンセル
                </button>
                <button
                  className="comiketter-bookmark-button-primary"
                  onClick={createBookmark}
                  disabled={!state.newBookmarkName.trim()}
                  style={{
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