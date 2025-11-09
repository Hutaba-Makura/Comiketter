import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../src/bookmarks/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-webpack5-compiler-swc',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
    '@storybook/addon-links',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      fastRefresh: true, // HMRを有効化
    },
  },
  // HMR設定
  core: {
    builder: '@storybook/builder-webpack5',
    disableTelemetry: true,
  },
  webpackFinal: async (config) => {
    // CSS/SCSSファイルの処理を追加
    config.module?.rules?.push({
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', 'sass-loader'],
    });

    // CSSファイルのsideEffectsを有効にする（MantineのCSSが正しく読み込まれるように）
    const cssRule = config.module?.rules?.find(
      (rule) => rule && typeof rule === 'object' && 'test' in rule && rule.test?.toString().includes('css')
    );
    
    if (cssRule && typeof cssRule === 'object' && 'sideEffects' in cssRule) {
      (cssRule as any).sideEffects = true;
    }

    return config;
  },
};

export default config;