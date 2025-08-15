import React from 'react';
import { Paper, Stack, Text, Group, Avatar, Badge } from '@mantine/core';
import { IconHeart, IconRepeat, IconMessage, IconShare } from '@tabler/icons-react';
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
    profileImageUrl: 'https://via.placeholder.com/48x48/1DA1F2/FFFFFF?text=U',
    verified: true
  };

  const sampleStats = {
    retweetCount: Math.floor(Math.random() * 100) + 1,
    likeCount: Math.floor(Math.random() * 1000) + 10,
    replyCount: Math.floor(Math.random() * 50) + 1,
    quoteCount: Math.floor(Math.random() * 20) + 1
  };

  const sampleDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

  return (
    <Paper p="md" withBorder>
      <Stack gap="sm">
        {/* ヘッダー */}
        <TweetHeader
          author={sampleAuthor}
          createdAt={sampleDate}
        />
        
        {/* ツイート内容 */}
        <Text size="sm">
          これはプロト版のサンプルツイートです。ID: {formatTweetId(id)}
          <br />
          実際のツイート内容はここに表示されます。
        </Text>
        
        {/* 統計情報 */}
        <TweetStats stats={sampleStats} />
        
        {/* アクションボタン */}
        <Group gap="xs">
          <Badge variant="light" size="xs" color="blue">
            プロト版
          </Badge>
        </Group>
      </Stack>
    </Paper>
  );
}
