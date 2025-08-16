import React from 'react';
import { Paper, Stack, Text, Group, Badge, Box } from '@mantine/core';
import { IconHeart, IconRepeat, IconMessage, IconShare, IconUser } from '@tabler/icons-react';
import { TweetHeader } from './TweetHeader';
import { TweetStats } from './TweetStats';
import { TweetMedia } from './TweetMedia';
import { formatTweetId } from '../utils/format';

interface TweetEmbedFallbackProps {
  id: string;
}

/**
 * react-tweet失敗時のフォールバック表示コンポーネント
 */
export function TweetEmbedFallback({ id }: TweetEmbedFallbackProps) {
  // プロト版ではサンプルデータを表示
  const sampleAuthor = {
    id: 'sample-user',
    username: 'sample_user',
    displayName: 'サンプルユーザー',
    profileImageUrl: '', // 外部画像を使用しない
    verified: true
  };

  const sampleStats = {
    retweetCount: Math.floor(Math.random() * 100) + 1,
    likeCount: Math.floor(Math.random() * 1000) + 10,
    replyCount: Math.floor(Math.random() * 50) + 1,
    quoteCount: Math.floor(Math.random() * 20) + 1
  };

  const sampleDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

  // サンプルメディア（ランダムに生成）
  const hasMedia = Math.random() > 0.5;
  const sampleMedia = hasMedia ? [
    {
      id: 'media-1',
      type: 'image' as const,
      url: 'https://via.placeholder.com/400x300/1DA1F2/FFFFFF?text=Image',
      previewUrl: 'https://via.placeholder.com/400x300/1DA1F2/FFFFFF?text=Image',
      altText: 'サンプル画像',
      width: 400,
      height: 300
    }
  ] : [];

  return (
    <Paper p="md" withBorder>
      <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* ヘッダー */}
        <TweetHeader
          author={sampleAuthor}
          createdAt={sampleDate}
        />
        
        {/* ツイート内容 */}
        <Text size="sm" style={{ lineHeight: 1.4 }}>
          これはプロト版のサンプルツイートです。ID: {formatTweetId(id)}
          <br />
          実際のツイート内容はここに表示されます。このツイートには複数行のテキストが含まれることがあります。
        </Text>

        {/* メディア表示 */}
        {hasMedia && <TweetMedia media={sampleMedia} />}
        
        {/* 統計情報とアクションボタン */}
        <TweetStats stats={sampleStats} />
        
        {/* プロト版バッジ */}
        <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Badge variant="light" size="xs" color="blue">
            プロト版
          </Badge>
        </Box>
      </Box>
    </Paper>
  );
}
