import type { Meta, StoryObj } from '@storybook/react';
import { TimelineView } from './TimelineView';
import { useCbStore } from '../state/cbStore';

/**
 * TimelineViewコンポーネントのメタデータ
 */
const meta: Meta<typeof TimelineView> = {
  title: 'Bookmarks/Timeline/TimelineView',
  component: TimelineView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'タイムライン表示コンポーネント。選択されたCBのツイート一覧を表示し、検索・ソート機能を提供します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {},
  decorators: [
    (Story) => (
      <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * CBが選択されていない状態
 */
export const NoCbSelected: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().clearSelection();
  },
};

/**
 * ローディング状態
 */
export const Loading: Story = {
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
    ]);
    useCbStore.getState().selectCb('1');
  },
};

/**
 * エラー状態
 */
export const Error: Story = {
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
    ]);
    useCbStore.getState().selectCb('1');
  },
};

/**
 * ツイートが存在する状態
 */
export const WithTweets: Story = {
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
    ]);
    useCbStore.getState().selectCb('1');
  },
};

/**
 * 空のタイムライン
 */
export const EmptyTimeline: Story = {
  args: {},
  play: async () => {
    useCbStore.getState().setCbs([
      {
        id: '1',
        name: 'コミケット関連',
        description: 'コミケットに関するツイート',
        tweetCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
    ]);
    useCbStore.getState().selectCb('1');
  },
};
