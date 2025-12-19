import React, { useState, useEffect } from 'react';
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
  IconCopy,
  IconArrowBigUpLine
} from '@tabler/icons-react';
import { Cb } from '../types/cb';
import { useCbStore } from '../state/cbStore';
import { formatCount } from '../utils/format';
import { cbService } from '../services/cbService';
import { getTextSync, useI18n } from '../utils/i18n';

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

  // i18n機能を一元管理（言語設定の初期化、ストレージ変更の監視、再レンダリングのトリガー）
  useI18n();

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
      alert(getTextSync('cb_delete_failed'));
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
      alert(getTextSync('cb_copy_failed'));
    }
  };

  // 実装中
  const handleExport = () => {
    console.log('CBエクスポート:', cb.id);
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
                  {new Date(cb.updatedAt).toLocaleDateString('ja-JP')}
                </Text>
              </div>
            </Group>

            <Group gap="xs" align="center">
              <Tooltip label={getTextSync('tweet_count', { count: cb.tweetCount.toString() })}>
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
                  <Menu shadow="md" width="auto" position="bottom-end">
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
                        {getTextSync('edit')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCopy size={14} />}
                        onClick={handleCopy}
                      >
                        {getTextSync('copy')}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconArrowBigUpLine size={14} />}
                        onClick={handleExport}
                      >
                        {getTextSync('export_single_cb')}
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={14} />}
                        color="red"
                        onClick={handleDelete}
                      >
                        {getTextSync('delete_bookmark')}
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
              {getTextSync('confirm_delete_cb')}
            </Text>
            <Text
              style={{
                color: 'rgb(83, 100, 113)',
                marginBottom: '24px',
                fontSize: '15px',
              }}
            >
              {getTextSync('cannot_undo')}
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
                {getTextSync('delete_bookmark')}
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
                {getTextSync('cancel')}
              </Button>
            </Stack>
          </Box>
        </div>
      )}
  </>
  );
}


