import React from 'react';
import { Group, Image, Paper, Text, Badge, Box } from '@mantine/core';
import { IconPhoto, IconVideo, IconGif, IconPlayerPlay } from '@tabler/icons-react';
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

  const getMediaLayout = () => {
    if (media.length === 1) {
      return 'single';
    } else if (media.length === 2) {
      return 'double';
    } else if (media.length === 3) {
      return 'triple';
    } else {
      return 'grid';
    }
  };

  const layout = getMediaLayout();

  return (
    <Box style={{ marginTop: '8px' }}>
      {layout === 'single' && (
        <Paper withBorder style={{ position: 'relative', overflow: 'hidden' }}>
          <Image
            src={media[0].previewUrl}
            alt={media[0].altText || 'メディア'}
            width="100%"
            height={300}
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
            leftSection={getMediaIcon(media[0].type)}
          >
            {media[0].type.toUpperCase()}
          </Badge>
          {media[0].type === 'video' && (
            <Box
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '50%',
                padding: '12px',
              }}
            >
              <IconPlayerPlay size={24} color="white" fill="white" />
            </Box>
          )}
        </Paper>
      )}

      {layout === 'double' && (
        <Group gap="xs">
          {media.map((item) => (
            <Paper key={item.id} withBorder style={{ position: 'relative', flex: 1 }}>
              <Image
                src={item.previewUrl}
                alt={item.altText || 'メディア'}
                width="100%"
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
      )}

      {layout === 'triple' && (
        <Group gap="xs">
          <Paper withBorder style={{ position: 'relative', flex: 1 }}>
            <Image
              src={media[0].previewUrl}
              alt={media[0].altText || 'メディア'}
              width="100%"
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
              leftSection={getMediaIcon(media[0].type)}
            >
              {media[0].type.toUpperCase()}
            </Badge>
          </Paper>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {media.slice(1).map((item) => (
              <Paper key={item.id} withBorder style={{ position: 'relative' }}>
                <Image
                  src={item.previewUrl}
                  alt={item.altText || 'メディア'}
                  width="100%"
                  height={73}
                  fit="cover"
                  radius="sm"
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
                  leftSection={getMediaIcon(item.type)}
                >
                  {item.type.toUpperCase()}
                </Badge>
              </Paper>
            ))}
          </Box>
        </Group>
      )}

      {layout === 'grid' && (
        <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
          {media.map((item, index) => (
            <Paper key={item.id} withBorder style={{ position: 'relative' }}>
              <Image
                src={item.previewUrl}
                alt={item.altText || 'メディア'}
                width="100%"
                height={index === 3 ? 150 : 100}
                fit="cover"
                radius="sm"
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
                leftSection={getMediaIcon(item.type)}
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
  );
}
