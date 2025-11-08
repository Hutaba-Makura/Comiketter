import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { TweetStats } from '../bookmarks/tweet/TweetStats';
import { sampleStats } from './data/tweetSampleData';

const meta = {
  title: 'Local-DB-Tweet/TweetStats',
  component: TweetStats,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ツイート統計コンポーネント。いいね、リツイート、リプライ、シェアの統計とアクションボタンを表示します。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    stats: {
      control: 'object',
      description: 'ツイートの統計情報'
    }
  },
  decorators: [
    (Story) => (
      <MantineProvider>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Story />
        </div>
      </MantineProvider>
    )
  ]
} satisfies Meta<typeof TweetStats>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な統計表示
export const Default: Story = {
  args: {
    stats: sampleStats[0]
  }
};

// 高エンゲージメント（いいね数が多い）
export const HighEngagement: Story = {
  args: {
    stats: {
      retweetCount: 1234,
      likeCount: 5678,
      replyCount: 234,
      quoteCount: 89
    }
  }
};

// 低エンゲージメント（数値が少ない）
export const LowEngagement: Story = {
  args: {
    stats: {
      retweetCount: 2,
      likeCount: 5,
      replyCount: 1,
      quoteCount: 0
    }
  }
};

// ゼロエンゲージメント
export const ZeroEngagement: Story = {
  args: {
    stats: {
      retweetCount: 0,
      likeCount: 0,
      replyCount: 0,
      quoteCount: 0
    }
  }
};

// 大きな数値（K表記のテスト）
export const LargeNumbers: Story = {
  args: {
    stats: {
      retweetCount: 12345,
      likeCount: 67890,
      replyCount: 1234,
      quoteCount: 567
    }
  }
};

// 非常に大きな数値（M表記のテスト）
export const VeryLargeNumbers: Story = {
  args: {
    stats: {
      retweetCount: 1234567,
      likeCount: 2345678,
      replyCount: 123456,
      quoteCount: 12345
    }
  }
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    stats: sampleStats[0]
  },
  decorators: [
    (Story) => (
      <MantineProvider theme={{ colorScheme: 'dark' } as any}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
          <Story />
        </div>
      </MantineProvider>
    )
  ]
};

// インタラクション状態のテスト
export const InteractiveStates: Story = {
  args: {
    stats: sampleStats[0]
  },
  parameters: {
    docs: {
      description: {
        story: 'ボタンをクリックしてインタラクション状態を確認できます。'
      }
    }
  }
};
