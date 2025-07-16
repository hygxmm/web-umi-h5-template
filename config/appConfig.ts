const config = {
  dev: {
    'process.env.APP_ENV': 'dev',
    'process.env.API_URL': '',
  },
  test: {
    'process.env.APP_ENV': 'test',
    'process.env.API_URL': 'https://api.uat.qingyulan.net',

  },
  prod: {
    'process.env.APP_ENV': 'prod',
    'process.env.API_URL': 'https://api.qingyulan.net',

  },
};

const getConfig = (env: 'dev' | 'test' | 'prod') => {
  return config[env];
};

export default getConfig;
