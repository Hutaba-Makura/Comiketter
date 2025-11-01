import { TweetAuthor, TweetStats, TweetMediaItem } from '../../bookmarks/types/tweet';

/**
 * Storybook専用のツイートサンプルデータ
 * 本番コードから完全に分離されたテスト用データ
 */

// TweetStats拡張（Storybook用フラグ）
export interface SampleTweetStats extends TweetStats {
  // ユーザーがRT済みかどうか
  isRetweeted: boolean;
  // ユーザーがいいね済みかどうか
  isFavorited: boolean;
}

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
export const sampleStats: SampleTweetStats[] = [
  {
    retweetCount: 156,
    likeCount: 1234,
    replyCount: 23,
    quoteCount: 8,
    isRetweeted: true,
    isFavorited: false
  },
  {
    retweetCount: 89,
    likeCount: 567,
    replyCount: 12,
    quoteCount: 3,
    isRetweeted: false,
    isFavorited: true
  },
  {
    retweetCount: 234,
    likeCount: 2345,
    replyCount: 45,
    quoteCount: 12,
    isRetweeted: true,
    isFavorited: true
  },
  {
    retweetCount: 45,
    likeCount: 234,
    replyCount: 8,
    quoteCount: 2,
    isRetweeted: false,
    isFavorited: false
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
      url: 'https://video.twimg.com/amplify_video/1976375876527988737/vid/avc1/1920x1080/DaUSmb1XZkHqEYkg.mp4?tag=21',
      previewUrl: 'https://pbs.twimg.com/amplify_video_thumb/1976375876527988737/img/NwB1QSaYkTW-1oHg.jpg',
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
      url: 'https://video.twimg.com/tweet_video/G3l8yaCWkAASxJB.mp4',
      previewUrl: 'https://pbs.twimg.com/tweet_video_thumb/G3l8yaCWkAASxJB.jpg',
      altText: 'GIFアニメーション',
      width: 500,
      height: 300
    }
  ],
  // 3枚の画像（グリッドレイアウト）
  [
    {
      id: 'media-6',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4LseiFX0AAWOpv?format=jpg&name=medium',
      previewUrl: 'https://pbs.twimg.com/media/G4LseiFX0AAWOpv?format=jpg&name=small',
      altText: '花隈千冬',
      width: 300,
      height: 200
    },
    {
      id: 'media-7',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4E3v43WIAAVy1Z?format=jpg&name=medium',
      previewUrl: 'https://pbs.twimg.com/media/G4E3v43WIAAVy1Z?format=jpg&name=small',
      altText: 'ベロン',
      width: 300,
      height: 200
    },
    {
      id: 'media-8',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G3-5bdZWAAEp7QP?format=jpg&name=medium',
      previewUrl: 'https://pbs.twimg.com/media/G3-5bdZWAAEp7QP?format=jpg&name=small',
      altText: 'ヤミ',
      width: 300,
      height: 200
    }
  ],
  // 4枚の画像（グリッドレイアウト）
  [
    {
      id: 'media-9',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4LseiFX0AAWOpv?format=jpg&name=medium',
      previewUrl: 'https://pbs.twimg.com/media/G4LseiFX0AAWOpv?format=jpg&name=small',
      altText: '花隈千冬',
      width: 300,
      height: 200
    },
    {
      id: 'media-10',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4E3v43WIAAVy1Z?format=jpg&name=medium',
      previewUrl: 'https://pbs.twimg.com/media/G4E3v43WIAAVy1Z?format=jpg&name=small',
      altText: 'ベロン',
      width: 300,
      height: 200
    },
    {
      id: 'media-11',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G3-5bdZWAAEp7QP?format=jpg&name=medium',
      previewUrl: 'https://pbs.twimg.com/media/G3-5bdZWAAEp7QP?format=jpg&name=small',
      altText: 'ヤミ',
      width: 300,
      height: 200
    },
    {
      id: 'media-12',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G30AmfmWIAAbeJr?format=jpg&name=small',
      previewUrl: 'https://pbs.twimg.com/media/G30AmfmWIAAbeJr?format=jpg&name=small',
      altText: 'ネコネコ',
      width: 300,
      height: 200
    },
    {
      id: 'media-13',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4h7kJZaQAAM-fX?format=jpg&name=large',
      previewUrl: 'https://pbs.twimg.com/media/G4h7kJZaQAAM-fX?format=jpg&name=small',
      altText: 'mikumiku',
      width: 300,
      height: 200
    },
    {
      id: 'media-14',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4gFiyba8AQPjFw?format=jpg&name=large',
      previewUrl: 'https://pbs.twimg.com/media/G4gFiyba8AQPjFw?format=jpg&name=small',
      altText: 'ぼざろ',
      width: 300,
      height: 200
    },
    {
      id: 'media-15',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4b96eUagAAWAe0?format=jpg&name=large',
      previewUrl: 'https://pbs.twimg.com/media/G4b96eUagAAWAe0?format=jpg&name=small',
      altText: 'あかり',
      width: 300,
      height: 200
    },
    {
      id: 'media-16',
      type: 'image',
      url: 'https://pbs.twimg.com/media/G4gdc4XaMAAp7zb?format=jpg&name=4096x4096',
      previewUrl: 'https://pbs.twimg.com/media/G4gdc4XaMAAp7zb?format=jpg&name=small',
      altText: 'ハッカドール',
      width: 4096,
      height: 4096
    }
  ]
];

