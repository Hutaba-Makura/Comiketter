import React, { useState } from 'react';
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

/**
 * Storybook用のCbSidebarコンポーネント
 * useEffectによるデータ取得を無効化
 */
export function CbSidebarStorybook() {
  const { cbs, loading, error } = useCbStore();
  const [searchQuery, setSearchQuery] = useState('');

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
        <Title order={3}>CB一覧</Title>
        <Text c="red" size="sm">
          エラー: {error}
        </Text>
        <Button onClick={() => window.location.reload()}>
          再読み込み
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md" h="100%">
      {/* ヘッダー */}
      <Box>
        <Group justify="space-between" align="center" mb="sm">
          <Title order={3}>CB一覧</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateCb}
            size="sm"
            variant="filled"
          >
            新規作成
          </Button>
        </Group>
        
        <Group gap="xs" mb="sm">
          <Badge variant="light" color="blue">
            CB: {totalCbs}件
          </Badge>
          <Badge variant="light" color="green">
            ツイート: {totalTweets}件
          </Badge>
        </Group>
        
        <Divider />
      </Box>

      {/* 検索バー */}
      <TextInput
        placeholder="CB名や説明で検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        size="sm"
        variant="filled"
      />

      {/* CB一覧 */}
      <Box pos="relative" style={{ flex: 1, overflow: 'hidden' }}>
        <LoadingOverlay visible={loading} />
        
        <ScrollArea 
          h="100%"
          type="never"
          scrollbarSize={6}
          scrollHideDelay={500}
          scrollbars="y"
          viewportProps={{ style: { overflowY: 'auto' } }}
        >
          {filteredCbs.length === 0 ? (
            <Box py="xl">
              {searchQuery ? (
                <Text size="sm" c="dimmed" ta="center">
                  「{searchQuery}」に一致するCBが見つかりません
                </Text>
              ) : (
                <Stack gap="sm" align="center">
                  <IconBookmark size={32} color="var(--mantine-color-blue-6)" />
                  <Text size="sm" c="dimmed" ta="center">
                    CBがありませんよ
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    新規作成ボタンからCBを作成してください
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    最終更新時刻:{new Date().toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
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
