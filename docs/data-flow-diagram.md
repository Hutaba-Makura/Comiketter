# 📊 Comiketter データフロー図

## 🔄 全体データフロー概要

```mermaid
graph TB
    A[Xページ] --> B[ContentScript]
    B --> C[API傍受]
    B --> D[ツイート監視]
    B --> E[サイドバーボタン]
    
    C --> F[ツイート情報抽出]
    D --> G[ボタン追加]
    E --> H[ブックマークページ]
    
    F --> I[Background]
    G --> J[CB選択UI]
    H --> K[ブックマーク管理]
    
    I --> L[ダウンロード管理]
    J --> M[IndexedDB]
    K --> M
    
    L --> N[ファイル保存]
    M --> O[データ永続化]
    
    style A fill:#1DA1F2
    style B fill:#FF6B6B
    style I fill:#4ECDC4
    style M fill:#45B7D1
```

## 🎯 主要機能別データフロー

### 1. API傍受・ツイート監視フロー

```mermaid
sequenceDiagram
    participant X as Xページ
    participant CS as ContentScript
    participant API as API傍受
    participant TO as ツイート監視
    participant BG as Background
    participant DB as IndexedDB

    X->>CS: ページ読み込み
    CS->>API: 初期化
    CS->>TO: 初期化
    
    loop 動的コンテンツ監視
        X->>TO: DOM変更検知
        TO->>TO: ツイート要素検出
        TO->>TO: ボタン追加判定
        TO->>TO: CB/DLボタン作成
    end
    
    loop API通信傍受
        X->>API: GraphQL通信
        API->>BG: ツイート情報送信
        BG->>DB: データ保存
    end
```

### 2. カスタムブックマーク（CB）フロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant CS as ContentScript
    participant CB as CBボタン
    participant UI as CB選択UI
    participant BG as Background
    participant DB as IndexedDB

    User->>CB: CBボタンクリック
    CB->>UI: 選択UI表示
    UI->>UI: テーマ検出
    UI->>UI: ブックマーク一覧表示
    
    User->>UI: ブックマーク選択
    UI->>BG: 保存要求
    BG->>DB: データ保存
    BG->>UI: 保存完了通知
    UI->>UI: UI更新
```

### 3. ダウンロードフロー

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant CS as ContentScript
    participant DL as DLボタン
    participant BG as Background
    participant DM as ダウンロード管理
    participant FS as ファイルシステム

    User->>DL: DLボタンクリック
    DL->>BG: ダウンロード要求
    BG->>DM: ダウンロード処理開始
    DM->>DM: ファイル名生成
    DM->>FS: ファイル保存
    DM->>BG: 保存完了通知
    BG->>DL: 状態更新
    DL->>User: 完了表示
```

### 4. サイドバーボタンフロー

```mermaid
sequenceDiagram
    participant X as Xページ
    participant SB as サイドバーボタン
    participant BG as Background
    participant BP as ブックマークページ

    X->>SB: ページ読み込み
    SB->>SB: ナビゲーション要素検索
    SB->>SB: ボタン挿入
    
    User->>SB: ボタンクリック
    SB->>BG: ページ開要求
    BG->>BP: ブックマークページ表示
```

## 🗄️ データストレージ構造

### IndexedDB スキーマ

```mermaid
erDiagram
    BOOKMARKS {
        string id PK
        string name
        string description
        date created_at
        date updated_at
    }
    
    BOOKMARKED_TWEETS {
        string id PK
        string bookmark_id FK
        string tweet_id
        string author_username
        string content
        array media_urls
        date tweet_date
        date saved_at
    }
    
    DOWNLOAD_HISTORY {
        string id PK
        string tweet_id
        string filename
        string filepath
        string download_method
        date downloaded_at
        string status
    }
    
    SETTINGS {
        string key PK
        string value
        date updated_at
    }
    
    BOOKMARKS ||--o{ BOOKMARKED_TWEETS : contains
```

## 🔧 コンポーネント間通信

### メッセージング構造

```mermaid
graph LR
    A[ContentScript] -->|LOG| B[Background]
    A -->|DOWNLOAD_TWEET_MEDIA| B
    A -->|SAVE_BOOKMARK| B
    A -->|GET_BOOKMARKS| B
    A -->|OPEN_BOOKMARK_PAGE| B
    
    B -->|DOWNLOAD_COMPLETE| A
    B -->|BOOKMARK_SAVED| A
    B -->|BOOKMARKS_DATA| A
```

### イベントフロー

```mermaid
graph TD
    A[DOM変更] --> B[MutationObserver]
    B --> C[ツイート検出]
    C --> D[ボタン追加]
    
    E[API通信] --> F[レスポンス傍受]
    F --> G[ツイート情報抽出]
    G --> H[データ保存]
    
    I[ユーザー操作] --> J[イベントハンドラー]
    J --> K[メッセージ送信]
    K --> L[Background処理]
    L --> M[結果通知]
```

## 🎨 UI状態管理

### テーマ検出フロー

```mermaid
graph LR
    A[Xページ] --> B[テーマ検出]
    B --> C{テーマ判定}
    C -->|ライト| D[ライトテーマ適用]
    C -->|ダーク| E[ダークテーマ適用]
    C -->|ブラック| F[ブラックテーマ適用]
    
    D --> G[UI更新]
    E --> G
    F --> G
```

### ボタン状態管理

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : クリック
    Loading --> Success : 処理完了
    Loading --> Error : エラー発生
    Success --> Idle : 3秒後
    Error --> Idle : 3秒後
```

## 📊 パフォーマンス最適化

### バッチ処理フロー

```mermaid
graph TD
    A[DOM変更] --> B[デバウンス処理]
    B --> C[100ms待機]
    C --> D[バッチ処理]
    D --> E[重複チェック]
    E --> F[処理実行]
```

### メモリ管理

```mermaid
graph LR
    A[WeakSet] --> B[処理済み要素管理]
    C[setInterval] --> D[定期的なクリーンアップ]
    E[disconnect] --> F[Observer停止]
```

## 🔍 エラーハンドリング

### エラー処理フロー

```mermaid
graph TD
    A[処理開始] --> B{エラーチェック}
    B -->|エラーなし| C[正常処理]
    B -->|エラー発生| D[エラーログ]
    D --> E[フォールバック処理]
    E --> F[ユーザー通知]
    C --> G[完了]
    F --> G
```

## 📈 監視・ログ

### ログフロー

```mermaid
graph LR
    A[ContentScript] -->|LOG| B[Background]
    B --> C[コンソール出力]
    B --> D[ログ保存]
    D --> E[デバッグ情報]
```

このデータフロー図は、Comiketterの現在の実装状況を反映しており、各コンポーネント間の相互作用とデータの流れを示しています。 