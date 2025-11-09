import React from 'react';
import { useCbStore } from '../state/cbStore';
import { useTimeline } from '../hooks/useTimeline';
import { StorybookTimelineView } from '../../stories/components/StorybookTimelineView';

/**
 * Storybook用のTimelineViewラッパーコンポーネント
 * ストアからデータを取得してStorybookTimelineViewに渡す
 */
export function StorybookTimelineViewWrapper() {
  const { selectedCbId, selectedCb } = useCbStore();
  const { tweetIds, loading, error } = useTimeline(selectedCbId);

  return (
    <StorybookTimelineView
      selectedCbId={selectedCbId}
      selectedCb={selectedCb}
      tweetIds={tweetIds}
      loading={loading}
      error={error}
    />
  );
}

