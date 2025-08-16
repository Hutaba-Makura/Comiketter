import React from 'react';
import { Avatar, Text, Box } from '@mantine/core';
import { IconCheck, IconUser } from '@tabler/icons-react';
import { TweetAuthor } from '../types/tweet';
import { formatRelativeTime } from '../utils/format';

interface TweetHeaderProps {
  author: TweetAuthor;
  createdAt: Date;
}

/**
 * ツイートヘッダーコンポーネント（フォールバック用）
 */
export function TweetHeader({ author, createdAt }: TweetHeaderProps) {
  return (
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
  );
}
