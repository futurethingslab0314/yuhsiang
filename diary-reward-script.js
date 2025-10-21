// === 像素風格日記獎勵系統 - 完全符合 Pixel Art Game Interface ===

// 全域變數
let currentCoinCount = 0;
let totalRewards = 0;
let isRecording = false;
let recognition = null;
let coinPositions = [];

// DOM 元素
const coinStackContainer = document.getElementById('coinStackContainer');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeBtn = document.getElementById('closeBtn');
const textModeBtn = document.getElementById('textModeBtn');
const voiceModeBtn = document.getElementById('voiceModeBtn');
const diaryTextarea = document.getElementById('diaryTextarea');
const voiceRecording = document.getElementById('voiceRecording');
const voiceStatus = document.getElementById('voiceStatus');
const recordBtn = document.getElementById('recordBtn');
const submitBtn = document.getElementById('submitBtn');
const progressFill = document.getElementById('progressFill');
const currentProgress = document.getElementById('currentProgress');
const todayGain = document.getElementById('todayGain');
const todayGainToast = document.getElementById('todayGainToast');
const toastAmount = document.getElementById('toastAmount');
const dateDisplay = document.getElementById('dateDisplay');
const coinTestBtn = document.getElementById('coinTestBtn');
const fillTestBtn = document.getElementById('fillTestBtn');
const targetTestBtn = document.getElementById('targetTestBtn');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadState();
    updateDateDisplay();
});

// 初始化應用
function initializeApp() {
    console.log('像素風格日記系統已啟動');
    
    // 初始化語音識別
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'zh-TW';
        
        recognition.onstart = function() {
            voiceStatus.textContent = '正在聆聽...';
            recordBtn.textContent = '🛑 停止錄音';
            recordBtn.classList.add('recording');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            diaryTextarea.value = transcript;
            voiceStatus.textContent = '錄音完成';
        };
        
        recognition.onend = function() {
            isRecording = false;
            recordBtn.textContent = '🎤 開始錄音';
            recordBtn.classList.remove('recording');
        };
        
        recognition.onerror = function(event) {
            console.error('語音識別錯誤:', event.error);
            voiceStatus.textContent = '錄音失敗，請重試';
            isRecording = false;
            recordBtn.textContent = '🎤 開始錄音';
            recordBtn.classList.remove('recording');
        };
    } else {
        console.warn('此瀏覽器不支援語音識別');
        voiceModeBtn.disabled = true;
        voiceModeBtn.textContent = '🎤 不支援';
    }
}

// 設定事件監聽器
function setupEventListeners() {
    // 設定按鈕
    settingsBtn.addEventListener('click', toggleSettings);
    closeBtn.addEventListener('click', closeSettings);
    
    // 點擊面板外側關閉
    document.addEventListener('click', function(e) {
        if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
            closeSettings();
        }
    });
    
    // 輸入模式切換
    textModeBtn.addEventListener('click', () => switchInputMode('text'));
    voiceModeBtn.addEventListener('click', () => switchInputMode('voice'));
    
    // 語音錄製
    recordBtn.addEventListener('click', toggleRecording);
    
    // 提交按鈕
    submitBtn.addEventListener('click', submitDiary);
    
    // 測試按鈕
    coinTestBtn.addEventListener('click', testCoinAnimation);
    fillTestBtn.addEventListener('click', testFillData);
    targetTestBtn.addEventListener('click', testShowPrint);
}

// 切換設定面板
function toggleSettings() {
    settingsPanel.classList.toggle('hidden');
}

function closeSettings() {
    settingsPanel.classList.add('hidden');
}

// 切換輸入模式
function switchInputMode(mode) {
    if (mode === 'text') {
        textModeBtn.classList.add('active');
        voiceModeBtn.classList.remove('active');
        diaryTextarea.classList.remove('hidden');
        voiceRecording.classList.add('hidden');
    } else {
        textModeBtn.classList.remove('active');
        voiceModeBtn.classList.add('active');
        diaryTextarea.classList.add('hidden');
        voiceRecording.classList.remove('hidden');
    }
}

// 切換錄音狀態
function toggleRecording() {
    if (!recognition) return;
    
    if (isRecording) {
        recognition.stop();
        isRecording = false;
    } else {
        recognition.start();
        isRecording = true;
    }
}

// 提交日記
async function submitDiary() {
    const diaryText = diaryTextarea.value.trim();
    
    if (!diaryText) {
        alert('請輸入日記內容');
        return;
    }
    
    // 顯示分析中
    submitBtn.textContent = '分析中...';
    submitBtn.disabled = true;
    
    try {
        // 模擬 AI 分析延遲
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 模擬分析結果（5-30 枚硬幣）
        const rewardCount = Math.floor(Math.random() * 26) + 5;
        
        // 更新狀態
        currentCoinCount += rewardCount;
        totalRewards += rewardCount;
        
        // 顯示 Toast
        showToast(rewardCount);
        
        // 掉落硬幣
        dropMultipleCoins(rewardCount);
        
        // 更新進度
        updateProgress();
        
        // 清空輸入
        diaryTextarea.value = '';
        
        // 儲存狀態
        saveState();
        
    } catch (error) {
        console.error('提交失敗:', error);
        alert('提交失敗，請重試');
    } finally {
        submitBtn.textContent = '✨ 提交日記';
        submitBtn.disabled = false;
    }
}

// 顯示 Toast 提示
function showToast(amount) {
    toastAmount.textContent = amount;
    todayGainToast.classList.remove('hidden');
    
    setTimeout(() => {
        todayGainToast.classList.add('hidden');
    }, 3000);
}

