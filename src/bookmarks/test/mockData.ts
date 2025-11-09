import { sampleTweetIds } from '../../stories/data/tweetSampleData';

/**
 * CBのモックデータ
 */
export const mockCbs = [
  {
    id: '1',
    name: 'コミケット関連',
    description: 'コミケットに関するツイート',
    tweetCount: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'イラスト',
    description: 'お気に入りのイラスト',
    tweetCount: 5,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    name: '技術情報',
    description: 'プログラミング関連の情報',
    tweetCount: 4,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '4',
    name: '音楽',
    description: 'お気に入りの音楽',
    tweetCount: 3,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: '5',
    name: '料理',
    description: '料理レシピ',
    tweetCount: 3,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-18'),
  },
];

/**
 * ツイートIDのモックデータ（後方互換性のため保持）
 * @deprecated sampleTweetIdsを使用してください
 */
export const mockTweetIds = sampleTweetIds.slice(0, 10);

/**
 * CBごとのツイートIDマッピング（Storybook用）
 * tweetSampleData.tsのsampleTweetIdsを活用
 * 
 * sampleTweetIdsは20個のIDがあるので、5つのCBに分散:
 * - CB 1 (コミケット関連): 0-4 (5個)
 * - CB 2 (イラスト): 5-9 (5個)
 * - CB 3 (技術情報): 10-13 (4個)
 * - CB 4 (音楽): 14-16 (3個)
 * - CB 5 (料理): 17-19 (3個)
 */
export const mockCbTweetIds: Record<string, string[]> = {
  // コミケット関連 - 5ツイート
  '1': sampleTweetIds.slice(0, 5),
  // イラスト - 5ツイート
  '2': sampleTweetIds.slice(5, 10),
  // 技術情報 - 4ツイート
  '3': sampleTweetIds.slice(10, 14),
  // 音楽 - 3ツイート
  '4': sampleTweetIds.slice(14, 17),
  // 料理 - 3ツイート
  '5': sampleTweetIds.slice(17, 20),
};

/**
 * 拡張CBのモックデータ（複数のCBとツイート群を含む）
 */
export const extendedMockCbs = [
  {
    id: 'ext-1',
    name: 'ゲーム実況',
    description: 'ゲーム実況動画のまとめ',
    tweetCount: 8,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: 'ext-2',
    name: 'アニメ感想',
    description: 'アニメの感想ツイート',
    tweetCount: 12,
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-22'),
  },
  {
    id: 'ext-3',
    name: 'VTuber',
    description: 'VTuber関連のツイート',
    tweetCount: 15,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-28'),
  },
  {
    id: 'ext-4',
    name: 'プログラミング',
    description: 'プログラミング技術メモ',
    tweetCount: 10,
    createdAt: new Date('2024-01-09'),
    updatedAt: new Date('2024-01-30'),
  },
  {
    id: 'ext-5',
    name: 'イラスト参考',
    description: 'イラストの参考資料',
    tweetCount: 7,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-26'),
  },
  {
    id: 'ext-6',
    name: 'ミュージック',
    description: 'お気に入りの音楽',
    tweetCount: 9,
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-27'),
  },
  {
    id: 'ext-7',
    name: '映画レビュー',
    description: '映画の感想とレビュー',
    tweetCount: 6,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-24'),
  },
  {
    id: 'ext-8',
    name: '料理レシピ',
    description: '美味しそうな料理レシピ',
    tweetCount: 11,
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-29'),
  },
];

/**
 * 拡張CBごとのツイートIDマッピング（Storybook用）
 * sampleTweetIdsを繰り返し使用して、より多くのCBにツイート群を割り当て
 */
export const extendedMockCbTweetIds: Record<string, string[]> = {
  // ゲーム実況 - 8ツイート（sampleTweetIdsを繰り返し使用）
  'ext-1': [
    ...sampleTweetIds.slice(0, 4),
    ...sampleTweetIds.slice(4, 8),
  ],
  // アニメ感想 - 12ツイート
  'ext-2': [
    ...sampleTweetIds.slice(8, 12),
    ...sampleTweetIds.slice(12, 16),
    ...sampleTweetIds.slice(16, 20),
    ...sampleTweetIds.slice(0, 4),
  ],
  // VTuber - 15ツイート
  'ext-3': [
    ...sampleTweetIds.slice(4, 12),
    ...sampleTweetIds.slice(12, 20),
    ...sampleTweetIds.slice(0, 7),
  ],
  // プログラミング - 10ツイート
  'ext-4': [
    ...sampleTweetIds.slice(10, 20),
  ],
  // イラスト参考 - 7ツイート
  'ext-5': [
    ...sampleTweetIds.slice(0, 7),
  ],
  // ミュージック - 9ツイート
  'ext-6': [
    ...sampleTweetIds.slice(11, 20),
  ],
  // 映画レビュー - 6ツイート
  'ext-7': [
    ...sampleTweetIds.slice(14, 20),
  ],
  // 料理レシピ - 11ツイート
  'ext-8': [
    ...sampleTweetIds.slice(0, 5),
    ...sampleTweetIds.slice(10, 16),
  ],
};

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
