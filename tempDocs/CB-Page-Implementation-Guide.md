# CBページ実装ガイド - 段階的開発仕様書

## 概要
このドキュメントは、CB（カスタムブックマーク）ページの実装を段階的に進めるための詳細仕様書です。各工程とパーツごとに正しく動作するか判断できるよう、具体的な実装手順と期待される動作を定義しています。

---

## 1. 全体アーキテクチャ

### 1.1 ページ構成
```
┌─────────────────────────────────────────────────────────────┐
│                       ヘッダー（将来実装）                    │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│   CB一覧     │              タイムライン表示エリア              │
│  サイドバー   │                                               │
│             │  ┌─────────────────────────────────────────┐  │
│  ┌─────────┐ │  │          ツイート1                      │  │
│  │ CB1     │ │  │  ┌─────────┐ ┌─────────────────────┐   │  │
│  │ (選択中) │ │  │  │ アイコン │ │ ユーザー名 @ID 時刻   │   │  │
│  └─────────┘ │  │  └─────────┘ └─────────────────────┘   │  │
│  ┌─────────┐ │  │  ┌─────────────────────────────────────┐  │
│  │ CB2     │ │  │  │ ツイート本文（最大4行で省略）          │  │
│  └─────────┘ │  │  └─────────────────────────────────────┘  │
│  ┌─────────┐ │  │  ┌─────────────────────────────────────┐  │
│  │ CB3     │ │  │  │ 画像/動画（あれば）                   │  │
│  └─────────┘ │  │  └─────────────────────────────────────┘  │
│             │  │  ┌─────────────────────────────────────┐  │
│             │  │  │ RT数 ♥数 リプライ数                    │  │
│             │  │  └─────────────────────────────────────┘  │
│             │  └─────────────────────────────────────────┘  │
│             │                                               │
│             │  ┌─────────────────────────────────────────┐  │
│             │  │          ツイート2                      │  │
│             │  │  ...（同様の構造）...                    │  │
│             │  └─────────────────────────────────────────┘  │
│             │                                               │
│             │  ┌─────────────────────────────────────────┐  │
│             │  │          ツイート3                      │  │
│             │  │  ...（同様の構造）...                    │  │
│             │  └─────────────────────────────────────────┘  │
│             │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

### 1.2 データフロー
```
1. ページ初期化
   ↓
2. DBからCB一覧を取得 → cbStoreに保存
   ↓
3. ユーザーがCBを選択 → selectedCbId更新
   ↓
4. 選択されたCBのツイートID一覧を取得 → timelineStoreに保存
   ↓
5. 各ツイートIDに対してreact-tweetで表示
   ↓
6. react-tweet失敗時は自前フォールバック表示
```

---

## 2. 段階的実装手順

### Phase 1: 基盤準備（必須）
**目標**: 開発環境の準備と基本的なページ構造の作成

#### Step 1.1: 依存関係の追加
```bash
npm install react-tweet
```

#### Step 1.2: manifest.jsonのCSP設定
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://cdn.syndication.twimg.com; img-src 'self' https://pbs.twimg.com https://abs.twimg.com data:; media-src 'self' https://video.twimg.com blob:;"
  }
}
```

#### Step 1.3: 基本的なページ構造作成
- `src/bookmarks/index.tsx` - エントリーポイント
- `src/bookmarks/BookmarkApp.tsx` - メインアプリケーション
- `src/bookmarks/layout/BookmarkLayout.tsx` - レイアウト

**完了条件**: 
- ブラウザでページが表示される
- コンソールエラーがない
- 基本的なレイアウト（左サイドバー、右メインエリア）が表示される

### Phase 2: データ層の実装（必須）
**目標**: DBアクセスと状態管理の基盤を作成

#### Step 2.1: 型定義の作成
- `src/bookmarks/types/cb.ts` - CB関連の型定義
- `src/bookmarks/types/tweet.ts` - ツイート関連の型定義

#### Step 2.2: サービス層の実装
- `src/bookmarks/services/cbService.ts` - DBアクセスラッパー

#### Step 2.3: 状態管理の実装
- `src/bookmarks/state/cbStore.ts` - CB一覧と選択状態
- `src/bookmarks/state/timelineStore.ts` - タイムライン状態

**完了条件**:
- ダミーデータでCB一覧が取得できる
- 選択状態が正しく管理される
- ツイートID一覧が取得できる

### Phase 3: サイドバーの実装（必須）
**目標**: CB一覧の表示と選択機能

#### Step 3.1: サイドバーコンポーネント
- `src/bookmarks/sidebar/CbSidebar.tsx` - CB一覧表示
- `src/bookmarks/sidebar/CbSidebarItem.tsx` - 個別CBアイテム

**完了条件**:
- 左サイドバーにCB一覧が表示される
- CBをクリックすると選択状態が変わる
- 選択中のCBが視覚的に区別される

### Phase 4: タイムライン表示の実装（必須）
**目標**: 選択されたCBのツイート一覧表示

#### Step 4.1: タイムラインフック
- `src/bookmarks/hooks/useTimeline.ts` - タイムライン取得

