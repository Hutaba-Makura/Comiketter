/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークしたツイート表示ページコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { Container, Title, Tabs, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { CustomBookmark, BookmarkedTweet } from '../types';
import { BookmarkManager } from '../utils/bookmarkManager';


export const BookmarkPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<CustomBookmark[]>([]);
  const [selectedBookmark, setSelectedBookmark] = useState<CustomBookmark | null>(null);
  const [bookmarkedTweets, setBookmarkedTweets] = useState<BookmarkedTweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const bookmarkManager = BookmarkManager.getInstance();
      await bookmarkManager.initialize();
      
      const bookmarksData = await bookmarkManager.getBookmarks();
      setBookmarks(bookmarksData);

      // 最初のブックマークを選択
      if (bookmarksData.length > 0) {
        setSelectedBookmark(bookmarksData[0]);
        await loadBookmarkedTweets(bookmarksData[0].id);
      }
    } catch (err) {
      console.error('Failed to initialize bookmark page:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookmarkedTweets = async (bookmarkId: string) => {
    try {
      const bookmarkManager = BookmarkManager.getInstance();
      const tweets = await bookmarkManager.getBookmarkedTweets(bookmarkId);
      setBookmarkedTweets(tweets);
    } catch (err) {
      console.error('Failed to load bookmarked tweets:', err);
      setError('ブックマークしたツイートの読み込みに失敗しました');
    }
  };

  const handleBookmarkSelect = async (bookmark: CustomBookmark) => {
    setSelectedBookmark(bookmark);
    await loadBookmarkedTweets(bookmark.id);
  };

  const handleBookmarkUpdate = async () => {
    await initializeData();
  };

  const handleBookmarkDelete = async (bookmarkId: string) => {
    try {
      const bookmarkManager = BookmarkManager.getInstance();
      await bookmarkManager.deleteBookmark(bookmarkId);
      
      // 削除されたブックマークが現在選択されている場合、最初のブックマークを選択
      if (selectedBookmark?.id === bookmarkId) {
        const remainingBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
        if (remainingBookmarks.length > 0) {
          setSelectedBookmark(remainingBookmarks[0]);
          await loadBookmarkedTweets(remainingBookmarks[0].id);
        } else {
          setSelectedBookmark(null);
          setBookmarkedTweets([]);
        }
      }
      
      await initializeData();
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
      setError('ブックマークの削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible={true} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="エラー" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl" style={{ color: '#1da1f2' }}>
        Comiketter カスタムブックマーク
      </Title>

      {bookmarks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Title order={3} mb="md" c="dimmed">
            ブックマークがありません
          </Title>
          <p style={{ color: '#657786' }}>
            ツイートにブックマークを追加すると、ここに表示されます。
          </p>
        </div>
      ) : (
        <Tabs value={selectedBookmark?.id || ''} onChange={(value) => {
          const bookmark = bookmarks.find(b => b.id === value);
          if (bookmark) {
            handleBookmarkSelect(bookmark);
          }
        }}>
          <Tabs.List>
            {bookmarks.map((bookmark) => (
              <Tabs.Tab key={bookmark.id} value={bookmark.id}>
                {bookmark.name} ({bookmark.tweetCount})
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {bookmarks.map((bookmark) => (
            <Tabs.Panel key={bookmark.id} value={bookmark.id}>
              {selectedBookmark?.id === bookmark.id && (
                <div>
                  <h3>{bookmark.name}</h3>
                  <p>ツイート数: {bookmark.tweetCount}</p>
                  {bookmark.description && <p>{bookmark.description}</p>}
                </div>
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
      )}
    </Container>
  );
}; 