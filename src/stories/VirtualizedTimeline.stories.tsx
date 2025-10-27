import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { VirtualizedTimeline } from '../bookmarks/timeline/VirtualizedTimeline';
import { sampleTweetIds } from './data/tweetSampleData';

const meta = {
  title: 'Timeline/VirtualizedTimeline',
  component: VirtualizedTimeline,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '仮想化されたタイムラインコンポーネント。大量のツイートを効率的に表示します。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    tweetIds: {
      control: 'object',
      description: '表示するツイートIDの配列'
    },
    height: {
      control: { type: 'number', min: 200, max: 1000, step: 50 },
      description: 'タイムラインの高さ（ピクセル）'
    },
    itemHeight: {
      control: { type: 'number', min: 100, max: 500, step: 25 },
      description: '各ツイートアイテムの高さ（ピクセル）'
    }
  },
  decorators: [
    (Story) => (
      <MantineProvider>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
          <Story />
        </div>
      </MantineProvider>
    )
  ]
} satisfies Meta<typeof VirtualizedTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な仮想化タイムライン
export const Default: Story = {
  args: {
    tweetIds: sampleTweetIds,
    height: 600,
    itemHeight: 200
  }
};

// 少数のツイート
export const FewTweets: Story = {
  args: {
    tweetIds: sampleTweetIds.slice(0, 3),
    height: 400,
    itemHeight: 200
  }
};

// 多数のツイート（仮想化の効果を確認）
export const ManyTweets: Story = {
  args: {
    tweetIds: Array.from({ length: 50 }, (_, i) => `1234567890123456${String(i).padStart(3, '0')}`),
    height: 600,
    itemHeight: 200
  }
};

// 高さを調整した表示
export const CustomHeight: Story = {
  args: {
    tweetIds: sampleTweetIds,
    height: 400,
    itemHeight: 150
  }
};

// アイテム高さを調整した表示
export const CustomItemHeight: Story = {
  args: {
    tweetIds: sampleTweetIds,
    height: 600,
    itemHeight: 250
  }
};

// 空のタイムライン
export const EmptyTimeline: Story = {
  args: {
    tweetIds: [],
    height: 400,
    itemHeight: 200
  }
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    tweetIds: sampleTweetIds,
    height: 600,
    itemHeight: 200
  },
  decorators: [
    (Story) => (
      <MantineProvider theme={{ colorScheme: 'dark' } as any}>
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
          <Story />
        </div>
      </MantineProvider>
    )
  ]
};

// パフォーマンステスト（大量データ）
export const PerformanceTest: Story = {
  args: {
    tweetIds: Array.from({ length: 1000 }, (_, i) => `1234567890123456${String(i).padStart(4, '0')}`),
    height: 600,
    itemHeight: 200
  },
  parameters: {
    docs: {
      description: {
        story: '1000件のツイートで仮想化のパフォーマンス効果を確認できます。スクロールがスムーズに動作することを確認してください。'
      }
    }
  }
};

// レスポンシブ表示（モバイルサイズ）
export const MobileView: Story = {
  args: {
    tweetIds: sampleTweetIds,
    height: 500,
    itemHeight: 180
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};

// レスポンシブ表示（タブレットサイズ）
export const TabletView: Story = {
  args: {
    tweetIds: sampleTweetIds,
    height: 600,
    itemHeight: 200
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};
