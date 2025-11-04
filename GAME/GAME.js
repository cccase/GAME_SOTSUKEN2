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

        // タブ切り替え時に畑の選択状態を解除
        // (ここでは既存のロジックに影響を与えないよう、後述のファームロジック内で処理)
    });
}


// =========================================================================
// FARM LOGIC: 畑管理ロジック (新規追加)
// =========================================================================

const FARM_SIZE = 10;
const FARM_BOX = document.getElementById('farm-box');
const HARVEST_BUTTON = document.getElementById('farm-button');

// 畑の選択状態
let selectedSeed = null; // 選択中の種ID (例: 'lettuce')
let isHarvesting = false; // 収穫モードかどうか
let isMouseDown = false; 
let isDragging = false;

/**
 * 種ボタンのIDからPRICE_BASEに対応する作物IDを取得するヘルパー関数
 * @param {string} buttonId - 種ボタンのID
 * @returns {string|null} 作物ID
 */
function getCropIdFromSeedButtonId(buttonId) {
    if (buttonId.includes('letus')) return 'lettuce';
    if (buttonId.includes('carot')) return 'carrot';
    if (buttonId.includes('tomato')) return 'tomato';
    if (buttonId.includes('onion')) return 'onion';
    return null;
}

/**
 * 畑のマス目のDOMを生成し、クリック/ドラッグイベントを設定する
 */
function initFarmGrid() {
    FARM_BOX.style.gridTemplateColumns = `repeat(${FARM_SIZE}, 1fr)`;
    FARM_BOX.innerHTML = ''; // 既存の "10 x 10" テキストを削除

    for (let i = 0; i < FARM_SIZE * FARM_SIZE; i++) {
        const plot = document.createElement('div');
        plot.classList.add('farm-plot');
        plot.dataset.index = i;

        // 💥 変更点: mousedownがクリックとドラッグ開始の両方を担当 💥

        // 1. クリック開始 または ドラッグ開始 (PC)
        plot.addEventListener('mousedown', (event) => {
            // 左クリック以外は無視
            if (event.button !== 0) return; 
            
            isMouseDown = true;
            // 押した瞬間に、まずそのマスでアクションを実行（クリック操作とドラッグ開始）
            handlePlotClick(event); 
        });

        // 2. ドラッグ中の連続実行 (PC)
        plot.addEventListener('mouseover', (event) => {
            // マウスボタンが押されたまま（isMouseDown）マスに入ったら
            if (isMouseDown) {
                // アクションを実行
                handlePlotClick(event);
            }
        });

        FARM_BOX.appendChild(plot);
    }
    
    // 3. ドラッグ終了 (PC)
    // マウスボタンが上がったら、押された状態を解除
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    // 4. モバイル対応 (タッチイベント)
    FARM_BOX.addEventListener('touchstart', (event) => {
        isMouseDown = true;
        event.preventDefault(); // スクロールを防ぐ
        
        // 最初のタッチ要素がマスなら、クリック処理を実行
        const targetPlot = event.touches[0].target.closest('.farm-plot');
        if (targetPlot) {
             handlePlotClick({ currentTarget: targetPlot });
        }
    }, { passive: false }); // スクロール防止のため passive: false を指定

    // 5. ドラッグ中の連続実行 (モバイル)
    FARM_BOX.addEventListener('touchmove', (event) => {
        if (!isMouseDown) return;
        event.preventDefault(); // スクロールを防ぐ

        const touch = event.touches[0];
        // 座標からDOM要素を取得
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetPlot = element ? element.closest('.farm-plot') : null;

        if (targetPlot) {
            handlePlotClick({ currentTarget: targetPlot });
        }
    }, { passive: false }); // スクロール防止のため passive: false を指定

    // 6. ドラッグ終了 (モバイル)
    document.addEventListener('touchend', () => {
        isMouseDown = false;
    });
}
/**
 * 畑のマス目の表示を更新する
 * @param {HTMLElement} plotElement - マス目のDOM要素
 * @param {object|null} plotData - 畑データ { cropId: string, plantedMonth: number }
 */
