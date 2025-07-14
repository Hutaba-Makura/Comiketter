/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: 動画ダウンロード機能のテスト
 */

import { DownloadManager } from '../background/downloadManager';

describe('Video Download Tests', () => {
  let downloadManager: DownloadManager;

  beforeEach(() => {
    downloadManager = new DownloadManager();
  });

  describe('selectBestVideoVariant', () => {
    it('should select the highest bitrate MP4 variant', () => {
      const variants = [
        { content_type: 'video/mp4', bitrate: 256000, url: 'low.mp4' },
        { content_type: 'video/mp4', bitrate: 832000, url: 'medium.mp4' },
        { content_type: 'video/mp4', bitrate: 2176000, url: 'high.mp4' },
        { content_type: 'application/x-mpegURL', bitrate: 0, url: 'playlist.m3u8' }
      ];

      const result = (downloadManager as any).selectBestVideoVariant(variants);
      
      expect(result).toBeDefined();
      expect(result.content_type).toBe('video/mp4');
      expect(result.bitrate).toBe(2176000);
      expect(result.url).toBe('high.mp4');
    });

    it('should handle variants with zero bitrate', () => {
      const variants = [
        { content_type: 'video/mp4', bitrate: 0, url: 'default.mp4' },
        { content_type: 'video/mp4', bitrate: 256000, url: 'low.mp4' }
      ];

      const result = (downloadManager as any).selectBestVideoVariant(variants);
      
      expect(result).toBeDefined();
      expect(result.content_type).toBe('video/mp4');
      expect(result.bitrate).toBe(256000);
      expect(result.url).toBe('low.mp4');
    });

    it('should return null for empty variants array', () => {
      const result = (downloadManager as any).selectBestVideoVariant([]);
      expect(result).toBeNull();
    });

    it('should return null when no MP4 variants are found', () => {
      const variants = [
        { content_type: 'application/x-mpegURL', bitrate: 0, url: 'playlist.m3u8' }
      ];

      const result = (downloadManager as any).selectBestVideoVariant(variants);
      expect(result).toBeNull();
    });
  });

  describe('generateAlternativeVideoUrls', () => {
    it('should generate alternative URLs for ext_tw_video', () => {
      const originalUrl = 'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/avc1/1280x720/example.mp4?tag=12';
      
      const alternatives = (downloadManager as any).generateAlternativeVideoUrls(originalUrl);
      
      expect(alternatives).toContain('https://video.twimg.com/ext_tw_video/1234567890/pu/vid/avc1/1920x1080/example.mp4?tag=12');
      expect(alternatives).toContain('https://video.twimg.com/ext_tw_video/1234567890/pu/vid/avc1/640x360/example.mp4?tag=12');
      expect(alternatives).toContain('https://video.twimg.com/ext_tw_video/1234567890/pu/vid/avc1/480x270/example.mp4?tag=12');
    });

    it('should generate alternative URLs for amplify_video', () => {
      const originalUrl = 'https://video.twimg.com/amplify_video/1234567890/vid/avc1/720x980/example.mp4?tag=16';
      
      const alternatives = (downloadManager as any).generateAlternativeVideoUrls(originalUrl);
      
      expect(alternatives).toContain('https://video.twimg.com/amplify_video/1234567890/vid/avc1/1080x1464/example.mp4?tag=16');
      expect(alternatives).toContain('https://video.twimg.com/amplify_video/1234567890/vid/avc1/480x652/example.mp4?tag=16');
      expect(alternatives).toContain('https://video.twimg.com/amplify_video/1234567890/vid/avc1/320x434/example.mp4?tag=16');
    });

    it('should handle tweet_video URLs (no alternatives)', () => {
      const originalUrl = 'https://video.twimg.com/tweet_video/example.mp4';
      
      const alternatives = (downloadManager as any).generateAlternativeVideoUrls(originalUrl);
      
      expect(alternatives).toEqual([]);
    });

    it('should handle invalid URLs gracefully', () => {
      const originalUrl = 'https://example.com/invalid/video/url';
      
      const alternatives = (downloadManager as any).generateAlternativeVideoUrls(originalUrl);
      
      expect(alternatives).toEqual([]);
    });
  });

  describe('detectMediaType', () => {
    it('should detect video URLs correctly', () => {
      const videoUrls = [
        'https://video.twimg.com/ext_tw_video/1234567890/pu/vid/avc1/1280x720/example.mp4',
        'https://video.twimg.com/amplify_video/1234567890/vid/avc1/720x980/example.mp4',
        'https://video.twimg.com/tweet_video/example.mp4',
        'https://example.com/video.mp4'
      ];

      videoUrls.forEach(url => {
        const result = (downloadManager as any).detectMediaType(url);
        expect(result).toBe('video');
      });
    });

    it('should detect image URLs correctly', () => {
      const imageUrls = [
        'https://pbs.twimg.com/media/example.jpg',
        'https://pbs.twimg.com/media/example.png',
        'https://example.com/image.webp'
      ];

      imageUrls.forEach(url => {
        const result = (downloadManager as any).detectMediaType(url);
        expect(result).toBe('image');
      });
    });

    it('should detect thumbnail URLs correctly', () => {
      const thumbnailUrls = [
        'https://pbs.twimg.com/profile_images_normal/example.jpg',
        'https://pbs.twimg.com/profile_images_bigger/example.jpg',
        'https://example.com/thumb_example.jpg'
      ];

      thumbnailUrls.forEach(url => {
        const result = (downloadManager as any).detectMediaType(url);
        expect(result).toBe('thumbnail');
      });
    });
  });

  describe('extractMediaFromTweet', () => {
    it('should extract video information from tweet data', () => {
      const tweetData = {
        tweet_results: {
          result: {
            legacy: {
              id_str: '1234567890',
              full_text: 'Test video tweet',
              created_at: '2024-01-01T00:00:00.000Z',
              extended_entities: {
                media: [
                  {
                    type: 'video',
                    media_key: 'test_key',
                    video_info: {
                      variants: [
                        { content_type: 'video/mp4', bitrate: 256000, url: 'low.mp4' },
                        { content_type: 'video/mp4', bitrate: 2176000, url: 'high.mp4' },
                        { content_type: 'application/x-mpegURL', bitrate: 0, url: 'playlist.m3u8' }
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

      (downloadManager as any).extractMediaFromTweet(tweetData);
      
      // キャッシュに保存されているかチェック
      const cachedMedia = (downloadManager as any).mediaCache.get('1234567890');
      expect(cachedMedia).toBeDefined();
      expect(cachedMedia.length).toBe(1);
      expect(cachedMedia[0].type).toBe('video');
      expect(cachedMedia[0].source).toBe('high.mp4'); // 最高ビットレートが選択される
    });

    it('should handle tweets without media', () => {
      const tweetData = {
        tweet_results: {
          result: {
            legacy: {
              id_str: '1234567890',
              full_text: 'Text only tweet',
              created_at: '2024-01-01T00:00:00.000Z'
            }
          }
        }
      };

      (downloadManager as any).extractMediaFromTweet(tweetData);
      
      const cachedMedia = (downloadManager as any).mediaCache.get('1234567890');
      expect(cachedMedia).toBeUndefined();
    });
  });
}); 