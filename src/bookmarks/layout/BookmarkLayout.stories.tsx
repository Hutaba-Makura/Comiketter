import type { Meta, StoryObj } from '@storybook/react';
import { BookmarkLayout } from './BookmarkLayout';

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