function updatePlotDisplay(plotElement, plotData) {
    plotElement.className = 'farm-plot'; // クラスをリセット
    plotElement.textContent = ''; // テキストをリセット

    if (plotData) {
        const cropId = plotData.cropId;
        const base = PRICE_BASE[cropId];
        const growTime = base.growTime;
        const currentMonth = gameData.month;
        const plantedMonth = plotData.plantedMonth;

        // 成長期間の計算
        const isReady = currentMonth >= plantedMonth + growTime;
        const remainingMonths = (plantedMonth + growTime) - currentMonth;

        plotElement.classList.add('growing'); // 生育中の基本クラス
        plotElement.classList.add(cropId); // 作物固有のクラス

        if (isReady) {
            // 収穫可能
            plotElement.classList.add('ready-to-harvest');
            plotElement.textContent = '完成！';
        } else {
            // 生育中
            plotElement.innerHTML = `${base.label}<br>(${remainingMonths})`;
        }
    } else {
        // 何も植えられていない
        plotElement.classList.add('empty');
    }
}

/**
 * 畑全体の表示を更新する
 */
function renderFarmPlots() {
    const plotElements = FARM_BOX.querySelectorAll('.farm-plot');
    gameData.farmPlots.forEach((plotData, index) => {
        updatePlotDisplay(plotElements[index], plotData);
    });
}
/**
 * 畑のマス目クリック時の処理
 * (種まきモード/収穫モード/通常モード)
 */
function handlePlotClick(event) {
    const plotElement = event.currentTarget;
    if (!plotElement || !plotElement.dataset) return; // ターゲット要素やdatasetがない場合は早期リターン
    const index = parseInt(plotElement.dataset.index);
    if (isNaN(index)) return; // インデックスが不正な場合は早期リターン
    const plotData = gameData.farmPlots[index];

    // 1. 種まきモード
    if (selectedSeed) {
        if (plotData) {
            // アラートを削除: alert('既に作物が植えられています。');
            return;
        }

        const seedPrice = PRICE_BASE[selectedSeed].seedPrice;

        if (gameData.money < seedPrice) {
            alert('お金が足りません！'); // このアラートは残します
        } else {
            // 種まき実行
            gameData.money -= seedPrice;
            gameData.farmPlots[index] = {
                cropId: selectedSeed,
                plantedMonth: gameData.month
            };

            // 種まき完了後も選択状態はトグル式で維持（selectedSeedはリセットしない）
            // UI更新
            updateInfoPanel();
            renderFarmPlots();
            // アラートを削除: alert(`${PRICE_BASE[gameData.farmPlots[index].cropId].label}を植えました！`);
        }
    }
    // 2. 収穫モード
    else if (isHarvesting) {
        if (!plotData || !plotElement.classList.contains('ready-to-harvest')) {
            // アラートを削除: alert('収穫できる作物がありません。');
            return;
        }

        // 収穫実行
        const cropId = plotData.cropId;

        // 【修正】現在の売却価格を取得。配列の長さが月数と一致しないため、
        // 必ず配列の最後の要素（最新の価格）を取得する
        const currentPrice = gameData.priceHistory[cropId][gameData.priceHistory[cropId].length - 1];

        if (currentPrice === undefined) {
            alert('価格データが不正です。収穫を中止します。');
            return;
        }

        // 収益を追加
        gameData.money += currentPrice;

        // 畑データをリセット
        gameData.farmPlots[index] = null;

        // UI更新
        updateInfoPanel();
        renderFarmPlots();
        // アラートを削除: alert(`${PRICE_BASE[cropId].label}を${currentPrice} Gで収穫しました！`);
    }
    // 3. 通常モード (何もしない)
    else {
        // 通常モード時の詳細アラートも削除し、空き地/生育中の情報表示をシンプルにする
        if (plotData) {
            // alert(`${PRICE_BASE[plotData.cropId].label}が生育中です。植えた月: ${plotData.plantedMonth}月`);
        } else {
            // alert('ここは空いています。マーケットで種を選んでからクリックしてください。');
        }
    }
}

/**
 * マーケットのアイテムスロットクリック時の処理 (ボタンではなくスロット全体に適用)
 */
function handleItemSlotClick(event) {
    // クリックされた要素がボタンかスロットかに関わらず、親の .item-slot を取得する
    // HTMLが <button class="item-slot"> に変更されたため、event.currentTargetを使用
    const slotElement = event.currentTarget; 
    if (!slotElement || !slotElement.id.startsWith('seed-button')) return;

    // IDはボタンから取得する
    const cropId = getCropIdFromSeedButtonId(slotElement.id);

    // 選択状態の切り替えロジック
    if (selectedSeed === cropId) {
        // 現在選択中の種と同じなら、選択解除
        selectedSeed = null;
        slotElement.classList.remove('selected');
        FARM_BOX.classList.remove('planting-mode');
    } else {
        // 新しい種を選択
        selectedSeed = cropId;
        isHarvesting = false;
        
        // 他のスロットの選択状態と収穫モードを解除
        document.querySelectorAll('.item-slot').forEach(slot => slot.classList.remove('selected'));
        HARVEST_BUTTON.classList.remove('active');

        // このスロットを選択状態にし、畑を植え付けモードにする
        slotElement.classList.add('selected');
        FARM_BOX.classList.add('planting-mode');
    }
}


