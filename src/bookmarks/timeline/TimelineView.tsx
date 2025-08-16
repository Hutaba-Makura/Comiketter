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
    <Box p="xl" style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダーとツールバーを1行に横並びに配置（固定） */}
      <Box style={{ flexShrink: 0 }}>
        <Group gap="lg" align="center" mb="md" wrap="nowrap">
          {/* CB名 */}
          <Text size="xl" fw={600} style={{ flexShrink: 0 }}>
            {selectedCb?.name || 'CB'}
          </Text>

          {/* ツイート数 */}
          <Badge variant="light" size="lg" style={{ flexShrink: 0 }}>
            {tweetIds.length} ツイート
          </Badge>

          {/* 検索バー */}
          <TextInput
            placeholder="ツイートを検索..."
            leftSection={<IconSearch size={14} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="sm"
            style={{ width: 250, flexShrink: 0 }}
          />
          
          {/* ソート選択 */}
          <Select
            value={sortOrder}
            onChange={(value) => setSortOrder(value as 'newest' | 'oldest')}
            data={[
              { value: 'newest', label: '新しい順' },
              { value: 'oldest', label: '古い順' }
            ]}
            size="sm"
            style={{ width: 120, flexShrink: 0 }}
            leftSection={
              sortOrder === 'newest' ? 
                <IconSortDescending size={14} /> : 
                <IconSortAscending size={14} />
            }
          />

          {/* 更新ボタン */}
          <Tooltip label="更新">
            <ActionIcon
              variant="light"
              size="md"
              onClick={refetch}
              loading={loading}
              style={{ flexShrink: 0 }}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* CBの説明文（別行に表示） */}
        {selectedCb?.description && (
          <Text size="sm" c="dimmed" mb="md">
            {selectedCb.description}
          </Text>
        )}

        {/* 検索結果表示 */}
        {searchQuery && (
          <Text size="sm" c="dimmed" mb="md">
            {filteredAndSortedTweetIds.length}件の結果
          </Text>
        )}

        {/* 仮想化スイッチ */}
        {filteredAndSortedTweetIds.length >= 100 && (
          <Box mb="md">
            <Switch
              label="仮想化表示"
              checked={useVirtualization}
              onChange={(event) => setUseVirtualization(event.currentTarget.checked)}
              size="sm"
            />
          </Box>
        )}

        <Divider mb="md" />
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
      </Box>
    </Box>
  );
}
