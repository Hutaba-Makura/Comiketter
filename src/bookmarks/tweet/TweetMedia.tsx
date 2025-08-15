import React from 'react';
import { Group, Image, Paper, Text, Badge } from '@mantine/core';
import { IconPhoto, IconVideo, IconGif } from '@tabler/icons-react';
import { TweetMediaItem } from '../types/tweet';

interface TweetMediaProps {
  media: TweetMediaItem[];
}

/**
 * ツイートメディアコンポーネント（フォールバック用）
 */
export function TweetMedia({ media }: TweetMediaProps) {
  if (media.length === 0) {
    return null;
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <IconVideo size={16} />;
      case 'gif':
        return <IconGif size={16} />;
      default:
        return <IconPhoto size={16} />;
    }
  };

  return (
    <Group gap="xs">
      {media.map((item) => (
        <Paper key={item.id} withBorder style={{ position: 'relative' }}>
          <Image
            src={item.previewUrl}
            alt={item.altText || 'メディア'}
            width={200}
            height={150}
            fit="cover"
            radius="sm"
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
            leftSection={getMediaIcon(item.type)}
          >
            {item.type.toUpperCase()}
          </Badge>
        </Paper>
      ))}
    </Group>
  );
}
