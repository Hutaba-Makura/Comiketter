import React, { useState, useCallback } from 'react';
import { Box, Alert, Text, Button } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { Tweet } from 'react-tweet';
import { useThemeBridge } from '../hooks/useThemeBridge';
import { TweetEmbedFallback } from './TweetEmbedFallback';

interface TweetEmbedProps {
  id: string;
}

/**
 * ツイート表示コンポーネント
 * react-tweetを使用した美しいツイート表示
 */
export function TweetEmbed({ id }: TweetEmbedProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { themeValue } = useThemeBridge();

  // エラーハンドラー
  const handleError = useCallback(() => {
    console.error('react-tweet error for tweet:', id);
    setHasError(true);
    setIsLoading(false);
  }, [id]);

  // ロード完了ハンドラー
  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // react-tweetが失敗した場合のフォールバック
  if (hasError) {
    return (
      <Box
        data-theme={themeValue}
        style={{
          border: '1px solid #e1e8ed',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="ツイートの読み込みに失敗しました"
          color="red"
          variant="light"
        >
          <Text size="sm" mb="md">
            このツイートを表示できませんでした
          </Text>
          <Button 
            variant="light" 
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
            }}
          >
            再試行
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      data-theme={themeValue}
      style={{
        border: '1px solid #e1e8ed',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ローディングオーバーレイ */}
      {isLoading && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Text size="sm" c="dimmed">読み込み中...</Text>
        </Box>
      )}
      
      <Tweet 
        id={id}
        onError={handleError}
        components={{
          // カスタムコンポーネントを追加（必要に応じて）
        }}
      />
    </Box>
  );
}
