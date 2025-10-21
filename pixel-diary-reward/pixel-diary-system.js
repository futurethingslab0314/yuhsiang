/**
 * 像素日記獎勵系統
 * 結合像素硬幣遊戲介面與日記獎勵規則
 */

// ===== 應用程式狀態管理 =====
const AppState = {
    totalRewards: 0,
    todayReward: 0,
    targetReward: 100,
    isRecording: false,
    currentMode: 'text',
    diaryContent: '',
    recognition: null,
    
    // 從 localStorage 載入狀態
    loadState() {
        const saved = localStorage.getItem('pixelDiaryRewardState');
        if (saved) {
            const data = JSON.parse(saved);
            this.totalRewards = data.totalRewards || 0;
            this.updateUI();
            
            // 初始化硬幣堆疊
            setTimeout(() => {
                if (window.pixelCoinSystem) {
                    this.initializeCoinStack(this.totalRewards);
                }
            }, 100);
        }
    },
    
    // 儲存狀態到 localStorage
    saveState() {
        const data = {
            totalRewards: this.totalRewards,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('pixelDiaryRewardState', JSON.stringify(data));
    },
    
    // 更新 UI 顯示
    updateUI() {
        // 更新資訊面板
        document.getElementById('coinCount').textContent = this.totalRewards;
        document.getElementById('todayGain').textContent = this.todayReward > 0 ? `+${this.todayReward}` : '0';
        document.getElementById('targetCoins').textContent = this.targetReward;
        
        // 更新進度條
        const progress = Math.min((this.totalRewards / this.targetReward) * 100, 100);
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('currentProgress').textContent = this.totalRewards;
        document.getElementById('targetProgress').textContent = this.targetReward;
        
        // 檢查是否達到目標
        if (this.totalRewards >= this.targetReward) {
            document.getElementById('printCard').classList.add('show');
        } else {
            document.getElementById('printCard').classList.remove('show');
        }
    },
    
    // 初始化硬幣堆疊（無動畫）
    initializeCoinStack(totalCoins) {
        if (window.pixelCoinSystem) {
            window.pixelCoinSystem.clear();
            // 直接設定硬幣數量，不播放掉落動畫
            for (let i = 0; i < totalCoins; i++) {
                this.addCoinToStack();
            }
        }
    },
    
    // 添加硬幣到堆疊
    addCoinToStack() {
        if (window.pixelCoinSystem) {
            window.pixelCoinSystem.addSingleCoin();
        }
    }
};

// ===== 像素硬幣系統 =====
class PixelCoinSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.coins = [];
        this.lastSpawn = 0;
        this.animationId = null;
        this.isAnimating = false;
        
        // 設定參數
        this.COIN_SIZE = 28;
        this.GRAVITY = 0.8;
        this.SPAWN_INTERVAL = 120;
        this.MAX_COINS = 200;
        this.GROUND_Y = this.canvas.height - 100;
        this.LEFT_MARGIN = 100;
        this.RIGHT_MARGIN = this.canvas.width - 100;
        
        this.init();
    }
    
    init() {
        // 設定畫布大小
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.GROUND_Y = this.canvas.height - 100;
        this.RIGHT_MARGIN = this.canvas.width - 100;
        
        // 開始動畫循環
        this.animate();
    }
    
    // 網格基礎的碰撞檢測
    isPositionOccupied(x, y) {
        for (const coin of this.coins) {
            if (coin.settled) {
                if (Math.abs(coin.x - x) < this.COIN_SIZE && Math.abs(coin.y - y) < this.COIN_SIZE) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // 為硬幣找到最低可用位置
    findSettlePosition(currentX, currentY) {
        for (let y = this.GROUND_Y; y >= 0; y -= this.COIN_SIZE) {
            const xPositions = [
                Math.round(currentX / this.COIN_SIZE) * this.COIN_SIZE,
                Math.round(currentX / this.COIN_SIZE) * this.COIN_SIZE - this.COIN_SIZE,
                Math.round(currentX / this.COIN_SIZE) * this.COIN_SIZE + this.COIN_SIZE,
            ];

            for (const x of xPositions) {
                if (x < this.LEFT_MARGIN || x > this.RIGHT_MARGIN - this.COIN_SIZE) continue;
                
                const hasSupport = y >= this.GROUND_Y || this.isPositionOccupied(x, y + this.COIN_SIZE);
                const isFree = !this.isPositionOccupied(x, y);
                
                if (isFree && hasSupport && currentY >= y - this.COIN_SIZE) {
                    return { x, y };
                }
            }
        }
        return null;
    }
    
    // 動畫循環
    animate(timestamp = 0) {
        // 清除畫布
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 更新和繪製硬幣
        this.coins.forEach((coin) => {
            if (!coin.settled) {
                coin.velocityY += this.GRAVITY;
                coin.y += coin.velocityY;

                const settlePos = this.findSettlePosition(coin.x, coin.y);
                
                if (settlePos && coin.y >= settlePos.y - this.COIN_SIZE / 2) {
                    coin.x = settlePos.x;
                    coin.y = settlePos.y;
                    coin.settled = true;
                    coin.velocityY = 0;
                }
            }

            // 繪製硬幣
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(Math.floor(coin.x), Math.floor(coin.y), coin.size, coin.size);
        });

        this.animationId = requestAnimationFrame((ts) => this.animate(ts));
    }
    
    // 添加單個硬幣（用於獎勵）
    addSingleCoin() {
        const newCoin = {
            x: Math.random() * (this.RIGHT_MARGIN - this.LEFT_MARGIN - this.COIN_SIZE) + this.LEFT_MARGIN,
            y: -this.COIN_SIZE * 2,
            velocityY: 0,
            size: this.COIN_SIZE,
            settled: false,
        };
        this.coins.push(newCoin);
        
        // 播放音效
        this.playCoinSound();
    }
    
    // 添加多個硬幣（用於獎勵動畫）
    addMultipleCoins(count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.addSingleCoin();
            }, i * 200); // 每個硬幣間隔 200ms
        }
    }
    
    // 清除所有硬幣
    clear() {
        this.coins = [];
    }
    
    // 播放硬幣音效
    playCoinSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.log('音效播放失敗:', e);
        }
    }
    
    // 調整畫布大小
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.GROUND_Y = height - 100;
        this.RIGHT_MARGIN = width - 100;
    }
}