#### Step 4.2: タイムライン表示
- `src/bookmarks/timeline/TimelineView.tsx` - タイムライン表示

**完了条件**:
- CB選択時にツイート一覧が表示される
- ローディング状態が表示される
- エラー状態が表示される
- 空状態が表示される

### Phase 5: ツイート表示の実装（必須）
**目標**: 個別ツイートの表示

#### Step 5.1: react-tweet統合
- `src/bookmarks/tweet/TweetEmbed.tsx` - react-tweet表示

#### Step 5.2: フォールバック表示
- `src/bookmarks/tweet/TweetEmbedFallback.tsx` - 自前ツイートカード
- `src/bookmarks/tweet/TweetHeader.tsx` - ツイートヘッダー
- `src/bookmarks/tweet/TweetStats.tsx` - ツイート統計
- `src/bookmarks/tweet/TweetMedia.tsx` - ツイートメディア

**完了条件**:
- react-tweetでツイートが表示される
- react-tweet失敗時にフォールバックが表示される
- テーマ（ライト/ダーク）が正しく適用される

### Phase 6: テーマ連携の実装（必須）
**目標**: Mantineテーマとreact-tweetの連携

#### Step 6.1: テーマ橋渡し
- `src/bookmarks/hooks/useThemeBridge.ts` - テーマ連携

**完了条件**:
- テーマ切替でreact-tweetの見た目が変わる
- フォールバック表示もテーマに合わせて変わる

### Phase 7: パフォーマンス最適化（任意）
**目標**: 大量データ対応

#### Step 7.1: 仮想リスト
- `src/bookmarks/timeline/TimelineVirtualList.tsx` - 仮想スクロール

**完了条件**:
- 100件以上のツイートでもスムーズにスクロールする

---

## 3. 各コンポーネントの詳細仕様

### 3.1 レイアウトコンポーネント

#### BookmarkLayout.tsx
```typescript
interface BookmarkLayoutProps {
  children?: React.ReactNode;
}

// 期待される動作:
// - 左側にサイドバー（固定幅240px）
// - 右側にメインエリア（残りの幅）
// - レスポンシブ対応（モバイル時はサイドバーを隠す）
// - 背景色がテーマに合わせて変わる
```

#### CbSidebar.tsx
```typescript
// 期待される動作:
// - cbStoreからCB一覧を取得して表示
// - 各CBアイテムをクリック可能にする
// - 選択中のCBを視覚的に強調表示
// - CB名、説明、ツイート数を表示
// - 新規作成ボタン（将来実装）
```

#### CbSidebarItem.tsx
```typescript
interface CbSidebarItemProps {
  cb: Cb;
  isSelected: boolean;
  onClick: (cbId: string) => void;
}

// 期待される動作:
// - CB名を表示
// - 説明文を表示（長い場合は省略）
// - ツイート数を表示
// - 選択状態に応じて背景色を変える
// - ホバー時の視覚的フィードバック
```

### 3.2 タイムラインコンポーネント

#### TimelineView.tsx
```typescript
// 期待される動作:
// - selectedCbIdがnullの場合は「CBを選択してください」を表示
// - ローディング中はスケルトン表示
// - エラー時はエラーメッセージとリトライボタンを表示
// - 空の場合は「このCBにはツイートがありません」を表示
// - 正常時はツイート一覧を縦に並べて表示
// - 各ツイート間に適切な余白を設ける
```

#### useTimeline.ts
```typescript
interface TimelineState {
  tweetIds: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// 期待される動作:
// - cbIdが変更されると自動的にツイートID一覧を取得
// - ローディング状態を管理
// - エラー状態を管理
// - リトライ機能を提供
```

### 3.3 ツイート表示コンポーネント

#### TweetEmbed.tsx
```typescript
interface TweetEmbedProps {
  id: string;
  theme?: 'light' | 'dark';
}

// 期待される動作:
// - react-tweetのTweetコンポーネントを使用
// - テーマに応じてdata-theme属性を設定
// - エラー時はTweetEmbedFallbackに切り替え
// - 外部リンクは新しいタブで開く
```

#### TweetEmbedFallback.tsx
```typescript
interface TweetEmbedFallbackProps {
  tweet: UITweet;
  theme?: 'light' | 'dark';
}

// 期待される動作:
// - TweetHeader、TweetStats、TweetMediaを組み合わせて表示
// - テーマに応じて色を調整
// - レスポンシブ対応
// - アクセシビリティ対応
```

#### TweetHeader.tsx
```typescript
interface TweetHeaderProps {
  author: TweetAuthor;
  createdAt: string;
  theme?: 'light' | 'dark';
}

// 期待される動作:
// - ユーザーアイコンを表示
// - ユーザー名を表示
// - @IDを表示
// - 投稿日時を表示
// - アイコンとテキストを横並びに配置
```

#### TweetStats.tsx
```typescript
interface TweetStatsProps {
  stats: TweetStats;
  theme?: 'light' | 'dark';
}

// 期待される動作:
// - RT数、いいね数、リプライ数を表示
// - 数値のフォーマット（1.2K形式）
// - アイコンと数値を横並びに配置
// - ホバー時の視覚的フィードバック
```

