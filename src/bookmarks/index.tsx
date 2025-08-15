import React from 'react';
import { createRoot } from 'react-dom/client';
import BookmarkApp from './BookmarkApp';

// DOM要素の取得
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

// React 18のcreateRootを使用
const root = createRoot(container);
root.render(<BookmarkApp />); 