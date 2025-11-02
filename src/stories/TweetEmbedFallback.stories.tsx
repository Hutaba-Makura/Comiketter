import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { TweetEmbedFallback } from '../bookmarks/tweet/TweetEmbedFallback';

const meta = {
  title: 'Tweet/TweetEmbedFallback',
  component: TweetEmbedFallback,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'react-tweet失敗時のフォールバック表示コンポーネント。エラー状態を表示し、再試行やTwitterでの確認を促します。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    id: {
      control: 'text',
      description: 'ツイートID'
    },
    onRetry: {
      action: 'retry',
      description: '再試行ボタンがクリックされた時のコールバック'
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
} satisfies Meta<typeof TweetEmbedFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なエラー表示
export const Default: Story = {
  args: {
    id: '1234567890123456789'
  }
};

// 長いツイートID
export const LongTweetId: Story = {
  args: {
    id: '123456789012345678901234567890123456789'
  }
};

// 短いツイートID
export const ShortTweetId: Story = {
  args: {
    id: '123456789'
  }
};

// 再試行コールバック付き
export const WithRetryCallback: Story = {
  args: {
    id: '1234567890123456790',
    onRetry: () => {
      console.log('再試行がクリックされました');
      alert('再試行がクリックされました');
    }
  }
};

// ダークテーマでの表示
export const DarkTheme: Story = {
  args: {
    id: '1234567890123456791'
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

// インタラクション機能のテスト
export const InteractiveFeatures: Story = {
  args: {
    id: '1234567890123456794',
    onRetry: () => {
      console.log('再試行ボタンがクリックされました');
    }
  },
  parameters: {
    docs: {
      description: {
        story: '再試行ボタンとTwitterで確認ボタンの動作をテストできます。'
      }
    }
  }
};
