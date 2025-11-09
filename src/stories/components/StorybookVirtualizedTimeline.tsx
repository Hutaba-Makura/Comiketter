import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box, Divider } from '@mantine/core';
import { StorybookTweet } from './StorybookTweet';

interface StorybookVirtualizedTimelineProps {
  tweetIds: string[];
  height: number;
  itemHeight?: number;
}

/**
 * Storybook専用の仮想化タイムラインコンポーネント
 * 大量のツイートを効率的に表示
 */
export function StorybookVirtualizedTimeline({ 
  tweetIds, 
  height, 
  itemHeight = 200 
}: StorybookVirtualizedTimelineProps) {
  const itemCount = tweetIds.length;

  // 仮想化リストのアイテムレンダラー
  const renderItem = useMemo(() => {
    return ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const tweetId = tweetIds[index];
      
      return (
        <Box style={style}>
          <Box p="md">
            <StorybookTweet id={tweetId} />
            {index < itemCount - 1 && <Divider my="md" />}
          </Box>
        </Box>
      );
    };
  }, [tweetIds, itemCount]);

  if (itemCount === 0) {
    return null;
  }

  return (
    <List
      height={height}
      itemCount={itemCount}
      itemSize={itemHeight}
      width="100%"
    >
      {renderItem}
    </List>
  );
}