// ===== 語音指示器 =====
class VoiceIndicator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.dots = [];
        this.animationId = null;
        this.PIXEL_SIZE = 28;
        
        this.init();
    }
    
    init() {
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.style.width = `${this.PIXEL_SIZE}px`;
            dot.style.height = `${this.PIXEL_SIZE}px`;
            dot.style.backgroundColor = 'white';
            dot.style.display = 'inline-block';
            dot.style.marginRight = '8px';
            dot.style.imageRendering = 'pixelated';
            dot.className = 'voice-indicator-dot';
            this.dots.push(dot);
            this.container.appendChild(dot);
        }
        
        this.startAnimation();
    }
    
    startAnimation() {
        const animate = (timestamp) => {
            this.dots.forEach((dot, index) => {
                const delay = index * 200;
                const cycleTime = 1500;
                const elapsed = (timestamp + delay) % cycleTime;
                const progress = elapsed / cycleTime;
                
                const y = Math.sin(progress * Math.PI * 2) * -10;
                dot.style.transform = `translateY(${y}px)`;
            });
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

// ===== 全域變數 =====
let pixelCoinSystem = null;
let voiceIndicator = null;

// ===== 初始化應用程式 =====
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 載入儲存的狀態
    AppState.loadState();
    
    // 顯示日期
    updateDateDisplay();
    
    // 設定事件監聽器
    setupEventListeners();
    
    // 初始化語音識別
    initSpeechRecognition();
    
    // 初始化像素硬幣系統
    pixelCoinSystem = new PixelCoinSystem('pixelCoinCanvas');
    window.pixelCoinSystem = pixelCoinSystem;
    
    // 初始化語音指示器
    voiceIndicator = new VoiceIndicator('voiceIndicatorContainer');
    
    console.log('✅ 像素日記獎勵系統已啟動');
}

// ===== 日期顯示 =====
function updateDateDisplay() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const dateStr = now.toLocaleDateString('zh-TW', options);
    document.getElementById('dateDisplay').textContent = dateStr;
}

