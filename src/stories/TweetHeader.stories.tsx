import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { TweetHeader } from '../bookmarks/tweet/TweetHeader';
import { sampleAuthors } from './data/tweetSampleData';

const meta = {
  title: 'CB/TweetHeader',
  component: TweetHeader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ツイートヘッダーコンポーネント。ユーザー情報と投稿時刻を表示します。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    author: {
      control: 'object',
      description: 'ツイート投稿者の情報'
    },
    createdAt: {
      control: 'date',
      description: 'ツイートの投稿日時'
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
} satisfies Meta<typeof TweetHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的なヘッダー表示
export const Default: Story = {
  args: {
    author: sampleAuthors[0],
    createdAt: new Date('2024-01-15T10:30:00Z')
  }
};

// 認証済みユーザー
export const VerifiedUser: Story = {
  args: {
    author: sampleAuthors[0], // 認証済みユーザー
    createdAt: new Date('2024-01-15T10:30:00Z')
  }
};

// 非認証ユーザー
export const UnverifiedUser: Story = {
  args: {
    author: sampleAuthors[1], // 非認証ユーザー
    createdAt: new Date('2024-01-15T10:30:00Z')
  }
};

// 長いユーザー名
export const LongDisplayName: Story = {
  args: {
    author: {
      ...sampleAuthors[0],
      displayName: 'とても長いユーザー名を持つユーザー',
      username: 'very_long_username_that_might_cause_layout_issues'
    },
    createdAt: new Date('2024-01-15T10:30:00Z')
  }
};

// 最近の投稿（1時間前）
export const RecentPost: Story = {
  args: {
    author: sampleAuthors[0],
    createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1時間前
  }
};

// 古い投稿（1週間前）
export const OldPost: Story = {
  args: {
    author: sampleAuthors[0],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1週間前
  }
};

// プロフィール画像なし
export const NoProfileImage: Story = {
  args: {
    author: {
      ...sampleAuthors[0],
      profileImageUrl: ''
    },
    createdAt: new Date('2024-01-15T10:30:00Z')
  }
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    author: sampleAuthors[0],
    createdAt: new Date('2024-01-15T10:30:00Z')
  },
  decorators: [
    (Story) => (
      <MantineProvider theme={{ colorScheme: 'dark' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
          <Story />
        </div>
      </MantineProvider>
    )
  ]
};
