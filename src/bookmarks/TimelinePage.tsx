/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: TL風ページのメインコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { 
  AppShell, 
  Container, 
  Title, 
  LoadingOverlay, 
  Alert,
  Group,
  Button,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Text,
  Badge
} from '@mantine/core';
import { 
  IconAlertCircle, 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconDatabase,
  IconBookmark,
  IconTimeline
} from '@tabler/icons-react';
import type { BookmarkDB, BookmarkedTweetDB } from '../db/bookmark-db';
import { bookmarkDB } from '../db/bookmark-db';
import { BookmarkSidebar } from './BookmarkSidebar';
import { TweetTimeline } from './TweetTimeline';
import { ImageModal } from './ImageModal';

export const TimelinePage: React.FC = () => {
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

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
      console.error('Failed to initialize timeline page:', err);
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

      setBookmarks(prev => 
        prev.map(b => 
          b.id === editingBookmark.id 
            ? { ...b, name: editBookmarkName.trim(), description: editBookmarkDescription.trim() }
            : b
        )
      );

      if (selectedBookmark?.id === editingBookmark.id) {
        setSelectedBookmark(prev => prev ? { ...prev, name: editBookmarkName.trim(), description: editBookmarkDescription.trim() } : null);
      }

      setEditBookmarkName('');
      setEditBookmarkDescription('');
      setIsEditModalOpen(false);
      setEditingBookmark(null);
    } catch (err) {
      console.error('Failed to update bookmark:', err);
      setError('ブックマークの更新に失敗しました');
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await bookmarkDB.deleteBookmark(bookmarkId);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));

      // 削除されたブックマークが選択されていた場合、最初のブックマークを選択
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

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const addSampleData = async () => {
    try {
      // サンプルブックマークを作成
      const sampleBookmark = await bookmarkDB.addBookmark({
        name: 'サンプルブックマーク',
        description: 'テスト用のブックマークです',
        isActive: true,
      });

      // サンプルツイートを追加
      const sampleTweet = await bookmarkDB.addBookmarkedTweet({
        bookmarkId: sampleBookmark.id,
        tweetId: '1234567890123456789',
        authorUsername: 'sample_user',
        authorDisplayName: 'サンプルユーザー',
        content: 'これはサンプルのツイートです。テスト用に作成されました。',
        mediaUrls: ['https://picsum.photos/400/300'],
        mediaTypes: ['image/jpeg'],
        tweetDate: new Date().toISOString(),
        isRetweet: false,
        isReply: false,
        saveType: 'url',
      });

      setBookmarks(prev => [...prev, sampleBookmark]);
      setSelectedBookmark(sampleBookmark);
      await loadBookmarkedTweets(sampleBookmark.id);
    } catch (err) {
      console.error('Failed to add sample data:', err);
      setError('サンプルデータの追加に失敗しました');
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      aside={{ width: 200, breakpoint: 'md' }}
      padding="md"
    >
      {/* ヘッダー */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <IconTimeline size={24} />
            <Title order={3}>Comiketter Timeline</Title>
          </Group>
          <Group>
            <Button 
              leftSection={<IconPlus size={16} />}
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
            >
              ブックマーク作成
            </Button>
            <Button 
              leftSection={<IconDatabase size={16} />}
              onClick={addSampleData}
              variant="light"
              size="sm"
            >
              サンプル追加
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* 左サイドバー - ブックマークリスト */}
      <AppShell.Navbar p="md">
        <BookmarkSidebar
          bookmarks={bookmarks}
          selectedBookmark={selectedBookmark}
          onSelect={handleBookmarkSelect}
          onEdit={openEditModal}
          onDelete={handleDeleteBookmark}
          onCreateNew={() => setIsCreateModalOpen(true)}
        />
      </AppShell.Navbar>

      {/* メインコンテンツ - ツイートタイムライン */}
      <AppShell.Main>
        <Container size="lg" p={0}>
          <LoadingOverlay visible={isLoading} />
          
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="エラー" color="red" mb="md">
              {error}
            </Alert>
          )}

          {selectedBookmark ? (
            <div>
              <Group mb="md" align="center">
                <IconBookmark size={20} />
                <Title order={4}>{selectedBookmark.name}</Title>
                <Badge variant="light" color="blue">
                  {bookmarkedTweets.length}件
                </Badge>
              </Group>
              
              {selectedBookmark.description && (
                <Text color="dimmed" mb="md">
                  {selectedBookmark.description}
                </Text>
              )}

              <TweetTimeline
                tweets={bookmarkedTweets}
                onTweetClick={handleTweetClick}
                onImageClick={handleImageClick}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <IconBookmark size={48} color="#ccc" />
              <Title order={4} mt="md" c="dimmed">
                ブックマークを選択してください
              </Title>
              <Text color="dimmed" mt="sm">
                左サイドバーからブックマークを選択するか、新しいブックマークを作成してください
              </Text>
            </div>
          )}
        </Container>
      </AppShell.Main>

      {/* 右サイドバー - 現在は空 */}
      <AppShell.Aside p="md">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Text c="dimmed" size="sm">
            右サイドバー
          </Text>
          <Text c="dimmed" size="xs" mt="xs">
            将来の機能用
          </Text>
        </div>
      </AppShell.Aside>

      {/* ブックマーク作成モーダル */}
      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="新しいブックマークを作成"
        size="md"
      >
        <Stack>
          <TextInput
            label="ブックマーク名"
            placeholder="例: 1日目、絶対行きたい"
            value={newBookmarkName}
            onChange={(e) => setNewBookmarkName(e.target.value)}
            required
          />
          <Textarea
            label="説明（オプション）"
            placeholder="ブックマークの説明を入力してください"
            value={newBookmarkDescription}
            onChange={(e) => setNewBookmarkDescription(e.target.value)}
            rows={3}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setIsCreateModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreateBookmark} disabled={!newBookmarkName.trim()}>
              作成
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ブックマーク編集モーダル */}
      <Modal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ブックマークを編集"
        size="md"
      >
        <Stack>
          <TextInput
            label="ブックマーク名"
            placeholder="例: 1日目、絶対行きたい"
            value={editBookmarkName}
            onChange={(e) => setEditBookmarkName(e.target.value)}
            required
          />
          <Textarea
            label="説明（オプション）"
            placeholder="ブックマークの説明を入力してください"
            value={editBookmarkDescription}
            onChange={(e) => setEditBookmarkDescription(e.target.value)}
            rows={3}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setIsEditModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEditBookmark} disabled={!editBookmarkName.trim()}>
              更新
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 画像拡大表示モーダル */}
      <ImageModal
        opened={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={selectedImage}
      />
    </AppShell>
  );
}; 