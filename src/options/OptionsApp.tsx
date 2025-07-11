// Options App component for Comiketter
import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Switch, Select, Button, Stack, Group, Divider } from '@mantine/core';
import { StorageManager } from '@/utils/storage';
import { FilenameSettings } from '@/components/FilenameSettings';
import { BookmarkManager } from '@/components/BookmarkManager';
import type { Settings } from '@/types';

export const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await StorageManager.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await StorageManager.saveSettings(settings);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<Settings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
  };

  const updateFilenameSettings = (filenameSettings: Settings['filenameSettings']) => {
    if (!settings) return;
    setSettings({ ...settings, filenameSettings });
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Text>設定を読み込み中...</Text>
      </Container>
    );
  }

  if (!settings) {
    return (
      <Container size="md" py="xl">
        <Text color="red">設定の読み込みに失敗しました</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>Comiketter 設定</Title>
        
        <Stack gap="md">
          <Title order={3} size="h4">基本設定</Title>
          <Switch
            label="タイムライン自動更新を無効化"
            checked={settings.tlAutoUpdateDisabled}
            onChange={(event) => updateSettings({ tlAutoUpdateDisabled: event.currentTarget.checked })}
          />
        </Stack>
        
        <Divider />
        
        <Stack gap="md">
          <Title order={3} size="h4">保存設定</Title>
          <Select
            label="保存形式"
            value={settings.saveFormat}
            onChange={(value) => updateSettings({ saveFormat: value as 'url' | 'blob' | 'mixed' })}
            data={[
              { value: 'url', label: '画像URL' },
              { value: 'blob', label: '画像本体' },
              { value: 'mixed', label: '混合' },
            ]}
          />
          <Select
            label="ダウンロード方法"
            value={settings.downloadMethod}
            onChange={(value) => updateSettings({ downloadMethod: value as 'chrome_downloads' | 'native_messaging' })}
            data={[
              { value: 'chrome_downloads', label: 'Chrome Downloads API' },
              { value: 'native_messaging', label: 'Native Messaging (curl)' },
            ]}
          />
        </Stack>
        
        <Divider />
        
        <Stack gap="md">
          <Title order={3} size="h4">ファイル名・パス設定</Title>
          <Text size="sm" c="dimmed">
            TwitterMediaHarvest準拠のファイル名・パス設定機能です。ダウンロードするファイルの命名規則をカスタマイズできます。
          </Text>
          <FilenameSettings
            settings={settings.filenameSettings}
            onSettingsChange={updateFilenameSettings}
            disabled={saving}
          />
        </Stack>
        
        <Divider />
        
        <Stack gap="md">
          <Title order={3} size="h4">自動ダウンロード条件</Title>
          <Switch
            label="リツイート時に自動ダウンロード"
            checked={settings.autoDownloadConditions.retweet}
            onChange={(event) => updateSettings({
              autoDownloadConditions: {
                ...settings.autoDownloadConditions,
                retweet: event.currentTarget.checked
              }
            })}
          />
          <Switch
            label="いいね時に自動ダウンロード"
            checked={settings.autoDownloadConditions.like}
            onChange={(event) => updateSettings({
              autoDownloadConditions: {
                ...settings.autoDownloadConditions,
                like: event.currentTarget.checked
              }
            })}
          />
          <Switch
            label="両方の条件を満たした時のみダウンロード"
            checked={settings.autoDownloadConditions.both}
            onChange={(event) => updateSettings({
              autoDownloadConditions: {
                ...settings.autoDownloadConditions,
                both: event.currentTarget.checked
              }
            })}
          />
        </Stack>
        
        <Divider />
        
        <Stack gap="md">
          <Title order={3} size="h4">メディアダウンロード設定</Title>
          <Text size="sm" c="dimmed">
            TwitterMediaHarvest準拠のメディアダウンロード設定です。動画サムネイルやプロフィール画像の除外設定ができます。
          </Text>
          <Switch
            label="動画サムネイルを含める"
            checked={settings.mediaDownloadSettings.includeVideoThumbnail}
            onChange={(event) => updateSettings({
              mediaDownloadSettings: {
                ...settings.mediaDownloadSettings,
                includeVideoThumbnail: event.currentTarget.checked
              }
            })}
          />
          <Switch
            label="プロフィール画像を除外"
            checked={settings.mediaDownloadSettings.excludeProfileImages}
            onChange={(event) => updateSettings({
              mediaDownloadSettings: {
                ...settings.mediaDownloadSettings,
                excludeProfileImages: event.currentTarget.checked
              }
            })}
          />
          <Switch
            label="バナー画像を除外"
            checked={settings.mediaDownloadSettings.excludeBannerImages}
            onChange={(event) => updateSettings({
              mediaDownloadSettings: {
                ...settings.mediaDownloadSettings,
                excludeBannerImages: event.currentTarget.checked
              }
            })}
          />
        </Stack>
        
        <Divider />
        
        <Stack gap="md">
          <Title order={3} size="h4">カスタムブックマーク管理</Title>
          <Text size="sm" c="dimmed">
            ツイートを保存するカスタムブックマークを作成・管理できます。
          </Text>
          <BookmarkManager />
        </Stack>
        
        <Group justify="flex-end">
          <Button onClick={saveSettings} loading={saving}>
            設定を保存
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}; 