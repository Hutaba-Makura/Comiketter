import React from 'react';
import { Group, Text, ActionIcon } from '@mantine/core';
import { IconHeart, IconRepeat, IconMessage, IconShare } from '@tabler/icons-react';
import { TweetStats as TweetStatsType } from '../types/tweet';
import { formatCount } from '../utils/format';

interface TweetStatsProps {
  stats: TweetStatsType;
}

/**
 * ツイート統計コンポーネント（フォールバック用）
 */
export function TweetStats({ stats }: TweetStatsProps) {
  return (
    <Group gap="lg" justify="space-between">
      <Group gap="md">
        {/* リプライ */}
        <Group gap="xs" align="center">
          <ActionIcon variant="subtle" size="sm" color="gray">
            <IconMessage size={16} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {formatCount(stats.replyCount)}
          </Text>
        </Group>
        
        {/* リツイート */}
        <Group gap="xs" align="center">
          <ActionIcon variant="subtle" size="sm" color="gray">
            <IconRepeat size={16} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {formatCount(stats.retweetCount)}
          </Text>
        </Group>
        
        {/* いいね */}
        <Group gap="xs" align="center">
          <ActionIcon variant="subtle" size="sm" color="gray">
            <IconHeart size={16} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {formatCount(stats.likeCount)}
          </Text>
        </Group>
      </Group>
      
      {/* シェア */}
      <ActionIcon variant="subtle" size="sm" color="gray">
        <IconShare size={16} />
      </ActionIcon>
    </Group>
  );
}
