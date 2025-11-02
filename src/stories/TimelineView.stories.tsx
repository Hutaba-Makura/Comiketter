import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { StorybookTimelineView } from './components/StorybookTimelineView';
import { sampleCbData, sampleTweetIds } from './data/tweetSampleData';

const meta = {
  title: 'Timeline/TimelineView',
  component: StorybookTimelineView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'タイムライン表示コンポーネント。CBに保存されたツイート一覧を表示し、検索・ソート・仮想化機能を提供します。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    selectedCbId: {
      control: 'text',
      description: '選択されたCBのID'
    },
    tweetIds: {
      control: 'object',
      description: '表示するツイートIDの配列'
    },
    loading: {
      control: 'boolean',
      description: 'ローディング状態'
    },
    error: {
      control: 'text',
      description: 'エラーメッセージ'
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
} satisfies Meta<typeof StorybookTimelineView>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なタイムライン表示
export const Default: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: [
      ...sampleTweetIds,
      '1234567890123456799', // 3枚画像のツイート（index 10）
      '1234567890123456800', // 4枚画像のツイート（index 11）
    ],
    loading: false,
    error: null
  }
};

// ローディング状態
export const Loading: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: [],
    loading: true,
    error: null
  }
};

// エラー状態
export const Error: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: [],
    loading: false,
    error: 'ツイートの取得に失敗しました'
  }
};

// 空のタイムライン
export const EmptyTimeline: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: [],
    loading: false,
    error: null
  }
};

// 少数のツイート
export const FewTweets: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: sampleTweetIds.slice(0, 3),
    loading: false,
    error: null
  }
};

// 多数のツイート（仮想化有効）
export const ManyTweets: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: Array.from({ length: 150 }, (_, i) => `1234567890123456${String(i).padStart(3, '0')}`),
    loading: false,
    error: null
  }
};

// CBが選択されていない状態
export const NoCbSelected: Story = {
  args: {
    selectedCbId: null,
    selectedCb: null,
    tweetIds: [],
    loading: false,
    error: null
  }
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: sampleTweetIds,
    loading: false,
    error: null
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

// レスポンシブ表示（デスクトップサイズ）
export const DesktopView: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: sampleTweetIds,
    loading: false,
    error: null
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop'
    }
  }
};

// インタラクション機能のテスト
export const InteractiveFeatures: Story = {
  args: {
    selectedCbId: 'sample-cb-1',
    selectedCb: sampleCbData,
    tweetIds: sampleTweetIds,
    loading: false,
    error: null
  },
  parameters: {
    docs: {
      description: {
        story: '検索、ソート、仮想化の切り替えなどのインタラクション機能をテストできます。'
      }
    }
  }
};