// サンプルツイートID
export const sampleTweetIds: string[] = [
  '1984286490667680125',
  '1984281425290637737',
  '1983914424424657333',
  '1982697446372479283',
  '1982750955390357952',
  '1982347315135623478',
  '1978755042510254088',
  '1978275443812843872',
  '1983899707392061608',
  '1983114648200327209',
  '1982721757544157683',
  '1982753666127085917',
  '1982811097447981203',
  '1979763409202868358',
  '1979508947989168542',
  '1979110150641455223',
  '1978765917942145157',
  '1978458955174085090',
  '1977125667088351553',
  '1969032787673161913',
  '1968517527887061090',
];

// サンプルツイートコンテンツ
export const sampleTweetContents: string[] = [
  '39393939',
  'テトテトテトテト',
  'ブルーアーカイブ！(電車内に響くクソデカボイス)',
  'ぬるぽ',
  'ちくわ大明神',
  '俺はお前が俺を見たのを見たぞ',
  '助けてー！集団ストーカに襲われています！！',
  '修行をしています。いつの日か世界を救うと信じて',
  'ヘアメイクアップアーティストでタレントのIKKOこと豊田一幸は2017年10月24日～10月28日の間に全くの他人と入れ替わっている。',
  'おはよう！朝４時に何してるんだい？',
  'ロンドンのんかマジレンジャー好きだったなぁ…', 
  'トホホ〜もう眠れない夜は雨の宿をくれなきゃいたずらしちゃうぞ',
  '一度描いてみたかったﾄﾞﾛｼｰです',
  '今日の季節だよ！そして今始まった、取れてた眉毛が戻ってきたよ！',
  'めちゃくちゃ似合ってる',
  '動かしたいと思って下書きしましたが下書きで満足しました\n頭デカすぎた(；；)\n後カラーセンスなくて泣ける',
  '頭がすごく痛いよ',
  '身分証を引き取るのにぴったりだよ。【Warthunder】',
];

// サンプルCBデータ
export const sampleCbData = {
  id: 'sample-cb-1',
  name: 'テスト用',
  description: 'テスト用のCBだよん',
  tweetCount: 10,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15')
};

export const sampleCbData2 = {
  id: 'sample-cb-2',
  name: 'イラスト',
  description: 'イラストのCBやねん',
  tweetCount: 10,
  createdAt: new Date('2024-04-05'),
  updatedAt: new Date('2024-10-15')
};
