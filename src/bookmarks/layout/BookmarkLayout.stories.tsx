import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider } from '@mantine/core';
import { BookmarkLayout } from './BookmarkLayout';
import { StorybookTimelineViewWrapper } from './StorybookTimelineViewWrapper';
import { withCbStore } from '../test/storybookDecorators';

/**
 * BookmarkLayoutコンポーネントのメタデータ
 */
const meta: Meta<typeof BookmarkLayout> = {
  title: 'ReactTweet/BookmarkLayout',
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
  args: {
    timelineViewComponent: StorybookTimelineViewWrapper,
  },
};

/**
 * ダークテーマでのレイアウト
 */
export const DarkTheme: Story = {
  args: {
    timelineViewComponent: StorybookTimelineViewWrapper,
  },
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
  args: {
    timelineViewComponent: StorybookTimelineViewWrapper,
  },
  parameters: {
    backgrounds: {
      default: 'light',
    },
  },
};

