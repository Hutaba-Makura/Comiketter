import React from 'react';
import { Group, Avatar, Text, Stack } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
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
    <Group gap="sm" align="flex-start">
      <Avatar
        src={author.profileImageUrl}
        alt={author.displayName}
        size="md"
        radius="xl"
      />
      
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Group gap="xs" align="center">
          <Text size="sm" fw={600} truncate>
            {author.displayName}
          </Text>
          
          {author.verified && (
            <IconCheck size={14} color="var(--mantine-color-blue-6)" />
          )}
          
          <Text size="sm" c="dimmed" truncate>
            @{author.username}
          </Text>
        </Group>
        
        <Text size="xs" c="dimmed">
          {formatRelativeTime(createdAt)}
        </Text>
      </Stack>
    </Group>
  );
}
