// Popup App component for Comiketter
import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Button, Stack, Group } from '@mantine/core';
import { StorageManager } from '@/utils/storage';
import type { CustomBookmark } from '@/types';
import { IconSettings, IconBookmark, IconBrandAmazon } from '@tabler/icons-react';
import { getTextSync, getLanguage, clearLanguageCache } from '../bookmarks/utils/i18n';

export const PopupApp: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<CustomBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [languageKey, setLanguageKey] = useState(0); // 言語変更時に再レンダリングをトリガー

  useEffect(() => {
    loadData();
  }, []);

  // 言語設定を取得してキャッシュに保存
  useEffect(() => {
    const initLanguage = async () => {
      await getLanguage();
    };
    initLanguage();
  }, []);

  // ストレージ変更を監視して言語設定の変更を検知
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.comiketter_settings) {
        // 言語設定が変更された場合、キャッシュをクリアして再取得
        clearLanguageCache();
        getLanguage().then(() => {
          // 強制的に再レンダリング（言語キーを変更）
          setLanguageKey(prev => prev + 1);
        });
      }
    };

    // ストレージ変更イベントをリッスン
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // languageKeyが変更された時に再レンダリングを確実にする
  useEffect(() => {
    // languageKeyが変更された時、コンポーネントが再レンダリングされ、
    // getTextSyncが再実行されるため、新しい言語が反映される
  }, [languageKey]);

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

  const openAuthorWishList = () => {
    chrome.tabs.create({ url: 'https://www.amazon.jp/hz/wishlist/ls/1AKUH6FMT1JMN?ref_=wl_share' });
  };

  if (loading) {
    return (
      <Container size="sm" py="md">
        <Text>{getTextSync('loading')}</Text>
      </Container>
    );
  }

  return (
    <Container size="sm" py="md">
      <Stack gap="md">
        <Title order={2} size="h3">Comiketter</Title>
        
        <Text size="sm" color="dimmed">
          {getTextSync('app_description')}
        </Text>

        <Group>
          <Button onClick={openBookmarks} variant="light" leftSection={<IconBookmark size={16} />}>
            {getTextSync('bookmark_list')} ({bookmarks.length})
          </Button>
          <Button onClick={openOptions} variant="outline" leftSection={<IconSettings size={16} />}>
            {getTextSync('settings')}
          </Button>
        </Group>

        <Group gap={0}>
          <Button onClick={openAuthorWishList} variant="outline" leftSection={<IconBrandAmazon size={16} />}>
            {getTextSync('author_wishlist')}
          </Button>
          <Text size="xs" color="dimmed">
            {getTextSync('author_wishlist_note')}
          </Text>
        </Group>

        <Text size="xs" color="dimmed">
          {getTextSync('version')}: 1.0.0
        </Text>
      </Stack>
    </Container>
  );
}; 