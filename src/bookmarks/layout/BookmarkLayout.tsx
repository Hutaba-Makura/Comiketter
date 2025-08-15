import React from 'react';
import { AppShell, AppShellMain, AppShellNavbar } from '@mantine/core';
import { CbSidebar } from '../sidebar/CbSidebar';
import { TimelineView } from '../timeline/TimelineView';

/**
 * ブックマークページのレイアウト
 */
export function BookmarkLayout() {
  return (
    <AppShell
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShellNavbar p="md">
        <CbSidebar />
      </AppShellNavbar>
      
      <AppShellMain>
        <TimelineView />
      </AppShellMain>
    </AppShell>
  );
}
