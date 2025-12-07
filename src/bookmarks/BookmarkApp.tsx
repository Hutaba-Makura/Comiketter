import React, { useEffect, useState } from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { BookmarkLayout } from './layout/BookmarkLayout';
import { cbService } from './services/cbService';
import { useCbStore } from './state/cbStore';
import { getTextSync, getLanguage, clearLanguageCache } from './utils/i18n';

/**
 * ブックマークアプリのメインコンポーネント
 */
export default function BookmarkApp() {
  const { setCbs, setLoading, setError } = useCbStore();
  const [languageKey, setLanguageKey] = useState(0); // 言語変更時に再レンダリングをトリガー

  // 言語設定を取得してキャッシュに保存
  useEffect(() => {
    const initLanguage = async () => {
      await getLanguage();
    };
    initLanguage();
  }, []);

  // ストレージ変更を監視して言語設定の変更を検知
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.comiketter_settings) {
        // 言語設定が変更された場合、キャッシュをクリアして再取得
        clearLanguageCache();
        getLanguage().then(() => {
          // 強制的に再レンダリング（言語キーを変更）
          setLanguageKey(prev => prev + 1);
        });
      }
    };

    // ストレージ変更イベントをリッスン
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // languageKeyが変更された時に再レンダリングを確実にする
  useEffect(() => {
    // languageKeyが変更された時、コンポーネントが再レンダリングされ、
    // getTextSyncが再実行されるため、新しい言語が反映される
  }, [languageKey]);

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
      <ColorSchemeScript />
      <MantineProvider defaultColorScheme="auto">
        <Notifications position="top-right" zIndex={10000} />
        <BookmarkLayout />
      </MantineProvider>
    </>
  );
}
