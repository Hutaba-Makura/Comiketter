import React, { useState, useMemo } from 'react';
import { 
  Stack, 
  Text, 
  Center, 
  Loader, 
  Alert, 
  Group, 
  Badge, 
  Select, 
  TextInput, 
  Box,
  Divider,
  Button,
  ActionIcon,
  Tooltip,
  Switch
} from '@mantine/core';
import { 
  IconAlertCircle, 
  IconSearch, 
  IconSortAscending, 
  IconSortDescending,
  IconRefresh
} from '@tabler/icons-react';
import { TweetEmbedFallback } from '../../bookmarks/tweet/TweetEmbedFallback';
import { TimelineSkeleton } from '../../bookmarks/timeline/TimelineSkeleton';
import { VirtualizedTimeline } from '../../bookmarks/timeline/VirtualizedTimeline';
import { StorybookTweet } from './StorybookTweet';
import { StorybookVirtualizedTimeline } from './StorybookVirtualizedTimeline';

// Storybook専用のTimelineViewコンポーネント
interface StorybookTimelineViewProps {
  selectedCbId?: string | null;
  selectedCb?: any;
  tweetIds?: string[];
  loading?: boolean;
  error?: string | null;
}

export function StorybookTimelineView({
  selectedCbId = 'sample-cb-1',
  selectedCb = {
    id: 'sample-cb-1',
    name: 'コミックマーケット関連',
    description: 'コミックマーケットに関するツイートをまとめたCB',
    tweetCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  tweetIds = [],
  loading = false,
  error = null
}: StorybookTimelineViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest_posted' | 'oldest_posted' | 'newest_registered' | 'oldest_registered'>('newest_registered');
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [tweetDataMap, setTweetDataMap] = useState<Map<string, { tweetDate: string }>>(new Map());
  
  // 編集モードの状態管理
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const descriptionInputRef = React.useRef<HTMLInputElement>(null);

  // 選択されたCBが変更されたら、編集用の値をリセット
  React.useEffect(() => {
    if (selectedCb) {
      setNameValue(selectedCb.name);
      setDescriptionValue(selectedCb.description || '');
      setEditingName(false);
      setEditingDescription(false);
    }
  }, [selectedCb?.id]);

  // フィルタリングとソート
  const filteredAndSortedTweetIds = useMemo(() => {
    let filtered = tweetIds;
    
    // 検索フィルタリング（現在はツイートIDでの検索のみ）
    if (searchQuery) {
      filtered = tweetIds.filter(id => 
        id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // ソート処理
    if (sortOrder === 'newest_registered') {
      // 元のtweetIdsの順序を保持（検索フィルタリング後も順序を維持）
      if (searchQuery) {
        // 検索フィルタリングがある場合のみ、順序を維持するためにソート
        const tweetIdsIndexMap = new Map(tweetIds.map((id, index) => [id, index]));
        filtered = [...filtered].sort((a, b) => {
          const aIndex = tweetIdsIndexMap.get(a) ?? Infinity;
          const bIndex = tweetIdsIndexMap.get(b) ?? Infinity;
          return aIndex - bIndex;
        });
      }
      // 検索がない場合は、filteredは既にtweetIdsと同じ順序なので何もしない
    }
    
    if (sortOrder === 'oldest_registered') {
      // 元のtweetIdsの逆順（検索フィルタリング後も順序を維持）
      const tweetIdsIndexMap = new Map(tweetIds.map((id, index) => [id, index]));
      filtered = [...filtered].sort((a, b) => {
        const aIndex = tweetIdsIndexMap.get(a) ?? Infinity;
        const bIndex = tweetIdsIndexMap.get(b) ?? Infinity;
        return bIndex - aIndex; // 逆順
      });
    }

    if (sortOrder === 'newest_posted') {
      // 投稿日時で新しい順にソート
      filtered = [...filtered].sort((a, b) => {
        const aData = tweetDataMap.get(a);
        const bData = tweetDataMap.get(b);
        
        // データがない場合は元の順序を維持
        if (!aData && !bData) return 0;
        if (!aData) return 1; // aが後ろに
        if (!bData) return -1; // bが後ろに
        
        const aDate = new Date(aData.tweetDate).getTime();
        const bDate = new Date(bData.tweetDate).getTime();
        
        // 新しい順: bDate - aDate (値が大きい方が新しい)
        return bDate - aDate;
      });
    }

    if (sortOrder === 'oldest_posted') {
      // 投稿日時で古い順にソート
      filtered = [...filtered].sort((a, b) => {
        const aData = tweetDataMap.get(a);
        const bData = tweetDataMap.get(b);
        
        // データがない場合は元の順序を維持
        if (!aData && !bData) return 0;
        if (!aData) return 1; // aが後ろに
        if (!bData) return -1; // bが後ろに
        
        const aDate = new Date(aData.tweetDate).getTime();
        const bDate = new Date(bData.tweetDate).getTime();
        
        // 古い順: aDate - bDate (値が小さい方が古い)
        return aDate - bDate;
      });
    }
    
    return filtered;
  }, [tweetIds, searchQuery, sortOrder, tweetDataMap]);

  // 仮想化を使用するかどうかを決定（100件以上の場合）
  const shouldUseVirtualization = useVirtualization && filteredAndSortedTweetIds.length >= 100;

  // 名前の編集開始
  const handleNameClick = () => {
    if (!selectedCb) return;
    setEditingName(true);
    setNameValue(selectedCb.name);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  // 説明文の編集開始
  const handleDescriptionClick = () => {
    if (!selectedCb) return;
    setEditingDescription(true);
    setDescriptionValue(selectedCb.description || '');
    setTimeout(() => {
      descriptionInputRef.current?.focus();
      descriptionInputRef.current?.select();
    }, 0);
  };

  // 名前の保存
  const handleNameSave = async () => {
    if (!selectedCb) return;
    
    const trimmedName = nameValue.trim();
    if (!trimmedName) {
      // 空の場合は元に戻す
      setNameValue(selectedCb.name);
      setEditingName(false);
      return;
    }

    if (trimmedName === selectedCb.name) {
      // 変更がない場合は編集モードを終了
      setEditingName(false);
      return;
    }

    setIsSaving(true);
    try {
      // Storybookでは保存処理をスキップ
      setEditingName(false);
    } catch (error) {
      console.error('CB名の更新エラー:', error);
      setNameValue(selectedCb.name);
      setEditingName(false);
    } finally {
      setIsSaving(false);
    }
  };

  // 説明文の保存
  const handleDescriptionSave = async () => {
    if (!selectedCb) return;
    
    const trimmedDescription = descriptionValue.trim();
    const currentDescription = selectedCb.description || '';

    if (trimmedDescription === currentDescription) {
      // 変更がない場合は編集モードを終了
      setEditingDescription(false);
      return;
    }

    setIsSaving(true);
    try {
      // Storybookでは保存処理をスキップ
      setEditingDescription(false);
    } catch (error) {
      console.error('CB説明文の更新エラー:', error);
      setDescriptionValue(currentDescription);
      setEditingDescription(false);
    } finally {
      setIsSaving(false);
    }
  };

  // 名前の編集キャンセル
  const handleNameCancel = () => {
    if (selectedCb) {
      setNameValue(selectedCb.name);
    }
    setEditingName(false);
  };

  // 説明文の編集キャンセル
  const handleDescriptionCancel = () => {
    if (selectedCb) {
      setDescriptionValue(selectedCb.description || '');
    }
    setEditingDescription(false);
  };

  // Enterキーで保存、Escapeキーでキャンセル
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleNameCancel();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleDescriptionCancel();
    }
  };

  // CBが選択されていない場合
  if (!selectedCbId) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <IconAlertCircle size={48} color="var(--mantine-color-gray-4)" />
          <Text size="lg" c="dimmed" fw={500}>
            CBが選択されていません
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            左側のサイドバーからCBを選択してください
          </Text>
        </Stack>
      </Center>
    );
  }

  // ローディング状態
  if (loading) {
    return <TimelineSkeleton />;
  }

  // エラー状態
  if (error) {
    return (
      <Center h={400}>
        <Alert
          icon={<IconAlertCircle size={20} />}
          title="エラーが発生しました"
          color="red"
          variant="light"
          style={{ maxWidth: 500 }}
        >
          <Text size="sm" mb="md">
            {error}
          </Text>
          <Button 
            variant="light" 
            size="sm"
            leftSection={<IconRefresh size={16} />}
            onClick={() => window.location.reload()}
          >
            再試行
          </Button>
        </Alert>
      </Center>
    );
  }

  return (
    <Box style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* CB情報ヘッダー */}
      <Box p="md" style={{ borderBottom: '1px solid #e1e8ed' }}>
        <Group justify="space-between" align="center">
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <TextInput
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.currentTarget.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                size="lg"
                style={{ fontWeight: 600 }}
                disabled={isSaving}
                autoFocus
              />
            ) : (
              <Text 
                size="xl" 
                fw={600}
                style={{ 
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={handleNameClick}
              >
                {selectedCb?.name || 'CB名'}
              </Text>
            )}
            {editingDescription ? (
              <TextInput
                ref={descriptionInputRef}
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.currentTarget.value)}
                onBlur={handleDescriptionSave}
                onKeyDown={handleDescriptionKeyDown}
                size="sm"
                placeholder="CBの説明"
                disabled={isSaving}
                autoFocus
              />
            ) : (
              <Text 
                size="sm" 
                c="dimmed"
                style={{ 
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  minHeight: '20px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={handleDescriptionClick}
              >
                {selectedCb?.description || 'CBの説明（クリックして編集）'}
              </Text>
            )}
          </Stack>
          <Group gap="xs">
            <Badge variant="light" size="lg">
              {filteredAndSortedTweetIds.length} ツイート
            </Badge>
            <Tooltip label="更新">
              <ActionIcon variant="subtle" size="lg">
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        <Divider my="md" />
      </Box>

      {/* ツールバー */}
      <Box style={{ flexShrink: 0 }} p="md">
        <Group gap="lg" align="center" mb="md" wrap="nowrap">
          {/* 検索バー */}
          <TextInput
            placeholder="ツイートを検索..."
            leftSection={<IconSearch size={14} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="sm"
            style={{ width: 250, flexShrink: 0 }}
          />
          
          {/* ソート選択 */}
          <Select
            value={sortOrder}
            onChange={(value) => setSortOrder(value as 'newest_registered' | 'oldest_registered' | 'newest_posted' | 'oldest_posted')}
            data={[
              { value: 'newest_registered', label: '登録が新しい順' },
              { value: 'oldest_registered', label: '登録が古い順' },
              { value: 'newest_posted', label: '投稿が新しい順' },
              { value: 'oldest_posted', label: '投稿が古い順' }
            ]}
            size="sm"
            style={{ width: 130, flexShrink: 0 }}
            leftSection={
              sortOrder === 'newest_registered' || sortOrder === 'newest_posted' ? 
                <IconSortDescending size={14} /> : 
                <IconSortAscending size={14} />
            }
          />

          {/* 仮想化スイッチ */}
          {filteredAndSortedTweetIds.length >= 100 && (
            <Group gap="xs" align="center" style={{ flexShrink: 0 }}>
              <Text size="sm" c="dimmed">
                仮想化
              </Text>
              <Switch
                checked={useVirtualization}
                onChange={(event) => setUseVirtualization(event.currentTarget.checked)}
                size="sm"
              />
            </Group>
          )}
        </Group>

        {/* 検索結果表示 */}
        {searchQuery && (
          <Text size="sm" c="dimmed" mb="md">
            {filteredAndSortedTweetIds.length}件の結果
          </Text>
        )}
      </Box>

      {/* ツイート一覧（スクロール可能） */}
      <Box style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filteredAndSortedTweetIds.length === 0 ? (
          <Center h={300}>
            <Stack align="center" gap="md">
              {searchQuery ? (
                <>
                  <IconSearch size={48} color="var(--mantine-color-gray-4)" />
                  <Text size="lg" c="dimmed" fw={500}>
                    検索結果がありません
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    「{searchQuery}」に一致するツイートが見つかりませんでした
                  </Text>
                  <Button 
                    variant="light" 
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    検索をクリア
                  </Button>
                </>
              ) : (
                <>
                  <Text size="lg" c="dimmed" fw={500}>
                    ツイートがありません
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    このCBにはまだツイートが追加されていません
                  </Text>
                </>
              )}
            </Stack>
          </Center>
        ) : shouldUseVirtualization ? (
          <Box style={{ height: '100%' }}>
            <StorybookVirtualizedTimeline 
              tweetIds={filteredAndSortedTweetIds}
              height={600}
              itemHeight={200}
            />
          </Box>
        ) : (
          <Stack gap={0} p="md">
            {filteredAndSortedTweetIds.map((id, index) => (
              <Box key={id}>
                <StorybookTweet id={id} />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
