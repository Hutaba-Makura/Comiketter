# CB Bookmarks – react-tweet ファイル構成（プロト）

> 対象範囲：`src/bookmarks/` 配下のみ（拡張の popup / options 等は対象外）。まずは “それっぽい見た目を最速で出す” ことにフォーカス。`react-tweet` を 1 ツイート表示の最小単位として採用し、失敗時のフォールバック（自前 `TweetCard`）を後付け可能な土台にする。

---

## ディレクトリ構成（提案）

```txt
bookmarks/
├── index.tsx                 # 入口。BookmarkApp をマウント
├── BookmarkApp.tsx           # ページ組み立て（ストア初期化、レイアウト配置）
├── layout/
│   └── BookmarkLayout.tsx    # 左:サイドバー / 右:TL / 背景 の器
├── sidebar/
│   ├── CbSidebar.tsx         # CB一覧 + 新規作成（モーダル起動）
│   ├── CbSidebarItem.tsx     # CB 1行（選択状態/件数表示など）
│   └── CbGroupSection.tsx    # （任意）グループ折り畳み
├── timeline/
│   ├── TimelineView.tsx      # TL の器（並び替え/フィルタ/空表示/エラー）
│   └── TimelineVirtualList.tsx # （後で）仮想リスト。プロトでは未使用でも可
├── tweet/
│   ├── TweetEmbed.tsx        # ★ `react-tweet` による 1 ツイート描画
│   ├── TweetEmbedFallback.tsx# ★ 失敗時：自前カード（最小: ヘッダ+統計）
│   ├── TweetHeader.tsx       # Fallback 用のヘッダ（Icon/Name/@id/時刻）
│   ├── TweetStats.tsx        # Fallback 用の統計（RT/♥）
│   └── TweetMedia.tsx        # Fallback 用のメディア（簡易サムネ）
├── hooks/
│   ├── useTimeline.ts        # TL 取得/状態（selectedCbId→tweetIds）
│   └── useThemeBridge.ts     # Mantine の colorScheme → data-theme 橋渡し
├── state/
│   ├── cbStore.ts            # CB一覧/選択中CB（Zustand など想定）
│   └── timelineStore.ts      # 並び順/検索語など（必要になったら）
├── services/
│   ├── cbService.ts          # utils/bookmarkDB への薄ラッパ（一覧/ツイートID）
│   └── tweetService.ts       # （任意）生データ→UI用の整形（Fallback用）
├── types/
│   ├── cb.ts                 # CB/CbGroup 型
│   └── tweet.ts              # Fallback 用 UITweet 型（author/stats/media 等）
├── utils/
│   ├── format.ts             # 日付/数値/ID の表示整形（i18nは後回し）
│   └── constants.ts          # ページ固有の定数（並び順キー等）
└── modals/
    ├── CbCreateModal.tsx     # CB 作成（プロトでは後回し可）
    └── CbEditModal.tsx       # CB 編集（同上）
```

---

## 各ファイルの責務（要点）

### ルート

* **index.tsx**

  * `BookmarkApp` を DOM にマウント。
  * 将来ルーティング（`/bookmarks/:cbId`）を入れるならここで。
* **BookmarkApp.tsx**

  * ストア初期化、Mantine Provider、テーマ切替、`BookmarkLayout` を配置。

### レイアウト

* **layout/BookmarkLayout.tsx**

  * 左カラムに `CbSidebar`、右カラムに `TimelineView` を置く。
  * 背景は CSS もしくは独立レイヤ（必要なら `background/` を追加）。

### サイドバー

* **sidebar/CbSidebar.tsx**

  * `cbStore` から CB 一覧を取得し、`CbSidebarItem` を並べる。
  * 選択で `cbStore.selectCb(id)` を呼ぶ。
* **sidebar/CbSidebarItem.tsx**

  * 1 行の表示＋選択状態（右側 TL を切り替える）。
* **sidebar/CbGroupSection.tsx**（任意）

  * CB をグループ単位にまとめる場合のみ使用。