// ===== 事件監聽器設定 =====
function setupEventListeners() {
    // 設定按鈕開關
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeBtn').addEventListener('click', closeSettings);
    
    // 輸入模式切換
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchMode(e.target.dataset.mode);
        });
    });
    
    // 文字輸入字數統計
    const diaryInput = document.getElementById('diaryInput');
    diaryInput.addEventListener('input', updateCharCount);
    
    // 語音錄音按鈕
    document.getElementById('voiceRecordBtn').addEventListener('click', toggleRecording);
    
    // 提交按鈕
    document.getElementById('submitBtn').addEventListener('click', submitDiary);
    
    // 列印按鈕
    document.getElementById('printBtn').addEventListener('click', showPrintPreview);
    
    // 點擊設定面板外側關閉
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('settingsPanel');
        const btn = document.getElementById('settingsBtn');
        if (!panel.contains(e.target) && !btn.contains(e.target) && panel.classList.contains('open')) {
            closeSettings();
        }
    });
    
    // 視窗大小調整
    window.addEventListener('resize', () => {
        if (pixelCoinSystem) {
            pixelCoinSystem.resize(window.innerWidth, window.innerHeight);
        }
    });
}

// ===== 設定面板開關 =====
function openSettings() {
    document.getElementById('settingsPanel').classList.add('open');
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('open');
}

// ===== 輸入模式切換 =====
function switchMode(mode) {
    AppState.currentMode = mode;
    
    // 更新按鈕狀態
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    // 切換輸入區域
    const textArea = document.querySelector('.text-input-area');
    const voiceArea = document.getElementById('voiceInputArea');
    
    if (mode === 'text') {
        textArea.style.display = 'block';
        voiceArea.classList.remove('active');
    } else {
        textArea.style.display = 'none';
        voiceArea.classList.add('active');
    }
}

// ===== 字數統計 =====
function updateCharCount() {
    const text = document.getElementById('diaryInput').value;
    document.getElementById('charCount').textContent = text.length;
}

// ===== 語音識別初始化 =====
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('⚠️ 此瀏覽器不支援語音識別功能');
        document.querySelector('[data-mode="voice"]').disabled = true;
        return;
    }
    
    AppState.recognition = new SpeechRecognition();
    AppState.recognition.lang = 'zh-TW';
    AppState.recognition.continuous = true;
    AppState.recognition.interimResults = true;
    
    AppState.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        document.getElementById('voiceTranscript').textContent = transcript;
        AppState.diaryContent = transcript;
    };
    
    AppState.recognition.onerror = (event) => {
        console.error('語音識別錯誤:', event.error);
        stopRecording();
    };
    
    AppState.recognition.onend = () => {
        if (AppState.isRecording) {
            AppState.recognition.start();
        }
    };
}

