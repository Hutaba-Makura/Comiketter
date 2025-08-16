import React, { useState } from 'react';
import { Alert, Text, Box } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Tweet } from 'react-tweet';
import { useThemeBridge } from '../hooks/useThemeBridge';
import { TweetEmbedFallback } from './TweetEmbedFallback';

interface TweetEmbedProps {
  id: string;
}

/**
 * react-tweetを使用したツイート表示コンポーネント
 */
export function TweetEmbed({ id }: TweetEmbedProps) {
  const [hasError, setHasError] = useState(false);
  const { themeValue } = useThemeBridge();

  // react-tweetが失敗した場合のフォールバック
  if (hasError) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="ツイートの読み込みに失敗しました"
        color="red"
        variant="light"
      >
        <Text size="sm" mb="md">
          このツイートを表示できませんでした
        </Text>
        <TweetEmbedFallback id={id} />
      </Alert>
    );
  }

  return (
    <Box
      data-theme={themeValue}
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <Tweet 
        id={id}
        onError={() => setHasError(true)}
      />
    </Box>
  );
}
