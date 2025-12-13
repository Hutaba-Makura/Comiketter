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
  LoadingOverlay,
  Transition,
  ActionIcon,
  Menu
} from '@mantine/core';
import { IconPencilPlus, IconSearch, IconBookmark, IconSettings, IconDots, IconFolderDown} from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { CbSidebarItem } from './CbSidebarItem';
import { cbService } from '../services/cbService';
import { getTextSync, useI18n } from '../utils/i18n';

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
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  
  // i18n機能を一元管理（言語設定の初期化、ストレージ変更の監視、再レンダリングのトリガー）
  useI18n();

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
        setError(err instanceof Error ? err.message : getTextSync('cb_list_fetch_failed'));
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
      alert(getTextSync('cb_name_required'));
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
      alert(getTextSync('cb_create_failed'));
    } finally {
      setIsCreating(false);
    }
  };

  // 実装中
  const handleImportCb = () => {
    console.log('CBインポート');
  };

  // 検索フィルタリングとupdateAt順にソート
  const filteredCbs = cbs
    .filter(cb => 
      cb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cb.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // updateAtが新しい順（降順）にソート
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });

  // 統計情報
  const totalTweets = cbs.reduce((sum, cb) => sum + cb.tweetCount, 0);
  const totalCbs = cbs.length;

  if (error) {
    return (
      <Stack gap="md" p="md">
        <Group display="flex" justify="start" align="center" gap="0">
          <IconBookmark size={24}/>
          <Title order={3} size="h4">
            {getTextSync('custom_bookmark')}
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
            {getTextSync('reload')}
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="md" p="md" h="100%">
        {/* ヘッダー */}
        <Group 
          display="flex" 
          justify="space-between" 
          align="center" 
          gap="xs"
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          <Group display="flex" justify="start" align="center" gap="0">
            <IconBookmark size={24}/>
            <Title order={3} size="h4">
              {getTextSync('custom_bookmark')}
            </Title>
          </Group>

          {/* メニューボタン */}
          <Transition mounted={isHeaderHovered} transition="fade" duration={150}>
            {(menuStyles) => (
              <Menu shadow="md" width={150} position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    size="xs"
                    style={menuStyles}
                  >
                    <IconDots size={12} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconFolderDown size={14} />}
                    onClick={handleImportCb}
                  >
                    {getTextSync('import_cb')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Transition>
        </Group>

        {/* 統計情報 */}
        <Group gap="xs" justify="flex-start">
          <Badge variant="light" color="rgb(29, 155, 240)" size="sm">
            {totalCbs} CB
          </Badge>
          <Badge variant="light" color="rgb(29, 155, 240)" size="sm">
            {getTextSync('tweets_count', { count: totalTweets.toString() })}
          </Badge>
        </Group>

        <Divider />

        {/* 検索 */}
        <TextInput
          placeholder={getTextSync('search_cb_placeholder')}
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
                    {getTextSync('no_cb_found_for_query', { query: searchQuery })}
                  </Text>
                ) : (
                  <Stack gap="sm" align="center">
                    <IconBookmark size={32} color="var(--mantine-color-blue-6)" />
                    <Text size="sm" c="dimmed" ta="center">
                      {getTextSync('no_cb_available')}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      {getTextSync('create_cb_from_button')}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                      {getTextSync('last_updated_time')}{new Date().toLocaleTimeString('ja-JP', {
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
              backgroundColor: 'rgb(29, 155, 240)',
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
            <Text size="xl" fw="bold">{getTextSync('create_new')}</Text>
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
              backgroundColor: isSettingsHovered ? 'rgba(15, 20, 25, 0.1)' : 'transparent',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={() => setIsSettingsHovered(true)}
            onMouseLeave={() => setIsSettingsHovered(false)}
            onClick={() => {
              if (chrome?.runtime?.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              } else if (chrome?.runtime?.getURL) {
                window.open(chrome.runtime.getURL('options.html'), '_blank');
              }
            }}
          >
            <IconSettings size={32} />
            <Text size="xl" fw="bold">{getTextSync('settings')}</Text>
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
                {getTextSync('create_cb')}
              </Text>

              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  {getTextSync('cb_name_label')}
                </Text>
                <TextInput
                  placeholder={getTextSync('cb_name_placeholder')}
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
                  {getTextSync('description_optional')}
                </Text>
                <Textarea
                  placeholder={getTextSync('cb_description_placeholder')}
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
                  {getTextSync('cancel')}
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
                  {getTextSync('create')}
                </Button>
              </Group>
            </Stack>
          </Box>
        </div>
      )}
    </>
  );
}
