// customers/app1/next.config.js
// 他のすべての設定をコメントアウトまたは削除
console.log('--- [next.config.js] START ---');
console.log(`NODE_ENV during build: ${process.env.NODE_ENV}`);
const config = {
  serverRuntimeConfig: {
    testKey: 'Hello from serverRuntimeConfig in next.config.js',
    envVarCheck: process.env.YOUR_OS_ENV_VAR || 'OS_ENV_VAR_NOT_SET_IN_CONFIG',
  },
  publicRuntimeConfig: {
    publicTestKey: 'Hello from publicRuntimeConfig in next.config.js',
  },
  // distDir: '.next', // デフォルトなので通常不要
  // output: 'standalone', // もし使っているなら、一時的にコメントアウトしてテスト
};
console.log('[next.config.js] Config object to be exported:', JSON.stringify(config, null, 2));
console.log('--- [next.config.js] END ---');
module.exports = config;
