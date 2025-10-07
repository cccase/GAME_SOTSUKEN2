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
// GAME/main_game_core.js - 月単位進行と価格変動ロジック (最新データ反映 & 参照価格を基本価格に修正)

// DOM要素の取得
const moneyDisplay = document.querySelector('#gold-box'); 
const dateDisplay = document.querySelector('#date-box'); 
const nextMonthBtn = document.getElementById('next-month-button'); 

let gameData = {
    money: 1000,
    month: 1, // 月単位で進行
    season: '春',
    // 価格変動グラフのためのデータ履歴
    priceHistory: {
        'lettuce': [],
        'carrot': [],
        'tomato': [],
        'onion': [] 
    }
};

// 【重要：ユーザーの最新データに合わせて修正】
const PRICE_BASE = {
    'lettuce': { 
        seedPrice: 50,      // 購入価格 (C)
        basePrice: 160,     // 基本総売却額 (S)
        growTime: 1,        // 期間 (T/月)
        maxVolatility: 0.35,    // +35%
        minVolatility: -0.50,   // -50% (レタス専用)
        label: 'レタス', color: 'rgba(50, 205, 50, 0.8)' 
    },
    'carrot': { 
        seedPrice: 100, 
        basePrice: 280, 
        growTime: 2, 
        volatility: 0.1,    // ±10%
        label: 'ニンジン', color: 'rgba(255, 140, 0, 0.8)' 
    },
    'tomato': { 
        seedPrice: 120, 
        basePrice: 450, 
        growTime: 3, 
        volatility: 0.35,   // ±35%
        label: 'トマト', color: 'rgba(220, 20, 60, 0.8)' 
    },
    'onion': { 
        seedPrice: 150, 
        basePrice: 550, 
        growTime: 4, 
        volatility: 0.1,    // ±10%
        label: 'タマネギ', color: 'rgba(100, 149, 237, 0.8)' 
    }
};
let priceChartInstance = null; // Chart.jsのインスタンス

// --- ユーティリティ関数 ---

function updateInfoPanel() {
    // 季節の表示ロジック（3ヶ月で季節が切り替わる想定）
    const monthIndexInYear = (gameData.month - 1) % 12;
    const seasons = ['春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬', '冬', '冬'];
    gameData.season = seasons[monthIndexInYear];

    moneyDisplay.textContent = `${gameData.money} ゴールド`;
    dateDisplay.textContent = `${gameData.month}ヶ月目 ${gameData.season}`;
}

// 価格をランダムに変動させて計算 (2ヶ月に一度のみ呼ばれる)
function generateMonthlyPrice(cropId) {
    const base = PRICE_BASE[cropId];
    // 【修正点】基本価格 (basePrice) を参照
    const basePrice = base.basePrice; 
    let changeRate;

    if (cropId === 'lettuce') {
        // レタス: -50% から +35% の間で変動
        const min = base.minVolatility; // -0.50
        const max = base.maxVolatility; // 0.35
        // (乱数 * 範囲) + 最小値
        changeRate = (Math.random() * (max - min)) + min;
    } else {
        // トマト, ニンジン, タマネギ: ±volatility の間で変動
        const volatility = base.volatility;
        // (乱数 * 2 * volatility) - volatility
        changeRate = (Math.random() * 2 * volatility) - volatility;
    }
    
    // 【修正点】基本価格に変動率を適用
    let newPrice = basePrice * (1 + changeRate);
    
    // 最低価格と最大価格の制限
    // 最低価格は種価格より少し上（購入価格を保証）
    if (newPrice < base.seedPrice + 10) {
        newPrice = base.seedPrice + 10;
    }
    // 最大値の制限
    if (newPrice > base.basePrice * 2) {
        newPrice = base.basePrice * 2;
    }

    return Math.round(newPrice);
}

