// GAME.js: タブ切り替え機能（Button ID方式）
document.addEventListener('DOMContentLoaded', initTabSwitcher);

function initTabSwitcher() {
    const tabsContainer = document.getElementById('side-panel-tabs');

    tabsContainer.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('button.tab-button');
        if (!clickedButton) return;

        const buttonId = clickedButton.id;
        const tabId = buttonId.replace('tab-', '');

        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        clickedButton.classList.add('active');
        document.getElementById(`content-${tabId}`).classList.add('active');
    });
}


// =========================================================================
// FARM LOGIC: 畑管理ロジック
// =========================================================================

const FARM_SIZE = 10;
const FARM_BOX = document.getElementById('farm-box');
const HARVEST_BUTTON = document.getElementById('farm-button');

// 畑の選択状態
let selectedSeed = null; 
let isHarvesting = false; 
let isMouseDown = false; 

function getCropIdFromSeedButtonId(buttonId) {
    if (buttonId.includes('letus')) return 'lettuce';
    if (buttonId.includes('carot')) return 'carrot';
    if (buttonId.includes('tomato')) return 'tomato';
    if (buttonId.includes('onion')) return 'onion';
    return null;
}

function initFarmGrid() {
    FARM_BOX.style.gridTemplateColumns = `repeat(${FARM_SIZE}, 1fr)`;
    FARM_BOX.innerHTML = ''; 

    for (let i = 0; i < FARM_SIZE * FARM_SIZE; i++) {
        const plot = document.createElement('div');
        plot.classList.add('farm-plot');
        plot.dataset.index = i;

        // 1. クリック開始 または ドラッグ開始 (PC)
        plot.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return; 
            isMouseDown = true;
            handlePlotClick(event); 
        });

        // 2. ドラッグ中の連続実行 (PC)
        plot.addEventListener('mouseover', (event) => {
            if (isMouseDown) {
                handlePlotClick(event);
            }
        });

        FARM_BOX.appendChild(plot);
    }
    
    // 3. ドラッグ終了 (PC)
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    // 4. モバイル対応 (タッチイベント)
    FARM_BOX.addEventListener('touchstart', (event) => {
        isMouseDown = true;
        event.preventDefault(); 
        
        const targetPlot = event.touches[0].target.closest('.farm-plot');
        if (targetPlot) {
             handlePlotClick({ currentTarget: targetPlot });
        }
    }, { passive: false });

    // 5. ドラッグ中の連続実行 (モバイル)
    FARM_BOX.addEventListener('touchmove', (event) => {
        if (!isMouseDown) return;
        event.preventDefault(); 

        const touch = event.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetPlot = element ? element.closest('.farm-plot') : null;

        if (targetPlot) {
            handlePlotClick({ currentTarget: targetPlot });
        }
    }, { passive: false }); 

    // 6. ドラッグ終了 (モバイル)
    document.addEventListener('touchend', () => {
        isMouseDown = false;
    });
}

function updatePlotDisplay(plotElement, plotData) {
    plotElement.className = 'farm-plot'; 
    plotElement.textContent = ''; 

    if (plotData) {
        const cropId = plotData.cropId;
        const base = PRICE_BASE[cropId];
        const growTime = base.growTime;
        const currentMonth = gameData.month;
        const plantedMonth = plotData.plantedMonth;

        const isReady = currentMonth >= plantedMonth + growTime;
        const remainingMonths = (plantedMonth + growTime) - currentMonth;

        plotElement.classList.add('growing'); 
        plotElement.classList.add(cropId); 

        if (isReady) {
            plotElement.classList.add('ready-to-harvest');
            plotElement.textContent = '収穫可能';
        } else {
            plotElement.innerHTML = `${base.label}<br>(${remainingMonths}M)`;
        }
    } else {
        plotElement.classList.add('empty');
    }
}

function renderFarmPlots() {
    const plotElements = FARM_BOX.querySelectorAll('.farm-plot');
    gameData.farmPlots.forEach((plotData, index) => {
        updatePlotDisplay(plotElements[index], plotData);
    });
}

function handlePlotClick(event) {
    const plotElement = event.currentTarget;
    if (!plotElement || !plotElement.dataset) return; 

    const index = parseInt(plotElement.dataset.index);
    if (isNaN(index)) return; 
    
    const plotData = gameData.farmPlots[index];

    // 1. 種まきモード
    if (selectedSeed) {
        if (plotData) {
            return;
        }

        const seedPrice = PRICE_BASE[selectedSeed].seedPrice;

        if (gameData.money < seedPrice) {
            alert('お金が足りません！'); 
        } else {
            gameData.money -= seedPrice;
            gameData.farmPlots[index] = {
                cropId: selectedSeed,
                plantedMonth: gameData.month
            };
            updateInfoPanel();
            renderFarmPlots();
        }
    }
    // 2. 収穫モード
    else if (isHarvesting) {
        if (!plotData || !plotElement.classList.contains('ready-to-harvest')) {
            return;
        }

        const cropId = plotData.cropId;
        const currentPrice = gameData.priceHistory[cropId][gameData.priceHistory[cropId].length - 1];

        if (currentPrice === undefined) {
            alert('価格データが不正です。収穫を中止します。');
            return;
        }

        gameData.money += currentPrice;
        gameData.farmPlots[index] = null;
        updateInfoPanel();
        renderFarmPlots();
    }
}

