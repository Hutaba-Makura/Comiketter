/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマーク管理コンポーネント（オプションページ用）
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { CustomBookmark } from '../types';
import { BookmarkManager } from '../utils/bookmarkManager';

interface BookmarkManagerProps {
  className?: string;
}

interface BookmarkManagerState {
  bookmarks: CustomBookmark[];
  isLoading: boolean;
  showCreateForm: boolean;
  editingBookmark: CustomBookmark | null;
  newBookmarkName: string;
  newBookmarkDescription: string;
  errorMessage: string;
  successMessage: string;
  searchQuery: string;
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'tweetCount';
  sortOrder: 'asc' | 'desc';
}

export const BookmarkManagerComponent: React.FC<BookmarkManagerProps> = ({
  className = '',
}) => {
  const [state, setState] = useState<BookmarkManagerState>({
    bookmarks: [],
    isLoading: true,
    showCreateForm: false,
    editingBookmark: null,
    newBookmarkName: '',
    newBookmarkDescription: '',
    errorMessage: '',
    successMessage: '',
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
      
      setState(prev => ({
        ...prev,
        bookmarks: sortedBookmarks,
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

  // 新規ブックマーク作成フォームを表示
  const showCreateBookmarkForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCreateForm: true,
      editingBookmark: null,
      newBookmarkName: '',
      newBookmarkDescription: '',
      errorMessage: '',
      successMessage: '',
    }));
  }, []);

  // 新規ブックマーク作成フォームを非表示
  const hideCreateBookmarkForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      showCreateForm: false,
      editingBookmark: null,
      newBookmarkName: '',
      newBookmarkDescription: '',
      errorMessage: '',
      successMessage: '',
    }));
  }, []);

  // ブックマーク編集フォームを表示
  const showEditBookmarkForm = useCallback((bookmark: CustomBookmark) => {
    setState(prev => ({
      ...prev,
      showCreateForm: true,
      editingBookmark: bookmark,
      newBookmarkName: bookmark.name,
      newBookmarkDescription: bookmark.description || '',
      errorMessage: '',
      successMessage: '',
    }));
  }, []);

  // 新規ブックマークを作成または更新
  const saveBookmark = async () => {
    const { newBookmarkName, newBookmarkDescription, editingBookmark } = state;
    
    if (!newBookmarkName.trim()) {
      setState(prev => ({
        ...prev,
        errorMessage: 'ブックマーク名を入力してください',
      }));
      return;
    }

    try {
      if (editingBookmark) {
        // 更新
        await bookmarkManager.updateBookmark(editingBookmark.id, {
          name: newBookmarkName.trim(),
          description: newBookmarkDescription.trim(),
        });
        setState(prev => ({
          ...prev,
          successMessage: 'ブックマークを更新しました',
        }));
      } else {
        // 新規作成
        await bookmarkManager.addBookmark(newBookmarkName.trim(), newBookmarkDescription.trim());
        setState(prev => ({
          ...prev,
          successMessage: 'ブックマークを作成しました',
        }));
      }

      // ブックマーク一覧を再読み込み
      await initializeBookmarks();
      
      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          successMessage: '',
        }));
      }, 3000);

      hideCreateBookmarkForm();
    } catch (error) {
      console.error('Failed to save bookmark:', error);
      setState(prev => ({
        ...prev,
        errorMessage: 'ブックマークの保存に失敗しました',
      }));
    }
  };

  // ブックマークを削除
  const deleteBookmark = async (bookmarkId: string) => {
    if (!confirm('このブックマークを削除しますか？')) {
      return;
    }

    try {
      await bookmarkManager.deleteBookmark(bookmarkId);
      await initializeBookmarks();
      setState(prev => ({
        ...prev,
        successMessage: 'ブックマークを削除しました',
      }));
      
      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          successMessage: '',
        }));
      }, 3000);
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      setState(prev => ({
        ...prev,
        errorMessage: 'ブックマークの削除に失敗しました',
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
  const updateSort = useCallback(async (sortBy: 'name' | 'createdAt' | 'updatedAt' | 'tweetCount', order: 'asc' | 'desc') => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: order,
    }));
    
    const sortedBookmarks = bookmarkManager.sortBookmarks(sortBy, order);
    setState(prev => ({
      ...prev,
      bookmarks: sortedBookmarks,
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (state.isLoading) {
    return (
      <div className={`bookmark-manager ${className}`}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className={`bookmark-manager ${className}`}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px', color: '#1da1f2' }}>カスタムブックマーク管理</h2>
        
        {/* エラーメッセージ */}
        {state.errorMessage && (
          <div style={{ 
            color: '#e0245e', 
            padding: '12px', 
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {state.errorMessage}
          </div>
        )}

        {/* 成功メッセージ */}
        {state.successMessage && (
          <div style={{ 
            color: '#00ba7c', 
            padding: '12px', 
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {state.successMessage}
          </div>
        )}

        {/* 検索・並び替え・新規作成 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="ブックマークを検索..."
            value={state.searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '8px 12px',
              border: '1px solid #e1e8ed',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
          
          <select
            value={`${state.sortBy}-${state.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as ['name' | 'createdAt' | 'updatedAt' | 'tweetCount', 'asc' | 'desc'];
              updateSort(sortBy, sortOrder);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #e1e8ed',
              borderRadius: '8px',
              fontSize: '14px',
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
          
          <button
            onClick={showCreateBookmarkForm}
            style={{
              background: '#1da1f2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            ＋ 新しいブックマーク
          </button>
        </div>
      </div>

      {/* ブックマーク一覧 */}
      {filteredBookmarks.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#657786',
          fontSize: '16px'
        }}>
          {state.searchQuery ? '検索結果がありません' : 'ブックマークがありません'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              style={{
                border: '1px solid #e1e8ed',
                borderRadius: '12px',
                padding: '16px',
                backgroundColor: 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                    {bookmark.name}
                  </h3>
                  {bookmark.description && (
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      color: '#657786', 
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {bookmark.description}
                    </p>
                  )}
                  <div style={{ 
                    color: '#657786', 
                    fontSize: '12px',
                    display: 'flex',
                    gap: '16px'
                  }}>
                    <span>{bookmark.tweetCount}件のツイート</span>
                    <span>作成: {formatDate(bookmark.createdAt)}</span>
                    <span>更新: {formatDate(bookmark.updatedAt)}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => showEditBookmarkForm(bookmark)}
                    style={{
                      background: '#f7f9fa',
                      color: '#14171a',
                      border: '1px solid #e1e8ed',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    style={{
                      background: '#fef2f2',
                      color: '#e0245e',
                      border: '1px solid #fecaca',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新規作成・編集フォーム */}
      {state.showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1da1f2' }}>
              {state.editingBookmark ? 'ブックマークを編集' : '新しいブックマークを作成'}
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                ブックマーク名 *
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
            
            <div style={{ marginBottom: '20px' }}>
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
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={hideCreateBookmarkForm}
                style={{
                  background: '#f7f9fa',
                  color: '#14171a',
                  border: '1px solid #e1e8ed',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={saveBookmark}
                disabled={!state.newBookmarkName.trim()}
                style={{
                  background: state.newBookmarkName.trim() ? '#1da1f2' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: state.newBookmarkName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                }}
              >
                {state.editingBookmark ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 