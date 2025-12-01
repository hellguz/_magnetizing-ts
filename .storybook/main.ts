import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['./public'],
  viteFinal: async (config) => {
    // Set the base path for GitHub Pages
    if (process.env.NODE_ENV === 'production') {
      config.base = '/_magnetizing-ts/';
    }
    return config;
  },
};

export default config;
