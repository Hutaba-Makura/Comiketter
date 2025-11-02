import type { Meta, StoryObj } from '@storybook/react';
import { MantineProvider } from '@mantine/core';
import { BookmarkLayout } from './BookmarkLayout';
import { StorybookTimelineViewWrapper } from './StorybookTimelineViewWrapper';
import { withExtendedCbStore } from '../test/storybookDecorators';

/**
 * BookmarkLayoutコンポーネントのメタデータ（ローカルDB版）
 */
const meta: Meta<typeof BookmarkLayout> = {
  title: 'Local-DB-Tweet/BookmarkLayout',
  component: BookmarkLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'ブックマークページのメインレイアウトコンポーネント（ローカルDB版）。StorybookTimelineViewとStorybookTweetを使用し、ローカルDBに保存されたツイートデータを表示します。',
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
    withExtendedCbStore,
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 複数のCBとツイート群を含むレイアウト
 * 8つのCBとそれぞれに複数のツイートが格納されているケース
 * StorybookTimelineViewとStorybookTweetを使用
 */
export const MultipleCbsWithTweets: Story = {
  args: {
    timelineViewComponent: StorybookTimelineViewWrapper,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: '8つのCBとそれぞれに複数のツイート群が格納されているレイアウトです。サイドバーでCBを選択すると、対応するツイート群がタイムラインに表示されます。StorybookTimelineViewとStorybookTweetを使用し、ローカルDBに保存されたツイートデータを表示します。',
      },
    },
  },
};

