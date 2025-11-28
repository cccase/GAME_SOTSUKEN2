// =========================================================================
// 1. グローバル変数・定数・DOM要素
// =========================================================================
const FARM_SIZE = 10;
const ENABLE_GAME_TIMER = true;
const GAME_DURATION_MONTHS = 12;

// DOM要素
const FARM_BOX = document.getElementById('farm-box');
const HARVEST_BUTTON = document.getElementById('farm-button');
const NEXT_MONTH_BUTTON = document.getElementById('next-month-button');
const MONEY_DISPLAY = document.querySelector('#gold-box');
const DATE_DISPLAY = document.querySelector('#date-box');
const TAB_PRICE_BTN = document.getElementById('tab-price');
const BTN_OPTION = document.getElementById('option-box');

// ゲームデータ
let gameData = {
    money: 1000,
    month: 1,
    season: '春',
    priceHistory: {
        'lettuce': [],
        'carrot': [],
        'tomato': [],
        'onion': []
    },
    farmPlots: Array(FARM_SIZE * FARM_SIZE).fill(null)
};

// 操作状態
let selectedSeed = null;
let isHarvesting = false;
let isMouseDown = false;

// 作物データ
const PRICE_BASE = {
    'lettuce': { seedPrice: 50, basePrice: 160, growTime: 1, maxVolatility: 0.35, minVolatility: -0.50, label: 'レタス', mark: '🥬', color: 'rgba(50, 205, 50, 0.8)' },
    'carrot': { seedPrice: 100, basePrice: 280, growTime: 2, volatility: 0.1, label: 'ニンジン', mark: '🥕', color: 'rgba(255, 140, 0, 0.8)' },
    'tomato': { seedPrice: 120, basePrice: 450, growTime: 3, volatility: 0.35, label: 'トマト', mark: '🍅', color: 'rgba(220, 20, 60, 0.8)' },
    'onion': { seedPrice: 150, basePrice: 550, growTime: 4, volatility: 0.1, label: 'タマネギ', mark: '🧅', color: 'rgba(100, 149, 237, 0.8)' }
};

let priceChartInstance = null;


// =========================================================================
// 2. 初期化処理 (DOMContentLoaded)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    generateInitialHistory();

    initTabSwitcher();
    initFarmGrid();
    updateInfoPanel();
    updateCurrentPrices();

    setupEventListeners();
});


// =========================================================================
// 3. イベントリスナー設定関数
// =========================================================================
function setupEventListeners() {
    // マーケットの種ボタン
    document.querySelectorAll('.item-slot').forEach(slotElement => {
        if (slotElement.querySelector('.market-button')) {
            slotElement.addEventListener('click', handleItemSlotClick);
        }
    });

    // 収穫ボタン
    if (HARVEST_BUTTON) {
        HARVEST_BUTTON.addEventListener('click', handleHarvestClick);
    }

    // 次の月へボタン
    if (NEXT_MONTH_BUTTON) {
        NEXT_MONTH_BUTTON.addEventListener('click', handleNextMonthClick);
    }

    // ねだんタブ
    if (TAB_PRICE_BTN) {
        TAB_PRICE_BTN.addEventListener('click', () => {
            setTimeout(renderPriceChart, 10);
        });
    }

    // 結果ウィンドウを閉じる処理
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    }
    const titleScreen = document.getElementById('title-screen');
    const btnStart = document.getElementById('btn-start-game');
    const btnHelpTitle = document.getElementById('btn-show-help');

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            titleScreen.style.display = 'none';
        });
    }

    if (btnHelpTitle) {
        btnHelpTitle.addEventListener('click', () => {
            showOverlay('help');
        });
    }

    // 設定ボタン
    if (BTN_OPTION) {
        BTN_OPTION.addEventListener('click', () => {
            showOverlay('help');
        });
    }
    const htmlHintBtn = document.getElementById('hint-button');
    if (htmlHintBtn) {
        htmlHintBtn.addEventListener('click', () => {
            showOverlay('hint');
        });
    }
}


