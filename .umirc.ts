import { defineConfig } from "umi";
import routes from "./config/routes";
import getConfig from "./config/appConfig";
import proxy from "./config/proxy";
const pxtorem = require('postcss-pxtorem');
import path from "path";

const { APP_ENV, PUBLIC_PATH } = process.env;

export default defineConfig({
  base: '/',
  routes,
  publicPath: PUBLIC_PATH || '/',
  npmClient: "yarn",
  history: {
    type: "hash",
  },
  targets: {
    android: 8,
    chrome: 56,
  },
  hash: true,
  define: getConfig(APP_ENV as "dev" | "test" | "prod"),
  tailwindcss: {},
  plugins: ["@umijs/plugins/dist/tailwindcss"],
  metas: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
  ],
  proxy,
  extraPostCSSPlugins: [
    pxtorem({
      rootValue: 37.5,
      propList: ['*'],
      exclude: /node_modules/i,
      selectorBlackList: ['.am-'],
    }),
  ],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
});
