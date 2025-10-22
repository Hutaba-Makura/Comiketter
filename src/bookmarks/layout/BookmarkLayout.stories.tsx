import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider } from '@mantine/core';
import { BookmarkLayout } from './BookmarkLayout';
import { withCbStore } from '../test/storybookDecorators';

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
