/**
 * CBのモックデータ
 */
export const mockCbs = [
  {
    id: '1',
    name: 'コミケット関連',
    description: 'コミケットに関するツイート',
    tweetCount: 150,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'イラスト',
    description: 'お気に入りのイラスト',
    tweetCount: 89,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    name: '技術情報',
    description: 'プログラミング関連の情報',
    tweetCount: 234,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '4',
    name: '音楽',
    description: 'お気に入りの音楽',
    tweetCount: 67,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '5',
    name: '料理',
    description: '料理レシピ',
    tweetCount: 45,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-18'),
  },
];

/**
 * ツイートIDのモックデータ
 */
export const mockTweetIds = [
  '1234567890123456789',
  '1234567890123456790',
  '1234567890123456791',
  '1234567890123456792',
  '1234567890123456793',
  '1234567890123456794',
  '1234567890123456795',
  '1234567890123456796',
  '1234567890123456797',
  '1234567890123456798',
];

/**
 * ツイートのモックデータ
 */
export const mockTweets = [
  {
    id: '1234567890123456789',
    text: 'コミケットの準備を始めました！今年は新作をたくさん持っていきます。',
    author: {
      name: 'イラストレーターA',
      username: 'artist_a',
      profile_image_url: 'https://via.placeholder.com/48x48',
    },
    created_at: '2024-01-15T10:00:00.000Z',
    media: [
      {
        type: 'photo',
        url: 'https://via.placeholder.com/400x300',
      },
    ],
  },
  {
    id: '1234567890123456790',
    text: '新しいイラストが完成しました！',
    author: {
      name: 'イラストレーターB',
      username: 'artist_b',
      profile_image_url: 'https://via.placeholder.com/48x48',
    },
    created_at: '2024-01-15T09:30:00.000Z',
    media: [
      {
        type: 'photo',
        url: 'https://via.placeholder.com/400x400',
      },
    ],
  },
];

/**
 * エラーメッセージのモックデータ
 */
export const mockErrors = {
  networkError: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
  serverError: 'サーバーエラーが発生しました。しばらく時間をおいてから再試行してください。',
  notFoundError: '指定されたCBが見つかりません。',
  unauthorizedError: '認証が必要です。ログインしてください。',
};
