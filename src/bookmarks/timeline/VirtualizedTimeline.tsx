import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box, Divider } from '@mantine/core';
import { Tweet } from '../tweet/Tweet';

interface VirtualizedTimelineProps {
  tweetIds: string[];
  height: number;
  itemHeight?: number;
  /** 削除後に呼び出されるコールバック関数 */
  onDelete?: () => void;
}

/**
 * 仮想化されたタイムラインコンポーネント
 * 大量のツイートを効率的に表示
 */
export function VirtualizedTimeline({ 
  tweetIds, 
  height, 
  itemHeight = 200,
  onDelete
}: VirtualizedTimelineProps) {
  const itemCount = tweetIds.length;

  // 仮想化リストのアイテムレンダラー
  const renderItem = useMemo(() => {
    return ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const tweetId = tweetIds[index];
      
      return (
        <Box style={style}>
          <Box p="md">
            <Tweet id={tweetId} onDelete={onDelete} />
            {index < itemCount - 1 && <Divider my="md" />}
          </Box>
        </Box>
      );
    };
  }, [tweetIds, itemCount, onDelete]);

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