#### TweetMedia.tsx
```typescript
interface TweetMediaProps {
  media: TweetMediaItem[];
  theme?: 'light' | 'dark';
}

// 期待される動作:
// - 画像/動画のサムネイルを表示
// - 複数メディアの場合はグリッド表示
// - アスペクト比を保持
// - クリック時の拡大表示（将来実装）
```

### 3.4 状態管理

#### cbStore.ts
```typescript
interface CbStore {
  cbs: Cb[];
  selectedCbId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadCbs: () => Promise<void>;
  selectCb: (id: string) => void;
  clearSelection: () => void;
}

// 期待される動作:
// - CB一覧の取得と管理
// - 選択状態の管理
// - ローディング状態の管理
// - エラー状態の管理
```

#### timelineStore.ts
```typescript
interface TimelineStore {
  tweetIds: string[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadTimeline: (cbId: string) => Promise<void>;
  clearTimeline: () => void;
  retry: () => void;
}

// 期待される動作:
// - ツイートID一覧の取得と管理
// - ローディング状態の管理
// - エラー状態の管理
// - リトライ機能
```

### 3.5 サービス層

#### cbService.ts
```typescript
// 期待される動作:
// - bookmarkDBからのCB一覧取得
// - 特定CBのツイートID一覧取得
// - エラーハンドリング
// - キャッシュ機能（将来実装）
```

---

## 4. 型定義

### 4.1 CB関連
```typescript
interface Cb {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tweetCount: number;
}

interface CbGroup {
  id: string;
  name: string;
  cbs: Cb[];
}
```

### 4.2 ツイート関連
```typescript
interface UITweet {
  id: string;
  author: TweetAuthor;
  content: string;
  createdAt: string;
  stats: TweetStats;
  media: TweetMediaItem[];
}

interface TweetAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  verified: boolean;
}

interface TweetStats {
  retweetCount: number;
  likeCount: number;
  replyCount: number;
}

interface TweetMediaItem {
  id: string;
  type: 'image' | 'video' | 'gif';
  url: string;
  previewUrl: string;
  altText?: string;
}
```

---

## 5. テスト観点

### 5.1 機能テスト
- [ ] CB選択時にタイムラインが切り替わる
- [ ] ローディング状態が正しく表示される
- [ ] エラー状態が正しく表示される
- [ ] 空状態が正しく表示される
- [ ] テーマ切替が正しく動作する

### 5.2 UIテスト
- [ ] レスポンシブ対応が正しく動作する
- [ ] アクセシビリティが確保されている
- [ ] ホバー・フォーカス状態が正しく表示される
- [ ] スクロールがスムーズに動作する

### 5.3 パフォーマンステスト
- [ ] 100件のツイートで60fpsを維持
- [ ] メモリリークがない
- [ ] 不要な再レンダリングがない

---

## 6. 実装時の注意事項

### 6.1 セキュリティ
- CSP設定を正しく行う
- 外部リンクは新しいタブで開く
- ユーザー入力のサニタイズ

### 6.2 パフォーマンス
- メモ化を適切に使用する
- 不要な再レンダリングを避ける
- 大量データの場合は仮想リストを使用

### 6.3 アクセシビリティ
- キーボード操作に対応
- スクリーンリーダーに対応
- フォーカス管理を適切に行う

### 6.4 エラーハンドリング
- ネットワークエラーの適切な処理
- ユーザーフレンドリーなエラーメッセージ
- リトライ機能の提供

---

## 7. 完了チェックリスト

### Phase 1: 基盤準備
- [ ] react-tweetがインストールされている
- [ ] manifest.jsonのCSP設定が正しい
- [ ] 基本的なページ構造が表示される
- [ ] コンソールエラーがない

### Phase 2: データ層
- [ ] 型定義が作成されている
- [ ] サービス層が実装されている
- [ ] 状態管理が実装されている
- [ ] ダミーデータで動作確認できる

### Phase 3: サイドバー
- [ ] CB一覧が表示される
- [ ] CB選択が動作する
- [ ] 選択状態の視覚的フィードバックがある
- [ ] レスポンシブ対応している

### Phase 4: タイムライン
- [ ] CB選択時にタイムラインが表示される
- [ ] ローディング状態が表示される
- [ ] エラー状態が表示される
- [ ] 空状態が表示される

### Phase 5: ツイート表示
- [ ] react-tweetでツイートが表示される
- [ ] フォールバック表示が動作する
- [ ] テーマが正しく適用される
- [ ] 外部リンクが新しいタブで開く

### Phase 6: テーマ連携
- [ ] テーマ切替が動作する
- [ ] react-tweetの見た目が変わる
- [ ] フォールバック表示もテーマに合わせて変わる

### Phase 7: パフォーマンス（任意）
- [ ] 仮想リストが実装されている
- [ ] 大量データでもスムーズに動作する
- [ ] メモリリークがない

---

このドキュメントに従って段階的に実装を進めることで、正しく動作するCBページを作成できます。各Phaseの完了条件を満たしてから次のPhaseに進むことで、品質を保ちながら開発を進めることができます。
