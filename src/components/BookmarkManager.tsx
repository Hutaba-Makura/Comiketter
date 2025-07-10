/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: カスタムブックマーク管理コンポーネント
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  Modal,
  TextInput,
  Textarea,
  ColorInput,
  ActionIcon,
  Menu,
  Alert,
  LoadingOverlay,
  Pagination,
  Select,
  Grid,
  Box,
} from '@mantine/core';
import { IconPlus, IconDots, IconEdit, IconTrash, IconBookmark, IconSearch, IconFilter } from '@tabler/icons-react';
import type { CustomBookmark, BookmarkedTweet, BookmarkStats } from '../types';
import { StorageManager } from '../utils/storage';

interface BookmarkManagerProps {
  onBookmarkSelect?: (bookmark: CustomBookmark) => void;
}

export const BookmarkManager: React.FC<BookmarkManagerProps> = ({ onBookmarkSelect }) => {
  const [bookmarks, setBookmarks] = useState<CustomBookmark[]>([]);
  const [selectedBookmark, setSelectedBookmark] = useState<CustomBookmark | null>(null);
  const [bookmarkedTweets, setBookmarkedTweets] = useState<BookmarkedTweet[]>([]);
  const [stats, setStats] = useState<BookmarkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // モーダル状態
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<CustomBookmark | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#228BE6',
  });

  // 検索・フィルター状態
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBookmark) {
      loadBookmarkedTweets(selectedBookmark.id);
    }
  }, [selectedBookmark]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [bookmarksData, statsData] = await Promise.all([
        StorageManager.getCustomBookmarks(),
        StorageManager.getBookmarkStats(),
      ]);

      setBookmarks(bookmarksData);
      setStats(statsData);

      // 最初のブックマークを選択
      if (bookmarksData.length > 0 && !selectedBookmark) {
        setSelectedBookmark(bookmarksData[0]);
      }
    } catch (err) {
      console.error('Failed to load bookmark data:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookmarkedTweets = async (bookmarkId: string) => {
    try {
      const tweets = await StorageManager.getBookmarkedTweetsByBookmarkId(bookmarkId);
      setBookmarkedTweets(tweets);
    } catch (err) {
      console.error('Failed to load bookmarked tweets:', err);
      setError('ツイートの読み込みに失敗しました');
    }
  };

  const handleCreateBookmark = async () => {
    try {
      if (!formData.name.trim()) {
        setError('ブックマーク名は必須です');
        return;
      }

      const newBookmark = await StorageManager.addCustomBookmark({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        isActive: true,
      });

      setBookmarks(prev => [newBookmark, ...prev]);
      setFormData({ name: '', description: '', color: '#228BE6' });
      setIsCreateModalOpen(false);
      setError(null);

      // 統計を更新
      const newStats = await StorageManager.getBookmarkStats();
      setStats(newStats);
    } catch (err) {
      console.error('Failed to create bookmark:', err);
      setError('ブックマークの作成に失敗しました');
    }
  };

  const handleUpdateBookmark = async () => {
    if (!editingBookmark) return;

    try {
      if (!formData.name.trim()) {
        setError('ブックマーク名は必須です');
        return;
      }

      await StorageManager.updateCustomBookmark(editingBookmark.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
      });

      setBookmarks(prev => 
        prev.map(b => 
          b.id === editingBookmark.id 
            ? { ...b, name: formData.name.trim(), description: formData.description.trim() || undefined, color: formData.color }
            : b
        )
      );

      if (selectedBookmark?.id === editingBookmark.id) {
        setSelectedBookmark(prev => prev ? { ...prev, name: formData.name.trim(), description: formData.description.trim() || undefined, color: formData.color } : null);
      }

      setFormData({ name: '', description: '', color: '#228BE6' });
      setEditingBookmark(null);
      setIsEditModalOpen(false);
      setError(null);
    } catch (err) {
      console.error('Failed to update bookmark:', err);
      setError('ブックマークの更新に失敗しました');
    }
  };

  const handleDeleteBookmark = async () => {
    if (!editingBookmark) return;

    try {
      await StorageManager.deleteCustomBookmark(editingBookmark.id);
      
      setBookmarks(prev => prev.filter(b => b.id !== editingBookmark.id));
      
      if (selectedBookmark?.id === editingBookmark.id) {
        const remainingBookmarks = bookmarks.filter(b => b.id !== editingBookmark.id);
        setSelectedBookmark(remainingBookmarks.length > 0 ? remainingBookmarks[0] : null);
      }

      setEditingBookmark(null);
      setIsDeleteModalOpen(false);
      setError(null);

      // 統計を更新
      const newStats = await StorageManager.getBookmarkStats();
      setStats(newStats);
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
      setError('ブックマークの削除に失敗しました');
    }
  };

  const handleBookmarkSelect = (bookmark: CustomBookmark) => {
    setSelectedBookmark(bookmark);
    onBookmarkSelect?.(bookmark);
  };

  const openEditModal = (bookmark: CustomBookmark) => {
    setEditingBookmark(bookmark);
    setFormData({
      name: bookmark.name,
      description: bookmark.description || '',
      color: bookmark.color || '#228BE6',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (bookmark: CustomBookmark) => {
    setEditingBookmark(bookmark);
    setIsDeleteModalOpen(true);
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = bookmark.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (bookmark.description && bookmark.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && bookmark.isActive) ||
                         (filterStatus === 'inactive' && !bookmark.isActive);

    return matchesSearch && matchesFilter;
  });

  const paginatedBookmarks = filteredBookmarks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredBookmarks.length / itemsPerPage);

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible />
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* ヘッダー */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>カスタムブックマーク管理</Title>
            <Text size="sm" color="dimmed">
              ブックマーク: {stats?.activeBookmarks || 0}個 / ツイート: {stats?.totalTweets || 0}件
            </Text>
          </div>
          <Button 
            leftSection={<IconPlus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            新規ブックマーク
          </Button>
        </Group>

        {/* エラー表示 */}
        {error && (
          <Alert color="red" title="エラー" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 検索・フィルター */}
        <Group>
          <TextInput
            placeholder="ブックマークを検索..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            leftSection={<IconFilter size={16} />}
            value={filterStatus}
            onChange={(value) => setFilterStatus(value || 'all')}
            data={[
              { value: 'all', label: 'すべて' },
              { value: 'active', label: 'アクティブ' },
              { value: 'inactive', label: '非アクティブ' },
            ]}
          />
        </Group>

        {/* ブックマーク一覧 */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Title order={3}>ブックマーク一覧</Title>
              {paginatedBookmarks.length === 0 ? (
                                 <Card p="md">
                   <Text ta="center" color="dimmed">
                     ブックマークがありません
                   </Text>
                 </Card>
              ) : (
                paginatedBookmarks.map(bookmark => (
                  <Card
                    key={bookmark.id}
                    p="md"
                    style={{
                      border: selectedBookmark?.id === bookmark.id ? '2px solid var(--mantine-color-blue-6)' : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleBookmarkSelect(bookmark)}
                  >
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" align="center">
                          <Box
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: bookmark.color || '#228BE6',
                            }}
                          />
                          <Text fw={500} size="sm">
                            {bookmark.name}
                          </Text>
                          {!bookmark.isActive && (
                            <Badge size="xs" color="gray">非アクティブ</Badge>
                          )}
                        </Group>
                        {bookmark.description && (
                          <Text size="xs" color="dimmed" mt={4}>
                            {bookmark.description}
                          </Text>
                        )}
                        <Text size="xs" color="dimmed" mt={4}>
                          ツイート: {stats?.tweetsByBookmark[bookmark.id] || 0}件
                        </Text>
                      </div>
                      <Menu>
                        <Menu.Target>
                          <ActionIcon variant="subtle" size="sm">
                            <IconDots size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(bookmark);
                            }}
                          >
                            編集
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(bookmark);
                            }}
                          >
                            削除
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Card>
                ))
              )}

              {/* ページネーション */}
              {totalPages > 1 && (
                <Pagination
                  total={totalPages}
                  value={currentPage}
                  onChange={setCurrentPage}
                  size="sm"
                />
              )}
            </Stack>
          </Grid.Col>

          {/* 選択されたブックマークの詳細 */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            {selectedBookmark ? (
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <div>
                    <Title order={3}>
                      <IconBookmark size={20} style={{ marginRight: 8 }} />
                      {selectedBookmark.name}
                    </Title>
                    {selectedBookmark.description && (
                      <Text size="sm" color="dimmed">
                        {selectedBookmark.description}
                      </Text>
                    )}
                  </div>
                  <Badge size="lg" color={selectedBookmark.isActive ? 'blue' : 'gray'}>
                    {selectedBookmark.isActive ? 'アクティブ' : '非アクティブ'}
                  </Badge>
                </Group>

                <Card p="md">
                  <Text size="sm" fw={500} mb="md">
                    保存されたツイート ({bookmarkedTweets.length}件)
                  </Text>
                                     {bookmarkedTweets.length === 0 ? (
                     <Text size="sm" color="dimmed" ta="center">
                       ツイートが保存されていません
                     </Text>
                   ) : (
                    <Stack gap="sm">
                      {bookmarkedTweets.slice(0, 10).map(tweet => (
                        <Card key={tweet.id} p="sm" withBorder>
                          <Text size="sm" fw={500}>
                            @{tweet.authorUsername}
                          </Text>
                          <Text size="xs" color="dimmed" mb={4}>
                            {new Date(tweet.tweetDate).toLocaleString('ja-JP')}
                          </Text>
                          <Text size="sm" lineClamp={3}>
                            {tweet.content}
                          </Text>
                          <Group gap="xs" mt={4}>
                            {tweet.isRetweet && <Badge size="xs" color="green">RT</Badge>}
                            {tweet.isReply && <Badge size="xs" color="blue">返信</Badge>}
                            <Badge size="xs" color="gray">{tweet.saveType}</Badge>
                          </Group>
                        </Card>
                      ))}
                                             {bookmarkedTweets.length > 10 && (
                         <Text size="sm" color="dimmed" ta="center">
                           他 {bookmarkedTweets.length - 10} 件のツイート...
                         </Text>
                       )}
                    </Stack>
                  )}
                </Card>
              </Stack>
            ) : (
                             <Card p="xl">
                 <Text ta="center" color="dimmed">
                   ブックマークを選択してください
                 </Text>
               </Card>
            )}
          </Grid.Col>
        </Grid>
      </Stack>

      {/* 新規作成モーダル */}
      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="新規ブックマーク作成"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="ブックマーク名"
            placeholder="例: 1日目、絶対行きたい"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.currentTarget.value }))}
            required
          />
          <Textarea
            label="説明"
            placeholder="ブックマークの説明（任意）"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.currentTarget.value }))}
            rows={3}
          />
          <ColorInput
            label="色"
            value={formData.color}
            onChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
            format="hex"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreateBookmark}>
              作成
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 編集モーダル */}
      <Modal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="ブックマーク編集"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="ブックマーク名"
            placeholder="例: 1日目、絶対行きたい"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.currentTarget.value }))}
            required
          />
          <Textarea
            label="説明"
            placeholder="ブックマークの説明（任意）"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.currentTarget.value }))}
            rows={3}
          />
          <ColorInput
            label="色"
            value={formData.color}
            onChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
            format="hex"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdateBookmark}>
              更新
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="ブックマーク削除"
        size="md"
      >
        <Stack gap="md">
          <Alert color="red" title="削除の確認">
            <Text size="sm">
              「{editingBookmark?.name}」を削除しますか？
            </Text>
            <Text size="sm" mt={4}>
              この操作は元に戻せません。保存されたツイートも削除されます。
            </Text>
          </Alert>
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              キャンセル
            </Button>
            <Button color="red" onClick={handleDeleteBookmark}>
              削除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}; 