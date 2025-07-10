/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Comiketter: ブックマークページ初期化スクリプト
 */

// ページの初期化
const initializeBookmarkPage = () => {
  const container = document.getElementById('root');
  if (!container) {
    console.error('Root container not found');
    return;
  }

  // Reactコンポーネントを動的に読み込んでレンダリング
  import('./BookmarkPage.tsx').then(({ BookmarkPage }) => {
    import('react').then((React) => {
      import('react-dom/client').then(({ createRoot }) => {
        import('@mantine/core').then(({ MantineProvider }) => {
          const root = createRoot(container);
          root.render(
            React.createElement(MantineProvider, null,
              React.createElement(BookmarkPage)
            )
          );
        });
      });
    });
  }).catch(error => {
    console.error('Failed to load bookmark page:', error);
    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #657786;">読み込みに失敗しました</div>';
  });
};

// DOM読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBookmarkPage);
} else {
  initializeBookmarkPage();
} 