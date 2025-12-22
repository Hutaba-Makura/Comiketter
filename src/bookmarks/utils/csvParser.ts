/**
 * CSVパーサーユーティリティ
 * CSVのパースとエンコードを担当
 */

/**
 * CSV行データ
 */
export interface CsvRow {
  [key: string]: string;
}

/**
 * CSVフィールドをエスケープ
 * @param field エスケープするフィールド
 * @returns エスケープされたフィールド
 */
export function escapeCsvField(field: string | number | boolean | undefined | null): string {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);

  // 空文字列の場合はそのまま返す
  if (str === '') {
    return '';
  }

  // カンマ、改行、ダブルクォートが含まれる場合はダブルクォートで囲む
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    // 既存のダブルクォートをエスケープ（""に変換）
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * CSVフィールドのエスケープを解除
 * @param field エスケープ解除するフィールド
 * @returns エスケープ解除されたフィールド
 */
export function unescapeCsvField(field: string): string {
  if (!field) {
    return '';
  }

  // ダブルクォートで囲まれている場合
  if (field.startsWith('"') && field.endsWith('"')) {
    // 先頭と末尾のダブルクォートを削除
    const unquoted = field.slice(1, -1);
    // エスケープされたダブルクォート（""）を通常のダブルクォート（"）に戻す
    return unquoted.replace(/""/g, '"');
  }

  return field;
}

/**
 * CSV行をパース
 * @param line CSV行
 * @param headers ヘッダー行
 * @returns パースされた行データ
 */
export function parseCsvLine(line: string, headers: string[]): CsvRow {
  const row: CsvRow = {};
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされたダブルクォート（""）
        currentValue += '"';
        i++; // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      values.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // 最後のフィールドを追加
  values.push(currentValue);

  // ヘッダーと値をマッピング
  headers.forEach((header, index) => {
    row[header] = unescapeCsvField(values[index] || '');
  });

  return row;
}

/**
 * CSV文字列をパース
 * @param csvText CSV文字列
 * @returns パースされた行データの配列
 */
export function parseCsv(csvText: string): CsvRow[] {
  // UTF-8 BOMを除去
  const text = csvText.startsWith('\uFEFF') ? csvText.slice(1) : csvText;

  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return [];
  }

  // ヘッダー行を取得
  const headerLine = lines[0];
  const headers: string[] = [];
  let currentHeader = '';
  let inQuotes = false;

  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    const nextChar = headerLine[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentHeader += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      headers.push(currentHeader.trim());
      currentHeader = '';
    } else {
      currentHeader += char;
    }
  }

  // 最後のヘッダーを追加
  if (currentHeader.trim()) {
    headers.push(currentHeader.trim());
  }

  // データ行をパース
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCsvLine(lines[i], headers);
      rows.push(row);
    } catch (error) {
      console.warn(`CSV行のパースエラー (行 ${i + 1}):`, error);
      // エラーが発生した行はスキップ
    }
  }

  return rows;
}

/**
 * 配列をJSON配列形式の文字列に変換
 * @param array 配列
 * @returns JSON配列形式の文字列
 */
export function encodeArrayField(array: string[] | undefined): string {
  if (!array || array.length === 0) {
    return '';
  }

  try {
    return JSON.stringify(array);
  } catch (error) {
    console.error('配列のエンコードエラー:', error);
    return '';
  }
}

/**
 * 配列フィールドをデコード
 * JSON配列形式またはパイプ区切り形式から配列に変換
 * @param field 配列フィールド
 * @returns 配列
 */
export function decodeArrayField(field: string): string[] {
  if (!field || field.trim() === '') {
    return [];
  }

  const trimmed = field.trim();

  // JSON配列形式の場合
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      console.warn('JSON配列のパースエラー:', error);
    }
  }

  // パイプ区切り形式の場合
  if (trimmed.includes('|')) {
    return trimmed.split('|').map(item => item.trim()).filter(item => item !== '');
  }

  // 単一の値の場合
  return [trimmed];
}

