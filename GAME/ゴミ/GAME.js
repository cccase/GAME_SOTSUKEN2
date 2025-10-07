const farmArea = document.getElementById('farm-area');
const moneyDisplay = document.getElementById('money');
const dateDisplay = document.getElementById('date');
const seasonDisplay = document.getElementById('season');
const nextDayBtn = document.getElementById('next-day-btn');
const toolPlantBtn = document.getElementById('tool-plant');
const toolHarvestBtn = document.getElementById('tool-harvest');
const seedListDiv = document.getElementById('seed-list');
const plantSound = document.getElementById('plant-sound');
const harvestSound = document.getElementById('harvest-sound');
const landUsedDisplay = document.getElementById('land-used');
const landTotalDisplay = document.getElementById('land-total');

let gameData = {
    money: 1000,
    day: 1,
    season: '春',
    farm: [],
    currentTool: 'plant',
    selectedSeed: null,
    farmWidth: 10,
    farmHeight: 10,
    landUsed: 0,
    isMouseDown: false,
    actionInterval: null
};

const SEEDS = [
    { id: 'lettuce', name: 'レタス', className: 'lettuce', price: 20, harvestAmount: 1, growTime: 2, sellPrice: 20, landSize: 1 },
    { id: 'carrot', name: 'ニンジン', className: 'carrot', price: 50, harvestAmount: 3, growTime: 3, sellPrice: 20, landSize: 1 },
    { id: 'tomato', name: 'トマト', className: 'tomato', price: 100, harvestAmount: 5, growTime: 5, sellPrice: 30, landSize: 1 },
    { id: 'corn', name: 'トウモロコシ', className: 'corn', price: 150, harvestAmount: 7, growTime: 7, sellPrice: 40, landSize: 1 }
];

