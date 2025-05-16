// customers/app1/app/runtime-config/route.ts (または該当のAPIルート)
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('--- [API Route] All available process.env variables ---');
  let envVarsForResponse = {};
  for (const key in process.env) {
    // Podログには全て出力
    console.log(`[ENV_FROM_API_ROUTE] ${key}=${process.env[key]}`);
    // レスポンスに含めるのは文字列型のものや、シリアライズ可能なものに限定した方が安全
    if (typeof process.env[key] === 'string') {
      envVarsForResponse[key] = process.env[key];
    }
  }
  console.log('--- [API Route] End of process.env variables ---');

  const specificVarName = "YOUR_K8S_ENV_VAR_NAME"; // Kubernetesで設定した実際の環境変数名 (大文字・小文字を正確に)
  const specificVarValue = process.env[specificVarName];

  console.log(`[API Route] Value of ${specificVarName}: ${specificVarValue}`);

  return NextResponse.json({
    message: "Checked process.env from API Route",
    retrievedSpecificVar: {
      name: specificVarName,
      value: specificVarValue === undefined ? "NOT_FOUND_OR_UNDEFINED" : specificVarValue,
    },
    // 注意: 全ての環境変数をレスポンスに含めるのはセキュリティリスクになる可能性があるため、
    // デバッグ目的でのみ、かつ必要なものに絞って行うこと。
    // もし多くの環境変数を見たい場合は、Podログを参照するのが基本。
    // sampleOfEnvVars: envVarsForResponse, // デバッグ用に一部の環境変数を返す（本番では注意）
  });
}
