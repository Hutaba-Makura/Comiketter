import React, { useEffect } from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { BookmarkLayout } from './layout/BookmarkLayout';
import { cbService } from './services/cbService';
import { useCbStore } from './state/cbStore';
import { getTextSync, useI18n } from './utils/i18n';

/**
 * ブックマークアプリのメインコンポーネント
 */
export default function BookmarkApp() {
  const { setCbs, setLoading, setError } = useCbStore();
  
  // i18n機能を一元管理（言語設定の初期化、ストレージ変更の監視、再レンダリングのトリガー）
  useI18n();

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
        setError(err instanceof Error ? err.message : getTextSync('app_init_failed'));
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [setCbs, setLoading, setError]);

  return (
    <>
      <ColorSchemeScript defaultColorScheme="auto"/>
      <MantineProvider defaultColorScheme="auto">
        <Notifications position="top-right" zIndex={10000} />
        <BookmarkLayout />
      </MantineProvider>
    </>
  );
}
