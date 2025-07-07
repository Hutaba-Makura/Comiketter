// Options App component for Comiketter
import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Switch, Select, Button, Stack, Group, Divider, TextInput, Modal, ActionIcon, Box } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { StorageManager } from '@/utils/storage';
import { FilenameSettings } from '@/components/FilenameSettings';
import type { Settings, CustomBookmark } from '@/types';

export const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [bookmarks, setBookmarks] = useState<CustomBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<CustomBookmark | null>(null);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [newBookmarkDescription, setNewBookmarkDescription] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [settingsData, bookmarksData] = await Promise.all([
        StorageManager.getSettings(),
        StorageManager.getCustomBookmarks(),
      ]);
      setSettings(settingsData);
      setBookmarks(bookmarksData);
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
            onChange={(value) => updateSettings({ downloadMethod: value as 'chrome-api' | 'native-messaging' })}
            data={[
              { value: 'chrome-api', label: 'Chrome Downloads API' },
              { value: 'native-messaging', label: 'Native Messaging (curl)' },
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
          <Group justify="space-between" align="center">
            <Title order={3} size="h4">カスタムブックマーク管理</Title>
            <Button 
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditingBookmark(null);
                setNewBookmarkName('');
                setNewBookmarkDescription('');
                setBookmarkModalOpen(true);
              }}
              size="sm"
            >
              新規作成
            </Button>
          </Group>
          
          <Text size="sm" c="dimmed">
            ツイートを保存するカスタムブックマークを作成・管理できます。
          </Text>

          {bookmarks.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              ブックマークがありません。新規作成ボタンからブックマークを作成してください。
            </Text>
          ) : (
            <Stack gap="sm">
              {bookmarks.map((bookmark) => (
                <Box key={bookmark.id} p="md" style={{ border: '1px solid #eee', borderRadius: '8px' }}>
                  <Group justify="space-between" align="center">
                    <Box>
                      <Text fw={500}>{bookmark.name}</Text>
                      {bookmark.description && (
                        <Text size="sm" c="dimmed">{bookmark.description}</Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {bookmark.tweetCount}件のツイート | 作成日: {new Date(bookmark.createdAt).toLocaleDateString()}
                      </Text>
                    </Box>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => {
                          setEditingBookmark(bookmark);
                          setNewBookmarkName(bookmark.name);
                          setNewBookmarkDescription(bookmark.description || '');
                          setBookmarkModalOpen(true);
                        }}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={async () => {
                          if (confirm(`ブックマーク「${bookmark.name}」を削除しますか？`)) {
                            try {
                              await StorageManager.deleteCustomBookmark(bookmark.id);
                              setBookmarks(bookmarks.filter(b => b.id !== bookmark.id));
                            } catch (error) {
                              console.error('Failed to delete bookmark:', error);
                            }
                          }
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>

        <Group justify="flex-end">
          <Button onClick={saveSettings} loading={saving}>
            設定を保存
          </Button>
        </Group>
      </Stack>

      {/* ブックマーク作成・編集モーダル */}
      <Modal
        opened={bookmarkModalOpen}
        onClose={() => setBookmarkModalOpen(false)}
        title={editingBookmark ? 'ブックマークを編集' : 'ブックマークを作成'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="ブックマーク名"
            value={newBookmarkName}
            onChange={(e) => setNewBookmarkName(e.currentTarget.value)}
            placeholder="例: 1日目、絶対行きたい"
            required
          />
          
          <TextInput
            label="説明（任意）"
            value={newBookmarkDescription}
            onChange={(e) => setNewBookmarkDescription(e.currentTarget.value)}
            placeholder="ブックマークの説明を入力"
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="outline" onClick={() => setBookmarkModalOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={async () => {
                if (!newBookmarkName.trim()) return;
                
                try {
                  if (editingBookmark) {
                    // 編集
                    await StorageManager.updateCustomBookmark(editingBookmark.id, {
                      name: newBookmarkName.trim(),
                      description: newBookmarkDescription.trim() || undefined,
                    });
                    setBookmarks(bookmarks.map(b => 
                      b.id === editingBookmark.id 
                        ? { ...b, name: newBookmarkName.trim(), description: newBookmarkDescription.trim() || undefined }
                        : b
                    ));
                  } else {
                    // 新規作成
                    const newBookmark = await StorageManager.addCustomBookmark({
                      name: newBookmarkName.trim(),
                      description: newBookmarkDescription.trim() || undefined,
                      tweetIds: [],
                    });
                    setBookmarks([...bookmarks, newBookmark]);
                  }
                  
                  setBookmarkModalOpen(false);
                  setNewBookmarkName('');
                  setNewBookmarkDescription('');
                  setEditingBookmark(null);
                } catch (error) {
                  console.error('Failed to save bookmark:', error);
                }
              }}
              disabled={!newBookmarkName.trim()}
            >
              {editingBookmark ? '更新' : '作成'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}; 