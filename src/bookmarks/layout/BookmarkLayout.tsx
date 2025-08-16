import React from 'react';
import { Box, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { CbSidebar } from '../sidebar/CbSidebar';
import { TimelineView } from '../timeline/TimelineView';

/**
 * ブックマークページのレイアウト
 */
export function BookmarkLayout() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  return (
    <Box
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
      }}
    >
      {/* サイドバー */}
      <Box
        style={{
          width: 320,
          minWidth: 320,
          borderRight: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          overflow: 'hidden',
        }}
      >
        <CbSidebar />
      </Box>
      
      {/* メインエリア */}
      <Box
        style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
        }}
      >
        <TimelineView />
      </Box>
    </Box>
  );
}
