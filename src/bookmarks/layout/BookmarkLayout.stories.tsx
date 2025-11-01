import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider } from '@mantine/core';
import { BookmarkLayout } from './BookmarkLayout';
import { StorybookTimelineViewWrapper } from './StorybookTimelineViewWrapper';
import { withCbStore, withExtendedCbStore } from '../test/storybookDecorators';

/**
 * BookmarkLayoutコンポーネントのメタデータ
 */
const meta: Meta<typeof BookmarkLayout> = {
  title: 'Bookmarks/Layout/BookmarkLayout',
  component: BookmarkLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'ブックマークページのメインレイアウトコンポーネント。サイドバーとタイムラインエリアを配置します。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {},
  decorators: [
    (Story) => (
      <MantineProvider>
        <Story />
      </MantineProvider>
    ),
    withCbStore,
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルトのレイアウト
 */
export const Default: Story = {
  args: {},
};

/**
 * ダークテーマでのレイアウト
 */
export const DarkTheme: Story = {
  args: {},
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
};

/**
 * ライトテーマでのレイアウト
 */
export const LightTheme: Story = {
  args: {},
  parameters: {
    backgrounds: {
      default: 'light',
    },
  },
};

/**
 * 複数のCBとツイート群を含むレイアウト
 * 8つのCBとそれぞれに複数のツイートが格納されているケース
 */
export const MultipleCbsWithTweets: Story = {
  args: {
    timelineViewComponent: StorybookTimelineViewWrapper,
  },
  decorators: [
    (Story) => (
      <MantineProvider>
        <Story />
      </MantineProvider>
    ),
    withExtendedCbStore,
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '8つのCBとそれぞれに複数のツイート群が格納されているレイアウトです。サイドバーでCBを選択すると、対応するツイート群がタイムラインに表示されます。StorybookTimelineViewとStorybookTweetを使用しています。',
      },
    },
  },
};
