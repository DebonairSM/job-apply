import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/dashboard/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

