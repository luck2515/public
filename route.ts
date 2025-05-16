// customers/app1/app/runtime-config/route.ts (または該当のAPIルート)
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('--- [API Route] All available process.env variables ---');

  // レスポンスに含める環境変数を格納するオブジェクト
  // 型を { [key: string]: string | undefined } にするか、
  // stringのみを格納するようにif文でチェックする
  const envVarsForResponse: { [key: string]: string } = {}; // stringのみを格納する場合

  for (const key in process.env) {
    const value = process.env[key];
    // Podログには全て出力 (undefinedもそのまま文字列 "undefined"として出力される)
    console.log(`[ENV_FROM_API_ROUTE] ${key}=${value}`);

    // レスポンスに含めるのは文字列型の値のみ
    if (typeof value === 'string') {
      envVarsForResponse[key] = value;
    }
  }
  console.log('--- [API Route] End of process.env variables ---');

  // ★★★ Kubernetesで設定した実際の環境変数名をここに正確に入力 ★★★
  const specificVarName = "YOUR_K8S_ENV_VAR_NAME_EXACTLY_AS_IN_K8S_ENV_COMMAND";
  const specificVarValue = process.env[specificVarName];

  console.log(`[API Route] Value of process.env.${specificVarName}: ${specificVarValue}`);
  console.log(`[API Route] Type of process.env.${specificVarName}: ${typeof specificVarValue}`);

  return NextResponse.json({
    message: "Checked process.env from API Route",
    retrievedSpecificVar: {
      name: specificVarName,
      value: specificVarValue === undefined ? "NOT_FOUND_OR_UNDEFINED" : specificVarValue,
      type: typeof specificVarValue,
    },
    // デバッグ用に一部の環境変数を返す（本番では注意、必要なものに絞るか削除）
    // 例えば、期待する環境変数だけを返すなど
    // sampleOfEnvVars: {
    //   [specificVarName]: process.env[specificVarName],
    //   // 他にも確認したい変数があれば追加
    //   "PATH": process.env.PATH,
    //   "NODE_VERSION": process.env.NODE_VERSION,
    //   "HOSTNAME": process.env.HOSTNAME
    // },
  });
}
