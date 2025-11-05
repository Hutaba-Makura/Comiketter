import React, { useEffect, useState } from 'react';
import { 
  Stack, 
  Title, 
  Button, 
  Group, 
  Text, 
  TextInput, 
  Textarea,
  Box, 
  Divider,
  Badge,
  ScrollArea,
  LoadingOverlay
} from '@mantine/core';
import { IconPencilPlus, IconSearch, IconBookmark, IconSettings} from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { CbSidebarItem } from './CbSidebarItem';
import { cbService } from '../services/cbService';

/**
 * CBサイドバーコンポーネント
 */
export function CbSidebar() {
  const { cbs, loading, error, setCbs, setLoading, setError, addCb } = useCbStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cbName, setCbName] = useState('');
  const [cbDescription, setCbDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // CB一覧を取得
  useEffect(() => {
    const fetchCbs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cbList = await cbService.listCbs();
        setCbs(cbList);
      } catch (err) {
        console.error('CB一覧取得エラー:', err);
        setError(err instanceof Error ? err.message : 'CB一覧の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchCbs();
  }, [setCbs, setLoading, setError]);

  const handleCreateCb = () => {
    setIsCreateModalOpen(true);
  };

  const handleCancelCreate = () => {
    setIsCreateModalOpen(false);
    setCbName('');
    setCbDescription('');
  };

  const handleCreateCbSubmit = async () => {
    if (!cbName.trim()) {
      alert('CB名を入力してください');
      return;
    }

    setIsCreating(true);
    try {
      const newCb = await cbService.createCb(cbName.trim(), cbDescription.trim() || undefined);
      addCb(newCb);
      setIsCreateModalOpen(false);
      setCbName('');
      setCbDescription('');
    } catch (err) {
      console.error('CB作成エラー:', err);
      alert('CBの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  // 検索フィルタリング
  const filteredCbs = cbs.filter(cb => 
    cb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cb.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 統計情報
  const totalTweets = cbs.reduce((sum, cb) => sum + cb.tweetCount, 0);
  const totalCbs = cbs.length;

  if (error) {
    return (
      <Stack gap="md" p="md">
        <Group justify="space-between" align="center">
          <Title order={3} size="h4">
            <IconBookmark size={20} style={{ marginRight: 8 }} />
            カスタムブックマーク
          </Title>
        </Group>
        
        <Box pos="relative">
          <Text size="sm" c="red" ta="center" py="xl">
            {error}
          </Text>
          <Button 
            variant="light" 
            size="xs"
            fullWidth
            onClick={() => window.location.reload()}
          >
            再読み込み
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="md" p="md" h="100%">
        {/* ヘッダー */}
        <Group justify="space-between" align="center">
          <Title order={3} size="h4">
            <IconBookmark size={20} style={{ marginRight: 8 }} />
            カスタムブックマーク
          </Title>
        </Group>

        {/* 統計情報 */}
        <Group gap="xs" justify="flex-start">
          <Badge variant="light" size="sm">
            {totalCbs} CB
          </Badge>
          <Badge variant="light" size="sm">
            {totalTweets} ツイート
          </Badge>
        </Group>

        <Divider />

        {/* 検索 */}
        <TextInput
          placeholder="CBを検索..."
          leftSection={<IconSearch size={14} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          size="xs"
          variant="filled"
        />

        {/* CB一覧 */}
        <Box pos="relative" style={{ flex: 1, overflow: 'hidden' }}>
          <LoadingOverlay visible={loading} />
          
          <ScrollArea 
            h="100%"
            type="never"
            scrollbarSize={6}
            scrollHideDelay={500}
            scrollbars="y"
            viewportProps={{ style: { overflowY: 'auto' } }}
          >
            {filteredCbs.length === 0 ? (
              <Box py="xl">
                {searchQuery ? (
                  <Text size="sm" c="dimmed" ta="center">
                    「{searchQuery}」に一致するCBが見つかりません
                  </Text>
                ) : (
                  <Stack gap="sm" align="center">
                    <IconBookmark size={32} color="var(--mantine-color-blue-6)" />
                    <Text size="sm" c="dimmed" ta="center">
                      CBがありませんよ
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      新規作成ボタンからCBを作成してください
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      最終更新時刻:{new Date().toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </Text>
                  </Stack>
                )}
              </Box>
            ) : (
              <Stack gap="xs">
                {filteredCbs.map(cb => (
                  <CbSidebarItem key={cb.id} cb={cb} />
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Box>

        <Stack gap={0}>
          {/* CB新規作成ボタン */}
          <Box 
            display="flex"
            style={{ 
              marginTop: 'auto',
              justifyContent: 'start',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'var(--mantine-color-blue-6)',
              color: 'white',
              border: '1px solid var(--mantine-color-gray-2)',
              borderRadius: '9999px',
              paddingLeft: '24px',
              paddingRight: '16px',
              paddingTop: '12px',
              paddingBottom: '12px',
              margin: '8px',
              cursor: 'pointer',
            }}
            onClick={handleCreateCb}
          >
            <IconPencilPlus size={32} />
            <Text size="xl" fw="bold">新規作成</Text>
          </Box>

          {/* 設定 */}
          <Box 
            display="flex"
            style={{ 
              marginTop: 'auto',
              justifyContent: 'start',
              alignItems: 'center',
              gap: '12px',
              border: '1px solid var(--mantine-color-gray-2)',
              borderRadius: '9999px',
              paddingLeft: '24px',
              paddingRight: '16px',
              paddingTop: '12px',
              paddingBottom: '12px',
              margin: '8px',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (chrome?.runtime?.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              } else if (chrome?.runtime?.getURL) {
                window.open(chrome.runtime.getURL('options.html'), '_blank');
              }
            }}
          >
            <IconSettings size={32} />
            <Text size="xl" fw="bold">設定</Text>
          </Box>
        </Stack>
      
      </Stack>

      {/* CB作成モーダル */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelCreate}
        >
          <Box
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Stack gap="md">
              <Text size="lg" fw={600}>
                CBを作成
              </Text>

              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  CB名 *
                </Text>
                <TextInput
                  placeholder="CB名を入力"
                  value={cbName}
                  onChange={(e) => setCbName(e.currentTarget.value)}
                  size="sm"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                  }}
                />
              </Stack>

              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  説明（任意）
                </Text>
                <Textarea
                  placeholder="CBの説明を入力"
                  value={cbDescription}
                  onChange={(e) => setCbDescription(e.currentTarget.value)}
                  size="sm"
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                  }}
                />
              </Stack>

              <Group justify="flex-end" gap="xs" mt="md">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCancelCreate}
                  disabled={isCreating}
                  style={{
                    backgroundColor: '#f7f9fa',
                    borderColor: 'rgb(207, 217, 222)',
                    borderRadius: '20px',
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateCbSubmit}
                  loading={isCreating}
                  disabled={isCreating}
                  style={{
                    backgroundColor: '#1da1f2',
                    color: 'white',
                    borderRadius: '20px',
                  }}
                >
                  作成
                </Button>
              </Group>
            </Stack>
          </Box>
        </div>
      )}
    </>
  );
}
