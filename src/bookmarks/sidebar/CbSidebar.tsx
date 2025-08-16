import React, { useEffect, useState } from 'react';
import { 
  Stack, 
  Title, 
  Button, 
  Group, 
  Text, 
  TextInput, 
  Box, 
  Divider,
  Badge,
  ScrollArea,
  LoadingOverlay
} from '@mantine/core';
import { IconPlus, IconSearch, IconBookmark } from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { CbSidebarItem } from './CbSidebarItem';
import { cbService } from '../services/cbService';

/**
 * CBサイドバーコンポーネント
 */
export function CbSidebar() {
  const { cbs, loading, error, setCbs, setLoading, setError } = useCbStore();
  const [searchQuery, setSearchQuery] = useState('');

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

  // 検索フィルタリング
  const filteredCbs = cbs.filter(cb => 
    cb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cb.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 統計情報
  const totalTweets = cbs.reduce((sum, cb) => sum + cb.tweetCount, 0);
  const totalCbs = cbs.length;

  if (error) {
    return (
      <Stack gap="md" p="md">
        <Group justify="space-between" align="center">
          <Title order={3} size="h4">
            <IconBookmark size={20} style={{ marginRight: 8 }} />
            カスタムブックマーク
          </Title>
        </Group>
        
        <Box pos="relative">
          <Text size="sm" c="red" ta="center" py="xl">
            {error}
          </Text>
          <Button 
            variant="light" 
            size="xs"
            fullWidth
            onClick={() => window.location.reload()}
          >
            再読み込み
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack gap="md" p="md" h="100%">
      {/* ヘッダー */}
      <Group justify="space-between" align="center">
        <Title order={3} size="h4">
          <IconBookmark size={20} style={{ marginRight: 8 }} />
          カスタムブックマーク
        </Title>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={handleCreateCb}
        >
          新規作成
        </Button>
      </Group>

      {/* 統計情報 */}
      <Group gap="xs" justify="center">
        <Badge variant="light" size="sm">
          {totalCbs} CB
        </Badge>
        <Badge variant="light" size="sm">
          {totalTweets} ツイート
        </Badge>
      </Group>

      <Divider />

      {/* 検索 */}
      <TextInput
        placeholder="CBを検索..."
        leftSection={<IconSearch size={14} />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        size="xs"
        variant="filled"
      />

      {/* CB一覧 */}
      <Box pos="relative" style={{ flex: 1 }}>
        <LoadingOverlay visible={loading} />
        
        <ScrollArea h="100%" type="auto">
          {filteredCbs.length === 0 ? (
            <Box py="xl">
              {searchQuery ? (
                <Text size="sm" c="dimmed" ta="center">
                  「{searchQuery}」に一致するCBが見つかりません
                </Text>
              ) : (
                <Stack gap="sm" align="center">
                  <IconBookmark size={32} color="var(--mantine-color-gray-4)" />
                  <Text size="sm" c="dimmed" ta="center">
                    CBがありません
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    新規作成ボタンからCBを作成してください
                  </Text>
                </Stack>
              )}
            </Box>
          ) : (
            <Stack gap="xs">
              {filteredCbs.map(cb => (
                <CbSidebarItem key={cb.id} cb={cb} />
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Box>
    </Stack>
  );
}
