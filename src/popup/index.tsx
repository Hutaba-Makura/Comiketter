// Popup UI entry point for Comiketter
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { PopupApp } from './PopupApp';

// Create root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

// Render the popup app
root.render(
  <React.StrictMode>
    <MantineProvider>
      <PopupApp />
    </MantineProvider>
  </React.StrictMode>
); 