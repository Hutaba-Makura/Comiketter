import React from 'react';
import { Paper, Text, Group, Badge, ActionIcon } from '@mantine/core';
import { IconBookmark, IconDotsVertical, IconTrash } from '@tabler/icons-react';
import { Cb } from '../types/cb';
import { useCbStore } from '../state/cbStore';
import { formatCount } from '../utils/format';

interface CbSidebarItemProps {
  cb: Cb;
}

/**
 * CBサイドバーアイテムコンポーネント
 */
export function CbSidebarItem({ cb }: CbSidebarItemProps) {
  const { selectedCbId, selectCb } = useCbStore();
  const isSelected = selectedCbId === cb.id;

  const handleSelect = () => {
    selectCb(cb.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: 削除確認モーダルを開く
    console.log('CB削除:', cb.id);
  };

  const handleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: メニューを開く
    console.log('CBメニュー:', cb.id);
  };

  return (
    <Paper
      p="sm"
      withBorder
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined,
        borderColor: isSelected ? 'var(--mantine-color-blue-3)' : undefined
      }}
      onClick={handleSelect}
    >
      <Group justify="space-between" align="flex-start" gap="xs">
        <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0 }}>
          <IconBookmark 
            size={16} 
            color={isSelected ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-6)'} 
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text 
              size="sm" 
              fw={isSelected ? 600 : 500}
              truncate
            >
              {cb.name}
            </Text>
            {cb.description && (
              <Text size="xs" c="dimmed" truncate>
                {cb.description}
              </Text>
            )}
          </div>
        </Group>

        <Group gap="xs" align="center">
          <Badge size="xs" variant="light">
            {formatCount(cb.tweetCount)}
          </Badge>
          
          <ActionIcon
            variant="subtle"
            size="xs"
            onClick={handleMenu}
          >
            <IconDotsVertical size={12} />
          </ActionIcon>
          
          <ActionIcon
            variant="subtle"
            size="xs"
            color="red"
            onClick={handleDelete}
          >
            <IconTrash size={12} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}
