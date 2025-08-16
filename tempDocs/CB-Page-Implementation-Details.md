# CBページ実装詳細仕様書

## 概要
このドキュメントは、CBページの実装時に参照する詳細な仕様書です。各コンポーネントの具体的な実装方法、コード例、テスト方法を含んでいます。

---

## 1. レイアウト実装詳細

### 1.1 BookmarkLayout.tsx

#### 基本構造
```typescript
import React from 'react';
import { Box, Group, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { CbSidebar } from '../sidebar/CbSidebar';
import { TimelineView } from '../timeline/TimelineView';

interface BookmarkLayoutProps {
  children?: React.ReactNode;
}

export function BookmarkLayout({ children }: BookmarkLayoutProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  
  return (
    <Box
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
      }}
    >
      {/* サイドバー */}
      <Box
        style={{
          width: 280,
          minWidth: 280,
          borderRight: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          overflowY: 'auto',
        }}
      >
        <CbSidebar />
      </Box>
      
      {/* メインエリア */}
      <Box
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: theme.spacing.md,
        }}
      >
        <TimelineView />
      </Box>
    </Box>
  );
}
```

#### レスポンシブ対応
```typescript
import { useMediaQuery } from '@mantine/hooks';

export function BookmarkLayout({ children }: BookmarkLayoutProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm}px)`);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  return (
    <Box style={{ display: 'flex', height: '100vh' }}>
      {/* モバイル時はサイドバーをオーバーレイ表示 */}
      {isMobile && sidebarOpen && (
        <Box
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* サイドバー */}
      <Box
        style={{
          width: isMobile ? 280 : 280,
          minWidth: isMobile ? 280 : 280,
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (sidebarOpen ? 0 : -280) : 0,
          top: 0,
          height: '100%',
          zIndex: 1001,
          transition: 'left 0.3s ease',
          // ... その他のスタイル
        }}
      >
        <CbSidebar onClose={() => setSidebarOpen(false)} />
      </Box>
      
      {/* メインエリア */}
      <Box style={{ flex: 1, overflowY: 'auto' }}>
        {isMobile && (
          <Button
            onClick={() => setSidebarOpen(true)}
            style={{ position: 'fixed', top: 16, left: 16, zIndex: 999 }}
          >
            メニュー
          </Button>
        )}
        <TimelineView />
      </Box>
    </Box>
  );
}
```

### 1.2 背景デザイン

#### グラデーション背景
```typescript
const BackgroundPattern = () => {
  const { colorScheme } = useMantineColorScheme();
  const theme = useMantineTheme();
  
  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: colorScheme === 'dark' 
          ? `linear-gradient(135deg, ${theme.colors.dark[8]} 0%, ${theme.colors.dark[6]} 100%)`
          : `linear-gradient(135deg, ${theme.colors.gray[0]} 0%, ${theme.colors.gray[1]} 100%)`,
        zIndex: -1,
      }}
    />
  );
};
```

---

## 2. サイドバー実装詳細

### 2.1 CbSidebar.tsx

#### 基本構造
```typescript
import React from 'react';
import { Stack, Title, Button, Group, Text, ScrollArea } from '@mantine/core';
import { IconPlus, IconBookmark } from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { CbSidebarItem } from './CbSidebarItem';

interface CbSidebarProps {
  onClose?: () => void;
}