// =========================================================================
// 4. 畑 (Farm) 関連ロジック
// =========================================================================
function initFarmGrid() {
    FARM_BOX.style.gridTemplateColumns = `repeat(${FARM_SIZE}, 1fr)`;
    FARM_BOX.innerHTML = '';

    for (let i = 0; i < FARM_SIZE * FARM_SIZE; i++) {
        const plot = document.createElement('div');
        plot.classList.add('farm-plot');
        plot.dataset.index = i;

        plot.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return;
            isMouseDown = true;
            handlePlotClick(event);
        });
        plot.addEventListener('mouseover', (event) => {
            if (isMouseDown) handlePlotClick(event);
        });

        FARM_BOX.appendChild(plot);
    }

    document.addEventListener('mouseup', () => isMouseDown = false);

    FARM_BOX.addEventListener('touchstart', (event) => {
        isMouseDown = true;
        event.preventDefault();
        const targetPlot = event.touches[0].target.closest('.farm-plot');
        if (targetPlot) handlePlotClick({ currentTarget: targetPlot });
    }, { passive: false });

    FARM_BOX.addEventListener('touchmove', (event) => {
        if (!isMouseDown) return;
        event.preventDefault();
        const touch = event.touches[0];
        const targetPlot = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.farm-plot');
        if (targetPlot) handlePlotClick({ currentTarget: targetPlot });
    }, { passive: false });

    document.addEventListener('touchend', () => isMouseDown = false);
}

function handlePlotClick(event) {
    const plotElement = event.currentTarget;
    if (!plotElement || !plotElement.dataset) return;

    const index = parseInt(plotElement.dataset.index);
    const plotData = gameData.farmPlots[index];

    // 種まき
    if (selectedSeed) {
        if (plotData) return;

        const seedPrice = PRICE_BASE[selectedSeed].seedPrice;
        if (gameData.money < seedPrice) {
            showOverlay('alert', 'お金が足りません！');
        } else {
            gameData.money -= seedPrice;
            gameData.farmPlots[index] = { cropId: selectedSeed, plantedMonth: gameData.month };
            updateInfoPanel();
            renderFarmPlots();
        }
    }
    // 収穫
    else if (isHarvesting) {
        if (!plotData || !plotElement.classList.contains('ready-to-harvest')) return;

        const cropId = plotData.cropId;
        const currentPrice = getCurrentPrice(cropId);

        if (currentPrice === undefined) {
            alert('価格データエラー');
            return;
        }

        gameData.money += currentPrice;
        gameData.farmPlots[index] = null;
        updateInfoPanel();
        renderFarmPlots();
    }
}

function renderFarmPlots() {
    const plotElements = FARM_BOX.querySelectorAll('.farm-plot');
    gameData.farmPlots.forEach((plotData, index) => {
        updatePlotDisplay(plotElements[index], plotData);
    });
}

function updatePlotDisplay(plotElement, plotData) {
    plotElement.className = 'farm-plot';
    plotElement.textContent = '';

    if (plotData) {
        const cropId = plotData.cropId;
        const base = PRICE_BASE[cropId];
        const growTime = base.growTime;
        const remainingMonths = (plotData.plantedMonth + growTime) - gameData.month;
        const isReady = remainingMonths <= 0;

        plotElement.classList.add('growing', cropId);

        if (isReady) {
            plotElement.classList.add('ready-to-harvest');
            plotElement.textContent = '完成！';
        } else {
            plotElement.innerHTML = `${base.label}<br>(${remainingMonths})`;
        }
    } else {
        plotElement.classList.add('empty');
    }
}

// =========================================================================
// 5. マーケット・UI 関連ロジック
// =========================================================================
function initTabSwitcher() {
    const tabsContainer = document.getElementById('side-panel-tabs');
    tabsContainer.addEventListener('mousedown', (event) => {
        const clickedButton = event.target.closest('button.tab-button');
        if (!clickedButton) return;

        const tabId = clickedButton.id.replace('tab-', '');

        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        clickedButton.classList.add('active');
        document.getElementById(`content-${tabId}`).classList.add('active');
    });
}

function handleItemSlotClick(event) {
    const slotElement = event.currentTarget;
    if (!slotElement || !slotElement.id.startsWith('seed-button')) return;

    const cropId = getCropIdFromSeedButtonId(slotElement.id);

    if (selectedSeed === cropId) {
        resetSelection();
    } else {
        resetSelection();
        selectedSeed = cropId;
        slotElement.classList.add('selected');
        FARM_BOX.classList.add('planting-mode');
    }
}

function handleHarvestClick() {
    if (isHarvesting) {
        resetSelection();
    } else {
        resetSelection();
        isHarvesting = true;
        HARVEST_BUTTON.classList.add('active');
        FARM_BOX.classList.add('harvest-mode');
    }
}

function resetSelection() {
    selectedSeed = null;
    isHarvesting = false;
    document.querySelectorAll('.item-slot').forEach(slot => slot.classList.remove('selected'));
    if (HARVEST_BUTTON) HARVEST_BUTTON.classList.remove('active');
    if (FARM_BOX) {
        FARM_BOX.classList.remove('planting-mode');
        FARM_BOX.classList.remove('harvest-mode');
    }
}

