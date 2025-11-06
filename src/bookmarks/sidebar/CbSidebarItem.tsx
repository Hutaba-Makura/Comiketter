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
  Transition,
  Button,
  Stack
} from '@mantine/core';
import { 
  IconBookmark, 
  IconDotsVertical, 
  IconTrash, 
  IconEdit, 
  IconCopy
} from '@tabler/icons-react';
import { Cb } from '../types/cb';
import { useCbStore } from '../state/cbStore';
import { formatCount } from '../utils/format';
import { cbService } from '../services/cbService';

interface CbSidebarItemProps {
  cb: Cb;
}

/**
 * CBサイドバーアイテムコンポーネント
 */
export function CbSidebarItem({ cb }: CbSidebarItemProps) {
  const { selectedCbId, selectCb, removeCb, selectCbAndEditName, addCb } = useCbStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isSelected = selectedCbId === cb.id;

  const handleSelect = () => {
    selectCb(cb.id);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await cbService.deleteCb(cb.id);
      removeCb(cb.id);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('CB削除エラー:', error);
      alert('CBの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  // CBの名前の編集を開始（TimelineViewのCB情報ヘッダーで編集）
  const handleEdit: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation(); // PaperのonClickを防ぐ
    selectCbAndEditName(cb.id); // CBを選択して編集モードに入る
  };

  const handleCopy: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.stopPropagation(); // PaperのonClickを防ぐ
    try {
      // CBをコピー
      const newCb = await cbService.copyCb(cb.id);
      
      // サイドバーに追加
      addCb(newCb);
      
      console.log('CBコピー完了:', newCb.id);
    } catch (error) {
      console.error('CBコピーエラー:', error);
      alert('CBのコピーに失敗しました');
    }
  };

  return (
    <>
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
                    ? 'rgb(29, 155, 240)' 
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
                      ? 'rgb(29, 155, 240)' 
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
                  color={isSelected ? "rgb(29, 155, 240)" : "gray"}
                >
                  {formatCount(cb.tweetCount)}
                </Badge>
              </Tooltip>
              
              <Transition mounted={isHovered || isSelected} transition="fade" duration={150}>
                {(menuStyles) => (
                  <Menu shadow="md" width={150} position="bottom-end">
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

      {/* 削除確認モーダル */}
      {isDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelDelete}
        >
          <Box
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '320px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Text
              size="xl"
              fw={700}
              style={{
                color: 'black',
                marginBottom: '8px',
              }}
            >
              カスタムブックマークを削除しますか？
            </Text>
            <Text
              style={{
                color: 'rgb(83, 100, 113)',
                marginBottom: '24px',
                fontSize: '15px',
              }}
            >
              この操作は取り消せません
            </Text>
            <Stack gap="xs">
              <Button
                color="rgb(244, 33, 46)"
                size="lg"
                radius="xl"
                fullWidth
                onClick={handleConfirmDelete}
                loading={isDeleting}
                style={{
                  borderColor: 'rgb(207, 217, 222)',
                }}
              >
                削除
              </Button>
              <Button
                variant="default"
                size="lg"
                radius="xl"
                fullWidth
                onClick={handleCancelDelete}
                disabled={isDeleting}
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: 'rgb(207, 217, 222)',
                }}
              >
                キャンセル
              </Button>
            </Stack>
          </Box>
        </div>
      )}
  </>
  );
}


