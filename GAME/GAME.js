// GAME.js: タブ切り替え機能（Button ID方式）
document.addEventListener('DOMContentLoaded', initTabSwitcher);

function initTabSwitcher() {
    const tabsContainer = document.getElementById('side-panel-tabs');
    
    tabsContainer.addEventListener('click', (event) => {
        // クリックされたのが <button> 要素かどうかを確認
        const clickedButton = event.target.closest('button.tab-button');
        
        if (!clickedButton) return;
        
        // --- ★ IDからプレフィックスを削除して必要なIDを取得 ★ ---
        const buttonId = clickedButton.id; // 例: "tab-market"
        // IDの "tab-" 部分を削除し、タブID ("market") を取得
        const tabId = buttonId.replace('tab-', ''); 
        
        // 1. すべてのタブボタンから active を削除
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 2. すべてのタブコンテンツから active を削除
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 3. クリックされたボタンと対応するコンテンツに active を追加
        clickedButton.classList.add('active');
        document.getElementById(`content-${tabId}`).classList.add('active');
    });
}