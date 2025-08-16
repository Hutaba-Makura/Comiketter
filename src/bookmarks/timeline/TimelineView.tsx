import React, { useState, useMemo } from 'react';
import { 
  Stack, 
  Text, 
  Center, 
  Loader, 
  Alert, 
  Group, 
  Badge, 
  Select, 
  TextInput, 
  Box,
  Divider,
  Button,
  ActionIcon,
  Tooltip,
  Switch
} from '@mantine/core';
import { 
  IconAlertCircle, 
  IconSearch, 
  IconSortAscending, 
  IconSortDescending,
  IconRefresh,
  IconFilter
} from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { useTimeline } from '../hooks/useTimeline';
import { TweetEmbed } from '../tweet/TweetEmbed';
import { TimelineSkeleton } from './TimelineSkeleton';
import { VirtualizedTimeline } from './VirtualizedTimeline';

/**
 * タイムライン表示コンポーネント
 */
export function TimelineView() {
  const { selectedCbId, selectedCb } = useCbStore();
  const { tweetIds, loading, error, refetch } = useTimeline(selectedCbId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [useVirtualization, setUseVirtualization] = useState(false);

  // フィルタリングとソート
  const filteredAndSortedTweetIds = useMemo(() => {
    let filtered = tweetIds;
    
    // 検索フィルタリング（現在はツイートIDでの検索のみ）
    if (searchQuery) {
      filtered = tweetIds.filter(id => 
        id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // ソート（現在は順序を維持）
    if (sortOrder === 'oldest') {
      filtered = [...filtered].reverse();
    }
    
    return filtered;
  }, [tweetIds, searchQuery, sortOrder]);

  // 仮想化を使用するかどうかを決定（100件以上の場合）
  const shouldUseVirtualization = useVirtualization && filteredAndSortedTweetIds.length >= 100;

  // CBが選択されていない場合
  if (!selectedCbId) {
    return (
      <Box p="xl">
        <Center h={400}>
          <Stack align="center" gap="md">
            <Text size="xl" c="dimmed" fw={500}>
              CBを選択してください
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={300}>
              左側のサイドバーから表示したいCBを選択してください
            </Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  // ローディング中
  if (loading) {
    return (
      <Box p="xl">
        <TimelineSkeleton />
      </Box>
    );
  }

  // エラー
  if (error) {
    return (
      <Box p="xl">
        <Center h={400}>
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="エラーが発生しました"
            color="red"
            variant="light"
            style={{ maxWidth: 500 }}
          >
            <Text size="sm" mb="md">{error}</Text>
            <Button 
              variant="light" 
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={refetch}
            >
              再試行
            </Button>
          </Alert>
        </Center>
      </Box>
    );
  }

  return (
    <Box p="xl">
      {/* ヘッダー */}
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Text size="xl" fw={600}>
              {selectedCb?.name || 'CB'}
            </Text>
            {selectedCb?.description && (
              <Text size="sm" c="dimmed">
                {selectedCb.description}
              </Text>
            )}
          </Stack>
          
          <Group gap="xs">
            <Badge variant="light" size="lg">
              {tweetIds.length} ツイート
            </Badge>
            
            <Tooltip label="更新">
              <ActionIcon
                variant="light"
                size="md"
                onClick={refetch}
                loading={loading}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Divider />

        {/* ツールバー */}
        <Group justify="space-between" align="center">
          <Group gap="md">
            <TextInput
              placeholder="ツイートを検索..."
              leftSection={<IconSearch size={14} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              size="sm"
              style={{ width: 250 }}
            />
            
            <Select
              value={sortOrder}
              onChange={(value) => setSortOrder(value as 'newest' | 'oldest')}
              data={[
                { value: 'newest', label: '新しい順' },
                { value: 'oldest', label: '古い順' }
              ]}
              size="sm"
              style={{ width: 120 }}
              leftSection={
                sortOrder === 'newest' ? 
                  <IconSortDescending size={14} /> : 
                  <IconSortAscending size={14} />
              }
            />

            {filteredAndSortedTweetIds.length >= 100 && (
              <Switch
                label="仮想化表示"
                checked={useVirtualization}
                onChange={(event) => setUseVirtualization(event.currentTarget.checked)}
                size="sm"
              />
            )}
          </Group>

          {searchQuery && (
            <Text size="sm" c="dimmed">
              {filteredAndSortedTweetIds.length}件の結果
            </Text>
          )}
        </Group>

        {/* ツイート一覧 */}
        {filteredAndSortedTweetIds.length === 0 ? (
          <Center h={300}>
            <Stack align="center" gap="md">
              {searchQuery ? (
                <>
                  <IconSearch size={48} color="var(--mantine-color-gray-4)" />
                  <Text size="lg" c="dimmed" fw={500}>
                    検索結果がありません
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    「{searchQuery}」に一致するツイートが見つかりませんでした
                  </Text>
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    検索をクリア
                  </Button>
                </>
              ) : (
                <>
                  <Text size="lg" c="dimmed" fw={500}>
                    ツイートがありません
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    このCBにはまだツイートが追加されていません
                  </Text>
                </>
              )}
            </Stack>
          </Center>
        ) : shouldUseVirtualization ? (
          <Box style={{ height: 600 }}>
            <VirtualizedTimeline 
              tweetIds={filteredAndSortedTweetIds}
              height={600}
              itemHeight={200}
            />
          </Box>
        ) : (
          <Stack gap="md">
            {filteredAndSortedTweetIds.map((id, index) => (
              <Box key={id}>
                <TweetEmbed id={id} />
                {index < filteredAndSortedTweetIds.length - 1 && (
                  <Divider my="md" />
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