function initFarm() {
    farmArea.innerHTML = '';
    gameData.farm = [];
    for (let y = 0; y < gameData.farmHeight; y++) {
        gameData.farm[y] = [];
        for (let x = 0; x < gameData.farmWidth; x++) {
            const cell = document.createElement('div');
            cell.classList.add('farm-cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            farmArea.appendChild(cell);
            gameData.farm[y][x] = {
                isEmpty: true,
                crop: null,
                plantedDay: null,
                growStage: 0
            };
        }
    }
    gameData.landTotal = gameData.farmWidth * gameData.farmHeight;
    updateInfoPanel();
}

function updateInfoPanel() {
    moneyDisplay.textContent = gameData.money;
    dateDisplay.textContent = `${gameData.day}日目`;
    seasonDisplay.textContent = gameData.season;
    landUsedDisplay.textContent = gameData.landUsed;
    landTotalDisplay.textContent = gameData.landTotal;
}

function populateMarket() {
    seedListDiv.innerHTML = '';
    SEEDS.forEach(seed => {
        const seedItem = document.createElement('div');
        seedItem.classList.add('seed-item');
        
        const dailyProfit = ((seed.harvestAmount * seed.sellPrice) - seed.price) / seed.growTime;
        const landProfit = (seed.harvestAmount * seed.sellPrice - seed.price) / seed.landSize;

        seedItem.innerHTML = `
            <h4>${seed.name}</h4>
            <p>価格: ${seed.price}G</p>
            <p>収穫まで: ${seed.growTime}日</p>
            <p><strong>1日あたりの利益: ${dailyProfit.toFixed(1)}G</strong></p>
            <p><strong>1マスあたりの利益: ${landProfit.toFixed(1)}G</strong></p>
            <button data-seed-id="${seed.id}">この種を植える</button>
        `;
        seedItem.querySelector('button').addEventListener('click', () => {
            gameData.selectedSeed = seed;
            toolPlantBtn.click();
        });
        seedListDiv.appendChild(seedItem);
    });
}

// 連続操作のための新しいイベントハンドラー群
function onFarmAreaMouseDown(event) {
    gameData.isMouseDown = true;
    const targetCell = event.target.closest('.farm-cell');
    if (targetCell) {
        // 初回の操作を実行
        performAction(targetCell);

        // 連続操作のタイマーを設定
        gameData.actionInterval = setInterval(() => {
            if (gameData.isMouseDown) {
                // マウスポインターの下にある要素を取得
                const hoveredCell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.farm-cell');
                if (hoveredCell) {
                    performAction(hoveredCell);
                }
            }
        }, 100); // 100msごとに実行
    }
}

function onFarmAreaMouseUp() {
    gameData.isMouseDown = false;
    clearInterval(gameData.actionInterval);
    // 長押しを離しても、音が1ループは再生するように修正
    if (!plantSound.paused) {
        plantSound.loop = false;
    }
    if (!harvestSound.paused) {
        harvestSound.loop = false;
    }
}

function onFarmAreaMouseLeave() {
    // マウスがエリア外に出たときも同様の処理
    onFarmAreaMouseUp();
}

// 植え付けまたは収穫を実行する共通関数
function performAction(cellElement) {
    const x = parseInt(cellElement.dataset.x);
    const y = parseInt(cellElement.dataset.y);
    const cellData = gameData.farm[y][x];

    if (gameData.currentTool === 'plant' && gameData.selectedSeed) {
        if (cellData.isEmpty && gameData.money >= gameData.selectedSeed.price && gameData.landUsed < gameData.landTotal) {
            gameData.money -= gameData.selectedSeed.price;
            cellData.isEmpty = false;
            cellData.crop = gameData.selectedSeed;
            cellData.plantedDay = gameData.day;
            cellData.growStage = 0;
            gameData.landUsed += gameData.selectedSeed.landSize;

            const cropVisual = document.createElement('div');
            cropVisual.classList.add('crop-visual', gameData.selectedSeed.className);
            cellElement.appendChild(cropVisual);
            cellElement.classList.add('planted');
            
            if (plantSound.paused) {
                plantSound.loop = true;
                plantSound.play();
            }
            updateInfoPanel();
        }
    } else if (gameData.currentTool === 'harvest') {
        if (!cellData.isEmpty && cellData.growStage === 3) {
            harvestCrop(x, y, cellElement);
            if (harvestSound.paused) {
                harvestSound.loop = true;
                harvestSound.play();
            }
        }
    }
}

farmArea.addEventListener('mousedown', onFarmAreaMouseDown);
farmArea.addEventListener('mouseup', onFarmAreaMouseUp);
farmArea.addEventListener('mouseleave', onFarmAreaMouseLeave);

function harvestCrop(x, y, cellElement) {
    const cellData = gameData.farm[y][x];
    gameData.money += cellData.crop.harvestAmount * cellData.crop.sellPrice;
    gameData.landUsed -= cellData.crop.landSize;

    cellElement.classList.add('harvesting');
    
    cellElement.querySelector('.crop-visual').addEventListener('animationend', () => {
        cellElement.innerHTML = '';
        cellElement.classList.remove('planted', 'harvesting', 'ready-to-harvest', 'selected-for-harvest');
        cellData.isEmpty = true;
        cellData.crop = null;
        cellData.plantedDay = null;
        cellData.growStage = 0;
        updateInfoPanel();
    }, { once: true });
}

nextDayBtn.addEventListener('click', () => {
    gameData.day++;
    if (gameData.day % 30 === 1 && gameData.day > 1) {
        const seasons = ['春', '夏', '秋', '冬'];
        const currentSeasonIndex = seasons.indexOf(gameData.season);
        gameData.season = seasons[(currentSeasonIndex + 1) % 4];
    }
    
    for (let y = 0; y < gameData.farmHeight; y++) {
        for (let x = 0; x < gameData.farmWidth; x++) {
            const cellData = gameData.farm[y][x];
            if (!cellData.isEmpty && cellData.crop) {
                const daysPassed = gameData.day - cellData.plantedDay;
                const cellElement = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (daysPassed >= cellData.crop.growTime) {
                    cellData.growStage = 3;
                    if (!cellElement.classList.contains('ready-to-harvest')) {
                         cellElement.classList.add('ready-to-harvest');
                    }
                }
            }
        }
    }
    updateInfoPanel();
});

toolPlantBtn.addEventListener('click', () => {
    gameData.currentTool = 'plant';
    toolPlantBtn.classList.add('active');
    toolHarvestBtn.classList.remove('active');
});

toolHarvestBtn.addEventListener('click', () => {
    gameData.currentTool = 'harvest';
    toolHarvestBtn.classList.add('active');
    toolPlantBtn.classList.remove('active');
});

initFarm();
populateMarket();
updateInfoPanel();