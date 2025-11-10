// Storybook用のPopupAppラッパーコンポーネント
import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Button, Stack, Group } from '@mantine/core';
import type { CustomBookmark } from '@/types';

interface PopupAppStorybookProps {
  bookmarks?: CustomBookmark[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Storybook用のPopupAppラッパーコンポーネント
 * PopupAppのUIを再現し、propsでモックデータを受け取ります
 */
export const PopupAppStorybook: React.FC<PopupAppStorybookProps> = ({
  bookmarks = [],
  loading = false,
  error = null,
}) => {
  const [displayBookmarks, setDisplayBookmarks] = useState<CustomBookmark[]>(bookmarks);
  const [isLoading, setIsLoading] = useState(loading);

  useEffect(() => {
    setDisplayBookmarks(bookmarks);
    setIsLoading(loading);
  }, [bookmarks, loading]);

  const openOptions = () => {
    // Storybookではconsole.logで代用
    console.log('openOptionsPage called');
    if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.openOptionsPage) {
      (window as any).chrome.runtime.openOptionsPage();
    }
  };

  const openBookmarks = () => {
    // Storybookではconsole.logで代用
    console.log('Open bookmarks page');
  };

  if (isLoading) {
    return (
      <Container size="sm" py="md">
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="md">
        <Stack gap="md">
          <Title order={2} size="h3">
            Comiketter
          </Title>
          <Text size="sm" color="red">
            エラー: {error}
          </Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2} size="h3">
          Comiketter
        </Title>

        <Text size="sm" color="dimmed">
          コミックマーケット参加者向けX（旧Twitter）専用拡張機能
        </Text>

        <Group>
          <Button onClick={openBookmarks} variant="light">
            ブックマーク一覧 ({displayBookmarks.length})
          </Button>
          <Button onClick={openOptions} variant="outline">
            設定
          </Button>
        </Group>

        <Text size="xs" color="dimmed">
          バージョン: 1.0.0
        </Text>
      </Stack>
    </Container>
  );
};

