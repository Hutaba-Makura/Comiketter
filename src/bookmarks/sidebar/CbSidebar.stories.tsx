import type { Meta, StoryObj } from '@storybook/react';
import { CbSidebar } from './CbSidebar';
import { useCbStore } from '../state/cbStore';

/**
 * CbSidebarコンポーネントのメタデータ
 */
const meta: Meta<typeof CbSidebar> = {
  title: 'Bookmarks/Sidebar/CbSidebar',
  component: CbSidebar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'カスタムブックマークのサイドバーコンポーネント。CB一覧の表示、検索、作成機能を提供します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {},
  decorators: [
    (Story) => (
      <div style={{ width: '320px', height: '600px', border: '1px solid #ccc' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルトのサイドバー（空の状態）
 */
export const Default: Story = {
  args: {},
};

/**
 * ローディング状態
 */
export const Loading: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().setLoading(true);
  },
};

/**
 * エラー状態
 */
export const Error: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().setError('CB一覧の取得に失敗しました');
    useCbStore.getState().setLoading(false);
  },
};

/**
 * CBが存在する状態
 */
export const WithCbs: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().setCbs([
      {
        id: '1',
        name: 'コミケット関連',
        description: 'コミケットに関するツイート',
        tweetCount: 150,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        name: 'イラスト',
        description: 'お気に入りのイラスト',
        tweetCount: 89,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-10'),
      },
      {
        id: '3',
        name: '技術情報',
        description: 'プログラミング関連の情報',
        tweetCount: 234,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-20'),
      },
    ]);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
  },
};

/**
 * 検索フィルタリング
 */
export const WithSearch: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().setCbs([
      {
        id: '1',
        name: 'コミケット関連',
        description: 'コミケットに関するツイート',
        tweetCount: 150,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        name: 'イラスト',
        description: 'お気に入りのイラスト',
        tweetCount: 89,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-10'),
      },
      {
        id: '3',
        name: '技術情報',
        description: 'プログラミング関連の情報',
        tweetCount: 234,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-20'),
      },
    ]);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
  },
};
