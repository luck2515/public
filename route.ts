// customers/app1/app/runtime-config/route.ts
import { NextResponse } from 'next/server';
import getConfig from 'next/config';

export const dynamic = 'force-dynamic'; // キャッシュを無効化（念のため）

export async function GET(request: Request) {
  console.log('--- [API Route] START ---');
  console.log(`NODE_ENV in API route: ${process.env.NODE_ENV}`);

  const configFromGetConfig = getConfig();

  console.log('[API Route] Value of getConfig():', configFromGetConfig); // ここが undefined かどうか
  console.log('[API Route] Type of getConfig() result:', typeof configFromGetConfig);

  if (typeof configFromGetConfig === 'undefined') {
    console.error('[API Route] CRITICAL: getConfig() returned undefined.');
    return NextResponse.json({
      error: 'getConfig() returned undefined. This is a critical issue.',
      configValue: String(configFromGetConfig) // undefinedを文字列化して返す
    }, { status: 500 });
  }

  // configFromGetConfig がオブジェクトであることを期待
  if (configFromGetConfig && typeof configFromGetConfig === 'object') {
    console.log('[API Route] Keys in config object:', Object.keys(configFromGetConfig));
    console.log('[API Route] serverRuntimeConfig from getConfig():', configFromGetConfig.serverRuntimeConfig);
    console.log('[API Route] publicRuntimeConfig from getConfig():', configFromGetConfig.publicRuntimeConfig);

    return NextResponse.json({
      message: 'Config retrieved.',
      serverConfig: configFromGetConfig.serverRuntimeConfig || 'serverRuntimeConfig not found or undefined',
      publicConfig: configFromGetConfig.publicRuntimeConfig || 'publicRuntimeConfig not found or undefined',
      rawConfig: configFromGetConfig, // デバッグ用に全体を返す
    });
  } else {
    console.error('[API Route] getConfig() did not return an object or was undefined.');
    return NextResponse.json({
      error: 'getConfig() did not return a valid object or was undefined.',
      configValue: String(configFromGetConfig),
      configType: typeof configFromGetConfig,
    }, { status: 500 });
  }
  console.log('--- [API Route] END ---'); // 通常ここまで到達しない場合がある
}
