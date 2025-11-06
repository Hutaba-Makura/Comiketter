import React, { useEffect } from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BookmarkLayout } from './layout/BookmarkLayout';
import { cbService } from './services/cbService';
import { useCbStore } from './state/cbStore';

/**
 * ブックマークアプリのメインコンポーネント
 */
export default function BookmarkApp() {
  const { setCbs, setLoading, setError } = useCbStore();

  // 初期化時にデータベースとCB一覧を取得
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // データベースの初期化
        await cbService.initialize();
        
        // CB一覧を取得
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
        <Notifications position="top-right" zIndex={1000} />
        <BookmarkLayout />
      </MantineProvider>
    </>
  );
}
