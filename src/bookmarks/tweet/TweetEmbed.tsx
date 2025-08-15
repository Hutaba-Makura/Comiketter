import React, { useState } from 'react';
import { Paper, Alert, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
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

  // react-tweetが利用できない場合のフォールバック
  if (hasError) {
    return <TweetEmbedFallback id={id} />;
  }

  // react-tweetの動的インポート
  React.useEffect(() => {
    const loadReactTweet = async () => {
      try {
        const { Tweet } = await import('react-tweet');
        // 成功した場合は何もしない（フォールバックは表示されない）
      } catch (error) {
        console.error('react-tweet読み込みエラー:', error);
        setHasError(true);
      }
    };
    
    loadReactTweet();
  }, []);

  // react-tweetが利用できない場合はフォールバック
  if (hasError) {
    return <TweetEmbedFallback id={id} />;
  }

  // プロト版ではフォールバックを表示
  return <TweetEmbedFallback id={id} />;
}
