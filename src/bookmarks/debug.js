// デバッグ用：拡張機能のコンテキストで実行されているか確認
console.log('Bookmarks page loaded');
console.log('Extension context:', typeof chrome !== 'undefined' && chrome.runtime);
console.log('Current URL:', window.location.href);