function handleItemSlotClick(event) {
    const slotElement = event.currentTarget; 
    if (!slotElement || !slotElement.id.startsWith('seed-button')) return;

    const cropId = getCropIdFromSeedButtonId(slotElement.id);

    if (selectedSeed === cropId) {
        selectedSeed = null;
        slotElement.classList.remove('selected');
        FARM_BOX.classList.remove('planting-mode');
    } else {
        selectedSeed = cropId;
        isHarvesting = false;
        
        document.querySelectorAll('.item-slot').forEach(slot => slot.classList.remove('selected'));
        HARVEST_BUTTON.classList.remove('active');

        slotElement.classList.add('selected');
        FARM_BOX.classList.add('planting-mode');
    }
}

function handleHarvestClick() {
    selectedSeed = null;
    document.querySelectorAll('.item-slot').forEach(slot => slot.classList.remove('selected'));
    FARM_BOX.classList.remove('planting-mode');

    if (isHarvesting) {
        isHarvesting = false;
        HARVEST_BUTTON.classList.remove('active');
    } else {
        isHarvesting = true;
        HARVEST_BUTTON.classList.add('active');
    }
}

// =========================================================================
// GAME CORE LOGIC: 月単位進行と価格変動ロジック
// =========================================================================

const moneyDisplay = document.querySelector('#gold-box');
const dateDisplay = document.querySelector('#date-box');
const nextMonthBtn = document.getElementById('next-month-button');

const ENABLE_GAME_TIMER = true;
const GAME_DURATION_MONTHS = 12; 

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

const PRICE_BASE = {
    'lettuce': {
        seedPrice: 50,      
        basePrice: 160,     
        growTime: 1,        
        maxVolatility: 0.35,    
        minVolatility: -0.50,   
        label: 'レタス', color: 'rgba(50, 205, 50, 0.8)'
    },
    'carrot': {
        seedPrice: 100,
        basePrice: 280,
        growTime: 2,
        volatility: 0.1,    
        label: 'ニンジン', color: 'rgba(255, 140, 0, 0.8)'
    },
    'tomato': {
        seedPrice: 120,
        basePrice: 450,
        growTime: 3,
        volatility: 0.35,   
        label: 'トマト', color: 'rgba(220, 20, 60, 0.8)'
    },
    'onion': {
        seedPrice: 150,
        basePrice: 550,
        growTime: 4,
        volatility: 0.1,    
        label: 'タマネギ', color: 'rgba(100, 149, 237, 0.8)'
    }
};
let priceChartInstance = null; 

function updateInfoPanel() {
    const monthIndexInYear = (gameData.month - 1) % 12;
    const seasons = ['春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬', '冬', '冬'];
    gameData.season = seasons[monthIndexInYear];

    moneyDisplay.textContent = `${gameData.money} 円`;
    dateDisplay.textContent = `${gameData.month}ヶ月目 ${gameData.season}`;
}

// 現在の価格を各タブに表示する関数（修正版）
function updateCurrentPrices() {
    for (const cropId in gameData.priceHistory) {
        const history = gameData.priceHistory[cropId];
        const lastPrice = history[history.length - 1]; 
        const cropName = PRICE_BASE[cropId].label;

        let elementId;
        if (cropId === 'lettuce') elementId = 'price-lettuce';
        else if (cropId === 'carrot') elementId = 'price-carrot';
        else if (cropId === 'tomato') elementId = 'price-tomato';
        else if (cropId === 'onion') elementId = 'price-onion';

        // 1. ねだんタブの価格更新
        const priceElement = document.getElementById(elementId);
        if (priceElement && lastPrice !== undefined) {
            priceElement.textContent = `${cropName} うるねだん: ${lastPrice} 円`;
        }

        // 2. ノートタブの価格更新
        const noteElement = document.getElementById(`note-${elementId}`);
        if (noteElement && lastPrice !== undefined) {
            noteElement.textContent = `いまのうるねだん：${lastPrice} 円`;
        }

        // 3. マーケットタブ（ボタン内）の価格更新（新規追加）
        const marketPriceElement = document.getElementById(`market-price-${cropId}`);
        if (marketPriceElement && lastPrice !== undefined) {
            marketPriceElement.textContent = `いまのうるねだん: ${lastPrice} 円`;
        }
    }
}