// グラフ描画データを作成 (変更なし)
function getChartData() {
    // X軸のラベルは1ヶ月目から現在のgameData.monthまで
    const labels = Array.from({ length: gameData.month }, (_, i) => `${i + 1}ヶ月目`);
    const datasets = [];

    for (const cropId in gameData.priceHistory) {
        const base = PRICE_BASE[cropId];
        const history = gameData.priceHistory[cropId];

        datasets.push({
            label: base.label,
            backgroundColor: "rgba(255,255,255,0.0)",
            borderColor: base.color,
            pointBackgroundColor: base.color,
            pointBorderColor: base.color.replace('0.8', '0.6'),
            pointHoverBackgroundColor: "white",
            pointHoverBorderColor: base.color.replace('0.8', '0.6'),
            lineTension: 0.1,
            data: history
        });
    }

    return { labels, datasets };
}

// グラフを初期化または更新するメイン関数 (変更なし)
function renderPriceChart() {
    const ctx = document.getElementById('line')?.getContext('2d');
    if (!ctx) return; 

    const data = getChartData();
    
    // Y軸の最大値を動的に設定 (全データの最大値を100単位で切り上げ)
    let maxPrice = 0;
    data.datasets.forEach(dataset => {
        dataset.data.forEach(price => {
            if (price > maxPrice) maxPrice = price;
        });
    });
    const suggestedMax = Math.ceil(maxPrice / 100) * 100;
    const suggestedMin = Math.floor(PRICE_BASE.lettuce.seedPrice / 10) * 10; 

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false, 
        title: {
            display: true,
            text: '価格変動チャート (2ヶ月ごと更新)',
            fontSize: 16
        },
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: '月'
                }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: '価格 (G)'
                },
                ticks: {
                    beginAtZero: false,
                    suggestedMax: suggestedMax,
                    suggestedMin: suggestedMin 
                }
            }]
        }
    };

    if (priceChartInstance) {
        // 既にインスタンスがある場合はデータを更新
        priceChartInstance.data.labels = data.labels;
        priceChartInstance.data.datasets = data.datasets;
        priceChartInstance.options.scales.yAxes[0].ticks.suggestedMax = suggestedMax; 
        priceChartInstance.options.scales.yAxes[0].ticks.suggestedMin = suggestedMin;
        priceChartInstance.update();
    } else {
        // インスタンスがない場合は新規作成
        priceChartInstance = new Chart(ctx, {
            type: 'line',
            data: data,
            options: chartOptions
        });
    }
}

// --- イベントリスナーと初期化 ---

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        gameData.month++;
        
        // 偶数月で変動 (2ヶ月に一度の変動)
        const shouldFluctuate = (gameData.month % 2 === 0); 

        // 価格データの更新
        for (const cropId in gameData.priceHistory) {
            const history = gameData.priceHistory[cropId];
            
            if (shouldFluctuate) {
                // 偶数月の場合は新しい価格を生成
                const newPrice = generateMonthlyPrice(cropId);
                history.push(newPrice);
            } else {
                // 奇数月の場合は前月の価格をそのままコピー
                if (history.length > 0) {
                    // 前月の価格をそのままコピー (変動しない)
                    history.push(history[history.length - 1]);
                } else {
                    // 1ヶ月目 (初期化時にデータが入っているはずだが、念のため)
                    history.push(PRICE_BASE[cropId].basePrice); 
                }
            }
        }

        // 情報パネルを更新
        updateInfoPanel();
        
        // グラフを更新
        renderPriceChart();
    });
}

// ゲームとグラフの初期化
document.addEventListener('DOMContentLoaded', () => {
    // 1ヶ月目の初期価格データを生成（変動はしないが、最初のデータとして基本価格を入れる）
    for (const cropId in gameData.priceHistory) {
        gameData.priceHistory[cropId].push(PRICE_BASE[cropId].basePrice);
    }
    
    updateInfoPanel(); // 初期情報の表示

    // 相場タブがクリックされた時にグラフを再描画する処理を追加
    const tabPriceBtn = document.getElementById('tab-price');
    if (tabPriceBtn) {
        tabPriceBtn.addEventListener('click', () => {
             // canvasが描画されるのを待ってからグラフを生成・更新
             setTimeout(renderPriceChart, 10); 
        });
    }
});