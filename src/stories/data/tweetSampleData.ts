import { TweetAuthor, TweetStats, TweetMediaItem } from '../../bookmarks/types/tweet';

/**
 * Storybook専用のツイートサンプルデータ
 * 本番コードから完全に分離されたテスト用データ
 */

// サンプルユーザーデータ
export const sampleAuthors: TweetAuthor[] = [
  {
    id: 'user-1',
    username: 'comiket_official',
    displayName: 'コミックマーケット',
    profileImageUrl: '',
    verified: true
  },
  {
    id: 'user-2',
    username: 'sample_artist',
    displayName: 'サンプルアーティスト',
    profileImageUrl: '',
    verified: false
  },
  {
    id: 'user-3',
    username: 'cosplayer_jp',
    displayName: 'コスプレイヤー日本',
    profileImageUrl: '',
    verified: true
  },
  {
    id: 'user-4',
    username: 'doujin_circle',
    displayName: '同人サークル「サンプル」',
    profileImageUrl: '',
    verified: false
  }
];

// サンプル統計データ
export const sampleStats: TweetStats[] = [
  {
    retweetCount: 156,
    likeCount: 1234,
    replyCount: 23,
    quoteCount: 8
  },
  {
    retweetCount: 89,
    likeCount: 567,
    replyCount: 12,
    quoteCount: 3
  },
  {
    retweetCount: 234,
    likeCount: 2345,
    replyCount: 45,
    quoteCount: 12
  },
  {
    retweetCount: 45,
    likeCount: 234,
    replyCount: 8,
    quoteCount: 2
  }
];

// サンプルメディアデータ
export const sampleMediaItems: TweetMediaItem[][] = [
  // 単一画像
  [
    {
      id: 'media-1',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4IkjETWYAIO2rO?format=jpg&name=900x900',
      previewUrl: 'https://pbs.twimg.com/media/G4IkjETWYAIO2rO?format=jpg&name=small',
      altText: 'Hatsune Miku',
      width: 600,
      height: 400
    }
  ],
  // 複数画像（2枚）
  [
    {
      id: 'media-2',
      type: 'image',
      url: 'https://pbs.twimg.com/media/FxIHj0pacAAmDHW?format=jpg&name=medium',
      previewUrl: 'https://pbs.twimg.com/media/FxIHj0pacAAmDHW?format=jpg&name=small',
      altText: '結月ゆかりです',
      width: 400,
      height: 300
    },
    {
      id: 'media-3',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4F-pS3WwAEK9D4?format=jpg&name=large',
      previewUrl: 'https://pbs.twimg.com/media/G4F-pS3WwAEK9D4?format=jpg&name=small',
      altText: 'クッキー☆',
      width: 400,
      height: 300
    }
  ],
  // 動画
  [
    {
      id: 'media-4',
      type: 'video',
      url: 'https://via.placeholder.com/600x400/45B7D1/FFFFFF?text=動画コンテンツ',
      previewUrl: 'https://via.placeholder.com/600x400/45B7D1/FFFFFF?text=動画コンテンツ',
      altText: '動画コンテンツ',
      width: 600,
      height: 400
    }
  ],
  // GIF
  [
    {
      id: 'media-5',
      type: 'gif',
      url: 'https://via.placeholder.com/500x300/96CEB4/FFFFFF?text=GIFアニメーション',
      previewUrl: 'https://via.placeholder.com/500x300/96CEB4/FFFFFF?text=GIFアニメーション',
      altText: 'GIFアニメーション',
      width: 500,
      height: 300
    }
  ],
  // 4枚の画像（グリッドレイアウト）
  [
    {
      id: 'media-6',
      type: 'image',
      url: 'https://via.placeholder.com/300x200/FFEAA7/FFFFFF?text=画像1',
      previewUrl: 'https://via.placeholder.com/300x200/FFEAA7/FFFFFF?text=画像1',
      altText: '画像1',
      width: 300,
      height: 200
    },
    {
      id: 'media-7',
      type: 'image',
      url: 'https://via.placeholder.com/300x200/DDA0DD/FFFFFF?text=画像2',
      previewUrl: 'https://via.placeholder.com/300x200/DDA0DD/FFFFFF?text=画像2',
      altText: '画像2',
      width: 300,
      height: 200
    },
    {
      id: 'media-8',
      type: 'image',
      url: 'https://via.placeholder.com/300x200/98D8C8/FFFFFF?text=画像3',
      previewUrl: 'https://via.placeholder.com/300x200/98D8C8/FFFFFF?text=画像3',
      altText: '画像3',
      width: 300,
      height: 200
    },
    {
      id: 'media-9',
      type: 'image',
      url: 'https://via.placeholder.com/300x200/F7DC6F/FFFFFF?text=画像4',
      previewUrl: 'https://via.placeholder.com/300x200/F7DC6F/FFFFFF?text=画像4',
      altText: '画像4',
      width: 300,
      height: 200
    }
  ]
];

// サンプルツイートID
export const sampleTweetIds: string[] = [
  '1234567890123456789',
  '1234567890123456790',
  '1234567890123456791',
  '1234567890123456792',
  '1234567890123456793',
  '1234567890123456794',
  '1234567890123456795',
  '1234567890123456796',
  '1234567890123456797',
  '1234567890123456798'
];

// サンプルツイートコンテンツ
export const sampleTweetContents: string[] = [
  'コミックマーケット100の開催が決定しました！皆様のご参加をお待ちしております。',
  '新作同人誌のサンプルを公開しました。ぜひチェックしてみてください！',
  'コスプレ写真を投稿しました。衣装は全て手作りです。',
  '同人サークル「サンプル」の新刊情報です。コミケでお待ちしております。',
  '今日はコミックマーケットの準備をしています。たくさんの方にお会いできるのが楽しみです。',
  '新作イラストを描きました。コミケで頒布予定です。',
  'コスプレの衣装制作が完了しました。細かい部分までこだわって作りました。',
  '同人誌の印刷が完了しました。コミケ当日が楽しみです。',
  'コミックマーケットの会場レイアウトを確認しました。迷子にならないよう注意してください。',
  '新作グッズのデザインが完成しました。コミケで販売予定です。'
];

// サンプルCBデータ
export const sampleCbData = {
  id: 'sample-cb-1',
  name: 'コミックマーケット関連',
  description: 'コミックマーケットに関するツイートをまとめたCB',
  tweetCount: 10,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15')
};
