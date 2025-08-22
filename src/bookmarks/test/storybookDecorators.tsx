import React from 'react';
import { MantineProvider } from '@mantine/core';
import { useCbStore } from '../state/cbStore';
import { mockCbs } from './mockData';

/**
 * CBストアのデコレーター
 */
export const withCbStore = (Story: React.ComponentType) => {
  // ストアを初期化
  React.useEffect(() => {
    useCbStore.getState().setCbs(mockCbs);
    useCbStore.getState().setLoading(false);
    useCbStore.getState().setError(null);
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
