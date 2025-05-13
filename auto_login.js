// Keycloakのテーマディレクトリに配置するスクリプト例
// 例: themes/keycloak/account/resources/js/auto-update.js

document.addEventListener('DOMContentLoaded', function() {
  // URLからauto_clickパラメータを取得
  const urlParams = new URLSearchParams(window.location.search);
  const autoClick = urlParams.get('auto_click');
  
  // URLハッシュからパスを取得
  const hash = window.location.hash;
  
  // security/signinginページでauto_click=trueの場合
  if (hash.includes('/security/signingin') && autoClick === 'true') {
    // ページ読み込み完了時にUPDATEボタンを探して自動クリック
    setTimeout(function() {
      // Keycloakのボタン要素を特定（実際のセレクタはKeycloakのバージョンによって異なる可能性があります）
      const updateButton = document.querySelector('button[data-testid="update"], button.update-button, button.kc-update-button');
      if (updateButton) {
        updateButton.click();
        console.log('自動的にUPDATEボタンをクリックしました');
      } else {
        console.log('UPDATEボタンが見つかりませんでした');
      }
    }, 1000); // 1秒待って実行（ページの読み込みを待つため）
  }
});
