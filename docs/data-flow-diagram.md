# 🔄 Comiketter データフロー図

## 概要
Comiketterの主要なデータフローを示す図です。API傍受からダウンロード、ブックマーク保存までの一連の流れを視覚化しています。

## メインデータフロー

```mermaid
flowchart TD
    %% 開始点
    A[ユーザーがX(Twitter)を閲覧] --> B[ContentScript注入]
    
    %% API傍受
    B --> C[API傍受開始]
    C --> D[XMLHttpRequest傍受]
    C --> E[fetch傍受]
    C --> F[webpackChunk傍受]
    
    D --> G[GraphQLレスポンス検出]
    E --> G
    F --> G
    
    %% レスポンス処理
    G --> H[レスポンス解析]
    H --> I{メディアファイルあり?}
    
    %% メディアファイル処理
    I -->|Yes| J[メディア情報抽出]
    I -->|No| K[通常のツイート処理]
    
    J --> L[ファイル名生成]
    L --> M[ダウンロード実行]
    M --> N[ダウンロード履歴保存]
    
    %% ブックマーク処理
    K --> O[カスタムブックマークボタン表示]
    O --> P[ユーザーがブックマーク選択]
    P --> Q[ブックマーク保存]
    Q --> R[ブックマーク履歴更新]
    
    %% 設定管理
    S[オプションページ] --> T[設定変更]
    T --> U[設定保存]
    U --> V[設定反映]
    
    %% データストレージ
    N --> W[IndexedDB: DownloadHistory]
    R --> X[IndexedDB: CustomBookmark]
    R --> Y[IndexedDB: BookmarkedTweet]
    U --> Z[IndexedDB: AppSettings]
    
    %% スタイル
    classDef apiNode fill:#e1f5fe
    classDef storageNode fill:#f3e5f5
    classDef processNode fill:#e8f5e8
    classDef userNode fill:#fff3e0
    
    class C,D,E,F,G,H apiNode
    class W,X,Y,Z storageNode
    class J,L,M,N,Q,R,T,U,V processNode
    class A,P,S userNode
```

## 詳細データフロー

### 1. API傍受フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant CS as ContentScript
    participant API as X API
    participant BG as Background
    participant DB as IndexedDB
    
    U->>CS: Xページ閲覧
    CS->>CS: API傍受開始
    CS->>API: GraphQLリクエスト
    API->>CS: レスポンス
    CS->>CS: レスポンス解析
    CS->>BG: メディア情報送信
    BG->>BG: ファイル名生成
    BG->>BG: ダウンロード実行
    BG->>DB: 履歴保存
```

### 2. ブックマーク保存フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant CS as ContentScript
    participant UI as ブックマークUI
    participant BG as Background
    participant DB as IndexedDB
    
    U->>CS: ブックマークボタンクリック
    CS->>UI: ブックマーク選択UI表示
    U->>UI: ブックマーク選択
    UI->>BG: ブックマーク保存要求
    BG->>DB: ブックマーク保存
    BG->>DB: ツイート情報保存
    DB->>BG: 保存完了
    BG->>UI: 保存完了通知
    UI->>U: 成功メッセージ表示
```

### 3. 設定管理フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant OP as オプションページ
    participant BG as Background
    participant DB as IndexedDB
    
    U->>OP: オプションページ開く
    OP->>DB: 現在設定取得
    DB->>OP: 設定データ
    OP->>U: 設定UI表示
    U->>OP: 設定変更
    OP->>DB: 設定保存
    DB->>OP: 保存完了
    OP->>BG: 設定更新通知
    BG->>BG: 設定反映
```

## データ変換フロー

### ツイートデータ変換

```mermaid
flowchart LR
    A[GraphQLレスポンス] --> B[レスポンス解析]
    B --> C{データタイプ判定}
    
    C -->|TweetDetail| D[ツイート詳細抽出]
    C -->|UserTweets| E[ユーザーツイート抽出]
    C -->|HomeTimeline| F[ホームタイムライン抽出]
    
    D --> G[メディア情報抽出]
    E --> G
    F --> G
    
    G --> H[TweetMediaFile生成]
    H --> I[ファイル名生成]
    I --> J[ダウンロード実行]
```

### ファイル名生成フロー

```mermaid
flowchart TD
    A[TweetMediaFile] --> B[パターントークン取得]
    B --> C[トークン置換処理]
    
    C --> D[アカウント名置換]
    C --> E[ツイートID置換]
    C --> F[シリアル番号置換]
    C --> G[日付置換]
    C --> H[ハッシュ値置換]
    
    D --> I[ファイル名結合]
    E --> I
    F --> I
    G --> I
    H --> I
    
    I --> J[ファイル名サニタイズ]
    J --> K[拡張子追加]
    K --> L[最終ファイル名]
```

## エラーハンドリングフロー

```mermaid
flowchart TD
    A[処理開始] --> B{API傍受成功?}
    B -->|No| C[エラーログ記録]
    B -->|Yes| D{メディア情報抽出成功?}
    
    D -->|No| E[スキップ処理]
    D -->|Yes| F{ファイル名生成成功?}
    
    F -->|No| G[デフォルトファイル名使用]
    F -->|Yes| H{ダウンロード実行成功?}
    
    H -->|No| I[ダウンロード失敗記録]
    H -->|Yes| J[成功処理]
    
    C --> K[エラー通知]
    E --> K
    G --> K
    I --> K
    
    K --> L[処理終了]
    J --> L
```

## パフォーマンス最適化フロー

### キャッシュ戦略

```mermaid
flowchart TD
    A[データ要求] --> B{キャッシュ存在?}
    B -->|Yes| C{キャッシュ有効?}
    B -->|No| D[新規データ取得]
    
    C -->|Yes| E[キャッシュから取得]
    C -->|No| F[キャッシュ更新]
    
    D --> G[データ処理]
    F --> G
    G --> H[キャッシュ保存]
    H --> I[データ返却]
    E --> I
```

### バッチ処理

```mermaid
flowchart TD
    A[複数ダウンロード要求] --> B[バッチ処理開始]
    B --> C[ダウンロードキュー作成]
    C --> D[並列ダウンロード実行]
    D --> E[進捗監視]
    E --> F{全完了?}
    F -->|No| E
    F -->|Yes| G[バッチ完了通知]
```

## セキュリティフロー

```mermaid
flowchart TD
    A[外部データ受信] --> B[データ検証]
    B --> C{検証成功?}
    C -->|No| D[データ拒否]
    C -->|Yes| E[サニタイズ処理]
    E --> F[安全なデータ保存]
    D --> G[エラーログ記録]
```

## 監視・ログフロー

```mermaid
flowchart TD
    A[処理実行] --> B[ログ記録開始]
    B --> C[処理タイミング記録]
    C --> D[処理実行]
    D --> E[結果記録]
    E --> F{エラー発生?}
    F -->|Yes| G[エラーログ詳細記録]
    F -->|No| H[成功ログ記録]
    G --> I[エラー通知]
    H --> I
    I --> J[ログ記録完了]
```

## データ永続化戦略

### ストレージ階層

```mermaid
flowchart TD
    A[データ] --> B{アクセス頻度}
    B -->|高頻度| C[メモリキャッシュ]
    B -->|中頻度| D[IndexedDB]
    B -->|低頻度| E[Chrome Storage]
    
    C --> F[高速アクセス]
    D --> G[永続化]
    E --> H[設定・メタデータ]
```

このデータフロー図により、Comiketterの複雑なデータ処理の流れが明確になり、開発時の理解と保守性が向上します。 