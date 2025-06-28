// Options UI entry point for Comiketter
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { OptionsApp } from './OptionsApp';

// Create root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

// Render the options app
root.render(
  <React.StrictMode>
    <MantineProvider>
      <OptionsApp />
    </MantineProvider>
  </React.StrictMode>
); 