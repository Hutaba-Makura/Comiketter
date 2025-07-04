# 🏗 Comiketter 実装環境設計書

## 📋 概要

ComiketterはChrome拡張機能（Manifest v3）として実装され、各機能は以下の3つの実行環境で動作します：

- **MAIN**: ページのJavaScriptと同じ実行環境（`"world": "MAIN"`）
- **ISOLATED**: 拡張機能専用の分離環境（`"world": "ISOLATED"`、デフォルト）
- **Service Worker**: バックグラウンド処理環境

## 🎯 各機能の実装環境

### 1. API傍受機能（`apiInterceptor.ts`）

#### 実装環境: **MAIN**
```json
{
  "content_scripts": [{
    "matches": ["https://twitter.com/*", "https://x.com/*"],
    "js": ["contentScript.js"],
    "world": "MAIN"
  }]
}
```

#### 理由
- `XMLHttpRequest.prototype.open`のオーバーライドが必要
- `window.fetch`のプロキシが必要
- `self.webpackChunk_twitter_responsive_web`へのアクセスが必要
- ページのJavaScriptと同じ環境で実行する必要がある

#### 制約事項
- **Chrome API使用不可**: `chrome.runtime.sendMessage`は利用できない
- **代替手段**: カスタムイベント（`document.dispatchEvent`）を使用
- **データ送信**: イベント経由でISOLATED環境のContentScriptに送信

#### 実装方針
```typescript
// MAIN環境での実装例
function captureResponse(this: XMLHttpRequest, _ev: ProgressEvent) {
  if (this.status === 200) {
    const event = new CustomEvent('comiketter:api-response', {
      detail: { path: url.pathname, body: this.responseText }
    });
    document.dispatchEvent(event); // ISOLATED環境に送信
  }
}
```

### 2. カスタムブックマーク機能（`customBookmarkManager.ts`）

#### 実装環境: **ISOLATED**
```json
{
  "content_scripts": [{
    "matches": ["https://twitter.com/*", "https://x.com/*"],
    "js": ["contentScript.js"],
    "world": "ISOLATED"
  }]
}
```

#### 理由
- DOM操作（ボタン追加、UI表示）が必要
- Chrome API（`chrome.storage`）へのアクセスが必要
- セキュリティ上の分離が必要

#### 実装方針
```typescript
// ISOLATED環境での実装例
class CustomBookmarkManager {
  async init(): Promise<void> {
    // DOM監視とボタン追加
    this.observeTweets();
    
    // MAIN環境からのイベント受信
    document.addEventListener('comiketter:api-response', (event) => {
      this.handleApiResponse(event.detail);
    });
  }
}
```

### 3. ダウンロード管理機能（`downloadManager.ts`）

#### 実装環境: **Service Worker**
```json
{
  "background": {
    "service_worker": "background.js"
  }
}
```

#### 理由
- `chrome.downloads` APIの使用が必要
- バックグラウンドでの継続的な処理が必要
- ファイルシステムへのアクセスが必要

#### 実装方針
```typescript
// Service Workerでの実装例
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_MEDIA') {
    this.downloadMedia(message.data);
  }
});
```

### 4. ポップアップUI（`popup/`）

#### 実装環境: **ISOLATED**
```json
{
  "action": {
    "default_popup": "popup.html"
  }
}
```

#### 理由
- React + MantineのUI表示
- Chrome APIへのアクセス
- ユーザーインタラクション処理

### 5. オプションページ（`options/`）

#### 実装環境: **ISOLATED**
```json
{
  "options_page": "options.html"
}
```

#### 理由
- 設定UIの表示
- IndexedDBへのアクセス
- 設定の永続化

## 🔄 環境間通信

### MAIN → ISOLATED
```typescript
// MAIN環境
document.dispatchEvent(new CustomEvent('comiketter:api-response', {
  detail: { path: '/graphql/...', body: '...' }
}));

// ISOLATED環境
document.addEventListener('comiketter:api-response', (event) => {
  // 処理
});
```

### ISOLATED → Service Worker
```typescript
// ISOLATED環境
chrome.runtime.sendMessage({
  type: 'DOWNLOAD_MEDIA',
  data: { url: '...', filename: '...' }
});

// Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_MEDIA') {
    // ダウンロード処理
  }
});
```

### Service Worker → ISOLATED
```typescript
// Service Worker
chrome.tabs.sendMessage(tabId, {
  type: 'DOWNLOAD_COMPLETED',
  data: { success: true }
});

// ISOLATED環境
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_COMPLETED') {
    // UI更新
  }
});
```

## 📁 ファイル構成

```
src/
├── contentScript/
│   ├── index.ts              # ISOLATED環境のエントリーポイント
│   ├── apiInterceptor.ts     # MAIN環境で実行（webpackChunk傍受）
│   ├── customBookmarkManager.ts # ISOLATED環境
│   └── tweetObserver.ts      # ISOLATED環境
├── background/
│   ├── index.ts              # Service Workerエントリーポイント
│   ├── downloadManager.ts    # Service Worker
│   └── messageHandler.ts     # Service Worker
├── popup/                    # ISOLATED環境
├── options/                  # ISOLATED環境
└── utils/                    # 共通ユーティリティ
```

## ⚠️ 重要な制約事項

### MAIN環境の制約
- `chrome.runtime.sendMessage`使用不可
- `chrome.storage`使用不可
- Chrome拡張機能のAPIにアクセス不可
- ページのJavaScriptと同じスコープで実行

### ISOLATED環境の制約
- ページのJavaScriptから分離
- DOM操作は可能
- Chrome API使用可能
- セキュリティ上の保護あり

### Service Workerの制約
- DOMアクセス不可
- ページコンテキストから分離
- バックグラウンドでの継続実行
- システムAPI（ダウンロード等）使用可能

## 🎯 実装優先順位

1. **API傍受機能**（MAIN環境）
   - webpackChunk傍受
   - XMLHttpRequest/fetch傍受
   - カスタムイベント発火

2. **イベント中継機能**（ISOLATED環境）
   - MAIN環境からのイベント受信
   - Service Workerへのメッセージ送信

3. **ダウンロード機能**（Service Worker）
   - メディアファイルのダウンロード
   - 履歴管理

4. **UI機能**（ISOLATED環境）
   - カスタムブックマークボタン
   - ポップアップ・オプションページ

この設計により、各機能が適切な環境で実行され、セキュリティとパフォーマンスの両方を確保できます。 