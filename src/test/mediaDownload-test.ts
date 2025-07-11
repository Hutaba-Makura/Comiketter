/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: メディアダウンロード機能のテスト
 */

import { DownloadManager } from '../background/downloadManager';

describe('Media Download Tests', () => {
  let downloadManager: DownloadManager;

  beforeEach(() => {
    downloadManager = new DownloadManager();
  });

  describe('detectMediaType', () => {
    it('should detect video files correctly', () => {
      const videoUrls = [
        'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/1280x720/example.mp4',
        'https://example.com/video.mp4',
        'https://example.com/video.mov',
      ];

      videoUrls.forEach(url => {
        const result = (downloadManager as any).detectMediaType(url);
        expect(result).toBe('video');
      });
    });

    it('should detect image files correctly', () => {
      const imageUrls = [
        'https://pbs.twimg.com/media/example.jpg',
        'https://example.com/image.png',
        'https://example.com/image.webp',
      ];

      imageUrls.forEach(url => {
        const result = (downloadManager as any).detectMediaType(url);
        expect(result).toBe('image');
      });
    });

    it('should detect thumbnail files correctly', () => {
      const thumbnailUrls = [
        'https://pbs.twimg.com/profile_images_normal/example.jpg',
        'https://pbs.twimg.com/profile_images_bigger/example.jpg',
        'https://pbs.twimg.com/profile_images_mini/example.jpg',
        'https://example.com/thumb_example.jpg',
        'https://example.com/small_example.jpg',
      ];

      thumbnailUrls.forEach(url => {
        const result = (downloadManager as any).detectMediaType(url);
        expect(result).toBe('thumbnail');
      });
    });
  });

  describe('isProfileOrBannerImage', () => {
    it('should detect profile images correctly', () => {
      const profileUrls = [
        'https://pbs.twimg.com/profile_images/1234567890/example.jpg',
        'https://pbs.twimg.com/profile_banners/1234567890/example.jpg',
        'https://pbs.twimg.com/profile_images_normal/1234567890/example.jpg',
        'https://pbs.twimg.com/profile_images_bigger/1234567890/example.jpg',
        'https://pbs.twimg.com/profile_images_mini/1234567890/example.jpg',
      ];

      profileUrls.forEach(url => {
        const result = (downloadManager as any).isProfileOrBannerImage(url);
        expect(result).toBe(true);
      });
    });

    it('should detect banner images correctly', () => {
      const bannerUrls = [
        'https://pbs.twimg.com/profile_banners/1234567890/example.jpg',
        'https://pbs.twimg.com/banner_images/1234567890/example.jpg',
      ];

      bannerUrls.forEach(url => {
        const result = (downloadManager as any).isProfileOrBannerImage(url);
        expect(result).toBe(true);
      });
    });

    it('should not detect regular media as profile/banner images', () => {
      const regularUrls = [
        'https://pbs.twimg.com/media/1234567890/example.jpg',
        'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/1280x720/example.mp4',
        'https://example.com/regular_image.jpg',
      ];

      regularUrls.forEach(url => {
        const result = (downloadManager as any).isProfileOrBannerImage(url);
        expect(result).toBe(false);
      });
    });
  });

  describe('extractMediaFromTweet', () => {
    it('should extract video with highest bitrate', () => {
      const mockTweetData = {
        tweet_results: {
          result: {
            legacy: {
              id_str: '1234567890',
              extended_entities: {
                media: [
                  {
                    type: 'video',
                    video_info: {
                      variants: [
                        { content_type: 'video/mp4', bitrate: 1000000, url: 'https://example.com/low.mp4' },
                        { content_type: 'video/mp4', bitrate: 2000000, url: 'https://example.com/high.mp4' },
                        { content_type: 'application/x-mpegURL', bitrate: 1500000, url: 'https://example.com/hls.m3u8' },
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
                    screen_name: 'testuser',
                    id_str: '123456',
                    name: 'Test User',
                    protected: false
                  }
                }
              }
            }
          }
        }
      };

      (downloadManager as any).extractMediaFromTweet(mockTweetData);
      const cachedMedia = (downloadManager as any).mediaCache.get('1234567890');
      
      expect(cachedMedia).toBeDefined();
      expect(cachedMedia.length).toBe(1);
      expect(cachedMedia[0].type).toBe('video');
      expect(cachedMedia[0].source).toBe('https://example.com/high.mp4');
      expect(cachedMedia[0].ext).toBe('mp4');
    });

    it('should extract images correctly', () => {
      const mockTweetData = {
        tweet_results: {
          result: {
            legacy: {
              id_str: '1234567890',
              extended_entities: {
                media: [
                  {
                    type: 'photo',
                    media_url_https: 'https://pbs.twimg.com/media/example1.jpg'
                  },
                  {
                    type: 'photo',
                    media_url_https: 'https://pbs.twimg.com/media/example2.jpg'
                  }
                ]
              }
            },
            core: {
              user_results: {
                result: {
                  legacy: {
                    screen_name: 'testuser',
                    id_str: '123456',
                    name: 'Test User',
                    protected: false
                  }
                }
              }
            }
          }
        }
      };

      (downloadManager as any).extractMediaFromTweet(mockTweetData);
      const cachedMedia = (downloadManager as any).mediaCache.get('1234567890');
      
      expect(cachedMedia).toBeDefined();
      expect(cachedMedia.length).toBe(2);
      expect(cachedMedia[0].type).toBe('image');
      expect(cachedMedia[1].type).toBe('image');
      expect(cachedMedia[0].serial).toBe(1);
      expect(cachedMedia[1].serial).toBe(2);
    });

    it('should exclude profile images when configured', () => {
      const mockTweetData = {
        tweet_results: {
          result: {
            legacy: {
              id_str: '1234567890',
              extended_entities: {
                media: [
                  {
                    type: 'photo',
                    media_url_https: 'https://pbs.twimg.com/media/example.jpg'
                  },
                  {
                    type: 'photo',
                    media_url_https: 'https://pbs.twimg.com/profile_images/1234567890/profile.jpg'
                  }
                ]
              }
            },
            core: {
              user_results: {
                result: {
                  legacy: {
                    screen_name: 'testuser',
                    id_str: '123456',
                    name: 'Test User',
                    protected: false
                  }
                }
              }
            }
          }
        }
      };

      (downloadManager as any).extractMediaFromTweet(mockTweetData);
      const cachedMedia = (downloadManager as any).mediaCache.get('1234567890');
      
      expect(cachedMedia).toBeDefined();
      expect(cachedMedia.length).toBe(1); // プロフィール画像は除外される
      expect(cachedMedia[0].source).toBe('https://pbs.twimg.com/media/example.jpg');
    });
  });
}); 