### タイムライン

* **timeline/TimelineView\.tsx**

  * `useTimeline(selectedCbId)` で **tweetIds** を取得。
  * `TweetEmbed` を ID ごとに並べる（プロトは `.map()` でOK）。
  * 空/ローディング/エラーの簡易表示。
* **timeline/TimelineVirtualList.tsx**（後で）

  * 件数増に応じて導入（`@tanstack/react-virtual` 等）。

### ツイート（表示単位）

* **tweet/TweetEmbed.tsx**

  * `react-tweet` の `<Tweet id="..." />` を中核に。
  * Mantine のテーマと同期したい場合は、親要素に `data-theme="light|dark"` を渡す（`useThemeBridge` 参照）。
* **tweet/TweetEmbedFallback.tsx**

  * `react-tweet` が読み込めない場合の代替表示。
  * `TweetHeader` / `TweetStats` / `TweetMedia` を組み合わせる最小カード。

### フック / ストア

* **hooks/useTimeline.ts**

  * 入力：`selectedCbId`（`cbStore`）
  * 出力：`tweetIds: string[]`, `loading`, `error`（まずは ID のみ）
  * 実装：`services/cbService.getTweetIds(cbId)` を呼ぶだけの薄層。
* **hooks/useThemeBridge.ts**

  * Mantine の `colorScheme` を `<div data-theme>` に渡すための小フック。
* **state/cbStore.ts**

  * `cbs: Cb[]`, `selectedCbId: string | null`, `selectCb(id)`
* **state/timelineStore.ts**（必要時）

  * 並び順、検索語、件数上限など。

### サービス / 型 / ユーティリティ

* **services/cbService.ts**

  * `utils/bookmarkDB.ts` の薄いラッパ：`listCbs`, `getTweetIdsByCbId` 等。
* **services/tweetService.ts**（任意）

  * フォールバック用に、生レスポンス → `UITweet` へ整形する関数。
* **types/**

  * `cb.ts`：`Cb` / `CbGroup`。
  * `tweet.ts`：`UITweet` / `TweetAuthor` / `TweetStats` / `TweetMediaItem`（Fallback用）。
* **utils/format.ts**

  * `formatCount(12345) => '12.3K'`、`formatDate(ISO)` 等。

---

## データフロー（最小）

```
CbSidebar (選択) → cbStore.selectedCbId → useTimeline(selectedCbId)
  → services.cbService.getTweetIdsByCbId(cbId) → TimelineView
    → [id1,id2,...].map(id => <TweetEmbed id={id}/>)
        ↳ react-tweet が失敗した場合のみ <TweetEmbedFallback tweet={...}/> （任意）
```

---

## 最小配線例（擬コード）

```tsx
// bookmarks/BookmarkApp.tsx
export default function BookmarkApp() {
  const theme = useMantineTheme();
  return (
    <MantineProvider>
      <BookmarkLayout>
        <CbSidebar />
        <TimelineView />
      </BookmarkLayout>
    </MantineProvider>
  );
}
```

```tsx
// bookmarks/timeline/TimelineView.tsx
export default function TimelineView() {
  const { selectedCbId } = useCbStore();
  const { tweetIds, loading, error } = useTimeline(selectedCbId);

  if (!selectedCbId) return <EmptyState message="CBを選択してください"/>;
  if (loading) return <Loader/>;
  if (error) return <ErrorState/>;

  return (
    <Stack>
      {tweetIds.map(id => <TweetEmbed key={id} id={id} />)}
    </Stack>
  );
}
```

---

## 導入メモ

* `react-tweet` の CSS Modules が使えるように Webpack 設定を確認。
* MV3 の CSP で外部リソース許可（`cdn.syndication.twimg.com` / `pbs.twimg.com` / `abs.twimg.com` / `video.twimg.com`）。
* プロト段階では **ID リストだけ**があれば描画可能（API レートや失敗時フォールバックは後で）。
