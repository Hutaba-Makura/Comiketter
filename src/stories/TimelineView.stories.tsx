import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { TimelineView } from '../bookmarks/timeline/TimelineView';
import { sampleCbData, sampleTweetIds } from './data/tweetSampleData';

// TimelineViewはuseCbStoreとuseTimelineフックに依存しているため、
// モックを提供する必要があります
const mockCbStore = {
  selectedCbId: 'sample-cb-1',
  selectedCb: sampleCbData
};

const mockTimeline = {
  tweetIds: sampleTweetIds,
  loading: false,
  error: null,
  refetch: () => {}
};

// モック関数を提供
jest.mock('../bookmarks/state/cbStore', () => ({
  useCbStore: () => mockCbStore
}));

jest.mock('../bookmarks/hooks/useTimeline', () => ({
  useTimeline: () => mockTimeline
}));

const meta = {
  title: 'CB/TimelineView',
  component: TimelineView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'タイムライン表示コンポーネント。CBに保存されたツイート一覧を表示し、検索・ソート・仮想化機能を提供します。'
      }
    }
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MantineProvider>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
          <Story />
        </div>
      </MantineProvider>
    )
  ]
} satisfies Meta<typeof TimelineView>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なタイムライン表示
export const Default: Story = {};

// ローディング状態
export const Loading: Story = {
  decorators: [
    (Story) => {
      // ローディング状態のモック
      jest.doMock('../bookmarks/hooks/useTimeline', () => ({
        useTimeline: () => ({
          tweetIds: [],
          loading: true,
          error: null,
          refetch: () => {}
        })
      }));
      
      return (
        <MantineProvider>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Story />
          </div>
        </MantineProvider>
      );
    }
  ]
};

// エラー状態
export const Error: Story = {
  decorators: [
    (Story) => {
      // エラー状態のモック
      jest.doMock('../bookmarks/hooks/useTimeline', () => ({
        useTimeline: () => ({
          tweetIds: [],
          loading: false,
          error: 'ツイートの取得に失敗しました',
          refetch: () => {}
        })
      }));
      
      return (
        <MantineProvider>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Story />
          </div>
        </MantineProvider>
      );
    }
  ]
};

// 空のタイムライン
export const EmptyTimeline: Story = {
  decorators: [
    (Story) => {
      // 空のタイムラインのモック
      jest.doMock('../bookmarks/hooks/useTimeline', () => ({
        useTimeline: () => ({
          tweetIds: [],
          loading: false,
          error: null,
          refetch: () => {}
        })
      }));
      
      return (
        <MantineProvider>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Story />
          </div>
        </MantineProvider>
      );
    }
  ]
};

// 多数のツイート（仮想化有効）
export const ManyTweets: Story = {
  decorators: [
    (Story) => {
      // 多数のツイートのモック
      const manyTweetIds = Array.from({ length: 150 }, (_, i) => `1234567890123456${String(i).padStart(3, '0')}`);
      
      jest.doMock('../bookmarks/hooks/useTimeline', () => ({
        useTimeline: () => ({
          tweetIds: manyTweetIds,
          loading: false,
          error: null,
          refetch: () => {}
        })
      }));
      
      return (
        <MantineProvider>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Story />
          </div>
        </MantineProvider>
      );
    }
  ]
};

// CBが選択されていない状態
export const NoCbSelected: Story = {
  decorators: [
    (Story) => {
      // CBが選択されていない状態のモック
      jest.doMock('../bookmarks/state/cbStore', () => ({
        useCbStore: () => ({
          selectedCbId: null,
          selectedCb: null
        })
      }));
      
      return (
        <MantineProvider>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Story />
          </div>
        </MantineProvider>
      );
    }
  ]
};

// ダークテーマ
export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        <div style={{ padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
          <Story />
        </div>
      </MantineProvider>
    )
  ]
};

// レスポンシブ表示（モバイルサイズ）
export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    }
  }
};

// レスポンシブ表示（タブレットサイズ）
export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    }
  }
};

// レスポンシブ表示（デスクトップサイズ）
export const DesktopView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop'
    }
  }
};

// インタラクション機能のテスト
export const InteractiveFeatures: Story = {
  parameters: {
    docs: {
      description: {
        story: '検索、ソート、仮想化の切り替えなどのインタラクション機能をテストできます。'
      }
    }
  }
};
