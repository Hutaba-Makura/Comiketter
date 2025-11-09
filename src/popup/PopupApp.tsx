// Popup App component for Comiketter
import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Button, Stack, Group } from '@mantine/core';
import { StorageManager } from '@/utils/storage';
import type { CustomBookmark } from '@/types';
import { IconSettings, IconBookmark } from '@tabler/icons-react';

export const PopupApp: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<CustomBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const bookmarksData = await StorageManager.getCustomBookmarks();
      setBookmarks(bookmarksData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const openBookmarks = () => {
    chrome.tabs.create({ url: 'bookmarks.html' });
  };

  if (loading) {
    return (
      <Container size="sm" py="md">
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2} size="h3">Comiketter</Title>
        
        <Text size="sm" color="dimmed">
          コミックマーケット参加者向けX（旧Twitter）専用拡張機能
        </Text>

        <Group>
          <Button onClick={openBookmarks} variant="light" leftSection={<IconBookmark size={16} />}>
            ブックマーク一覧 ({bookmarks.length})
          </Button>
          <Button onClick={openOptions} variant="outline" leftSection={<IconSettings size={16} />}>
            設定
          </Button>
        </Group>

        <Text size="xs" color="dimmed">
          バージョン: 0.9.0
        </Text>
      </Stack>
    </Container>
  );
}; 