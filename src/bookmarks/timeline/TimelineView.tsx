import React from 'react';
import { Stack, Text, Center, Loader, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { useTimeline } from '../hooks/useTimeline';
import { TweetEmbed } from '../tweet/TweetEmbed';

/**
 * タイムライン表示コンポーネント
 */
export function TimelineView() {
  const { selectedCbId } = useCbStore();
  const { tweetIds, loading, error } = useTimeline(selectedCbId);

  // CBが選択されていない場合
  if (!selectedCbId) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Text size="lg" c="dimmed">
            CBを選択してください
          </Text>
          <Text size="sm" c="dimmed">
            左側のサイドバーから表示したいCBを選択してください
          </Text>
        </Stack>
      </Center>
    );
  }

  // ローディング中
  if (loading) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="sm" c="dimmed">
            ツイートを読み込み中...
          </Text>
        </Stack>
      </Center>
    );
  }

  // エラー
  if (error) {
    return (
      <Center h={400}>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="エラー"
          color="red"
          variant="light"
          style={{ maxWidth: 400 }}
        >
          <Text size="sm">{error}</Text>
        </Alert>
      </Center>
    );
  }

  // ツイートがない場合
  if (tweetIds.length === 0) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Text size="lg" c="dimmed">
            ツイートがありません
          </Text>
          <Text size="sm" c="dimmed">
            このCBにはまだツイートが追加されていません
          </Text>
        </Stack>
      </Center>
    );
  }

  // ツイート一覧を表示
  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {tweetIds.length}件のツイート
      </Text>
      
      <Stack gap="md">
        {tweetIds.map(id => (
          <TweetEmbed key={id} id={id} />
        ))}
      </Stack>
    </Stack>
  );
}