// ===== 錄音控制 =====
function toggleRecording() {
    if (!AppState.recognition) {
        alert('語音識別功能不可用');
        return;
    }
    
    if (AppState.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    AppState.isRecording = true;
    AppState.recognition.start();
    
    const btn = document.getElementById('voiceRecordBtn');
    btn.classList.add('recording');
    btn.querySelector('.voice-text').textContent = '停止錄音';
    
    document.getElementById('recordingIndicator').classList.add('active');
    document.getElementById('voiceTranscript').textContent = '';
}

function stopRecording() {
    AppState.isRecording = false;
    AppState.recognition.stop();
    
    const btn = document.getElementById('voiceRecordBtn');
    btn.classList.remove('recording');
    btn.querySelector('.voice-text').textContent = '開始錄音';
    
    document.getElementById('recordingIndicator').classList.remove('active');
}

// ===== 提交日記 =====
async function submitDiary() {
    // 取得日記內容
    let content = '';
    if (AppState.currentMode === 'text') {
        content = document.getElementById('diaryInput').value.trim();
    } else {
        content = AppState.diaryContent.trim();
    }
    
    // 驗證內容
    if (!content) {
        alert('請先輸入日記內容');
        return;
    }
    
    if (content.length < 20) {
        alert('日記內容太短，請至少輸入 20 個字');
        return;
    }
    
    // 顯示分析狀態
    showAnalysisStatus();
    
    // 分析日記並獲得獎勵
    const reward = await analyzeDiaryWithAI(content);
    
    // 隱藏分析狀態
    hideAnalysisStatus();
    
    // 更新獎勵
    AppState.todayReward = reward;
    AppState.totalRewards += reward;
    AppState.saveState();
    AppState.updateUI();
    
    // 播放硬幣掉落動畫
    pixelCoinSystem.addMultipleCoins(reward);
    
    // 顯示獲得提示
    showTodayGainToast(reward);
    
    // 清空輸入
    clearInput();
    
    // 延遲關閉設定面板
    setTimeout(() => {
        closeSettings();
    }, 1500);
}

// ===== AI 分析（模擬）=====
async function analyzeDiaryWithAI(content) {
    // ⚠️ 這裡可以替換為真實的 ChatGPT API 呼叫
    
    return new Promise((resolve) => {
        setTimeout(() => {
            // 模擬分析：根據字數和正面詞彙計算獎勵
            let baseReward = Math.floor(content.length / 10);
            
            // 正面情緒詞彙加成
            const positiveWords = ['開心', '快樂', '愉快', '滿足', '感恩', '幸福', '美好', '棒', '讚', '成功', '進步', '學習', '成長', '愛', '溫暖'];
            const positiveCount = positiveWords.filter(word => content.includes(word)).length;
            const emotionBonus = positiveCount * 3;
            
            // 總獎勵（限制在 5-30 之間）
            const totalReward = Math.min(Math.max(baseReward + emotionBonus, 5), 30);
            
            resolve(totalReward);
        }, 2000);
    });
}

// ===== UI 控制函式 =====
function showAnalysisStatus() {
    document.getElementById('analysisStatus').classList.add('active');
    document.getElementById('submitBtn').disabled = true;
}

function hideAnalysisStatus() {
    document.getElementById('analysisStatus').classList.remove('active');
    document.getElementById('submitBtn').disabled = false;
}

function clearInput() {
    document.getElementById('diaryInput').value = '';
    document.getElementById('voiceTranscript').textContent = '';
    AppState.diaryContent = '';
    updateCharCount();
}

// ===== 今日獲得提示 =====
function showTodayGainToast(amount) {
    const toast = document.getElementById('todayGainToast');
    const amountEl = document.getElementById('toastAmount');
    
    amountEl.textContent = amount;
    toast.classList.add('show');
    
    // 3 秒後自動隱藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== 列印功能 =====
function showPrintPreview() {
    // 生成 AI 紙籤內容（模擬）
    const ticketContent = generateTicketContent();
    
    // 模擬列印
    alert(`🖨️ 列印紙籤：\n\n${ticketContent}\n\n✅ 列印完成！`);
    
    // 重置獎勵
    AppState.totalRewards = 0;
    AppState.saveState();
    AppState.updateUI();
    pixelCoinSystem.clear();
    document.getElementById('printCard').classList.remove('show');
}

function generateTicketContent() {
    const tasks = [
        '今天嘗試一件從未做過的事',
        '寫下三件讓你感恩的事',
        '給一個朋友發送溫暖的訊息',
        '閱讀一篇啟發性的文章',
        '花 10 分鐘冥想或深呼吸',
        '完成一項被拖延的小任務',
        '學習一個新技能或知識',
        '整理你的工作空間',
        '運動 30 分鐘',
        '寫下今天的一個小目標'
    ];
    
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    return `任務：${randomTask}\n\n完成後記得寫進日記喔！`;
}

// ===== 開發者測試功能 =====
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.testAddCoins = (count = 10) => {
        pixelCoinSystem.addMultipleCoins(count);
        AppState.totalRewards += count;
        AppState.saveState();
        AppState.updateUI();
    };
    
    window.testFillData = () => {
        const testContent = '今天天氣很好，和朋友去了公園散步。看到很多小孩在玩耍，心情變得很愉快。晚上做了一頓美味的晚餐，感覺很滿足。';
        document.getElementById('diaryInput').value = testContent;
        updateCharCount();
    };
    
    window.testShowPrint = () => {
        AppState.totalRewards = 100;
        AppState.updateUI();
    };
    
    console.log('🔧 開發模式：可使用測試函式');
    console.log('  - testAddCoins(count) : 添加指定數量的硬幣');
    console.log('  - testFillData() : 填充測試資料');
    console.log('  - testShowPrint() : 測試列印功能');
}

// ===== 導出給全域使用 =====
window.AppState = AppState;
window.PixelCoinSystem = PixelCoinSystem;
window.VoiceIndicator = VoiceIndicator;
