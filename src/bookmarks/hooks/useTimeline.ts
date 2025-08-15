import { useState, useEffect } from 'react';
import { cbService } from '../services/cbService';

/**
 * タイムライン取得用のフック
 */
export function useTimeline(selectedCbId: string | null) {
  const [tweetIds, setTweetIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // CBが選択されていない場合は何もしない
    if (!selectedCbId) {
      setTweetIds([]);
      setError(null);
      return;
    }

    const fetchTweetIds = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const ids = await cbService.getTweetIdsByCbId(selectedCbId);
        setTweetIds(ids);
      } catch (err) {
        console.error('ツイートID取得エラー:', err);
        setError(err instanceof Error ? err.message : 'ツイートの取得に失敗しました');
        setTweetIds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTweetIds();
  }, [selectedCbId]);

  return {
    tweetIds,
    loading,
    error
  };
}