function getCropIdFromSeedButtonId(buttonId) {
    if (buttonId.includes('lettuce')) return 'lettuce';
    if (buttonId.includes('carot')) return 'carrot';
    if (buttonId.includes('tomato')) return 'tomato';
    if (buttonId.includes('onion')) return 'onion';
    return null;
}

function updateInfoPanel() {
    const monthIndexInYear = (gameData.month - 1) % 12;
    const seasons = ['春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬', '冬', '冬'];
    gameData.season = seasons[monthIndexInYear];

    MONEY_DISPLAY.textContent = `${gameData.money} 円`;
    DATE_DISPLAY.textContent = `${gameData.month}ヶ月目 ${gameData.season}`;
}

// =========================================================================
// 6. ゲーム進行・価格ロジック
// =========================================================================
function handleNextMonthClick() {
    if (ENABLE_GAME_TIMER && gameData.month > GAME_DURATION_MONTHS) {
        showGameResult();
        return;
    }

    gameData.month++;

    if (ENABLE_GAME_TIMER && gameData.month === GAME_DURATION_MONTHS) {
        NEXT_MONTH_BUTTON.textContent = "終了";
        NEXT_MONTH_BUTTON.style.backgroundColor = "#e74c3c";
        NEXT_MONTH_BUTTON.style.color = "white";
    }

    if (ENABLE_GAME_TIMER && gameData.month > GAME_DURATION_MONTHS) {
        showGameResult();
        return;
    }

    const shouldFluctuate = (gameData.month % 2 !== 0);
    for (const cropId in gameData.priceHistory) {
        const history = gameData.priceHistory[cropId];
        if (shouldFluctuate) {
            history.push(generateMonthlyPrice(cropId));
        }
    }

    resetSelection();
    isHarvesting = true;
    HARVEST_BUTTON.classList.add('active');

    updateInfoPanel();
    if (shouldFluctuate) renderPriceChart();
    renderFarmPlots();
}

function generateInitialHistory() {
    const PAST_HISTORY_COUNT = 6;
    for (let i = 0; i < PAST_HISTORY_COUNT + 1; i++) {
        for (const cropId in gameData.priceHistory) {
            gameData.priceHistory[cropId].push(generateMonthlyPrice(cropId));
        }
    }
}

function generateMonthlyPrice(cropId) {
    const base = PRICE_BASE[cropId];
    let changeRate;

    if (cropId === 'lettuce') {
        changeRate = (Math.random() * (base.maxVolatility - base.minVolatility)) + base.minVolatility;
    } else {
        changeRate = (Math.random() * 2 * base.volatility) - base.volatility;
    }

    let newPrice = Math.round(base.basePrice * (1 + changeRate));
    
    if (newPrice < base.seedPrice + 10) newPrice = base.seedPrice + 10;
    if (newPrice > base.basePrice * 2) newPrice = base.basePrice * 2;

    return newPrice;
}

function getCurrentPrice(cropId) {
    const history = gameData.priceHistory[cropId];
    return history[history.length - 1];
}

function updateCurrentPrices() {
    for (const cropId in gameData.priceHistory) {
        const currentPrice = getCurrentPrice(cropId);
        const cropName = PRICE_BASE[cropId].mark;

        if (currentPrice === undefined) continue;

        let baseId = cropId;

        // ねだんタブ更新
        const elPrice = document.getElementById(`price-${baseId}`);
        if (elPrice) elPrice.innerHTML = `${cropName}<br>${currentPrice} 円`;

        // ノートタブ更新
        const elNote = document.getElementById(`note-price-${baseId}`);
        if (elNote) elNote.textContent = `今のねだん：${currentPrice} 円`;

        // マーケットタブ更新
        const elMarket = document.getElementById(`market-price-${baseId}`);
        if (elMarket) elMarket.textContent = `今のねだん: ${currentPrice} 円`;
    }
}

function showGameResult() {
    if (NEXT_MONTH_BUTTON) {
        NEXT_MONTH_BUTTON.disabled = false;
        NEXT_MONTH_BUTTON.textContent = "結果";
        NEXT_MONTH_BUTTON.style.backgroundColor = "#f39c12";
        NEXT_MONTH_BUTTON.style.color = "white";
    }
    if (HARVEST_BUTTON) {
        HARVEST_BUTTON.disabled = true;
        HARVEST_BUTTON.style.backgroundColor = "gray";
    }

    const surveyLink = "https://forms.gle/4B6jshohSmWRDudG9";

    const message = `${GAME_DURATION_MONTHS}ヶ月間 おつかれさまでした！<br>` +
        `あなたの おかね は <strong>${gameData.money} 円</strong> です。<br><br>` +
        `<a id="survey-link-button" href="${surveyLink}" target="_blank">アンケートにご協力ください &#10148;</a>`;

    const resultMessageEl = document.getElementById('result-message');
    if (resultMessageEl) resultMessageEl.innerHTML = message;

    const overlay = document.getElementById('overlay');
    if (overlay) showOverlay('result', message);

    DATE_DISPLAY.textContent = "ゲーム終了";
    DATE_DISPLAY.style.color = "red";
}