// 掉落多個硬幣
function dropMultipleCoins(count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            dropSingleCoin();
        }, i * 300); // 每 300ms 掉落一個
    }
}

// 掉落單個硬幣
function dropSingleCoin() {
    const coin = document.createElement('div');
    coin.className = 'stacked-coin coin-dropping';
    
    const coinSize = 28; // 28px 像素方塊
    const containerWidth = coinStackContainer.offsetWidth;
    
    // 網格對齊的隨機位置
    const minX = coinSize / 2;
    const maxX = containerWidth - coinSize / 2;
    const gridColumns = Math.floor((maxX - minX) / coinSize);
    const randomX = minX + Math.floor(Math.random() * gridColumns) * coinSize;
    
    // 隨機旋轉角度
    const randomRotate = Math.random() * 720 - 360;
    
    // 計算硬幣應該落在的高度
    const finalY = calculateCoinPosition(randomX, coinSize);
    
    // 設置硬幣樣式
    coin.style.left = `${randomX}px`;
    coin.style.bottom = `${finalY}px`;
    coin.style.setProperty('--rotate-angle', `${randomRotate}deg`);
    
    // 記錄硬幣位置
    coinPositions.push({
        x: randomX,
        y: finalY,
        size: coinSize
    });
    
    // 添加到容器
    coinStackContainer.appendChild(coin);
    
    // 播放音效
    playCoinSound();
    
    // 動畫完成後移除動畫類別
    setTimeout(() => {
        coin.classList.remove('coin-dropping');
        coin.classList.add('coin-landed');
    }, 800);
}

// 計算硬幣應該落在的位置（網格對齊碰撞檢測）
function calculateCoinPosition(x, size) {
    const groundLevel = 0;
    let maxY = groundLevel;
    
    // 網格對齊的碰撞檢測
    for (let pos of coinPositions) {
        const gridX = Math.round(x / size) * size;
        const posGridX = Math.round(pos.x / size) * size;
        
        if (gridX === posGridX) {
            // 完全堆疊在相同網格位置
            const stackHeight = pos.y + size;
            if (stackHeight > maxY) {
                maxY = stackHeight;
            }
        }
    }
    
    return maxY;
}

// 播放硬幣音效
function playCoinSound() {
    try {
        // 使用 Web Audio API 生成音效
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.warn('音效播放失敗:', error);
    }
}

// 更新進度
function updateProgress() {
    const progress = Math.min(totalRewards, 100);
    progressFill.style.width = `${progress}%`;
    currentProgress.textContent = totalRewards;
    todayGain.textContent = `今日獲得: +${currentCoinCount}`;
    
    // 檢查是否達到目標
    if (totalRewards >= 100) {
        showPrintPrompt();
    }
}

// 顯示列印提示
function showPrintPrompt() {
    const printPrompt = document.createElement('div');
    printPrompt.className = 'print-prompt';
    printPrompt.innerHTML = `
        <div class="print-content">
            <h2>🎟️ 恭喜達成目標！</h2>
            <p>你已累積 100 枚硬幣！</p>
            <p>紙籤已準備好列印</p>
            <button onclick="printSlip()">🖨️ 列印紙籤</button>
        </div>
    `;
    
    document.body.appendChild(printPrompt);
    
    // 3秒後自動消失
    setTimeout(() => {
        printPrompt.remove();
    }, 5000);
}

// 列印紙籤
function printSlip() {
    // 這裡可以整合真實的印表機 API
    console.log('列印紙籤功能');
    alert('紙籤列印功能（需要整合印表機 API）');
}

// 更新日期顯示
function updateDateDisplay() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
    };
    dateDisplay.textContent = now.toLocaleDateString('zh-TW', options);
}

// 儲存狀態
function saveState() {
    const state = {
        totalRewards: totalRewards,
        currentCoinCount: currentCoinCount,
        coinPositions: coinPositions,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('diaryRewardState', JSON.stringify(state));
}

// 載入狀態
function loadState() {
    const savedState = localStorage.getItem('diaryRewardState');
    if (savedState) {
        const state = JSON.parse(savedState);
        totalRewards = state.totalRewards || 0;
        currentCoinCount = state.currentCoinCount || 0;
        coinPositions = state.coinPositions || [];
        
        // 重新渲染硬幣
        renderExistingCoins();
        updateProgress();
    }
}

// 重新渲染現有硬幣
function renderExistingCoins() {
    coinPositions.forEach(pos => {
        const coin = document.createElement('div');
        coin.className = 'stacked-coin';
        coin.style.left = `${pos.x}px`;
        coin.style.bottom = `${pos.y}px`;
        coinStackContainer.appendChild(coin);
    });
}

// === 測試功能 ===

// 測試硬幣動畫
function testCoinAnimation() {
    dropMultipleCoins(10);
}

// 填充測試資料
function testFillData() {
    const testTexts = [
        '今天心情很好，完成了所有工作！',
        '遇到了一些挑戰，但都克服了。',
        '和朋友一起度過了愉快的時光。',
        '學習了新技能，感覺很有成就感。',
        '今天天氣很好，出去散步了。'
    ];
    
    const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];
    diaryTextarea.value = randomText;
}

// 測試達標功能
function testShowPrint() {
    totalRewards = 100;
    updateProgress();
    showPrintPrompt();
}

// === 全域測試函數（Console 可用） ===
window.testCoinAnimation = testCoinAnimation;
window.testFillData = testFillData;
window.testShowPrint = testShowPrint;
window.clearAllCoins = function() {
    const coins = document.querySelectorAll('.stacked-coin');
    coins.forEach(coin => coin.remove());
    coinPositions = [];
    currentCoinCount = 0;
    totalRewards = 0;
    updateProgress();
    saveState();
};
