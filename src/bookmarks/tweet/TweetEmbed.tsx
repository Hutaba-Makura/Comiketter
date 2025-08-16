import React from 'react';
import { Box } from '@mantine/core';
import { useThemeBridge } from '../hooks/useThemeBridge';
import { TweetEmbedFallback } from './TweetEmbedFallback';

interface TweetEmbedProps {
  id: string;
}

/**
 * ツイート表示コンポーネント
 * 現在はフォールバック実装のみを使用
 */
export function TweetEmbed({ id }: TweetEmbedProps) {
  const { themeValue } = useThemeBridge();

  return (
    <Box
      data-theme={themeValue}
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: 8,
        overflow: 'hidden',
        padding: '16px',
      }}
    >
      <TweetEmbedFallback id={id} />
    </Box>
  );
}
