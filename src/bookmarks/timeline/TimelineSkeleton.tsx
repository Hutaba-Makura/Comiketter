import React from 'react';
import { 
  Stack, 
  Skeleton, 
  Group, 
  Box, 
  Divider 
} from '@mantine/core';

/**
 * タイムラインのローディングスケルトン
 */
export function TimelineSkeleton() {
  return (
    <Stack gap="xl">
      {/* ヘッダースケルトン */}
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Skeleton height={28} width={200} />
            <Skeleton height={16} width={300} />
          </Stack>
          <Group gap="xs">
            <Skeleton height={24} width={80} />
            <Skeleton height={32} width={32} circle />
          </Group>
        </Group>
        <Divider />
      </Stack>

      {/* ツールバースケルトン */}
      <Group justify="space-between" align="center">
        <Group gap="md">
          <Skeleton height={36} width={250} />
          <Skeleton height={36} width={120} />
        </Group>
        <Skeleton height={16} width={100} />
      </Group>

      {/* ツイートスケルトン */}
      <Stack gap="md">
        {Array.from({ length: 5 }).map((_, index) => (
          <Box key={index}>
            <Stack gap="md">
              {/* ツイートヘッダー */}
              <Group gap="sm" align="center">
                <Skeleton height={48} width={48} circle />
                <Stack gap={4} style={{ flex: 1 }}>
                  <Skeleton height={16} width={120} />
                  <Skeleton height={14} width={80} />
                </Stack>
                <Skeleton height={14} width={60} />
              </Group>

              {/* ツイート内容 */}
              <Stack gap="sm">
                <Skeleton height={16} width="100%" />
                <Skeleton height={16} width="80%" />
                <Skeleton height={16} width="60%" />
              </Stack>

              {/* ツイートアクション */}
              <Group gap="lg">
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
                <Skeleton height={16} width={60} />
              </Group>
            </Stack>
            
            {index < 4 && <Divider my="md" />}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
