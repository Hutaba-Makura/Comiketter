/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: TwitterのTLのようなツイート表示コンポーネント
 */

import React from 'react';
import { 
  Card, 
  Text, 
  Group, 
  Avatar, 
  ActionIcon, 
  Stack,
  Badge,
  Image,
  Box
} from '@mantine/core';
import { 
  IconExternalLink, 
  IconHeart, 
  IconMessageCircle, 
  IconRepeat, 
  IconShare,
  IconPhoto,
  IconVideo,
  IconLink
} from '@tabler/icons-react';
import type { BookmarkedTweetDB } from '../utils/bookmarkDB';

interface TweetTimelineProps {
  tweets: BookmarkedTweetDB[];
  onTweetClick?: (tweetId: string) => void;
}

export const TweetTimeline: React.FC<TweetTimelineProps> = ({
  tweets,
  onTweetClick
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}分`;
    } else if (diffInHours < 24) {
      return `${diffInHours}時間`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}日`;
    }
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openTweet = (tweetId: string) => {
    if (onTweetClick) {
      onTweetClick(tweetId);
    } else {
      window.open(`https://twitter.com/i/status/${tweetId}`, '_blank');
    }
  };

  const getMediaIcon = (mediaTypes: string[] = []) => {
    if (mediaTypes.some(type => type.startsWith('video/'))) {
      return <IconVideo size={16} color="#1da1f2" />;
    } else if (mediaTypes.some(type => type.startsWith('image/'))) {
      return <IconPhoto size={16} color="#1da1f2" />;
    }
    return null;
  };

  const renderMediaPreview = (mediaUrls: string[] = [], mediaTypes: string[] = []) => {
    if (!mediaUrls.length) return null;

    const imageUrls = mediaUrls.filter((_, index) => 
      mediaTypes[index]?.startsWith('image/')
    );

    if (imageUrls.length === 0) return null;

    return (
      <Box mt="xs">
        <Group gap="xs">
          {imageUrls.slice(0, 4).map((url, index) => (
            <Box
              key={index}
              style={{
                width: imageUrls.length === 1 ? 200 : 80,
                height: 80,
                borderRadius: 8,
                overflow: 'hidden',
                flex: imageUrls.length === 1 ? 'none' : 1
              }}
            >
              <Image
                src={url}
                alt={`Media ${index + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          ))}
        </Group>
      </Box>
    );
  };

  if (tweets.length === 0) {
    return (
      <Card withBorder>
        <Text ta="center" color="dimmed" py="xl">
          このブックマークにはまだツイートが追加されていません
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap={0}>
      {tweets.map((tweet) => (
        <Card
          key={tweet.id}
          withBorder
          style={{
            borderBottom: '1px solid #e1e8ed',
            borderRadius: 0,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: '#f7f9fa'
            }
          }}
          onClick={() => openTweet(tweet.tweetId)}
        >
          <Group align="flex-start" gap="md" wrap="nowrap">
            {/* アバター */}
            <Avatar
              src={`https://unavatar.io/${tweet.authorUsername}`}
              alt={tweet.authorDisplayName || tweet.authorUsername}
              size="md"
              radius="xl"
            />

            {/* ツイート内容 */}
            <Box style={{ flex: 1, minWidth: 0 }}>
              {/* ヘッダー情報 */}
              <Group gap="xs" mb="xs" wrap="nowrap">
                <Text size="sm" fw={600} style={{ color: '#14171a' }}>
                  {tweet.authorDisplayName || tweet.authorUsername}
                </Text>
                <Text size="sm" color="dimmed" style={{ color: '#657786' }}>
                  @{tweet.authorUsername}
                </Text>
                <Text size="sm" color="dimmed" style={{ color: '#657786' }}>
                  · {formatDate(tweet.tweetDate)}
                </Text>
                {tweet.isRetweet && (
                  <Badge size="xs" variant="light" color="green">
                    RT
                  </Badge>
                )}
                {tweet.isReply && (
                  <Badge size="xs" variant="light" color="blue">
                    返信
                  </Badge>
                )}
                {getMediaIcon(tweet.mediaTypes)}
              </Group>

              {/* ツイート本文 */}
              <Text size="sm" mb="xs" style={{ 
                color: '#14171a', 
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {tweet.content}
              </Text>

              {/* メディアプレビュー */}
              {renderMediaPreview(tweet.mediaUrls, tweet.mediaTypes)}

              {/* アクション */}
              <Group gap="lg" mt="md">
                <Group gap="xs">
                  <ActionIcon variant="subtle" size="sm" color="gray">
                    <IconMessageCircle size={16} />
                  </ActionIcon>
                  <Text size="xs" color="dimmed">0</Text>
                </Group>
                
                <Group gap="xs">
                  <ActionIcon variant="subtle" size="sm" color="gray">
                    <IconRepeat size={16} />
                  </ActionIcon>
                  <Text size="xs" color="dimmed">0</Text>
                </Group>
                
                <Group gap="xs">
                  <ActionIcon variant="subtle" size="sm" color="gray">
                    <IconHeart size={16} />
                  </ActionIcon>
                  <Text size="xs" color="dimmed">0</Text>
                </Group>
                
                <ActionIcon variant="subtle" size="sm" color="gray">
                  <IconShare size={16} />
                </ActionIcon>
              </Group>

              {/* 保存情報 */}
              <Text size="xs" color="dimmed" mt="xs">
                保存日: {formatFullDate(tweet.savedAt)}
              </Text>
            </Box>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}; 