// =========================================================================
// 7. グラフ描画 (Chart.js)
// =========================================================================
function renderPriceChart() {
    const ctx = document.getElementById('line')?.getContext('2d');
    if (!ctx) return;

    const data = getChartData();
    const suggestedMax = Math.ceil(Math.max(...data.datasets.flatMap(d => d.data)) / 100) * 100;
    const suggestedMin = Math.floor(PRICE_BASE.lettuce.seedPrice / 10) * 10;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        title: { display: true, text: 'ねだんチャート', fontSize: 16 },
        scales: {
            xAxes: [{ scaleLabel: { display: true, labelString: '時間' } }],
            yAxes: [{
                scaleLabel: { display: true, labelString: 'ねだん (円)' },
                ticks: { beginAtZero: false, suggestedMax, suggestedMin }
            }]
        }
    };

    if (priceChartInstance) {
        priceChartInstance.data = data;
        priceChartInstance.options.scales.yAxes[0].ticks.suggestedMax = suggestedMax;
        priceChartInstance.update();
    } else {
        priceChartInstance = new Chart(ctx, { type: 'line', data: data, options: chartOptions });
    }
    updateCurrentPrices();
}

function getChartData() {
    const numDataPoints = gameData.priceHistory.lettuce.length;
    const latestIndex = numDataPoints - 1;

    const labels = Array.from({ length: numDataPoints }, (_, i) => {
        const monthsAgo = (latestIndex - i) * 2;
        return monthsAgo === 0 ? '今' : `${monthsAgo}ヶ月前`;
    });

    const datasets = [];
    for (const cropId in gameData.priceHistory) {
        const base = PRICE_BASE[cropId];
        datasets.push({
            label: base.label,
            borderColor: base.color,
            backgroundColor: "rgba(0,0,0,0)",
            pointBackgroundColor: base.color,
            data: gameData.priceHistory[cropId],
            lineTension: 0.2
        });
    }
    return { labels, datasets };
}

// =========================================================================
// 8. 汎用オーバーレイ表示関数
// =========================================================================
function showOverlay(type, message = '') {
    const overlay = document.getElementById('overlay');
    const alertSection = document.getElementById('alert-section');
    const resultSection = document.getElementById('result-section');
    const helpSection = document.getElementById('help-section');
    const hintSection = document.getElementById('hint-section');
    const alertMessageEl = document.getElementById('alert-message');

    if (!overlay) return;

    [alertSection, resultSection, helpSection, hintSection].forEach(el => {
        if (el) el.style.display = 'none';
    });

    if (type === 'alert') {
        if (alertSection) {
            alertSection.style.display = 'block';
            if (alertMessageEl) alertMessageEl.textContent = message;
        }
    } else if (type === 'result') {
        if (resultSection) resultSection.style.display = 'block';
    } else if (type === 'help') {
        if (helpSection) helpSection.style.display = 'block';
    } else if (type === 'hint') {
        if (hintSection) hintSection.style.display = 'block';
    }

    overlay.style.display = 'flex';
}

// ヘルプ用ページ送り
let currentHelpPage = 1;
const totalHelpPages = 8;

function changeHelpPage(direction) {
    const nextPage = currentHelpPage + direction;
    if (nextPage < 1 || nextPage > totalHelpPages) return;

    document.getElementById(`help-page-${currentHelpPage}`).style.display = 'none';
    document.getElementById(`help-page-${nextPage}`).style.display = 'block';

    currentHelpPage = nextPage;
    updateHelpControls();
}

function updateHelpControls() {
    const prevBtn = document.getElementById('help-prev-button');
    const nextBtn = document.getElementById('help-next-button');
    
    if (currentHelpPage === 1) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'inline';
    }

    if (currentHelpPage === totalHelpPages) {
        nextBtn.innerHTML = `<span style="color: black;">${currentHelpPage} / ${totalHelpPages}</span>`;
    } else {
        nextBtn.innerHTML = `<span style = "color: black;"> ${currentHelpPage} / ${totalHelpPages}</span > ▶`;
    }
}

updateHelpControls();