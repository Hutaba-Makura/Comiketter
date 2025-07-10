/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークしたツイート表示ページコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { Container, Title, Tabs, LoadingOverlay, Alert, Group, Button, Modal, TextInput, Textarea, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import type { BookmarkDB, BookmarkedTweetDB } from '../utils/bookmarkDB';
import { bookmarkDB } from '../utils/bookmarkDB';
import { TweetTimeline } from './TweetTimeline';

export const BookmarkPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkDB[]>([]);
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkDB | null>(null);
  const [bookmarkedTweets, setBookmarkedTweets] = useState<BookmarkedTweetDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkDB | null>(null);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [newBookmarkDescription, setNewBookmarkDescription] = useState('');
  const [editBookmarkName, setEditBookmarkName] = useState('');
  const [editBookmarkDescription, setEditBookmarkDescription] = useState('');

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await bookmarkDB.init();
      const bookmarksData = await bookmarkDB.getAllBookmarks();
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
      const tweets = await bookmarkDB.getBookmarkedTweetsByBookmarkId(bookmarkId);
      setBookmarkedTweets(tweets);
    } catch (err) {
      console.error('Failed to load bookmarked tweets:', err);
      setError('ブックマークしたツイートの読み込みに失敗しました');
    }
  };

  const handleBookmarkSelect = async (bookmark: BookmarkDB) => {
    setSelectedBookmark(bookmark);
    await loadBookmarkedTweets(bookmark.id);
  };

  const handleCreateBookmark = async () => {
    if (!newBookmarkName.trim()) return;

    try {
      const newBookmark = await bookmarkDB.addBookmark({
        name: newBookmarkName.trim(),
        description: newBookmarkDescription.trim(),
        isActive: true,
      });

      setBookmarks(prev => [...prev, newBookmark]);
      setNewBookmarkName('');
      setNewBookmarkDescription('');
      setIsCreateModalOpen(false);

      // 新しく作成したブックマークを選択
      setSelectedBookmark(newBookmark);
      await loadBookmarkedTweets(newBookmark.id);
    } catch (err) {
      console.error('Failed to create bookmark:', err);
      setError('ブックマークの作成に失敗しました');
    }
  };

  const handleEditBookmark = async () => {
    if (!editingBookmark || !editBookmarkName.trim()) return;

    try {
      await bookmarkDB.updateBookmark(editingBookmark.id, {
        name: editBookmarkName.trim(),
        description: editBookmarkDescription.trim(),
      });

      const updatedBookmarks = await bookmarkDB.getAllBookmarks();
      setBookmarks(updatedBookmarks);

      // 編集したブックマークが現在選択されている場合、更新
      if (selectedBookmark?.id === editingBookmark.id) {
        const updatedBookmark = updatedBookmarks.find(b => b.id === editingBookmark.id);
        if (updatedBookmark) {
          setSelectedBookmark(updatedBookmark);
        }
      }

      setEditingBookmark(null);
      setEditBookmarkName('');
      setEditBookmarkDescription('');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update bookmark:', err);
      setError('ブックマークの更新に失敗しました');
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm('このブックマークを削除しますか？\nこの操作は取り消せません。')) {
      return;
    }

    try {
      await bookmarkDB.deleteBookmark(bookmarkId);
      
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
      
      const updatedBookmarks = await bookmarkDB.getAllBookmarks();
      setBookmarks(updatedBookmarks);
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
      setError('ブックマークの削除に失敗しました');
    }
  };

  const openEditModal = (bookmark: BookmarkDB) => {
    setEditingBookmark(bookmark);
    setEditBookmarkName(bookmark.name);
    setEditBookmarkDescription(bookmark.description || '');
    setIsEditModalOpen(true);
  };

  const handleTweetClick = (tweetId: string) => {
    window.open(`https://twitter.com/i/status/${tweetId}`, '_blank');
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
      <Group justify="space-between" align="center" mb="xl">
        <Title order={1} style={{ color: '#1da1f2' }}>
          Comiketter カスタムブックマーク
        </Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setIsCreateModalOpen(true)}
          variant="filled"
          color="blue"
        >
          新しいブックマーク
        </Button>
      </Group>

      {bookmarks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Title order={3} mb="md" c="dimmed">
            ブックマークがありません
          </Title>
          <p style={{ color: '#657786' }}>
            新しいブックマークを作成して、ツイートを整理しましょう。
          </p>
        </div>
      ) : (
        <div>
          {/* ブックマークタブ */}
          <Tabs 
            value={selectedBookmark?.id || ''} 
            onChange={(value) => {
              const bookmark = bookmarks.find(b => b.id === value);
              if (bookmark) {
                handleBookmarkSelect(bookmark);
              }
            }}
            mb="xl"
          >
            <Tabs.List>
              {bookmarks.map((bookmark) => (
                <Tabs.Tab key={bookmark.id} value={bookmark.id}>
                  <Group gap="xs">
                    <span>{bookmark.name}</span>
                    <span style={{ color: '#657786', fontSize: '0.8em' }}>
                      ({bookmarkedTweets.length})
                    </span>
                  </Group>
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>

          {/* 選択されたブックマークの詳細 */}
          {selectedBookmark && (
            <div>
              <Group justify="space-between" align="center" mb="md">
                <div>
                  <Title order={2} mb="xs">
                    {selectedBookmark.name}
                  </Title>
                  {selectedBookmark.description && (
                    <Text color="dimmed" mb="xs">
                      {selectedBookmark.description}
                    </Text>
                  )}
                  <Text size="sm" color="dimmed">
                    {bookmarkedTweets.length}件のツイート
                  </Text>
                </div>
                <Group>
                  <Button
                    variant="subtle"
                    leftSection={<IconEdit size={16} />}
                    onClick={() => openEditModal(selectedBookmark)}
                  >
                    編集
                  </Button>
                  <Button
                    variant="subtle"
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={() => handleDeleteBookmark(selectedBookmark.id)}
                  >
                    削除
                  </Button>
                </Group>
              </Group>

              {/* ツイートタイムライン */}
              <TweetTimeline 
                tweets={bookmarkedTweets}
                onTweetClick={handleTweetClick}
              />
            </div>
          )}
        </div>
      )}

      {/* 新規作成モーダル */}
      <Modal 
        opened={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="新しいブックマークを作成"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="ブックマーク名"
            value={newBookmarkName}
            onChange={(e) => setNewBookmarkName(e.target.value)}
            placeholder="ブックマーク名を入力"
            required
          />
          
          <Textarea
            label="説明（任意）"
            value={newBookmarkDescription}
            onChange={(e) => setNewBookmarkDescription(e.target.value)}
            placeholder="ブックマークの説明を入力"
            rows={3}
          />

          <Group justify="flex-end" gap="md">
            <Button variant="subtle" onClick={() => setIsCreateModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreateBookmark} disabled={!newBookmarkName.trim()}>
              作成
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 編集モーダル */}
      <Modal 
        opened={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        title="ブックマークを編集"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="ブックマーク名"
            value={editBookmarkName}
            onChange={(e) => setEditBookmarkName(e.target.value)}
            placeholder="ブックマーク名を入力"
            required
          />
          
          <Textarea
            label="説明（任意）"
            value={editBookmarkDescription}
            onChange={(e) => setEditBookmarkDescription(e.target.value)}
            placeholder="ブックマークの説明を入力"
            rows={3}
          />

          <Group justify="flex-end" gap="md">
            <Button variant="subtle" onClick={() => setIsEditModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEditBookmark} disabled={!editBookmarkName.trim()}>
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}; 