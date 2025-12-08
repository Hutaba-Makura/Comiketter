/**
 * manifest.jsonのversionをpackage.jsonに同期するスクリプト
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
const packagePath = path.join(__dirname, '..', 'package.json');

try {
  // manifest.jsonからversionを読み込む
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version;

  if (!version) {
    console.error('Error: manifest.jsonにversionが見つかりません');
    process.exit(1);
  }

  // package.jsonを読み込む
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  // versionを更新
  packageJson.version = version;

  // package.jsonを書き込む
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

  console.log(`✅ package.jsonのversionを${version}に更新しました`);
} catch (error) {
  console.error('Error: バージョンの同期に失敗しました', error);
  process.exit(1);
}
