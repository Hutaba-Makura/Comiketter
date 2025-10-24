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

/**
 * 多数のCBリスト（スクロールが必要な状態）
 */
export const WithManyCbs: Story = {
  args: {},
  play: async () => {
    const manyCbs = [
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
      {
        id: '4',
        name: 'アニメ・漫画',
        description: 'アニメと漫画の感想・考察',
        tweetCount: 456,
        createdAt: new Date('2024-01-04'),
        updatedAt: new Date('2024-01-18'),
      },
      {
        id: '5',
        name: 'ゲーム',
        description: 'ゲーム関連のツイート',
        tweetCount: 123,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-12'),
      },
      {
        id: '6',
        name: '音楽',
        description: '音楽の感想・おすすめ',
        tweetCount: 78,
        createdAt: new Date('2024-01-06'),
        updatedAt: new Date('2024-01-14'),
      },
      {
        id: '7',
        name: '料理・レシピ',
        description: '料理の写真とレシピ',
        tweetCount: 67,
        createdAt: new Date('2024-01-07'),
        updatedAt: new Date('2024-01-16'),
      },
      {
        id: '8',
        name: '旅行',
        description: '旅行の記録と写真',
        tweetCount: 234,
        createdAt: new Date('2024-01-08'),
        updatedAt: new Date('2024-01-19'),
      },
      {
        id: '9',
        name: '読書',
        description: '読んだ本の感想',
        tweetCount: 45,
        createdAt: new Date('2024-01-09'),
        updatedAt: new Date('2024-01-11'),
      },
      {
        id: '10',
        name: 'スポーツ',
        description: 'スポーツ観戦・実践記録',
        tweetCount: 156,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-17'),
      },
      {
        id: '11',
        name: 'ペット',
        description: 'ペットの写真と日常',
        tweetCount: 89,
        createdAt: new Date('2024-01-11'),
        updatedAt: new Date('2024-01-13'),
      },
      {
        id: '12',
        name: '仕事・キャリア',
        description: '仕事に関する情報・体験談',
        tweetCount: 112,
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-21'),
      },
      {
        id: '13',
        name: '健康・フィットネス',
        description: '健康管理・運動記録',
        tweetCount: 78,
        createdAt: new Date('2024-01-13'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '14',
        name: 'ファッション',
        description: 'ファッション・コーディネート',
        tweetCount: 134,
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-18'),
      },
      {
        id: '15',
        name: '映画・ドラマ',
        description: '映画・ドラマの感想・レビュー',
        tweetCount: 267,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
      },
    ];
    
    useCbStore.getState().setCbs(manyCbs);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
  },
};

/**
 * 様々なツイート数パターンのCBリスト
 */
export const WithVariedTweetCounts: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().setCbs([
      {
        id: '1',
        name: '新規CB（ツイートなし）',
        description: 'まだツイートが追加されていないCB',
        tweetCount: 0,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '2',
        name: '少ないツイート数',
        description: '少数のツイート',
        tweetCount: 5,
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '3',
        name: '中程度のツイート数',
        description: '中程度のツイート数',
        tweetCount: 150,
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '4',
        name: '大量のツイート数',
        description: '大量のツイートが保存されているCB',
        tweetCount: 2500,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-20'),
      },
      {
        id: '5',
        name: '非常に大量のツイート数',
        description: '非常に大量のツイートが保存されているCB',
        tweetCount: 15000,
        createdAt: new Date('2023-12-01'),
        updatedAt: new Date('2024-01-20'),
      },
    ]);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
  },
};

/**
 * 長い名前と説明のCBリスト
 */
export const WithLongNamesAndDescriptions: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().setCbs([
      {
        id: '1',
        name: 'これは非常に長いCBの名前で、UIがどのように表示されるかをテストするためのものです',
        description: 'これは非常に長い説明文で、UIがどのように表示されるかをテストするためのものです。複数行にわたる長い説明文がどのように表示されるかを確認できます。',
        tweetCount: 150,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: '2',
        name: '短い名前',
        description: '短い説明',
        tweetCount: 89,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-10'),
      },
      {
        id: '3',
        name: '中程度の長さのCB名',
        description: '中程度の長さの説明文で、UIの表示をテストします。',
        tweetCount: 234,
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-20'),
      },
    ]);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
  },
};