export function CbSidebar({ onClose }: CbSidebarProps) {
  const { cbs, loading, error, selectedCbId } = useCbStore();
  
  return (
    <Stack style={{ height: '100%' }} p="md">
      {/* ヘッダー */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <IconBookmark size={20} />
          <Title order={3}>カスタムブックマーク</Title>
        </Group>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={handleCreateCb}
        >
          新規作成
        </Button>
      </Group>
      
      {/* CB一覧 */}
      <ScrollArea style={{ flex: 1 }}>
        {loading ? (
          <Stack gap="xs">
            {[...Array(3)].map((_, i) => (
              <Box key={i} style={{ height: 60, backgroundColor: 'gray.2', borderRadius: 8 }} />
            ))}
          </Stack>
        ) : error ? (
          <Alert color="red" title="エラー" variant="light">
            <Text size="sm">{error}</Text>
            <Button size="xs" mt="xs" onClick={handleRetry}>
              再試行
            </Button>
          </Alert>
        ) : cbs.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconBookmark size={32} style={{ opacity: 0.5 }} />
              <Text size="sm" c="dimmed" ta="center">
                CBがありません
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                新規作成ボタンからCBを作成してください
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="xs">
            {cbs.map(cb => (
              <CbSidebarItem 
                key={cb.id} 
                cb={cb} 
                isSelected={selectedCbId === cb.id}
                onClick={handleCbSelect}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
}
```

### 2.2 CbSidebarItem.tsx

#### 基本構造
```typescript
import React from 'react';
import { Box, Group, Text, Badge, Avatar } from '@mantine/core';
import { IconMessageCircle, IconCalendar } from '@tabler/icons-react';
import { Cb } from '../types/cb';

interface CbSidebarItemProps {
  cb: Cb;
  isSelected: boolean;
  onClick: (cbId: string) => void;
}

export const CbSidebarItem = React.memo(function CbSidebarItem({ 
  cb, 
  isSelected, 
  onClick 
}: CbSidebarItemProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  
  return (
    <Box
      onClick={() => onClick(cb.id)}
      style={{
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
        backgroundColor: isSelected 
          ? (colorScheme === 'dark' ? theme.colors.blue[9] : theme.colors.blue[0])
          : 'transparent',
        border: `1px solid ${isSelected 
          ? (colorScheme === 'dark' ? theme.colors.blue[6] : theme.colors.blue[3])
          : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
        },
      }}
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(cb.id);
        }
      }}
    >
      <Group gap="sm" align="flex-start">
        {/* CBアイコン */}
        <Avatar 
          size="md" 
          color={isSelected ? 'blue' : 'gray'}
          style={{ flexShrink: 0 }}
        >
          {cb.name.charAt(0).toUpperCase()}
        </Avatar>
        
        {/* CB情報 */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" align="center" mb={4}>
            <Text 
              size="sm" 
              fw={isSelected ? 600 : 500}
              style={{ 
                color: isSelected 
                  ? (colorScheme === 'dark' ? theme.white : theme.colors.blue[7])
                  : undefined 
              }}
              truncate
            >
              {cb.name}
            </Text>
            {isSelected && (
              <Badge size="xs" variant="light" color="blue">
                選択中
              </Badge>
            )}
          </Group>
          
          {cb.description && (
            <Text 
              size="xs" 
              c="dimmed" 
              lineClamp={2}
              mb={4}
            >
              {cb.description}
            </Text>
          )}
          
          <Group gap="xs" align="center">
            <Group gap={4} align="center">
              <IconMessageCircle size={12} />
              <Text size="xs" c="dimmed">
                {cb.tweetCount}
              </Text>
            </Group>
            <Group gap={4} align="center">
              <IconCalendar size={12} />
              <Text size="xs" c="dimmed">
                {formatDate(cb.updatedAt)}
              </Text>
            </Group>
          </Group>
        </Box>
      </Group>
    </Box>
  );
});
```

---

## 3. タイムライン実装詳細

### 3.1 TimelineView.tsx

#### 基本構造
```typescript
import React from 'react';
import { Stack, Text, Center, Alert, Skeleton } from '@mantine/core';
import { IconAlertCircle, IconMoodEmpty } from '@tabler/icons-react';
import { useCbStore } from '../state/cbStore';
import { useTimeline } from '../hooks/useTimeline';
import { TweetEmbed } from '../tweet/TweetEmbed';
import { TimelineSkeleton } from './TimelineSkeleton';

export function TimelineView() {
  const { selectedCbId, cbs } = useCbStore();
  const { tweetIds, loading, error, refetch } = useTimeline(selectedCbId);
  
  const selectedCb = cbs.find(cb => cb.id === selectedCbId);
  
  // CBが選択されていない場合
  if (!selectedCbId) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <IconMoodEmpty size={48} style={{ opacity: 0.5 }} />
          <Text size="lg" c="dimmed">
            CBを選択してください
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            左側のサイドバーから表示したいCBを選択してください
          </Text>
        </Stack>
      </Center>
    );
  }
  
  // ローディング中
  if (loading) {
    return <TimelineSkeleton />;
  }
  
  // エラー
  if (error) {
    return (
      <Center h={400}>
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="エラー"
          color="red"
          variant="light"
          style={{ maxWidth: 400 }}
        >
          <Text size="sm" mb="md">{error}</Text>
          <Button size="sm" onClick={refetch}>
            再試行
          </Button>
        </Alert>
      </Center>
    );
  }
  
  // ツイートがない場合
  if (tweetIds.length === 0) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <IconMoodEmpty size={48} style={{ opacity: 0.5 }} />
          <Text size="lg" c="dimmed">
            ツイートがありません
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            「{selectedCb?.name}」にはまだツイートが追加されていません
          </Text>
        </Stack>
      </Center>
    );
  }
  
  // ツイート一覧を表示
  return (
    <Stack gap="md">
      {/* ヘッダー */}
      <Group justify="space-between" align="center">
        <Stack gap={4}>
          <Text size="lg" fw={600}>
            {selectedCb?.name}
          </Text>
          <Text size="sm" c="dimmed">
            {tweetIds.length}件のツイート
          </Text>
        </Stack>
        <Button 
          variant="light" 
          size="xs"
          onClick={refetch}
        >
          更新
        </Button>
      </Group>
      
      {/* ツイート一覧 */}
      <Stack gap="md">
        {tweetIds.map(id => (
          <TweetEmbed key={id} id={id} />
        ))}
      </Stack>
    </Stack>
  );
}
```

### 3.2 TimelineSkeleton.tsx

#### スケルトンローディング
```typescript
import React from 'react';
import { Stack, Skeleton, Box } from '@mantine/core';

export function TimelineSkeleton() {
  return (
    <Stack gap="md">
      {/* ヘッダースケルトン */}
      <Stack gap={4}>
        <Skeleton height={24} width={200} />
        <Skeleton height={16} width={100} />
      </Stack>
      
      {/* ツイートスケルトン */}
      {[...Array(5)].map((_, i) => (
        <Box key={i} style={{ padding: 16, border: '1px solid gray.3', borderRadius: 8 }}>
          <Stack gap="sm">
            {/* ヘッダー */}
            <Group gap="sm">
              <Skeleton height={40} width={40} radius="xl" />
              <Stack gap={4} style={{ flex: 1 }}>
                <Skeleton height={16} width={120} />
                <Skeleton height={12} width={80} />
              </Stack>
            </Group>
            
            {/* 本文 */}
            <Stack gap={4}>
              <Skeleton height={16} width="100%" />
              <Skeleton height={16} width="80%" />
              <Skeleton height={16} width="60%" />
            </Stack>
            
            {/* 統計 */}
            <Group gap="md">
              <Skeleton height={16} width={60} />
              <Skeleton height={16} width={60} />
              <Skeleton height={16} width={60} />
            </Group>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
```

---

## 4. ツイート表示実装詳細

### 4.1 TweetEmbed.tsx

#### react-tweet統合
```typescript
import React, { useState } from 'react';
import { Box, Alert, Button } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { Tweet } from 'react-tweet';
import { TweetEmbedFallback } from './TweetEmbedFallback';
import { useThemeBridge } from '../hooks/useThemeBridge';

interface TweetEmbedProps {
  id: string;
  theme?: 'light' | 'dark';
}

export const TweetEmbed = React.memo(function TweetEmbed({ 
  id, 
  theme 
}: TweetEmbedProps) {
  const [error, setError] = useState(false);
  const { dataTheme } = useThemeBridge(theme);
  
  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="ツイートの読み込みに失敗しました"
        color="red"
        variant="light"
      >
        <Text size="sm" mb="md">
          このツイートを表示できませんでした
        </Text>
        <Button size="xs" onClick={() => setError(false)}>
          再試行
        </Button>
      </Alert>
    );
  }
  
  return (
    <Box
      data-theme={dataTheme}
      style={{
        border: '1px solid gray.3',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <Tweet 
        id={id}
        onError={() => setError(true)}
        components={{
          // 外部リンクを新しいタブで開く
          Link: ({ href, children, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      />
    </Box>
  );
});
```

### 4.2 TweetEmbedFallback.tsx

#### フォールバック表示
```typescript
import React from 'react';
import { Box, Group, Text, Avatar, Badge } from '@mantine/core';
import { IconMessageCircle, IconHeart, IconRepeat } from '@tabler/icons-react';
import { TweetHeader } from './TweetHeader';
import { TweetStats } from './TweetStats';
import { TweetMedia } from './TweetMedia';
import { UITweet } from '../types/tweet';

interface TweetEmbedFallbackProps {
  tweet: UITweet;
  theme?: 'light' | 'dark';
}

export const TweetEmbedFallback = React.memo(function TweetEmbedFallback({ 
  tweet, 
  theme 
}: TweetEmbedFallbackProps) {
  const { colorScheme } = useMantineColorScheme();
  const themeMode = theme || colorScheme;
  
  return (
    <Box
      style={{
        padding: 16,
        border: `1px solid ${themeMode === 'dark' ? 'gray.6' : 'gray.3'}`,
        borderRadius: 8,
        backgroundColor: themeMode === 'dark' ? 'gray.8' : 'white',
      }}
    >
      <Stack gap="md">
        {/* ヘッダー */}
        <TweetHeader 
          author={tweet.author} 
          createdAt={tweet.createdAt}
          theme={themeMode}
        />
        
        {/* 本文 */}
        <Text 
          size="sm" 
          style={{ 
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {tweet.content}
        </Text>
        
        {/* メディア */}
        {tweet.media.length > 0 && (
          <TweetMedia 
            media={tweet.media}
            theme={themeMode}
          />
        )}
        
        {/* 統計 */}
        <TweetStats 
          stats={tweet.stats}
          theme={themeMode}
        />
      </Stack>
    </Box>
  );
});
```

---

## 5. 状態管理実装詳細

### 5.1 cbStore.ts

#### Zustand実装
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Cb } from '../types/cb';

interface CbStore {
  // State
  cbs: Cb[];
  selectedCbId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setCbs: (cbs: Cb[]) => void;
  setSelectedCbId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  selectedCb: Cb | undefined;
  
  // Async Actions
  loadCbs: () => Promise<void>;
  selectCb: (id: string) => void;
  clearSelection: () => void;
}

export const useCbStore = create<CbStore>()(
  devtools(
    (set, get) => ({
      // State
      cbs: [],
      selectedCbId: null,
      loading: false,
      error: null,
      
      // Actions
      setCbs: (cbs) => set({ cbs }),
      setSelectedCbId: (selectedCbId) => set({ selectedCbId }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      // Computed
      get selectedCb() {
        const { cbs, selectedCbId } = get();
        return cbs.find(cb => cb.id === selectedCbId);
      },
      
      // Async Actions
      loadCbs: async () => {
        const { setCbs, setLoading, setError } = get();
        
        setLoading(true);
        setError(null);
        
        try {
          const cbService = await import('../services/cbService');
          const cbs = await cbService.cbService.listCbs();
          setCbs(cbs);
        } catch (error) {
          console.error('CB一覧取得エラー:', error);
          setError(error instanceof Error ? error.message : 'CB一覧の取得に失敗しました');
        } finally {
          setLoading(false);
        }
      },
      
      selectCb: (id) => {
        const { setSelectedCbId, cbs } = get();
        const cb = cbs.find(c => c.id === id);
        if (cb) {
          setSelectedCbId(id);
        }
      },
      
      clearSelection: () => {
        const { setSelectedCbId } = get();
        setSelectedCbId(null);
      },
    }),
    {
      name: 'cb-store',
    }
  )
);
```

### 5.2 useTimeline.ts

#### カスタムフック
```typescript
import { useState, useEffect, useCallback } from 'react';
import { cbService } from '../services/cbService';

interface TimelineState {
  tweetIds: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTimeline(cbId: string | null): TimelineState {
  const [tweetIds, setTweetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchTimeline = useCallback(async () => {
    if (!cbId) {
      setTweetIds([]);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const ids = await cbService.getTweetIdsByCbId(cbId);
      setTweetIds(ids);
    } catch (err) {
      console.error('タイムライン取得エラー:', err);
      setError(err instanceof Error ? err.message : 'タイムラインの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [cbId]);
  
  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);
  
  return {
    tweetIds,
    loading,
    error,
    refetch: fetchTimeline,
  };
}
```

---

## 6. テスト実装詳細

### 6.1 コンポーネントテスト

#### CbSidebarItem.test.tsx
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { CbSidebarItem } from './CbSidebarItem';

const mockCb = {
  id: 'test-cb-1',
  name: 'テストCB',
  description: 'テスト用のCBです',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tweetCount: 10,
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('CbSidebarItem', () => {
  it('CBの情報が正しく表示される', () => {
    const mockOnClick = jest.fn();
    
    renderWithProvider(
      <CbSidebarItem 
        cb={mockCb} 
        isSelected={false} 
        onClick={mockOnClick} 
      />
    );
    
    expect(screen.getByText('テストCB')).toBeInTheDocument();
    expect(screen.getByText('テスト用のCBです')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
  
  it('選択状態が正しく表示される', () => {
    const mockOnClick = jest.fn();
    
    renderWithProvider(
      <CbSidebarItem 
        cb={mockCb} 
        isSelected={true} 
        onClick={mockOnClick} 
      />
    );
    
    expect(screen.getByText('選択中')).toBeInTheDocument();
  });
  
  it('クリック時にonClickが呼ばれる', () => {
    const mockOnClick = jest.fn();
    
    renderWithProvider(
      <CbSidebarItem 
        cb={mockCb} 
        isSelected={false} 
        onClick={mockOnClick} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledWith('test-cb-1');
  });
  
  it('キーボード操作が正しく動作する', () => {
    const mockOnClick = jest.fn();
    
    renderWithProvider(
      <CbSidebarItem 
        cb={mockCb} 
        isSelected={false} 
        onClick={mockOnClick} 
      />
    );
    
    const item = screen.getByRole('button');
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledWith('test-cb-1');
  });
});
```

### 6.2 フックテスト

#### useTimeline.test.ts
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useTimeline } from './useTimeline';
import { cbService } from '../services/cbService';

// モック
jest.mock('../services/cbService');

describe('useTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('cbIdがnullの場合、空の配列を返す', async () => {
    const { result } = renderHook(() => useTimeline(null));
    
    await waitFor(() => {
      expect(result.current.tweetIds).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });
  
  it('正常にツイートID一覧を取得する', async () => {
    const mockTweetIds = ['123', '456', '789'];
    (cbService.getTweetIdsByCbId as jest.Mock).mockResolvedValue(mockTweetIds);
    
    const { result } = renderHook(() => useTimeline('test-cb-1'));
    
    // 初期状態
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.tweetIds).toEqual(mockTweetIds);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });
  
  it('エラー時に適切にエラー状態を設定する', async () => {
    const mockError = new Error('テストエラー');
    (cbService.getTweetIdsByCbId as jest.Mock).mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useTimeline('test-cb-1'));
    
    await waitFor(() => {
      expect(result.current.error).toBe('テストエラー');
      expect(result.current.loading).toBe(false);
    });
  });
  
  it('refetchが正しく動作する', async () => {
    const mockTweetIds = ['123', '456'];
    (cbService.getTweetIdsByCbId as jest.Mock).mockResolvedValue(mockTweetIds);
    
    const { result } = renderHook(() => useTimeline('test-cb-1'));
    
    await waitFor(() => {
      expect(result.current.tweetIds).toEqual(mockTweetIds);
    });
    
    // refetchを呼び出し
    result.current.refetch();
    
    await waitFor(() => {
      expect(cbService.getTweetIdsByCbId).toHaveBeenCalledTimes(2);
    });
  });
});
```

---

## 7. パフォーマンス最適化

### 7.1 メモ化

#### コンポーネントのメモ化
```typescript
// メモ化されたコンポーネント
export const CbSidebarItem = React.memo(function CbSidebarItem({ 
  cb, 
  isSelected, 
  onClick 
}: CbSidebarItemProps) {
  // コンポーネントの実装
});

// コールバックのメモ化
const handleCbSelect = useCallback((cbId: string) => {
  selectCb(cbId);
}, [selectCb]);

// 計算結果のメモ化
const sortedCbs = useMemo(() => {
  return [...cbs].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}, [cbs]);
```

### 7.2 仮想リスト

#### react-window使用例
```typescript
import { FixedSizeList as List } from 'react-window';

const TweetList = ({ tweetIds }: { tweetIds: string[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <TweetEmbed id={tweetIds[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={tweetIds.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

---

## 8. アクセシビリティ対応

### 8.1 ARIA属性

#### サイドバーアイテム
```typescript
<Box
  role="button"
  tabIndex={0}
  aria-selected={isSelected}
  aria-label={`${cb.name}を選択`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(cb.id);
    }
  }}
>
  {/* コンテンツ */}
</Box>
```

### 8.2 フォーカス管理

#### フォーカスリング
```typescript
const focusStyles = {
  outline: `2px solid ${theme.colors.blue[5]}`,
  outlineOffset: '2px',
};

<Box
  style={{
    ...baseStyles,
    '&:focus-visible': focusStyles,
  }}
>
  {/* コンテンツ */}
</Box>
```

---

この詳細仕様書に従って実装を進めることで、高品質で保守性の高いCBページを作成できます。各セクションのコード例を参考に、段階的に実装を進めてください。
