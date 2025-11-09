import React from 'react';
import { MantineProvider } from '@mantine/core';
import { useCbStore } from '../state/cbStore';
import { mockCbs, mockCbTweetIds, extendedMockCbs, extendedMockCbTweetIds } from './mockData';
import { cbService } from '../services/cbService';

/**
 * CBストアのデコレーター
 */
export const withCbStore = (Story: React.ComponentType) => {
  // ストアを初期化
  React.useEffect(() => {
    useCbStore.getState().setCbs(mockCbs);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
    
    // cbServiceのlistCbsメソッドをモック
    const originalListCbs = cbService.listCbs.bind(cbService);
    cbService.listCbs = async () => {
      return mockCbs;
    };
    
    // cbServiceのgetTweetIdsByCbIdメソッドをモック
    const originalGetTweetIdsByCbId = cbService.getTweetIdsByCbId.bind(cbService);
    cbService.getTweetIdsByCbId = async (cbId: string) => {
      // mockCbTweetIdsに存在する場合はそれを使用、ない場合は空配列を返す
      return mockCbTweetIds[cbId] || [];
    };
    
    // クリーンアップ時に元のメソッドを復元
    return () => {
      cbService.listCbs = originalListCbs;
      cbService.getTweetIdsByCbId = originalGetTweetIdsByCbId;
    };
  }, []);

  return <Story />;
};

/**
 * 拡張CBストアのデコレーター（複数のCBとツイート群を含む）
 */
export const withExtendedCbStore = (Story: React.ComponentType) => {
  // ストアを初期化
  React.useEffect(() => {
    useCbStore.getState().setCbs(extendedMockCbs);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
    
    // 最初のCBを初期選択（FewTweetsの実装を参考に）
    if (extendedMockCbs.length > 0) {
      useCbStore.getState().selectCb(extendedMockCbs[0].id);
    }
    
    // cbServiceのlistCbsメソッドをモック
    const originalListCbs = cbService.listCbs.bind(cbService);
    cbService.listCbs = async () => {
      return extendedMockCbs;
    };
    
    // cbServiceのgetTweetIdsByCbIdメソッドをモック
    const originalGetTweetIdsByCbId = cbService.getTweetIdsByCbId.bind(cbService);
    cbService.getTweetIdsByCbId = async (cbId: string) => {
      // extendedMockCbTweetIdsに存在する場合はそれを使用、なければ通常のmockCbTweetIdsを確認、なければ空配列を返す
      return extendedMockCbTweetIds[cbId] || mockCbTweetIds[cbId] || [];
    };
    
    // クリーンアップ時に元のメソッドを復元
    return () => {
      cbService.listCbs = originalListCbs;
      cbService.getTweetIdsByCbId = originalGetTweetIdsByCbId;
    };
  }, []);

  return <Story />;
};

/**
 * Mantineプロバイダーのデコレーター
 */
export const withMantineProvider = (Story: React.ComponentType) => (
  <MantineProvider>
    <Story />
  </MantineProvider>
);

/**
 * フルスクリーンレイアウトのデコレーター
 */
export const withFullScreenLayout = (Story: React.ComponentType) => (
  <div style={{ width: '100vw', height: '100vh' }}>
    <Story />
  </div>
);

/**
 * サイドバーレイアウトのデコレーター
 */
export const withSidebarLayout = (Story: React.ComponentType) => (
  <div style={{ width: '320px', height: '600px', border: '1px solid #ccc' }}>
    <Story />
  </div>
);

/**
 * タイムラインレイアウトのデコレーター
 */
export const withTimelineLayout = (Story: React.ComponentType) => (
  <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
    <Story />
  </div>
);

/**
 * レスポンシブレイアウトのデコレーター
 */
export const withResponsiveLayout = (Story: React.ComponentType) => (
  <div style={{ 
    width: '100%', 
    maxWidth: '1200px', 
    height: '100vh',
    margin: '0 auto',
    border: '1px solid #ccc'
  }}>
    <Story />
  </div>
);
