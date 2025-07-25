/**
 * API処理機能のテスト
 */

import { ApiProcessor } from '../api-processor';
import type { ApiResponseMessage } from '../api-processor/types';

describe('ApiProcessor', () => {
  let apiProcessor: ApiProcessor;

  beforeEach(() => {
    apiProcessor = new ApiProcessor();
  });

  describe('processApiResponse', () => {
    it('HomeLatestTimeline APIを正しく処理できる', () => {
      const message: ApiResponseMessage = {
        path: '/i/api/graphql/HomeLatestTimeline',
        data: {
          data: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: [
                  {
                    entryId: 'tweet-123',
                    content: {
                      itemContent: {
                        tweet_results: {
                          result: {
                            legacy: {
                              id_str: '1234567890',
                              full_text: 'テストツイート',
                              created_at: 'Sun Jul 13 16:05:00 +0000 2025',
                              favorite_count: 10,
                              retweet_count: 5,
                              reply_count: 2,
                              quote_count: 1,
                              bookmarked: false,
                              favorited: true,
                              retweeted: false,
                              possibly_sensitive: false
                            },
                            core: {
                              user_results: {
                                result: {
                                  legacy: {
                                    name: 'テストユーザー',
                                    screen_name: 'testuser',
                                    id_str: '123456'
                                  },
                                  avatar: {
                                    image_url: 'https://pbs.twimg.com/profile_images/test.jpg'
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        },
        timestamp: Date.now()
      };

      const result = apiProcessor.processApiResponse(message);

      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].id_str).toBe('1234567890');
      expect(result.tweets[0].full_text).toBe('テストツイート');
      expect(result.tweets[0].user.screen_name).toBe('testuser');
      expect(result.errors).toHaveLength(0);
    });

    it('メディア付きツイートを正しく処理できる', () => {
      const message: ApiResponseMessage = {
        path: '/i/api/graphql/TweetDetail',
        data: {
          data: {
            tweet: {
              legacy: {
                id_str: '1234567890',
                full_text: '画像付きツイート',
                created_at: 'Sun Jul 13 16:05:00 +0000 2025',
                favorite_count: 10,
                retweet_count: 5,
                reply_count: 2,
                quote_count: 1,
                bookmarked: false,
                favorited: true,
                retweeted: false,
                possibly_sensitive: false,
                extended_entities: {
                  media: [
                    {
                      id_str: 'media123',
                      type: 'photo',
                      media_url_https: 'https://pbs.twimg.com/media/test.jpg'
                    }
                  ]
                }
              },
              core: {
                user_results: {
                  result: {
                    legacy: {
                      name: 'テストユーザー',
                      screen_name: 'testuser',
                      id_str: '123456'
                    },
                    avatar: {
                      image_url: 'https://pbs.twimg.com/profile_images/test.jpg'
                    }
                  }
                }
              }
            }
          }
        },
        timestamp: Date.now()
      };

      const result = apiProcessor.processApiResponse(message);

      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].media).toHaveLength(1);
      expect(result.tweets[0].media![0].type).toBe('photo');
      expect(result.tweets[0].media![0].media_url_https).toBe('https://pbs.twimg.com/media/test.jpg');
      expect(result.errors).toHaveLength(0);
    });

    it('動画付きツイートを正しく処理できる', () => {
      const message: ApiResponseMessage = {
        path: '/i/api/graphql/TweetDetail',
        data: {
          data: {
            tweet: {
              legacy: {
                id_str: '1234567890',
                full_text: '動画付きツイート',
                created_at: 'Sun Jul 13 16:05:00 +0000 2025',
                favorite_count: 10,
                retweet_count: 5,
                reply_count: 2,
                quote_count: 1,
                bookmarked: false,
                favorited: true,
                retweeted: false,
                possibly_sensitive: false,
                extended_entities: {
                  media: [
                    {
                      id_str: 'media123',
                      type: 'video',
                      media_url_https: 'https://pbs.twimg.com/amplify_video_thumb/test.jpg',
                      video_info: {
                        duration_millis: 10000,
                        aspect_ratio: [16, 9],
                        variants: [
                          {
                            bitrate: 1280000,
                            content_type: 'video/mp4',
                            url: 'https://video.twimg.com/ext_tw_video/test/vid/1280x720/video.mp4'
                          },
                          {
                            content_type: 'application/x-mpegURL',
                            url: 'https://video.twimg.com/ext_tw_video/test/pl/playlist.m3u8'
                          }
                        ]
                      }
                    }
                  ]
                }
              },
              core: {
                user_results: {
                  result: {
                    legacy: {
                      name: 'テストユーザー',
                      screen_name: 'testuser',
                      id_str: '123456'
                    },
                    avatar: {
                      image_url: 'https://pbs.twimg.com/profile_images/test.jpg'
                    }
                  }
                }
              }
            }
          }
        },
        timestamp: Date.now()
      };

      const result = apiProcessor.processApiResponse(message);

      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].media).toHaveLength(1);
      expect(result.tweets[0].media![0].type).toBe('video');
      expect(result.tweets[0].media![0].video_info).toBeDefined();
      expect(result.tweets[0].media![0].video_info!.variants).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('未対応のAPIタイプを適切に処理する', () => {
      const message: ApiResponseMessage = {
        path: '/i/api/graphql/UnknownAPI',
        data: {},
        timestamp: Date.now()
      };

      const result = apiProcessor.processApiResponse(message);

      expect(result.tweets).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('エラーが発生した場合に適切に処理する', () => {
      const message: ApiResponseMessage = {
        path: '/i/api/graphql/HomeLatestTimeline',
        data: null, // 無効なデータ
        timestamp: Date.now()
      };

      const result = apiProcessor.processApiResponse(message);

      expect(result.tweets).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
}); 