/**
 * 収穫ボタンクリック時の処理
 */
function handleHarvestClick() {
    // 種まきモードを解除
    selectedSeed = null;
    document.querySelectorAll('.item-slot').forEach(slot => slot.classList.remove('selected'));
    FARM_BOX.classList.remove('planting-mode');

    if (isHarvesting) {
        // 再クリックで収穫モードを解除
        isHarvesting = false;
        HARVEST_BUTTON.classList.remove('active');
    } else {
        // 収穫モードに切り替え
        isHarvesting = true;
        HARVEST_BUTTON.classList.add('active');
    }
}

// =========================================================================
// GAME CORE LOGIC: 月単位進行と価格変動ロジック (既存)
// =========================================================================

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
    },
    // 【新規追加】畑のデータ (10x10 = 100マス)
    farmPlots: Array(FARM_SIZE * FARM_SIZE).fill(null)
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

    // 変更: おかね -> 円
    moneyDisplay.textContent = `${gameData.money} 円`;
    dateDisplay.textContent = `${gameData.month}ヶ月目 ${gameData.season}`;
}

// 【新規追加】現在の価格を相場タブに表示する関数
function updateCurrentPrices() {
    for (const cropId in gameData.priceHistory) {
        const history = gameData.priceHistory[cropId];
        const lastPrice = history[history.length - 1]; // 最後の要素が現在の価格
        const cropName = PRICE_BASE[cropId].label;

        // HTML要素のIDを動的に生成 (lettuce, carrot, tomato, onion)
        // HTMLのIDは price-lettuce, price-carrot, ... に変更されているため、IDを調整
        let elementId;
        if (cropId === 'lettuce') elementId = 'price-lettuce';
        else if (cropId === 'carrot') elementId = 'price-carrot';
        else if (cropId === 'tomato') elementId = 'price-tomato';
        else if (cropId === 'onion') elementId = 'price-onion';

        // 1. ねだんタブの価格要素を更新
        const priceElement = document.getElementById(elementId);

        if (priceElement && lastPrice !== undefined) {
            // 変更: G -> 円
            priceElement.textContent = `${cropName}: ${lastPrice} 円`;
        }

        // 2. 【拡張】ノートタブの価格要素を更新
        // IDは 'note-price-lettuce' など
        const noteElement = document.getElementById(`note-${elementId}`);

        if (noteElement && lastPrice !== undefined) {
            // 変更: いまのねだん：... おかね -> いまのねだん：... 円
            noteElement.textContent = `いまのねだん：${lastPrice} 円`;
        }
    }
}

// 価格をランダムに変動させて計算 (2ヶ月に一度のみ呼ばれる)
function generateMonthlyPrice(cropId) {
    const base = PRICE_BASE[cropId];
    const basePrice = base.basePrice;
    let changeRate;

    if (cropId === 'lettuce') {
        // レタス: -50% から +35% の間で変動
        const min = base.minVolatility;
        const max = base.maxVolatility;
        changeRate = (Math.random() * (max - min)) + min;
    } else {
        // トマト, ニンジン, タマネギ: ±volatility の間で変動
        const volatility = base.volatility;
        changeRate = (Math.random() * 2 * volatility) - volatility;
    }

    let newPrice = basePrice * (1 + changeRate);

    // 最低価格と最大価格の制限
    if (newPrice < base.seedPrice + 10) {
        newPrice = base.seedPrice + 10;
    }
    if (newPrice > base.basePrice * 2) {
        newPrice = base.basePrice * 2;
    }

    return Math.round(newPrice);
}

// グラフ描画データを作成 (変更なし)
function getChartData() {
    const numDataPoints = gameData.priceHistory.lettuce.length;
    // 最新のデータポイントのインデックス
    const latestIndex = numDataPoints - 1;

    // 【修正】ラベルを現在の月を基準に相対的な「〇〇ヶ月まえ」として生成する
    const labels = Array.from({ length: numDataPoints }, (_, i) => {
        // 最新インデックスからの差分を2倍（2ヶ月間隔のため）
        const monthsAgo = (latestIndex - i) * 2; 

        if (monthsAgo === 0) {
            return '今'; // 現在の月
        } else {
            return `${monthsAgo}ヶ月前`;
        }
    });

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
            lineTension: 0.2,
            data: history
        });
    }

    return { labels, datasets };
}

