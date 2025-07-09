/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマーク詳細表示コンポーネント
 */

import React, { useState } from 'react';
import { 
  Card, 
  Text, 
  Button, 
  Group, 
  Modal, 
  TextInput, 
  Textarea, 
  Stack,
  ActionIcon,
  Menu,
  Badge
} from '@mantine/core';
import { IconEdit, IconTrash, IconDotsVertical, IconExternalLink } from '@tabler/icons-react';
import type { CustomBookmark, BookmarkedTweet } from '../types';
import { BookmarkManager } from '../utils/bookmarkManager';

interface BookmarkDetailProps {
  bookmark: CustomBookmark;
  bookmarkedTweets: BookmarkedTweet[];
  onUpdate: () => void;
  onDelete: (bookmarkId: string) => void;
}

export const BookmarkDetail: React.FC<BookmarkDetailProps> = ({
  bookmark,
  bookmarkedTweets,
  onUpdate,
  onDelete,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(bookmark.name);
  const [editDescription, setEditDescription] = useState(bookmark.description || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    setEditName(bookmark.name);
    setEditDescription(bookmark.description || '');
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      const bookmarkManager = BookmarkManager.getInstance();
      await bookmarkManager.updateBookmark(bookmark.id, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      
      setIsEditModalOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update bookmark:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (confirm(`「${bookmark.name}」を削除しますか？\nこの操作は取り消せません。`)) {
      onDelete(bookmark.id);
    }
  };

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

  const openTweet = (tweetId: string) => {
    window.open(`https://twitter.com/i/status/${tweetId}`, '_blank');
  };

  return (
    <div>
      {/* ブックマーク情報ヘッダー */}
      <Card mb="md" withBorder>
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Group gap="xs" mb="xs">
              <Text size="xl" fw={600}>
                {bookmark.name}
              </Text>
              <Badge variant="light" color="blue">
                {bookmark.tweetCount}件
              </Badge>
            </Group>
            
            {bookmark.description && (
              <Text size="sm" color="dimmed" mb="xs">
                {bookmark.description}
              </Text>
            )}
            
            <Text size="xs" color="dimmed">
              作成日: {formatDate(bookmark.createdAt)}
              {bookmark.updatedAt !== bookmark.createdAt && (
                <> | 更新日: {formatDate(bookmark.updatedAt)}</>
              )}
            </Text>
          </div>
          
          <Menu>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconEdit size={14} />} onClick={handleEdit}>
                編集
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconTrash size={14} />} 
                color="red" 
                onClick={handleDelete}
              >
                削除
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Card>

      {/* ブックマークしたツイート一覧 */}
      <div>
        <Text size="lg" fw={600} mb="md">
          ブックマークしたツイート
        </Text>
        
        {bookmarkedTweets.length === 0 ? (
          <Card withBorder>
            <Text ta="center" color="dimmed" py="xl">
              このブックマークにはまだツイートが追加されていません
            </Text>
          </Card>
        ) : (
          <Stack gap="md">
            {bookmarkedTweets.map((bookmarkedTweet) => (
              <Card key={bookmarkedTweet.id} withBorder>
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Text size="sm" mb="xs">
                      {bookmarkedTweet.tweet.text}
                    </Text>
                    <Text size="xs" color="dimmed">
                      保存日: {formatDate(bookmarkedTweet.savedAt)}
                    </Text>
                  </div>
                  <ActionIcon 
                    variant="subtle" 
                    size="sm"
                    onClick={() => openTweet(bookmarkedTweet.tweetId)}
                  >
                    <IconExternalLink size={16} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </div>

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
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="ブックマーク名を入力"
            required
          />
          
          <Textarea
            label="説明（任意）"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="ブックマークの説明を入力"
            rows={3}
          />
          
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => setIsEditModalOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSave} 
              loading={isSaving}
              disabled={!editName.trim()}
            >
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}; 