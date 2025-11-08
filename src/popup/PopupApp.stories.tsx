import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { PopupAppStorybook } from './PopupApp.storybook';
import type { CustomBookmark } from '@/types';

// chrome APIをグローバルに設定（Storybook用）
if (typeof window !== 'undefined' && !(window as any).chrome) {
  (window as any).chrome = {
    runtime: {
      openOptionsPage: () => {
        console.log('openOptionsPage called (mocked)');
      },
    },
  };
}

const meta = {
  title: 'Popup/PopupApp',
  component: PopupAppStorybook,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Comiketterのポップアップアプリコンポーネント。ブックマーク一覧へのアクセスと設定画面への遷移を提供します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    bookmarks: {
      control: 'object',
      description: '表示するカスタムブックマークの配列',
    },
    loading: {
      control: 'boolean',
      description: 'ローディング状態',
    },
    error: {
      control: 'text',
      description: 'エラーメッセージ',
    },
  },
  decorators: [
    (Story) => (
      <MantineProvider>
        <div
          style={{
            width: '400px',
            minHeight: '300px',
            padding: '20px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
} satisfies Meta<typeof PopupAppStorybook>;

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルブックマークデータ
const sampleBookmarks: CustomBookmark[] = [
  {
    id: '1',
    name: 'コミケット関連',
    description: 'コミケットに関するツイート',
    color: '#ff6b6b',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    isActive: true,
    tweetCount: 150,
  },
  {
    id: '2',
    name: 'イラスト',
    description: 'お気に入りのイラスト',
    color: '#4ecdc4',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    isActive: true,
    tweetCount: 89,
  },
  {
    id: '3',
    name: '技術情報',
    description: 'プログラミング関連の情報',
    color: '#45b7d1',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
    isActive: true,
    tweetCount: 234,
  },
];

/**
 * デフォルトの状態（ブックマークあり）
 */
export const Default: Story = {
  args: {
    bookmarks: sampleBookmarks,
    loading: false,
    error: null,
  },
};

/**
 * ローディング状態
 */
export const Loading: Story = {
  args: {
    bookmarks: [],
    loading: true,
    error: null,
  },
};

/**
 * ブックマークなしの状態
 */
export const Empty: Story = {
  args: {
    bookmarks: [],
    loading: false,
    error: null,
  },
};

/**
 * 多数のブックマーク
 */
export const ManyBookmarks: Story = {
  args: {
    bookmarks: Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      name: `ブックマーク ${i + 1}`,
      description: `これは${i + 1}番目のブックマークです`,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      createdAt: new Date(2024, 0, i + 1).toISOString(),
      updatedAt: new Date(2024, 0, i + 15).toISOString(),
      isActive: true,
      tweetCount: Math.floor(Math.random() * 1000),
    })),
    loading: false,
    error: null,
  },
};

/**
 * エラー状態
 */
export const Error: Story = {
  args: {
    bookmarks: [],
    loading: false,
    error: 'ブックマークの取得に失敗しました',
  },
};

/**
 * 単一のブックマーク
 */
export const SingleBookmark: Story = {
  args: {
    bookmarks: [sampleBookmarks[0]],
    loading: false,
    error: null,
  },
};

/**
 * ダークテーマ
 */
export const DarkTheme: Story = {
  args: {
    bookmarks: sampleBookmarks,
    loading: false,
    error: null,
  },
  decorators: [
    (Story) => (
      <MantineProvider theme={{ colorScheme: 'dark' } as any}>
        <div
          style={{
            width: '400px',
            minHeight: '300px',
            padding: '20px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
          }}
        >
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
};

/**
 * ポップアップサイズ（実際のChrome拡張機能のポップアップサイズに近い）
 */
export const PopupSize: Story = {
  args: {
    bookmarks: sampleBookmarks,
    loading: false,
    error: null,
  },
  decorators: [
    (Story) => (
      <MantineProvider>
        <div
          style={{
            width: '350px',
            minHeight: '500px',
            padding: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <Story />
        </div>
      </MantineProvider>
    ),
  ],
};

