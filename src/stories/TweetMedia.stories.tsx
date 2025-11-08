import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import { TweetMedia } from '../bookmarks/tweet/TweetMedia';
import { sampleMediaItems } from './data/tweetSampleData';

const meta = {
  title: 'Local-DB-Tweet/TweetMedia',
  component: TweetMedia,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'ツイートメディアコンポーネント。画像、動画、GIFを適切なレイアウトで表示します。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    media: {
      control: 'object',
      description: 'メディアアイテムの配列'
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
} satisfies Meta<typeof TweetMedia>;

export default meta;
type Story = StoryObj<typeof meta>;

// メディアなし
export const NoMedia: Story = {
  args: {
    media: []
  }
};

// 単一画像
export const SingleImage: Story = {
  args: {
    media: sampleMediaItems[0]
  }
};

// 2枚の画像
export const DoubleImages: Story = {
  args: {
    media: sampleMediaItems[1]
  }
};

// 動画
export const Video: Story = {
  args: {
    media: sampleMediaItems[2]
  }
};

// GIF
export const Gif: Story = {
  args: {
    media: sampleMediaItems[3]
  }
};

// 4枚の画像（グリッドレイアウト）
export const GridImages: Story = {
  args: {
    media: sampleMediaItems[4]
  }
};

// 5枚以上の画像（+N表示）
export const ManyImages: Story = {
  args: {
    media: [
      ...sampleMediaItems[4],
      {
        id: 'media-10',
        type: 'image',
        url: 'https://via.placeholder.com/300x200/FF7675/FFFFFF?text=画像5',
        previewUrl: 'https://via.placeholder.com/300x200/FF7675/FFFFFF?text=画像5',
        altText: '画像5',
        width: 300,
        height: 200
      },
      {
        id: 'media-11',
        type: 'image',
        url: 'https://via.placeholder.com/300x200/74B9FF/FFFFFF?text=画像6',
        previewUrl: 'https://via.placeholder.com/300x200/74B9FF/FFFFFF?text=画像6',
        altText: '画像6',
        width: 300,
        height: 200
      }
    ]
  }
};

// 3枚の画像（トリプルレイアウト）
export const TripleImages: Story = {
  args: {
    media: [
      {
        id: 'media-12',
        type: 'image',
        url: 'https://via.placeholder.com/400x300/00B894/FFFFFF?text=画像1',
        previewUrl: 'https://via.placeholder.com/400x300/00B894/FFFFFF?text=画像1',
        altText: '画像1',
        width: 400,
        height: 300
      },
      {
        id: 'media-13',
        type: 'image',
        url: 'https://via.placeholder.com/400x300/00CEC9/FFFFFF?text=画像2',
        previewUrl: 'https://via.placeholder.com/400x300/00CEC9/FFFFFF?text=画像2',
        altText: '画像2',
        width: 400,
        height: 300
      },
      {
        id: 'media-14',
        type: 'image',
        url: 'https://via.placeholder.com/400x300/6C5CE7/FFFFFF?text=画像3',
        previewUrl: 'https://via.placeholder.com/400x300/6C5CE7/FFFFFF?text=画像3',
        altText: '画像3',
        width: 400,
        height: 300
      }
    ]
  }
};

// ダークテーマ
export const DarkTheme: Story = {
  args: {
    media: sampleMediaItems[0]
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

