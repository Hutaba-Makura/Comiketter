import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { TimelineSkeleton } from '../bookmarks/timeline/TimelineSkeleton';

const meta = {
  title: 'Timeline/TimelineSkeleton',
  component: TimelineSkeleton,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'タイムラインのローディングスケルトンコンポーネント。ツイート一覧の読み込み中に表示されるプレースホルダーです。'
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
} satisfies Meta<typeof TimelineSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なスケルトン表示
export const Default: Story = {};

// ダークテーマでのスケルトン
export const DarkTheme: Story = {
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

// アニメーション状態の確認
export const AnimationState: Story = {
  parameters: {
    docs: {
      description: {
        story: 'スケルトンのアニメーション状態を確認できます。実際のローディング時の動作をシミュレートします。'
      }
    }
  }
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
