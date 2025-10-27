import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text } from '@mantine/core';
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

  // エラーハンドラー（レンダリング中の状態更新を避ける）
  const handleError = useCallback(() => {
    console.error('react-tweet error for tweet:', id);
    // レンダリング中を避けるため、次のティックで実行
    setTimeout(() => {
      setHasError(true);
      setIsLoading(false);
    }, 0);
  }, [id]);

  // ローディング状態を自動的に管理
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 2000); // 2秒後にローディングを終了

    return () => clearTimeout(timer);
  }, [isLoading]);

  // react-tweetが失敗した場合のフォールバック
  if (hasError) {
    return (
      <TweetEmbedFallback 
        id={id}
        onRetry={() => {
          setHasError(false);
          setIsLoading(true);
        }}
      />
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
