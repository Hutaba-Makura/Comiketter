/**
 * メディア情報を抽出するクラス
 * 
 * Twitter APIレスポンスからメディア（画像、動画、GIF）の情報を抽出し、
 * 統一された形式に変換する
 */

import type { ProcessedMedia } from './types';

export class MediaExtractor {
  /**
   * ツイートオブジェクトからメディア情報を抽出
   */
  extractFromTweet(tweetData: any): ProcessedMedia[] {
    try {
      const mediaArray = tweetData.legacy?.extended_entities?.media;
      if (!Array.isArray(mediaArray)) {
        return [];
      }

      const media: ProcessedMedia[] = [];

      for (const mediaItem of mediaArray) {
        const extractedMedia = this.extractFromMediaItem(mediaItem);
        if (extractedMedia) {
          media.push(extractedMedia);
        }
      }

      return media;
    } catch (error) {
      console.error('Comiketter: メディア情報抽出エラー:', error);
      return [];
    }
  }

  /**
   * 個別のメディアアイテムからProcessedMediaを抽出
   */
  extractFromMediaItem(mediaItem: any): ProcessedMedia | null {
    try {
      if (!mediaItem?.id_str || !mediaItem?.type) {
        return null;
      }

      const media: ProcessedMedia = {
        id_str: mediaItem.id_str,
        type: mediaItem.type,
        media_url_https: mediaItem.media_url_https || ''
      };

      // 動画またはGIFの場合、video_infoを追加
      if (mediaItem.type === 'video' || mediaItem.type === 'animated_gif') {
        if (mediaItem.video_info) {
          media.video_info = {
            duration_millis: mediaItem.video_info.duration_millis || 0,
            aspect_ratio: mediaItem.video_info.aspect_ratio || [1, 1],
            variants: this.extractVideoVariants(mediaItem.video_info.variants || [])
          };
        }
      }

      return media;
    } catch (error) {
      console.error('Comiketter: メディアアイテム抽出エラー:', error);
      return null;
    }
  }

  /**
   * 動画のバリアント情報を抽出
   */
  private extractVideoVariants(variants: any[]): NonNullable<ProcessedMedia['video_info']>['variants'] {
    return variants
      .filter(variant => variant?.url && variant?.content_type)
      .map(variant => ({
        bitrate: variant.bitrate,
        content_type: variant.content_type,
        url: variant.url
      }))
      .sort((a, b) => {
        // bitrateが高い順にソート（高画質優先）
        const bitrateA = a.bitrate || 0;
        const bitrateB = b.bitrate || 0;
        return bitrateB - bitrateA;
      });
  }

  /**
   * 最適な動画URLを取得（最高画質）
   * MP4形式のバリアントをフィルタリングし、最高ビットレートのものを選択
   */
  getBestVideoUrl(media: ProcessedMedia): string | null {
    console.log('Comiketter: [MediaExtractor] getBestVideoUrl called with:', {
      type: media.type,
      has_video_info: !!media.video_info,
      variants_count: media.video_info?.variants?.length || 0
    });
    
    if (media.type !== 'video' && media.type !== 'animated_gif') {
      console.warn('Comiketter: [MediaExtractor] Media type is not video/gif:', media.type);
      return null;
    }

    const variants = media.video_info?.variants;
    if (!variants?.length) {
      console.warn('Comiketter: [MediaExtractor] No video variants found');
      return null;
    }

    console.log('Comiketter: [MediaExtractor] Total variants:', variants.length);

    // MP4形式のバリアントのみをフィルタリング
    const mp4Variants = variants.filter(
      variant => variant.content_type === 'video/mp4'
    );

    console.log('Comiketter: [MediaExtractor] MP4 variants:', mp4Variants.length);

    if (mp4Variants.length === 0) {
      // MP4形式が見つからない場合は、最初のバリアントを使用（フォールバック）
      console.warn('Comiketter: [MediaExtractor] No MP4 variants found, using first variant as fallback');
      return variants[0].url;
    }

    // 最高ビットレートのバリアントを選択
    // response-processing-rule.md: "...video_info.variants[].bitrate を取得し、その中で最も数値が大きいもののURLを ...video_info.variants[].url で取得"
    const bestVariant = mp4Variants.reduce((best, current) => {
      const bestBitrate = best.bitrate || 0;
      const currentBitrate = current.bitrate || 0;
      return currentBitrate > bestBitrate ? current : best;
    });

    console.log('Comiketter: [MediaExtractor] Selected best variant:', {
      bitrate: bestVariant.bitrate,
      url: bestVariant.url
    });

    return bestVariant.url;
  }

  /**
   * 指定されたbitrate以下の最適な動画URLを取得
   */
  getVideoUrlByBitrate(media: ProcessedMedia, maxBitrate: number): string | null {
    if (media.type !== 'video' && media.type !== 'animated_gif') {
      return null;
    }

    const variants = media.video_info?.variants;
    if (!variants?.length) {
      return null;
    }

    // 指定されたbitrate以下の最高画質のバリアントを探す
    const suitableVariant = variants.find(
      variant => variant.bitrate && variant.bitrate <= maxBitrate
    );

    return suitableVariant?.url || variants[0].url;
  }
} 