# Comiketter ベストプラクティスガイド

## 開発原則

### 1. 型安全性第一
- TypeScriptの型システムを最大限活用
- `any`型の使用は最小限に
- 適切な型ガードを実装
- ジェネリクスを活用して再利用性を向上

### 2. テスト駆動開発
- 新機能は必ずテストから始める
- テストカバレッジ80%以上を維持
- 統合テストと単体テストのバランスを取る
- モックを適切に使用

### 3. パフォーマンス意識
- 不要な再レンダリングを避ける
- メモ化を適切に使用
- バンドルサイズを監視
- 遅延読み込みを活用

### 4. セキュリティ優先
- ユーザー入力は必ず検証
- XSS対策を徹底
- 機密情報は適切に管理
- 最小権限の原則を適用

## アーキテクチャ設計

### 1. レイヤー分離
```
src/
├── types/          # 型定義層
├── utils/          # ユーティリティ層
├── stores/         # 状態管理層
├── hooks/          # ビジネスロジック層
├── components/     # UI層
└── pages/          # ページ層
```

### 2. 依存関係の方向
- 上位レイヤーは下位レイヤーに依存可能
- 下位レイヤーは上位レイヤーに依存禁止
- 循環依存は絶対に避ける

### 3. 関心の分離
- 単一責任の原則を守る
- 各モジュールは明確な役割を持つ
- 副作用は最小限に抑制

## コーディング規約

### 1. 命名規則
```typescript
// ファイル名: kebab-case
filename-generator.ts
api-interceptor.ts

// コンポーネント: PascalCase
FilenameSettings.tsx
CustomBookmark.tsx

// 型定義: PascalCase
interface FilenameSettingProps {}
type DownloadConfig = {}

// 定数: UPPER_SNAKE_CASE
const STORAGE_KEYS = {}
const DEFAULT_SETTINGS = {}

// 関数: camelCase
const generateFilename = () => {}
const handleDownload = () => {}
```

### 2. コメント規約
```typescript
/**
 * ファイル名生成ユーティリティ
 * TwitterMediaHarvestの機能を参考に実装
 */
export class FilenameGenerator {
  /**
   * ディレクトリ名の検証
   * @param directory 検証するディレクトリ名
   * @returns エラーメッセージまたはundefined
   */
  static validateDirectory(directory: string): string | undefined {
    // 実装
  }
}
```

### 3. エラーハンドリング
```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('操作に失敗しました:', error)
  throw new Error('ユーザーフレンドリーなエラーメッセージ')
}
```

## React ベストプラクティス

### 1. コンポーネント設計
```typescript
interface ComponentProps {
  // 必須プロパティ
  requiredProp: string
  // オプショナルプロパティ
  optionalProp?: number
  // イベントハンドラー
  onAction: (data: ActionData) => void
}

export const Component: React.FC<ComponentProps> = ({
  requiredProp,
  optionalProp,
  onAction,
}) => {
  // 実装
}
```

### 2. フック使用
```typescript
// カスタムフック
export const useCustomHook = (deps: string[]) => {
  const [state, setState] = useState<StateType>(initialState)
  
  useEffect(() => {
    // 副作用処理
  }, deps)
  
  return { state, setState }
}

// コンポーネントでの使用
const Component = () => {
  const { state, setState } = useCustomHook(['dependency'])
  // 実装
}
```

### 3. パフォーマンス最適化
```typescript
// メモ化
const MemoizedComponent = React.memo(Component)

// コールバック最適化
const handleClick = useCallback((id: string) => {
  // 処理
}, [dependency])

// 計算結果のメモ化
const expensiveValue = useMemo(() => {
  return heavyCalculation(data)
}, [data])
```

## テスト ベストプラクティス

### 1. テスト構造
```typescript
describe('機能名', () => {
  describe('正常系', () => {
    it('正常な入力で期待される結果を返す', () => {
      // テスト実装
    })
  })
  
  describe('異常系', () => {
    it('不正な入力でエラーを投げる', () => {
      // テスト実装
    })
  })
})
```

