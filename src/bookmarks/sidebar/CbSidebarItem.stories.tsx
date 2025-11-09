import type { Meta, StoryObj } from '@storybook/react';
import { CbSidebarItem } from './CbSidebarItem';
import { mockCbs } from '../test/mockData';
import { useCbStore } from '../state/cbStore';

/**
 * CbSidebarItemコンポーネントのメタデータ
 */
const meta: Meta<typeof CbSidebarItem> = {
  title: 'Bookmarks/Sidebar/CbSidebarItem',
  component: CbSidebarItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'CBサイドバーアイテムコンポーネント。個別のCBを表示し、選択・編集・削除機能を提供します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    cb: {
      description: '表示するCBのデータ',
      control: { type: 'object' },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルトのアイテム
 */
export const Default: Story = {
  args: {
    cb: mockCbs[0],
  },
};

/**
 * 選択されたアイテム
 */
export const Selected: Story = {
  args: {
    cb: mockCbs[0],
  },
  play: async () => {
    // 選択状態をシミュレート
    useCbStore.getState().selectCb(mockCbs[0].id);
  },
};

/**
 * 長い名前のアイテム
 */
export const LongName: Story = {
  args: {
    cb: {
      ...mockCbs[0],
      name: 'とても長いカスタムブックマークの名前です。これは非常に長い名前の例です。',
      description: 'これは非常に長い説明文の例です。カスタムブックマークの説明として使用される長いテキストです。',
    },
  },
};

/**
 * 多くのツイートを持つアイテム
 */
export const ManyTweets: Story = {
  args: {
    cb: {
      ...mockCbs[0],
      tweetCount: 9999,
    },
  },
};

/**
 * 説明なしのアイテム
 */
export const NoDescription: Story = {
  args: {
    cb: {
      ...mockCbs[0],
      description: '',
    },
  },
};

/**
 * 新しく作成されたアイテム
 */
export const NewlyCreated: Story = {
  args: {
    cb: {
      ...mockCbs[0],
      tweetCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
};