function generateMonthlyPrice(cropId) {
    const base = PRICE_BASE[cropId];
    const basePrice = base.basePrice;
    let changeRate;

    if (cropId === 'lettuce') {
        const min = base.minVolatility;
        const max = base.maxVolatility;
        changeRate = (Math.random() * (max - min)) + min;
    } else {
        const volatility = base.volatility;
        changeRate = (Math.random() * 2 * volatility) - volatility;
    }

    let newPrice = basePrice * (1 + changeRate);

    if (newPrice < base.seedPrice + 10) {
        newPrice = base.seedPrice + 10;
    }
    if (newPrice > base.basePrice * 2) {
        newPrice = base.basePrice * 2;
    }

    return Math.round(newPrice);
}

function getChartData() {
    const numDataPoints = gameData.priceHistory.lettuce.length;
    const latestIndex = numDataPoints - 1;
    
    const latestDataMonth = gameData.month % 2 === 0 ? gameData.month - 1 : gameData.month;

    const labels = Array.from({ length: numDataPoints }, (_, i) => {
        const indexDiff = latestIndex - i; 
        const monthOfDataPoint = latestDataMonth - (indexDiff * 2);
        const monthsAgo = gameData.month - monthOfDataPoint;

        if (monthsAgo === 0) {
            return '今'; 
        } else {
            return `${monthsAgo}ヶ月まえ`;
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
            text: '価格変動チャート (現在を「今」として表示)',
            fontSize: 16
        },
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: '現在からの時間'
                }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'うるねだん (円)'
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

    updateCurrentPrices();
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        if (ENABLE_GAME_TIMER && gameData.month > GAME_DURATION_MONTHS) {
            showGameResult(); 
            return; 
        }

        gameData.month++;

        if (ENABLE_GAME_TIMER && gameData.month === GAME_DURATION_MONTHS) {
            nextMonthBtn.textContent = "終了";
            nextMonthBtn.style.backgroundColor = "#dc3545"; 
            nextMonthBtn.style.color = "white";
        }
        
        if (ENABLE_GAME_TIMER && gameData.month > GAME_DURATION_MONTHS) {
            showGameResult();
            return; 
        }

        const shouldFluctuate = (gameData.month % 2 !== 0);

        for (const cropId in gameData.priceHistory) {
            const history = gameData.priceHistory[cropId];

            if (shouldFluctuate) {
                const newPrice = generateMonthlyPrice(cropId);
                history.push(newPrice); 
            }
        }

        selectedSeed = null;
        isHarvesting = true; 
        document.querySelectorAll('.item-slot').forEach(btn => btn.classList.remove('selected'));
        HARVEST_BUTTON?.classList.add('active');
        FARM_BOX?.classList.remove('planting-mode');
        
        updateInfoPanel();

        if (shouldFluctuate) {
            renderPriceChart();
        }

        renderFarmPlots();
    });
}

function showGameResult() {
    if (nextMonthBtn) {
        nextMonthBtn.disabled = true;
        nextMonthBtn.textContent = "おわり";
        nextMonthBtn.style.backgroundColor = "#6c757d"; 
    }
    if (HARVEST_BUTTON) {
        HARVEST_BUTTON.disabled = true;
        HARVEST_BUTTON.style.backgroundColor = "#6c757d";
    }

    alert(
        `${GAME_DURATION_MONTHS}ヶ月間 お疲れさまでした！\n\n` +
        `最終的な おかね は ${gameData.money} 円 です。\n\n` +
        `（リロードしてもう一度あそべます）`
    );

    dateDisplay.textContent = "ゲーム終了";
    dateDisplay.style.color = "red";
    dateDisplay.style.fontWeight = "bold";
}

document.addEventListener('DOMContentLoaded', () => {
    const PAST_HISTORY_COUNT = 6;

    for (let i = 0; i < PAST_HISTORY_COUNT; i++) {
        for (const cropId in gameData.priceHistory) {
            const newPrice = generateMonthlyPrice(cropId);
            gameData.priceHistory[cropId].push(newPrice);
        }
    }

    for (const cropId in gameData.priceHistory) {
        const newPrice = generateMonthlyPrice(cropId);
        gameData.priceHistory[cropId].push(newPrice);
    }

    updateInfoPanel(); 
    updateCurrentPrices(); 

    const tabPriceBtn = document.getElementById('tab-price');
    if (tabPriceBtn) {
        tabPriceBtn.addEventListener('click', () => {
            setTimeout(renderPriceChart, 10);
        });
    }

    initFarmGrid();

    document.querySelectorAll('.item-slot').forEach(slotElement => {
        if (slotElement.querySelector('.market-button')) {
            slotElement.addEventListener('click', handleItemSlotClick);
        }
    });

    if (HARVEST_BUTTON) {
        HARVEST_BUTTON.addEventListener('click', handleHarvestClick);
    }
});