### 2. モック使用
```typescript
// 外部依存のモック
jest.mock('../utils/storage', () => ({
  StorageManager: {
    getSettings: jest.fn(),
    saveSettings: jest.fn(),
  }
}))

// テスト内でのモック
const mockGetSettings = StorageManager.getSettings as jest.Mock
mockGetSettings.mockResolvedValue(mockSettings)
```

### 3. テストデータ
```typescript
// テストデータの定義
const mockMediaFile: TweetMediaFileProps = {
  tweetId: '1145141919810',
  tweetUser: {
    screenName: 'testUser',
    userId: '123456789',
    displayName: 'Test User',
    isProtected: false,
  },
  createdAt: new Date('2024-01-15T10:30:00Z'),
  serial: 1,
  hash: 'abc123def456',
  source: 'https://example.com/image.jpg',
  type: 'image',
  ext: '.jpg',
}
```

## セキュリティ ベストプラクティス

### 1. 入力値検証
```typescript
// バリデーション関数
const validateUserInput = (input: string): boolean => {
  // 危険な文字を除去
  const sanitized = input.replace(/[<>:"/\\|?*]/g, '')
  return sanitized.length > 0 && sanitized.length <= 100
}

// 使用例
if (!validateUserInput(userInput)) {
  throw new Error('不正な入力です')
}
```

### 2. XSS対策
```typescript
// 危険なHTMLをエスケープ
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Reactでの使用
<div>{escapeHtml(userContent)}</div>
```

### 3. 機密情報管理
```typescript
// 環境変数の使用
const API_KEY = process.env.REACT_APP_API_KEY

// ローカルストレージでの機密情報保存は避ける
// 代わりにセッションストレージやメモリ内保存を検討
```

## パフォーマンス ベストプラクティス

### 1. バンドル最適化
```typescript
// 動的インポート
const LazyComponent = React.lazy(() => import('./LazyComponent'))

// 使用例
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>
```

### 2. メモリ管理
```typescript
// イベントリスナーの適切な管理
useEffect(() => {
  const handleResize = () => {
    // 処理
  }
  
  window.addEventListener('resize', handleResize)
  
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}, [])
```

### 3. レンダリング最適化
```typescript
// 不要な再レンダリングを防ぐ
const ExpensiveComponent = React.memo(({ data }: Props) => {
  return <div>{expensiveCalculation(data)}</div>
})

// 依存関係の最適化
const optimizedCallback = useCallback(() => {
  // 処理
}, [dependency1, dependency2]) // 必要最小限の依存関係
```

## デバッグ ベストプラクティス

### 1. ログ出力
```typescript
// 開発環境でのみログ出力
if (process.env.NODE_ENV === 'development') {
  console.log('デバッグ情報:', data)
}

// エラーログ
console.error('エラーが発生しました:', error)
```

### 2. 型ガード
```typescript
// 型ガード関数
const isTweetMediaFile = (obj: unknown): obj is TweetMediaFileProps => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'tweetId' in obj &&
    'tweetUser' in obj
  )
}

// 使用例
if (isTweetMediaFile(data)) {
  // dataはTweetMediaFileProps型として扱える
}
```

### 3. エラーバウンダリ
```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('エラーが発生しました:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <h1>エラーが発生しました。</h1>
    }

    return this.props.children
  }
}
```

## ドキュメント ベストプラクティス

### 1. README
- プロジェクト概要
- セットアップ手順
- 使用方法
- 貢献方法
- ライセンス情報

### 2. API仕様書
- エンドポイント一覧
- リクエスト/レスポンス形式
- エラーハンドリング
- 認証方法

### 3. コードコメント
- 複雑なロジックの説明
- 型定義の説明
- 使用例の記載
- 注意事項の明記

## 継続的改善

### 1. 定期的なレビュー
- コードレビューの実施
- パフォーマンス監視
- セキュリティ監査
- 依存関係の更新

### 2. メトリクス収集
- テストカバレッジ
- バンドルサイズ
- ビルド時間
- エラー率

### 3. フィードバックループ
- ユーザーフィードバックの収集
- 改善案の検討
- 実装とテスト
- 効果測定 