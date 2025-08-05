/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 左サイドバー用ブックマークリストコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Text, 
  Badge, 
  Group, 
  ActionIcon, 
  Menu, 
  Stack,
  Button,
  ScrollArea,
  Divider,
  Box,
  Tooltip
} from '@mantine/core';
import { 
  IconEdit, 
  IconTrash, 
  IconDotsVertical, 
  IconPlus,
  IconBookmark,
  IconSearch,
  IconFilter
} from '@tabler/icons-react';
import type { BookmarkDB } from '../db/bookmark-db';

interface BookmarkSidebarProps {
  bookmarks: BookmarkDB[];
  selectedBookmark: BookmarkDB | null;
  onSelect: (bookmark: BookmarkDB) => void;
  onEdit: (bookmark: BookmarkDB) => void;
  onDelete: (bookmarkId: string) => void;
  onCreateNew: () => void;
}

export const BookmarkSidebar: React.FC<BookmarkSidebarProps> = ({
  bookmarks,
  selectedBookmark,
  onSelect,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true);

  // フィルタリングされたブックマーク
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = bookmark.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (bookmark.description && bookmark.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterActive ? bookmark.isActive : true;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return '今日';
    } else if (diffInDays === 1) {
      return '昨日';
    } else if (diffInDays < 7) {
      return `${diffInDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getBookmarkColor = (bookmark: BookmarkDB) => {
    if (bookmark.color) {
      return bookmark.color;
    }
    // デフォルトカラーを生成（ブックマーク名のハッシュから）
    const hash = bookmark.name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Stack gap="md" h="100%">
      {/* ヘッダー */}
      <Box>
        <Group justify="space-between" align="center" mb="sm">
          <Group gap="xs">
            <IconBookmark size={20} />
            <Text fw={600} size="lg">ブックマーク</Text>
            <Badge variant="light" color="blue" size="sm">
              {bookmarks.length}
            </Badge>
          </Group>
          <Tooltip label="新しいブックマークを作成">
            <ActionIcon 
              variant="light" 
              color="blue" 
              size="sm"
              onClick={onCreateNew}
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* 検索・フィルター */}
        <Stack gap="xs">
          <Group gap="xs">
            <ActionIcon 
              variant={filterActive ? "filled" : "light"} 
              color="green" 
              size="sm"
              onClick={() => setFilterActive(!filterActive)}
            >
              <IconFilter size={14} />
            </ActionIcon>
            <Text size="xs" color="dimmed">
              {filterActive ? 'アクティブのみ' : 'すべて表示'}
            </Text>
          </Group>
        </Stack>
      </Box>

      <Divider />

      {/* ブックマークリスト */}
      <ScrollArea h="calc(100vh - 200px)" type="auto">
        <Stack gap="xs">
          {filteredBookmarks.length === 0 ? (
            <Box ta="center" py="xl">
              <IconBookmark size={32} color="#ccc" />
              <Text size="sm" color="dimmed" mt="xs">
                {searchTerm ? '検索結果がありません' : 'ブックマークがありません'}
              </Text>
              {!searchTerm && (
                <Button 
                  variant="light" 
                  size="xs" 
                  mt="sm"
                  leftSection={<IconPlus size={12} />}
                  onClick={onCreateNew}
                >
                  最初のブックマークを作成
                </Button>
              )}
            </Box>
          ) : (
            filteredBookmarks.map((bookmark) => (
              <Card
                key={bookmark.id}
                withBorder
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedBookmark?.id === bookmark.id ? '#f8f9fa' : 'transparent',
                  borderColor: selectedBookmark?.id === bookmark.id ? getBookmarkColor(bookmark) : undefined,
                  borderLeft: `3px solid ${getBookmarkColor(bookmark)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: selectedBookmark?.id === bookmark.id ? '#f8f9fa' : '#f8f9fa',
                    transform: 'translateX(2px)',
                  }
                }}
                onClick={() => onSelect(bookmark)}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" mb="xs" wrap="nowrap">
                      <Text 
                        fw={500} 
                        size="sm" 
                        style={{ 
                          color: '#14171a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {bookmark.name}
                      </Text>
                      {!bookmark.isActive && (
                        <Badge variant="light" color="gray" size="xs">
                          非アクティブ
                        </Badge>
                      )}
                    </Group>
                    
                    {bookmark.description && (
                      <Text 
                        size="xs" 
                        color="dimmed" 
                        mb="xs" 
                        lineClamp={2}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {bookmark.description}
                      </Text>
                    )}
                    
                    <Text size="xs" color="dimmed">
                      {formatDate(bookmark.createdAt)}
                    </Text>
                  </Box>
                  
                  <Menu>
                    <Menu.Target>
                      <ActionIcon 
                        variant="subtle" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconDotsVertical size={14} />
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
            ))
          )}
        </Stack>
      </ScrollArea>

      {/* フッター */}
      <Divider />
      <Box>
        <Text size="xs" color="dimmed" ta="center">
          {filteredBookmarks.length} / {bookmarks.length} ブックマーク
        </Text>
      </Box>
    </Stack>
  );
}; 