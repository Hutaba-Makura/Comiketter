import React, { useEffect } from 'react';
import { Stack, Title, Button, Group, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { CbSidebarItem } from './CbSidebarItem';
import { cbService } from '../services/cbService';

/**
 * CBサイドバーコンポーネント
 */
export function CbSidebar() {
  const { cbs, loading, error, setCbs, setLoading, setError } = useCbStore();

  // CB一覧を取得
  useEffect(() => {
    const fetchCbs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cbList = await cbService.listCbs();
        setCbs(cbList);
      } catch (err) {
        console.error('CB一覧取得エラー:', err);
        setError(err instanceof Error ? err.message : 'CB一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchCbs();
  }, [setCbs, setLoading, setError]);

  const handleCreateCb = () => {
    // TODO: モーダルを開く
    console.log('CB作成モーダルを開く');
  };

  if (loading) {
    return (
      <Stack>
        <Title order={3}>カスタムブックマーク</Title>
        <Text size="sm" c="dimmed">読み込み中...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack>
        <Title order={3}>カスタムブックマーク</Title>
        <Text size="sm" c="red">{error}</Text>
        <Button 
          variant="light" 
          size="xs"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={3}>カスタムブックマーク</Title>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={handleCreateCb}
        >
          新規作成
        </Button>
      </Group>

      {cbs.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          CBがありません
        </Text>
      ) : (
        <Stack gap="xs">
          {cbs.map(cb => (
            <CbSidebarItem key={cb.id} cb={cb} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
