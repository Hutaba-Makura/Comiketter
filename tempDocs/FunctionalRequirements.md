# CB Bookmarks – react-tweet 要件定義（プロト）

> 目的：**“Twitter っぽい見た目”を最速で得る**ため、`react-tweet` を用いて CB（カスタムブックマーク）に紐づくツイート ID 群をタイムライン風に表示する。まずは **閲覧（Read-only）** に特化し、編集系は後回し。

---

## 1. スコープ

* 対象ページ：`src/bookmarks/` のブックマークページ。
* 表示対象：選択中 CB に属するツイート（ID ベース）。
* 非対象（今回のプロト）：

  * ツイート作成/RT/♥ 等のアクション、ドラフト、下書き
  * 詳細モーダル、スレッド展開、検索・高度なフィルタ
  * 無限スクロール/仮想リストの最適化（件数次第で次フェーズ）

---

## 2. 前提・依存

* 技術スタック：React + Mantine。
* 組み込みライブラリ：`react-tweet`（iframe/外部JS不要）。
* 拡張（MV3）の CSP を満たすこと：

  * `connect-src`: `https://cdn.syndication.twimg.com`
  * `img-src`: `https://pbs.twimg.com`, `https://abs.twimg.com`, `data:`
  * `media-src`: `https://video.twimg.com`, `blob:`
* データソース：既存 `utils/bookmarkDB.ts`（想定）

  * `getTweetIdsByCbId(cbId): Promise<string[]>` を利用（なければ追加）。

---

## 3. 機能要件（Functional Requirements）

### FR-1: CB 選択

* **説明**：サイドバーで CB を選ぶと、その CB の TL が表示される。
* **入出力**：`cbStore.selectedCbId` を更新。
* **完了条件**：選択変更から 1 秒以内に TL が切り替わる。

### FR-2: TL 表示（react-tweet）

* **説明**：選択中 CB が持つ `tweetIds: string[]` を `react-tweet` の `<Tweet id="..."/>` として縦並び表示する。
* **表示順**：デフォルトは保存日時の降順（新→旧）。
* **件数の上限**：プロトでは **最大 100 件**（設定化は次フェーズ）。

### FR-3: ローディング/空/エラー

* **説明**：

  * 取得中：スケルトン行（3〜5行）。
  * 0 件："このCBにはツイートがありません"。
  * エラー："TLを読み込めませんでした"（リトライボタン）。

### FR-4: ダーク/ライトテーマ連動

* **説明**：Mantine の `colorScheme` に応じて、`react-tweet` 親要素へ `data-theme="light|dark"` を付与。
* **完了条件**：テーマ切替で即時反映。

### FR-5: 外部リンクの動作

* **説明**：埋め込み内リンクは全て **新しいタブ** で開く。
* **完了条件**：現在の拡張ページから離脱しない。

### FR-6: Fallback（任意/次フェーズで良い）

* **説明**：`react-tweet` の取得失敗（404, CORS, CSP ブロック 等）時に、自前カード `TweetEmbedFallback` を表示。
* **最小表示項目**：

  * アイコン / 名前 / @id / 投稿日時
  * RT 数 / ♥ 数
  * 本文（最大 4 行）
  * 画像1枚（あればサムネ）

---

## 4. 非機能要件（Non-Functional Requirements）

### NFR-1: パフォーマンス

* 100 件表示でスクロール 60fps を目標。
* 100 件超でカクつく場合は **仮想リストに切り替え**（次フェーズ）。

### NFR-2: アクセシビリティ

* キーボード操作：サイドバー上下選択、Enter で決定。
* フォーカスリングの可視化（Mantine 既定で可）。

### NFR-3: 安定性

* 失敗時のユーザ可視なメッセージ。
* 取得リトライ（指数バックオフ 3 回）。

### NFR-4: ロギング

* デバッグログは `utils/logger.ts` に集約。リリースビルドでは抑制。

---

## 5. 画面・UI 要件（最小）

### TL 行間/余白（推奨値）

* 1 カード縦パディング 12px / 横 16px。
* 行間 1.4、本文は最大 4 行で省略。

### サイドバー幅（推奨値）

* 240px（モバイル幅では隠してアイコン化）。

---

## 6. データ・インタフェース

### 6.1 `cbStore`（Zustand 例）

```ts
// state/cbStore.ts（概略）
export interface CbStore {
  cbs: Cb[];
  selectedCbId: string | null;
  selectCb: (id: string) => void;
  loadCbs: () => Promise<void>;
}
```

### 6.2 `useTimeline`（最小）

```ts
// hooks/useTimeline.ts（概略）
export function useTimeline(cbId: string | null) {
  // returns { tweetIds, loading, error, refetch }
}
```

