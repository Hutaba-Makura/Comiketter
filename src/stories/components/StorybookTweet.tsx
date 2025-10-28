import React from 'react';
import { Paper, Stack, Text, Group, Badge, Box, Avatar, ActionIcon } from '@mantine/core';
import { IconHeart, IconRepeat, IconMessage, IconShare, IconUser, IconCheck } from '@tabler/icons-react';
import { sampleAuthors, sampleStats, sampleMediaItems, sampleTweetContents } from '../data/tweetSampleData';
import { formatTweetId, formatRelativeTime, formatCount } from '../../bookmarks/utils/format';

// Storybook専用のツイート表示コンポーネント
interface StorybookTweetProps {
  id: string;
}

export function StorybookTweet({ id }: StorybookTweetProps) {
  // ツイートIDに基づいてサンプルデータを選択
  const tweetIndex = parseInt(id.slice(-1)) || 0;
  const author = sampleAuthors[tweetIndex % sampleAuthors.length];
  const stats = sampleStats[tweetIndex % sampleStats.length];
  const content = sampleTweetContents[tweetIndex % sampleTweetContents.length];
  const media = sampleMediaItems[tweetIndex % sampleMediaItems.length];
  const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

  return (
    <Paper p="md" withBorder style={{ maxWidth: '598px' , margin: '0 auto'}}>
      <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* ヘッダー */}
        <Box style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
          {/* プロフィール画像 */}
          <Avatar
            src={author.profileImageUrl || undefined}
            alt={author.displayName}
            size="md"
            radius="xl"
            color="blue"
            style={{ flexShrink: 0 }}
          >
            {!author.profileImageUrl && <IconUser size={20} />}
          </Avatar>
          
          {/* ユーザー情報 */}
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
            {/* ユーザー名、認証マーク、ユーザーID、時刻を横並び */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
                {author.displayName}
              </Text>
              
              {author.verified && (
                <IconCheck size={14} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />
              )}
              
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                @{author.username}
              </Text>
              
              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                · {formatRelativeTime(createdAt)}
              </Text>
            </Box>
          </Box>
        </Box>
        
        {/* ツイート内容 */}
        <Text size="sm" style={{ lineHeight: 1.4 }}>
          {content}
          <br />
          <Text size="xs" c="dimmed" mt="xs">
            ID: {formatTweetId(id)}
          </Text>
        </Text>

        {/* メディア表示 */}
        {media.length > 0 && (
          <Box style={{ marginTop: '8px' }}>
            {media.length === 1 ? (
              <Paper withBorder style={{ position: 'relative', overflow: 'hidden' }}>
                <img
                  src={media[0].previewUrl}
                  alt={media[0].altText || 'メディア'}
                  style={{ 
                    width: '100%', 
                    minWidth: '300px', 
                    maxWidth: '516px', 
                    minHeight: '300px', 
                    maxHeight: '417.33px', 
                    objectFit: 'cover', 
                    borderRadius: '4px'
                  }}
                />
                <Badge
                  size="xs"
                  variant="filled"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                  }}
                >
                  {media[0].type.toUpperCase()}
                </Badge>
              </Paper>
            ) : (
              <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                {media.slice(0, 4).map((item, index) => (
                  <Paper key={item.id} withBorder style={{ position: 'relative' }}>
                    <img
                      src={item.previewUrl}
                      alt={item.altText || 'メディア'}
                      style={{ 
                        width: '100%', 
                        minWidth: '165.5px',
                        maxWidth: '257px',
                        minHeight: '187.31px',
                        maxHeight: '290.25px', 
                        objectFit: 'cover', 
                        borderRadius: '4px' 
                      }}
                    />
                    <Badge
                      size="xs"
                      variant="filled"
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)'
                      }}
                    >
                      {item.type.toUpperCase()}
                    </Badge>
                    {index === 3 && media.length > 4 && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                        }}
                      >
                        <Text size="lg" fw={600} c="white">
                          +{media.length - 4}
                        </Text>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
        
        {/* 統計情報とアクションボタン */}
        <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {/* 左側のアクションボタン */}
          <Box style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {/* リプライ */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ActionIcon variant="subtle" size="sm" color="gray">
                <IconMessage size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.replyCount)}
              </Text>
            </Box>
            
            {/* リツイート */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ActionIcon variant="subtle" size="sm" color="gray">
                <IconRepeat size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.retweetCount)}
              </Text>
            </Box>
            
            {/* いいね */}
            <Box style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <ActionIcon variant="subtle" size="sm" color="gray">
                <IconHeart size={16} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {formatCount(stats.likeCount)}
              </Text>
            </Box>
          </Box>
          
          {/* 右側のシェアボタン */}
          <ActionIcon variant="subtle" size="sm" color="gray" style={{ cursor: 'pointer' }}>
            <IconShare size={16} />
          </ActionIcon>
        </Box>
        
        {/* Storybookバッジ */}
        <Box style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Badge variant="light" size="xs" color="blue">
            Storybook
          </Badge>
        </Box>
      </Box>
    </Paper>
  );
}
