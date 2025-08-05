/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークページ初期化スクリプト
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { TimelinePage } from './TimelinePage';

// Mantineテーマ設定
const theme = {
  colorScheme: 'light' as const,
  primaryColor: 'blue',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  colors: {
    blue: [
      '#e3f2fd',
      '#bbdefb',
      '#90caf9',
      '#64b5f6',
      '#42a5f5',
      '#2196f3',
      '#1e88e5',
      '#1976d2',
      '#1565c0',
      '#0d47a1',
    ] as const,
  },
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
      },
    },
  },
};

// ページの初期化
const initializeTimelinePage = async (): Promise<void> => {
  const container = document.getElementById('root');
  if (!container) {
    console.error('Comiketter: Root container not found');
    return;
  }

  try {
    // Reactコンポーネントをレンダリング
    const root = createRoot(container);
    root.render(
      React.createElement(MantineProvider, { theme },
        React.createElement(TimelinePage)
      )
    );
    
    console.log('Comiketter: Timeline page initialized successfully');
  } catch (error) {
    console.error('Comiketter: Failed to initialize timeline page:', error);
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #657786;">読み込みに失敗しました</div>';
  }
};

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTimelinePage);
} else {
  initializeTimelinePage();
} 