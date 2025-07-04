# コードレビュープロンプトテンプレート

## コードレビュー基本方針

### 1. レビュー観点
- **機能性**: 要件を満たしているか
- **型安全性**: TypeScriptの型が適切か
- **パフォーマンス**: 効率的な実装か
- **セキュリティ**: セキュリティリスクがないか
- **保守性**: 将来の変更に対応しやすいか
- **テスト**: 適切なテストが含まれているか

### 2. レビュー指針
- 建設的なフィードバックを提供
- 具体的な改善案を提示
- 日本語で分かりやすく説明
- コードの良い点も指摘

## レビュープロンプトテンプレート

### 1. 新機能レビュー
```
Comiketterプロジェクトの新機能コードをレビューしてください。

対象ファイル：
[ファイルパスを記述]

レビュー観点：
- 型安全性
- パフォーマンス
- セキュリティ
- 保守性
- テストカバレッジ
- コーディング規約準拠

レビュー結果を日本語で報告し、改善案を提示してください。
```

### 2. バグ修正レビュー
```
Comiketterプロジェクトのバグ修正コードをレビューしてください。

対象ファイル：
[ファイルパスを記述]

修正内容：
[修正内容を記述]

レビュー観点：
- 修正が適切か
- 副作用がないか
- テストが十分か
- 他の箇所への影響

レビュー結果を日本語で報告し、改善案を提示してください。
```

### 3. リファクタリングレビュー
```
Comiketterプロジェクトのリファクタリングコードをレビューしてください。

対象ファイル：
[ファイルパスを記述]

リファクタリング内容：
[リファクタリング内容を記述]

レビュー観点：
- 機能が維持されているか
- 可読性が向上しているか
- パフォーマンスが改善されているか
- 型安全性が維持されているか

レビュー結果を日本語で報告し、改善案を提示してください。
```

### 4. アーキテクチャレビュー
```
Comiketterプロジェクトのアーキテクチャ変更をレビューしてください。

変更対象：
[変更対象を記述]

変更内容：
[変更内容を記述]

レビュー観点：
- 設計の妥当性
- 拡張性
- 保守性
- パフォーマンスへの影響
- セキュリティへの影響

レビュー結果を日本語で報告し、改善案を提示してください。
```

## 特定観点レビュー

### 1. 型安全性レビュー
```
Comiketterプロジェクトの型安全性をレビューしてください。

対象ファイル：
[ファイルパスを記述]

レビュー観点：
- 型注釈の適切性
- ジェネリクスの使用
- 型ガードの実装
- エラーハンドリングの型安全性

レビュー結果を日本語で報告し、改善案を提示してください。
```

### 2. パフォーマンスレビュー
```
Comiketterプロジェクトのパフォーマンスをレビューしてください。

対象ファイル：
[ファイルパスを記述]

レビュー観点：
- アルゴリズムの効率性
- メモリ使用量
- レンダリング最適化
- ネットワークリクエスト
- バンドルサイズ

レビュー結果を日本語で報告し、改善案を提示してください。
```

### 3. セキュリティレビュー
```
Comiketterプロジェクトのセキュリティをレビューしてください。

対象ファイル：
[ファイルパスを記述]

レビュー観点：
- XSS対策
- CSRF対策
- 入力値検証
- 認証・認可
- データ暗号化
- 機密情報の取り扱い

レビュー結果を日本語で報告し、改善案を提示してください。
```

### 4. テストレビュー
```
Comiketterプロジェクトのテストコードをレビューしてください。

対象ファイル：
[ファイルパスを記述]

レビュー観点：
- テストカバレッジ
- テストケースの網羅性
- モックの適切性
- テストの可読性
- エッジケースのテスト

レビュー結果を日本語で報告し、改善案を提示してください。
```

## レビュー結果テンプレート

### 1. 良い点
```
✅ 良い点：
- [具体的な良い点を記述]
- [具体的な良い点を記述]
- [具体的な良い点を記述]
```

### 2. 改善点
```
⚠️ 改善点：
- [具体的な改善点を記述]
- [具体的な改善点を記述]
- [具体的な改善点を記述]
```

### 3. セキュリティリスク
```
🚨 セキュリティリスク：
- [具体的なリスクを記述]
- [具体的なリスクを記述]
- [具体的なリスクを記述]
```

### 4. パフォーマンス問題
```
🐌 パフォーマンス問題：
- [具体的な問題を記述]
- [具体的な問題を記述]
- [具体的な問題を記述]
```

### 5. 推奨改善案
```
💡 推奨改善案：
1. [具体的な改善案を記述]
2. [具体的な改善案を記述]
3. [具体的な改善案を記述]
```

## レビュー後のフォローアップ

### 1. 改善確認
```
前回のレビューで指摘した改善点が修正されているか確認してください。

対象ファイル：
[ファイルパスを記述]

前回の指摘事項：
[前回の指摘事項を記述]

確認結果を日本語で報告してください。
```

### 2. 最終レビュー
```
最終レビューを実施してください。

対象ファイル：
[ファイルパスを記述]

レビュー観点：
- 全ての指摘事項が修正されているか
- 新たな問題がないか
- コードの品質が向上しているか

レビュー結果を日本語で報告してください。
```

## レビュー品質向上のためのチェックリスト

### 1. レビュー前チェック
- [ ] コードの全体像を把握
- [ ] 関連するファイルも確認
- [ ] テストコードも含めてレビュー
- [ ] ドキュメントの更新も確認

### 2. レビュー中チェック
- [ ] 建設的なフィードバックを提供
- [ ] 具体的な改善案を提示
- [ ] 良い点も指摘
- [ ] 日本語で分かりやすく説明

### 3. レビュー後チェック
- [ ] 指摘事項の優先度を明確化
- [ ] 修正期限を設定
- [ ] フォローアップを計画
- [ ] レビュー結果を記録 