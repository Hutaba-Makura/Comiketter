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
import { TweetEmbedFallback } from '../../bookmarks/tweet/TweetEmbedFallback';
import { TimelineSkeleton } from '../../bookmarks/timeline/TimelineSkeleton';
import { VirtualizedTimeline } from '../../bookmarks/timeline/VirtualizedTimeline';
import { StorybookTweet } from './StorybookTweet';
import { StorybookVirtualizedTimeline } from './StorybookVirtualizedTimeline';

// Storybook専用のTimelineViewコンポーネント
interface StorybookTimelineViewProps {
  selectedCbId?: string | null;
  selectedCb?: any;
  tweetIds?: string[];
  loading?: boolean;
  error?: string | null;
}

export function StorybookTimelineView({
  selectedCbId = 'sample-cb-1',
  selectedCb = {
    id: 'sample-cb-1',
    name: 'コミックマーケット関連',
    description: 'コミックマーケットに関するツイートをまとめたCB',
    tweetCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  tweetIds = [],
  loading = false,
  error = null
}: StorybookTimelineViewProps) {
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
      <Center h={400}>
        <Stack align="center" gap="md">
          <IconAlertCircle size={48} color="var(--mantine-color-gray-4)" />
          <Text size="lg" c="dimmed" fw={500}>
            CBが選択されていません
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            左側のサイドバーからCBを選択してください
          </Text>
        </Stack>
      </Center>
    );
  }

  // ローディング状態
  if (loading) {
    return <TimelineSkeleton />;
  }

  // エラー状態
  if (error) {
    return (
      <Center h={400}>
        <Alert
          icon={<IconAlertCircle size={20} />}
          title="エラーが発生しました"
          color="red"
          variant="light"
          style={{ maxWidth: 500 }}
        >
          <Text size="sm" mb="md">
            {error}
          </Text>
          <Button 
            variant="light" 
            size="sm"
            leftSection={<IconRefresh size={16} />}
            onClick={() => window.location.reload()}
          >
            再試行
          </Button>
        </Alert>
      </Center>
    );
  }

  return (
    <Box style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* CB情報ヘッダー */}
      <Box p="md" style={{ borderBottom: '1px solid #e1e8ed' }}>
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Text size="xl" fw={600}>
              {selectedCb?.name || 'CB名'}
            </Text>
            <Text size="sm" c="dimmed">
              {selectedCb?.description || 'CBの説明'}
            </Text>
          </Stack>
          <Group gap="xs">
            <Badge variant="light" size="lg">
              {filteredAndSortedTweetIds.length} ツイート
            </Badge>
            <ActionIcon variant="subtle" size="lg">
              <IconRefresh size={20} />
            </ActionIcon>
          </Group>
        </Group>
        <Divider my="md" />
      </Box>

      {/* ツールバー */}
      <Box p="md" style={{ borderBottom: '1px solid #e1e8ed' }}>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <TextInput
              placeholder="ツイートを検索..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 250 }}
            />
            <Select
              placeholder="並び順"
              leftSection={<IconSortAscending size={16} />}
              value={sortOrder}
              onChange={(value) => setSortOrder(value as 'newest' | 'oldest')}
              data={[
                { value: 'newest', label: '新しい順' },
                { value: 'oldest', label: '古い順' }
              ]}
              style={{ width: 120 }}
            />
          </Group>
          <Group gap="md" align="center">
            <Text size="sm" c="dimmed">
              仮想化
            </Text>
            <Switch
              checked={useVirtualization}
              onChange={(e) => setUseVirtualization(e.currentTarget.checked)}
              size="sm"
            />
          </Group>
        </Group>
      </Box>

      {/* ツイート一覧（スクロール可能） */}
      <Box style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
          <Box style={{ height: '100%' }}>
            <StorybookVirtualizedTimeline 
              tweetIds={filteredAndSortedTweetIds}
              height={600}
              itemHeight={200}
            />
          </Box>
        ) : (
          <Stack gap={0} p="md">
            {filteredAndSortedTweetIds.map((id, index) => (
              <Box key={id}>
                <StorybookTweet id={id} />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
