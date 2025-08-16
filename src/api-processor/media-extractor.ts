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
   */
  getBestVideoUrl(media: ProcessedMedia): string | null {
    if (media.type !== 'video' && media.type !== 'animated_gif') {
      return null;
    }

    const variants = media.video_info?.variants;
    if (!variants?.length) {
      return null;
    }

    // 最初のバリアント（最高画質）のURLを返す
    return variants[0].url;
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