// グラフを初期化または更新するメイン関数
function renderPriceChart() {
    const ctx = document.getElementById('line')?.getContext('2d');
    if (!ctx) return;

    const data = getChartData();

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
            text: 'ねだんチャート',
            fontSize: 16
        },
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: '時間' 
                }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'ねだん (円)'
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
        priceChartInstance.data.labels = data.labels;
        priceChartInstance.data.datasets = data.datasets;
        priceChartInstance.options.scales.yAxes[0].ticks.suggestedMax = suggestedMax;
        priceChartInstance.options.scales.yAxes[0].ticks.suggestedMin = suggestedMin;
        priceChartInstance.update();
    } else {
        priceChartInstance = new Chart(ctx, {
            type: 'line',
            data: data,
            options: chartOptions
        });
    }

    // グラフの更新後に現在の価格表示も更新する
    updateCurrentPrices();
}

// GAME.js の nextMonthBtn.addEventListener 内

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        gameData.month++;

        // 奇数月に価格が変動するように変更
        const shouldFluctuate = (gameData.month % 2 !== 0);

        // 価格データの更新
        for (const cropId in gameData.priceHistory) {
            const history = gameData.priceHistory[cropId];

            if (shouldFluctuate) {
                const newPrice = generateMonthlyPrice(cropId);
                history.push(newPrice); // ★ 奇数月のみ新しい価格をプッシュ ★
            }
            // 偶数月はプッシュしない (データ配列に空きができる)
        }

        // 畑の選択状態をリセット (月を跨いだら植え付け/収穫モードを解除)
        selectedSeed = null;
        isHarvesting = true; // 変更: 次の月に進んだら収穫モードをデフォルトでオンにする
        document.querySelectorAll('.item-slot').forEach(slot => slot.classList.remove('selected'));
        HARVEST_BUTTON?.classList.add('active'); // 変更: 収穫ボタンをアクティブにする
        FARM_BOX?.classList.remove('planting-mode');
        

        // 情報パネルを更新
        updateInfoPanel();

        // グラフを更新
        if (shouldFluctuate) {
            renderPriceChart();
        }

        // 【新規追加】畑の表示を更新 (成長状態を反映させる)
        renderFarmPlots();

    });
}

// ゲームとグラフの初期化
document.addEventListener('DOMContentLoaded', () => {
    // 【修正】ゲーム開始前に6回分の過去価格データをランダムに生成（合計7データポイント、-11ヶ月目から1ヶ月目まで）
    const PAST_HISTORY_COUNT = 6;

    // 過去の価格変動をランダムに生成し、履歴に追加
    for (let i = 0; i < PAST_HISTORY_COUNT; i++) {
        for (const cropId in gameData.priceHistory) {
            // ベース価格からのランダム変動を使用し、過去価格を生成
            const newPrice = generateMonthlyPrice(cropId);
            gameData.priceHistory[cropId].push(newPrice);
        }
    }

    // 1ヶ月目の初期価格データを生成 (最新データとして追加)
    // generateMonthlyPriceを使い、最新の1ヶ月目の価格を生成します。
    for (const cropId in gameData.priceHistory) {
        const newPrice = generateMonthlyPrice(cropId);
        gameData.priceHistory[cropId].push(newPrice);
    }

    updateInfoPanel(); // 初期情報の表示
    updateCurrentPrices(); // 初期価格の表示

    // 相場タブがクリックされた時にグラフを再描画する処理を追加
    const tabPriceBtn = document.getElementById('tab-price');
    if (tabPriceBtn) {
        tabPriceBtn.addEventListener('click', () => {
            // canvasが描画されるのを待ってからグラフを生成・更新
            setTimeout(renderPriceChart, 10);
        });
    }

    // =========================================================================
    // FARM LOGIC 初期化処理 (新規追加)
    // =========================================================================

    // 畑マス目の生成
    initFarmGrid();

    // 種まきボタンのイベントリスナー設定 (親スロット全体で反応するように変更)
    document.querySelectorAll('.item-slot').forEach(slotElement => {
        // market-button を含むスロット（マーケットアイテム）のみを対象とする
        if (slotElement.querySelector('.market-button')) {
            slotElement.addEventListener('click', handleItemSlotClick);
        }
    });

    // 収穫ボタンのイベントリスナー設定
    if (HARVEST_BUTTON) {
        HARVEST_BUTTON.addEventListener('click', handleHarvestClick);
    }
});