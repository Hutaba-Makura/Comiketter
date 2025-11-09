import React from 'react';
import type { Preview } from '@storybook/react-webpack5';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#f8f9fa',
        },
        {
          name: 'dark',
          value: '#1a1b1e',
        },
      ],
    },
  },
  decorators: [
    (Story) => {
      return (
        <MantineProvider>
          <Story />
        </MantineProvider>
      );
    },
  ],
  globalTypes: {
    theme: {
      description: 'グローバルテーマ',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;