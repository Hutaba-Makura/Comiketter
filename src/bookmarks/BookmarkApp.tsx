import React, { useEffect } from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { BookmarkLayout } from './layout/BookmarkLayout';
import { cbService } from './services/cbService';
import { useCbStore } from './state/cbStore';

/**
 * ブックマークアプリのメインコンポーネント
 */
export default function BookmarkApp() {
  const { setCbs, setLoading, setError } = useCbStore();

  // 初期化時にCB一覧を取得
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const cbList = await cbService.listCbs();
        setCbs(cbList);
      } catch (err) {
        console.error('アプリ初期化エラー:', err);
        setError(err instanceof Error ? err.message : 'アプリの初期化に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [setCbs, setLoading, setError]);

  return (
    <>
      <ColorSchemeScript />
      <MantineProvider defaultColorScheme="auto">
        <BookmarkLayout />
      </MantineProvider>
    </>
  );
}