### 6.3 `cbService`（最小）

```ts
// services/cbService.ts（概略）
export async function getTweetIdsByCbId(cbId: string): Promise<string[]>;
```

---

## 7. 実装ステップ（パーツ別・順次）

> 各パーツを順に積み上げる。各ステップは「完了条件」を満たしたら次へ進む。

**Step 0: 基盤準備**

* `yarn add react-tweet`
* `manifest.json` の `content_security_policy.extension_pages` を調整（`connect/img/media`）。
* 完了条件：開発ビルドで拡張ページが起動し、`react-tweet` の型が解決される。

**Step 1: データ層（services / types）**

* `services/cbService.ts` に `getTweetIdsByCbId(cbId): Promise<string[]>` を用意。
* `types/cb.ts` を作成（`Cb` 型）。
* 完了条件：任意の `cbId` で ID 配列（ダミー可）が返る。

**Step 2: 状態層（state）**

* `state/cbStore.ts`：`cbs`, `selectedCbId`, `selectCb`, `loadCbs` を実装。
* 完了条件：`loadCbs()` でサイドバー表示用の CB 一覧（ダミー可）が得られる。

**Step 3: サイドバー（sidebar）**

* `CbSidebar.tsx` / `CbSidebarItem.tsx` を作成し、`cbStore` の `cbs` を列挙。
* クリックで `selectCb(id)` を発火。
* 完了条件：CB クリックで `selectedCbId` が更新される。

**Step 4: タイムラインの取得フック（hooks）**

* `useTimeline.ts`：`cbId` を受け取り `tweetIds, loading, error, refetch` を返す。
* 内部で `cbService.getTweetIdsByCbId(cbId)` を呼ぶ。
* 完了条件：`selectedCbId` 変更で `tweetIds` が更新される。

**Step 5: タイムラインの器（timeline）**

* `TimelineView.tsx`：`tweetIds.map(id => <TweetEmbed id={id}/>)` で縦並び。
* 取得中はスケルトン、0 件は空表示、エラーは再試行ボタン。
* 完了条件：ダミー/実データで TL が視覚的に切り替わる。

**Step 6: ツイート表示（tweet）**

* `TweetEmbed.tsx`：`<Tweet id={id} />` を返す最小実装。
* `useThemeBridge`（任意）で Mantine の `colorScheme` → `data-theme` を受け渡し。
* 外部リンクは新規タブで開く設定を確認。
* 完了条件：1 件のツイートが期待どおり描画される（ライト/ダークも反映）。

**Step 7: レイアウト統合（layout / app）**

* `BookmarkLayout.tsx` にサイドバー + TL を配置。
* `BookmarkApp.tsx` で Provider・テーマを適用し、`BookmarkLayout` を描画。
* 完了条件：ページ遷移なしで CB 切替〜TL 更新が一連で動作。

**Step 8: 失敗時フォールバック（任意）**

* `TweetEmbedFallback.tsx`（`TweetHeader`/`TweetStats`/`TweetMedia`）を用意。
* `TweetEmbed` 内で失敗時に Fallback を表示。
* 完了条件：`react-tweet` が取得失敗でも最低限のカードが表示。

**Step 9: パフォーマンス上限（暫定）**

* 表示上限を 100 件に固定。
* 件数増でスクロールが重い場合は `TimelineVirtualList.tsx` を導入（次フェーズ）。
* 完了条件：100 件で実用的なスクロール性能を維持。

**Step 10: 最小テスト**

* CB 切替、エラー時のリトライ、テーマ切替を手動/ユニットで確認。
* 完了条件：主要フローの回帰が取れる。

---

## 8. テスト観点（軽量）

* CB 選択 → TL が切り替わること。
* 不正 ID を含む場合、エラー表示されること。
* テーマ切替で `react-tweet` の配色が変わること。

---

## 9. 既知の制約 / 留意事項

* `react-tweet` は Twitter の syndication API に依存。大量連続取得時はレート/ブロックの可能性あり（必要ならキャッシュ層を別途検討）。
* MV3 の CSP に違反するとリソースが読み込めないため、`manifest.json` の設定が必須。
* 埋め込み内のリンクは新規タブで開く想定（離脱防止）。

---

## 付録：最小コード例

```tsx
// tweet/TweetEmbed.tsx
import { memo } from 'react';
import { Tweet } from 'react-tweet';

export const TweetEmbed = memo(function TweetEmbed({ id }: { id: string }) {
  return (
    <div data-theme={/* 'light' or 'dark' を親から受け取る */ undefined}>
      <Tweet id={id} />
    </div>
  );
});
```
