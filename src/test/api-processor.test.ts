/**
 * ApiProcessorのテスト
 * response-processing-rule.md 2.3準拠の実装を検証
 */

import { ApiProcessor } from '../api-processor/api-processor';
import type { ApiResponseMessage } from '../api-processor/types';

// モックデータ（実際のAPIレスポンス構造に基づく）
const mockApiResponse: ApiResponseMessage = {
  path: 'https://x.com/i/api/graphql/HomeLatestTimeline',
  timestamp: Date.now(),
  data: {
    home: {
      home_timeline_urt: {
        instructions: [
          {
            type: 'TimelineClearCache'
          },
          {
            type: 'TimelineAddEntries',
            entries: [
              {
                entryId: 'tweet-123456789',
                sortIndex: '1234567890',
                content: {
                  entryType: 'TimelineTimelineItem',
                  __typename: 'TimelineTimelineItem',
                  itemContent: {
                    itemType: 'TimelineTweet',
                    __typename: 'TimelineTweet',
                    tweet_results: {
                      result: {
                        __typename: 'Tweet',
                        legacy: {
                          id_str: '123456789',
                          full_text: 'テストツイートです',
                          created_at: 'Sun Jul 13 16:05:00 +0000 2025',
                          favorite_count: 10,
                          retweet_count: 5,
                          reply_count: 2,
                          quote_count: 1,
                          bookmarked: false,
                          favorited: true,
                          retweeted: false,
                          possibly_sensitive: false,
                          in_reply_to_screen_name: 'replyuser',
                          in_reply_to_status_id_str: '987654321',
                          in_reply_to_user_id_str: '111111111',
                          conversation_id_str: '123456789'
                        },
                        core: {
                          user_results: {
                            result: {
                              __typename: 'User',
                              core: {
                                name: 'テストユーザー',
                                screen_name: 'testuser'
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
              },
              {
                entryId: 'tweet-987654321',
                sortIndex: '9876543210',
                content: {
                  entryType: 'TimelineTimelineItem',
                  __typename: 'TimelineTimelineItem',
                  itemContent: {
                    itemType: 'TimelineTweet',
                    __typename: 'TimelineTweet',
                    tweet_results: {
                      result: {
                        __typename: 'Tweet',
                        legacy: {
                          id_str: '987654321',
                          full_text: 'リツイートされたツイート',
                          created_at: 'Sun Jul 13 15:00:00 +0000 2025',
                          favorite_count: 100,
                          retweet_count: 50,
                          reply_count: 10,
                          quote_count: 5,
                          bookmarked: false,
                          favorited: false,
                          retweeted: true,
                          possibly_sensitive: false
                        },
                        core: {
                          user_results: {
                            result: {
                              __typename: 'User',
                              core: {
                                name: '元ツイートユーザー',
                                screen_name: 'originaluser'
                              },
                              avatar: {
                                image_url: 'https://pbs.twimg.com/profile_images/original.jpg'
                              }
                            }
                          }
                        },
                        retweeted_status_result: {
                          result: {
                            __typename: 'Tweet',
                            legacy: {
                              id_str: '555555555',
                              full_text: '元のツイート内容',
                              created_at: 'Sun Jul 13 14:00:00 +0000 2025',
                              favorite_count: 200,
                              retweet_count: 100,
                              reply_count: 20,
                              quote_count: 10,
                              bookmarked: false,
                              favorited: false,
                              retweeted: false,
                              possibly_sensitive: false
                            },
                            core: {
                              user_results: {
                                result: {
                                  __typename: 'User',
                                  core: {
                                    name: '元ツイート作者',
                                    screen_name: 'originalauthor'
                                  },
                                  avatar: {
                                    image_url: 'https://pbs.twimg.com/profile_images/author.jpg'
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              {
                entryId: 'tweet-invalid',
                sortIndex: '1111111111',
                content: {
                  entryType: 'TimelineTimelineItem',
                  __typename: 'TimelineTimelineItem',
                  itemContent: {
                    itemType: 'TimelineTweet',
                    __typename: 'TimelineTweet',
                    tweet_results: {
                      result: {
                        __typename: 'Tweet',
                        legacy: {
                          // 必須キーが欠けている（id_strがない）
                          full_text: '無効なツイート',
                          created_at: 'Sun Jul 13 16:05:00 +0000 2025',
                          favorite_count: 0,
                          retweet_count: 0,
                          reply_count: 0,
                          quote_count: 0,
                          bookmarked: false,
                          favorited: false,
                          retweeted: false,
                          possibly_sensitive: false
                        },
                        core: {
                          user_results: {
                            result: {
                              __typename: 'User',
                              core: {
                                name: '無効ユーザー',
                                screen_name: 'invaliduser'
                              },
                              avatar: {
                                image_url: 'https://pbs.twimg.com/profile_images/invalid.jpg'
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
    }
  }
};

describe('ApiProcessor', () => {
  let apiProcessor: ApiProcessor;

  beforeEach(() => {
    apiProcessor = new ApiProcessor();
  });

  describe('processApiResponse', () => {
    it('正常なAPIレスポンスからツイートを抽出できる', async () => {
      const result = await apiProcessor.processApiResponse(mockApiResponse);

      expect(result.tweets).toHaveLength(2); // 有効なツイートは2件
      expect(result.errors).toHaveLength(0);

      // 1つ目のツイートを検証
      const firstTweet = result.tweets[0];
      expect(firstTweet.id_str).toBe('123456789');
      expect(firstTweet.full_text).toBe('テストツイートです');
      expect(firstTweet.user.name).toBe('テストユーザー');
      expect(firstTweet.user.screen_name).toBe('testuser');
      expect(firstTweet.in_reply_to_screen_name).toBe('replyuser');
      expect(firstTweet.in_reply_to_status_id_str).toBe('987654321');
      expect(firstTweet.in_reply_to_user_id_str).toBe('111111111');
      expect(firstTweet.conversation_id_str).toBe('123456789');

      // 2つ目のツイート（リツイート）を検証
      const secondTweet = result.tweets[1];
      expect(secondTweet.id_str).toBe('987654321');
      expect(secondTweet.full_text).toBe('リツイートされたツイート');
      expect(secondTweet.user.name).toBe('元ツイートユーザー');
      expect(secondTweet.user.screen_name).toBe('originaluser');
      expect(secondTweet.retweeted).toBe(true);

      // リツイート元の情報を検証
      expect(secondTweet.retweeted_status).toBeDefined();
      expect(secondTweet.retweeted_status!.id_str).toBe('555555555');
      expect(secondTweet.retweeted_status!.full_text).toBe('元のツイート内容');
      expect(secondTweet.retweeted_status!.user.name).toBe('元ツイート作者');
      expect(secondTweet.retweeted_status!.user.screen_name).toBe('originalauthor');
    });

    it('必須キーが欠けているツイートは除外される', async () => {
      const result = await apiProcessor.processApiResponse(mockApiResponse);

      // id_strが欠けているツイートは除外される
      const invalidTweet = result.tweets.find(tweet => tweet.id_str === 'tweet-invalid');
      expect(invalidTweet).toBeUndefined();
    });

    it('TimelineAddEntries以外のinstructionは無視される', async () => {
      const modifiedResponse = {
        ...mockApiResponse,
        data: {
          data: {
            instructions: [
              {
                type: 'TimelineClearCache' // これは無視される
              },
              {
                type: 'OtherInstruction', // これも無視される
                entries: []
              }
            ]
          }
        }
      };

      const result = await apiProcessor.processApiResponse(modifiedResponse as ApiResponseMessage);

      expect(result.tweets).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('空のentries配列は適切に処理される', async () => {
      const emptyResponse = {
        ...mockApiResponse,
        data: {
          data: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: []
              }
            ]
          }
        }
      };

      const result = await apiProcessor.processApiResponse(emptyResponse as ApiResponseMessage);

      expect(result.tweets).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('tweet_results.resultが存在しない場合は無視される', async () => {
      const noResultResponse = {
        ...mockApiResponse,
        data: {
          data: {
            instructions: [
              {
                type: 'TimelineAddEntries',
                entries: [
                  {
                    entryId: 'tweet-no-result',
                    content: {
                      itemContent: {
                        tweet_results: {
                          // resultが存在しない
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      };

      const result = await apiProcessor.processApiResponse(noResultResponse as ApiResponseMessage);

      expect(result.tweets).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('processApiResponseWithoutCache', () => {
    it('キャッシュ無効でツイートを抽出できる', async () => {
      const result = await apiProcessor.processApiResponseWithoutCache(mockApiResponse);

      expect(result.tweets).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('extractApiType', () => {
    it('正しいAPIタイプを抽出できる', () => {
      const testCases = [
        { path: 'https://x.com/i/api/graphql/HomeLatestTimeline', expected: 'HomeLatestTimeline' },
        { path: 'https://x.com/i/api/graphql/UserTweets', expected: 'UserTweets' },
        { path: 'https://x.com/i/api/graphql/TweetDetail', expected: 'TweetDetail' },
        { path: 'https://x.com/i/api/graphql/Bookmarks', expected: 'Bookmarks' },
        { path: 'https://x.com/i/api/graphql/Likes', expected: 'Likes' },
        { path: 'https://x.com/i/api/graphql/UserHighlightsTweets', expected: 'UserHighlightsTweets' },
        { path: 'https://x.com/i/api/graphql/ListLatestTweetsTimeline', expected: 'ListLatestTweetsTimeline' },
        { path: 'https://x.com/i/api/graphql/UserMedia', expected: 'UserMedia' },
        { path: 'https://x.com/i/api/graphql/NotificationsTimeline', expected: 'NotificationsTimeline' },
        { path: 'https://x.com/i/api/favorites/create', expected: 'FavoriteTweet' },
        { path: 'https://x.com/i/api/favorites/destroy', expected: 'UnfavoriteTweet' },
        { path: 'https://x.com/i/api/retweet/create', expected: 'CreateRetweet' },
        { path: 'https://x.com/i/api/unknown', expected: 'Unknown' }
      ];

      testCases.forEach(({ path, expected }) => {
        // private メソッドをテストするため、any でアクセス
        const result = (apiProcessor as any).extractApiType(path);
        expect(result).toBe(expected);
      });
    });
  });
}); 