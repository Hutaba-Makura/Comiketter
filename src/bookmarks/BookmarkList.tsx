/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマーク一覧表示コンポーネント
 */

import React from 'react';
import { Card, Text, Badge, Group, ActionIcon, Menu } from '@mantine/core';
import { IconEdit, IconTrash, IconDotsVertical } from '@tabler/icons-react';
import type { CustomBookmark } from '../types';

interface BookmarkListProps {
  bookmarks: CustomBookmark[];
  selectedBookmarkId?: string;
  onSelect: (bookmark: CustomBookmark) => void;
  onEdit: (bookmark: CustomBookmark) => void;
  onDelete: (bookmarkId: string) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  selectedBookmarkId,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      {bookmarks.map((bookmark) => (
        <Card
          key={bookmark.id}
          mb="sm"
          withBorder
          style={{
            cursor: 'pointer',
            backgroundColor: selectedBookmarkId === bookmark.id ? '#f7f9fa' : 'transparent',
            borderColor: selectedBookmarkId === bookmark.id ? '#1da1f2' : undefined,
          }}
          onClick={() => onSelect(bookmark)}
        >
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Group gap="xs" mb="xs">
                <Text fw={500} size="md">
                  {bookmark.name}
                </Text>
                <Badge variant="light" color="blue" size="sm">
                  {bookmark.tweetCount}件
                </Badge>
              </Group>
              
              {bookmark.description && (
                <Text size="sm" color="dimmed" mb="xs" lineClamp={2}>
                  {bookmark.description}
                </Text>
              )}
              
              <Text size="xs" color="dimmed">
                作成日: {formatDate(bookmark.createdAt)}
              </Text>
            </div>
            
            <Menu>
              <Menu.Target>
                <ActionIcon 
                  variant="subtle" 
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item 
                  leftSection={<IconEdit size={14} />} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(bookmark);
                  }}
                >
                  編集
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconTrash size={14} />} 
                  color="red" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(bookmark.id);
                  }}
                >
                  削除
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card>
      ))}
    </div>
  );
}; 