import React, { useState } from 'react';
import { 
  Paper, 
  Text, 
  Group, 
  Badge, 
  ActionIcon, 
  Menu,
  Tooltip,
  Box,
  Transition
} from '@mantine/core';
import { 
  IconBookmark, 
  IconDotsVertical, 
  IconTrash, 
  IconEdit, 
  IconCopy,
  IconShare
} from '@tabler/icons-react';
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
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedCbId === cb.id;

  const handleSelect = () => {
    selectCb(cb.id);
  };

  const handleDelete = () => {
    // TODO: 削除確認モーダルを開く
    console.log('CB削除:', cb.id);
  };

  const handleEdit = () => {
    // TODO: 編集モーダルを開く
    console.log('CB編集:', cb.id);
  };

  const handleCopy = () => {
    // TODO: CB情報をクリップボードにコピー
    console.log('CBコピー:', cb.id);
  };

  const handleShare = () => {
    // TODO: 共有機能を実装
    console.log('CB共有:', cb.id);
  };

  return (
    <Transition mounted={true} transition="fade" duration={200}>
      {(styles) => (
        <Paper
          p="sm"
          withBorder
          style={{
            ...styles,
            cursor: 'pointer',
            backgroundColor: isSelected 
              ? 'var(--mantine-color-blue-0)' 
              : isHovered 
                ? 'var(--mantine-color-gray-0)' 
                : undefined,
            borderColor: isSelected 
              ? 'var(--mantine-color-blue-3)' 
              : isHovered 
                ? 'var(--mantine-color-gray-3)' 
                : undefined,
            transition: 'all 0.2s ease',
            transform: isHovered ? 'translateY(-1px)' : undefined,
            boxShadow: isHovered 
              ? '0 2px 8px rgba(0, 0, 0, 0.1)' 
              : isSelected 
                ? '0 1px 4px rgba(0, 0, 0, 0.1)' 
                : undefined,
          }}
          onClick={handleSelect}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Group justify="space-between" align="flex-start" gap="xs">
            <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0 }}>
              <Box
                style={{
                  color: isSelected 
                    ? 'var(--mantine-color-blue-6)' 
                    : 'var(--mantine-color-gray-6)',
                  transition: 'color 0.2s ease'
                }}
              >
                <IconBookmark size={16} />
              </Box>
              
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text 
                  size="sm" 
                  fw={isSelected ? 600 : 500}
                  truncate
                  style={{
                    color: isSelected 
                      ? 'var(--mantine-color-blue-8)' 
                      : undefined
                  }}
                >
                  {cb.name}
                </Text>
                {cb.description && (
                  <Text 
                    size="xs" 
                    c="dimmed" 
                    truncate
                    style={{ lineHeight: 1.2 }}
                  >
                    {cb.description}
                  </Text>
                )}
                <Text size="xs" c="dimmed" mt={2}>
                  {new Date(cb.createdAt).toLocaleDateString('ja-JP')}
                </Text>
              </div>
            </Group>

            <Group gap="xs" align="center">
              <Tooltip label={`${cb.tweetCount}件のツイート`}>
                <Badge 
                  size="xs" 
                  variant={isSelected ? "filled" : "light"}
                  color={isSelected ? "blue" : "gray"}
                >
                  {formatCount(cb.tweetCount)}
                </Badge>
              </Tooltip>
              
              <Transition mounted={isHovered || isSelected} transition="fade" duration={150}>
                {(menuStyles) => (
                  <Menu shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        style={menuStyles}
                      >
                        <IconDotsVertical size={12} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconEdit size={14} />}
                        onClick={handleEdit}
                      >
                        編集
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={handleCopy}
                      >
                        コピー
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconShare size={14} />}
                        onClick={handleShare}
                      >
                        共有
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={handleDelete}
                      >
                        削除
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Transition>
            </Group>
          </Group>
        </Paper>
      )}
    </Transition>
  );
}
