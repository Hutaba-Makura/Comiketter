import React from 'react';
import { Group, Text, ActionIcon, Box } from '@mantine/core';
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
    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      {/* 左側のアクションボタン */}
      <Box style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        {/* リプライ */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ActionIcon variant="subtle" size="sm" color="gray">
            <IconMessage size={16} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {formatCount(stats.replyCount)}
          </Text>
        </Box>
        
        {/* リツイート */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ActionIcon variant="subtle" size="sm" color="gray">
            <IconRepeat size={16} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {formatCount(stats.retweetCount)}
          </Text>
        </Box>
        
        {/* いいね */}
        <Box style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ActionIcon variant="subtle" size="sm" color="gray">
            <IconHeart size={16} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {formatCount(stats.likeCount)}
          </Text>
        </Box>
      </Box>
      
      {/* 右側のシェアボタン */}
      <ActionIcon variant="subtle" size="sm" color="gray">
        <IconShare size={16} />
      </ActionIcon>
    </Box>
  );
}
