// ===== 應用程式狀態管理 =====
const AppState = {
    totalRewards: 0,
    todayReward: 0,
    targetReward: 100,
    isRecording: false,
    currentMode: 'text', // 'text' 或 'voice'
    diaryContent: '',
    recognition: null, // 語音識別物件
    
    // 從 localStorage 載入狀態
    loadState() {
        const saved = localStorage.getItem('diaryRewardState');
        if (saved) {
            const data = JSON.parse(saved);
            this.totalRewards = data.totalRewards || 0;
            // 初始化時直接設定硬幣數量，不播放動畫
            if (typeof currentCoinCount !== 'undefined') {
                currentCoinCount = this.totalRewards;
            }
            this.updateUI();
            
            // 初始渲染硬幣堆疊（無動畫）
            setTimeout(() => {
                if (typeof initCoinStack === 'function') {
                    initCoinStack(this.totalRewards);
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
        localStorage.setItem('diaryRewardState', JSON.stringify(data));
    },
    
    // 更新 UI 顯示
    updateUI() {
        // 更新總獎勵（主畫面數字）
        document.getElementById('coinCountNumber').textContent = this.totalRewards;
        
        // 更新錢幣堆疊視覺效果
        updateCoinStack(this.totalRewards);
        
        // 更新今日獎勵（設定面板）
        const todayRewardEl = document.getElementById('todayReward');
        if (todayRewardEl) {
            todayRewardEl.textContent = this.todayReward > 0 ? `+${this.todayReward}` : '+0';
        }
        
        // 更新進度條
        const progress = Math.min((this.totalRewards / this.targetReward) * 100, 100);
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('currentProgress').textContent = this.totalRewards;
        document.getElementById('targetProgress').textContent = this.targetReward;
        
        // 檢查是否達到目標
        if (this.totalRewards >= this.targetReward) {
            this.showPrintCard();
        }
    },
    
    // 顯示列印卡片
    showPrintCard() {
        document.getElementById('printCard').classList.remove('hidden');
    }
};

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
    
    console.log('✅ 每日日記獎勵系統已啟動');
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
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    
    // 輸入模式切換
    document.getElementById('textModeBtn').addEventListener('click', () => switchMode('text'));
    document.getElementById('voiceModeBtn').addEventListener('click', () => switchMode('voice'));
    
    // 文字輸入字數統計
    const diaryInput = document.getElementById('diaryInput');
    diaryInput.addEventListener('input', updateCharCount);
    
    // 語音錄音按鈕
    document.getElementById('voiceRecordBtn').addEventListener('click', toggleRecording);
    
    // 提交按鈕
    document.getElementById('submitBtn').addEventListener('click', submitDiary);
    
    // 模擬投幣按鈕
    document.getElementById('triggerCoinBtn').addEventListener('click', () => triggerCoinAnimation(10));
    
    // 列印按鈕
    document.getElementById('printBtn').addEventListener('click', showPrintPreview);
    
    // 彈窗按鈕
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        closeModal('successModal');
    });
    
    document.getElementById('cancelPrintBtn').addEventListener('click', () => {
        closeModal('printModal');
    });
    
    document.getElementById('confirmPrintBtn').addEventListener('click', confirmPrint);
    
    // 點擊設定面板外側關閉
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('settingsPanel');
        const btn = document.getElementById('settingsBtn');
        if (!panel.contains(e.target) && !btn.contains(e.target) && !panel.classList.contains('hidden')) {
            closeSettings();
        }
    });
}

// ===== 設定面板開關 =====
function openSettings() {
    document.getElementById('settingsPanel').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.add('hidden');
}

// ===== 輸入模式切換 =====
function switchMode(mode) {
    AppState.currentMode = mode;
    
    // 更新按鈕狀態
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'text') {
        document.getElementById('textModeBtn').classList.add('active');
        document.getElementById('textInputArea').classList.remove('hidden');
        document.getElementById('voiceInputArea').classList.add('hidden');
    } else {
        document.getElementById('voiceModeBtn').classList.add('active');
        document.getElementById('textInputArea').classList.add('hidden');
        document.getElementById('voiceInputArea').classList.remove('hidden');
    }
}

// ===== 字數統計 =====
function updateCharCount() {
    const text = document.getElementById('diaryInput').value;
    document.getElementById('charCount').textContent = text.length;
}

// ===== 語音識別初始化 =====
function initSpeechRecognition() {
    // 檢查瀏覽器是否支援語音識別
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('⚠️ 此瀏覽器不支援語音識別功能');
        document.getElementById('voiceModeBtn').disabled = true;
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
    btn.querySelector('.voice-text').textContent = '點擊停止錄音';
    
    document.getElementById('recordingIndicator').classList.remove('hidden');
    document.getElementById('voiceTranscript').textContent = '';
}

function stopRecording() {
    AppState.isRecording = false;
    AppState.recognition.stop();
    
    const btn = document.getElementById('voiceRecordBtn');
    btn.classList.remove('recording');
    btn.querySelector('.voice-text').textContent = '點擊開始錄音';
    
    document.getElementById('recordingIndicator').classList.add('hidden');
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
    
    // 模擬 API 呼叫（實際使用時替換為真實 API）
    const reward = await analyzeDiaryWithAI(content);
    
    // 隱藏分析狀態
    hideAnalysisStatus();
    
    // 更新獎勵
    AppState.todayReward = reward;
    AppState.totalRewards += reward;
    AppState.saveState();
    AppState.updateUI();
    
    // 顯示成功彈窗
    showSuccessModal(reward);
    
    // 清空輸入
    clearInput();
}

// ===== AI 分析（模擬）=====
async function analyzeDiaryWithAI(content) {
    // ⚠️ API 替換位置 1: ChatGPT API 呼叫
    // 以下是模擬實作，請替換為真實的 ChatGPT API 呼叫
    
    return new Promise((resolve) => {
        setTimeout(() => {
            // 模擬分析：根據字數和正面詞彙計算獎勵
            let baseReward = Math.floor(content.length / 10); // 基礎獎勵
            
            // 正面情緒詞彙加成
            const positiveWords = ['開心', '快樂', '愉快', '滿足', '感恩', '幸福', '美好', '棒', '讚'];
            const positiveCount = positiveWords.filter(word => content.includes(word)).length;
            const emotionBonus = positiveCount * 3;
            
            // 總獎勵（限制在 5-30 之間）
            const totalReward = Math.min(Math.max(baseReward + emotionBonus, 5), 30);
            
            resolve(totalReward);
            
            /*
            // ===== 真實 API 實作範例 =====
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_KEY_HERE' // ⚠️ 替換為你的 API Key
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一個情緒分析助手。根據使用者的日記內容，分析情緒並給予 5-30 分的獎勵。正面情緒高給高分，負面情緒給低分。只回傳數字。'
                        },
                        {
                            role: 'user',
                            content: content
                        }
                    ],
                    max_tokens: 10,
                    temperature: 0.7
                })
            });
            
            const data = await response.json();
            const reward = parseInt(data.choices[0].message.content);
            resolve(reward);
            */
        }, 2000); // 模擬 API 延遲
    });
}

// ===== UI 控制函式 =====
function showAnalysisStatus() {
    document.getElementById('analysisStatus').classList.remove('hidden');
    document.getElementById('submitBtn').disabled = true;
}

function hideAnalysisStatus() {
    document.getElementById('analysisStatus').classList.add('hidden');
    document.getElementById('submitBtn').disabled = false;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function clearInput() {
    document.getElementById('diaryInput').value = '';
    document.getElementById('voiceTranscript').textContent = '';
    AppState.diaryContent = '';
    updateCharCount();
}

// ===== 硬幣掉落動畫 =====
// 這個函式現在主要用於測試
function triggerCoinAnimation(count = 10) {
    // 更新硬幣堆疊（一次一個掉落）
    AppState.totalRewards += count;
    AppState.todayReward += count;
    AppState.saveState();
    AppState.updateUI();
}

// ===== 音效播放 =====
function playCoinSound() {
    // ⚠️ API 替換位置 2: 音效檔案路徑
    // 請準備音效檔案並替換路徑
    
    /*
    const audio = new Audio('sounds/coin-drop.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('音效播放失敗:', e));
    */
    
    // 使用 Web Audio API 生成簡單的音效（備用方案）
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
        console.log('音效生成失敗:', e);
    }
}

// ===== 列印功能 =====
function showPrintPreview() {
    // 生成 AI 紙籤內容（模擬）
    const ticketContent = generateTicketContent();
    document.getElementById('ticketContent').textContent = ticketContent;
    document.getElementById('printModal').classList.remove('hidden');
}

function generateTicketContent() {
    // ⚠️ API 替換位置 3: AI 生成紙籤內容
    // 以下是模擬內容，請替換為 ChatGPT API 生成
    
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
    
    /*
    // ===== 真實 API 實作範例 =====
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY_HERE'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '你是一個激勵助手。生成一個簡短、正面、可執行的每日任務，約 20 字內。'
                },
                {
                    role: 'user',
                    content: '請給我一個今日任務'
                }
            ],
            max_tokens: 50
        })
    });
    const data = await response.json();
    return data.choices[0].message.content;
    */
}

async function confirmPrint() {
    closeModal('printModal');
    
    // ⚠️ API 替換位置 4: Raspberry Pi 熱感印紙機控制
    // 以下是模擬實作，請替換為實際的印紙機控制 API
    
    alert('🖨️ 列印中...\n請稍候，紙籤準備中！');
    
    /*
    // ===== Raspberry Pi 印紙機控制範例 =====
    try {
        const response = await fetch('/api/print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: document.getElementById('ticketContent').textContent,
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            alert('✅ 列印成功！請拿取你的紙籤');
            // 重置獎勵
            AppState.totalRewards = 0;
            AppState.saveState();
            AppState.updateUI();
            document.getElementById('printCard').classList.add('hidden');
        } else {
            alert('❌ 列印失敗，請稍後再試');
        }
    } catch (error) {
        console.error('列印錯誤:', error);
        alert('❌ 列印失敗，請檢查印紙機連接');
    }
    */
    
    // 模擬列印完成
    setTimeout(() => {
        alert('✅ 列印完成！請拿取你的紙籤');
        // 重置獎勵（模擬）
        AppState.totalRewards = 0;
        AppState.saveState();
        AppState.updateUI();
        document.getElementById('printCard').classList.add('hidden');
    }, 2000);
}

// ===== 實用工具函式 =====

// 測試用：快速填充假資料
function fillTestData() {
    const testContent = '今天天氣很好，和朋友去了公園散步。看到很多小孩在玩耍，心情變得很愉快。晚上做了一頓美味的晚餐，感覺很滿足。';
    document.getElementById('diaryInput').value = testContent;
    updateCharCount();
}

// ===== 錢幣堆疊視覺效果 =====
let currentCoinCount = 0;

function updateCoinStack(totalCoins) {
    const container = document.getElementById('coinStackContainer');
    
    // 如果新的硬幣數量少於當前數量，重新渲染
    if (totalCoins < currentCoinCount) {
        container.innerHTML = '';
        currentCoinCount = 0;
    }
    
    // 計算需要新增的硬幣數量
    const coinsToAdd = totalCoins - currentCoinCount;
    
    if (coinsToAdd <= 0) return;
    
    // 一次掉落一個硬幣
    let addedCoins = 0;
    const dropInterval = setInterval(() => {
        if (addedCoins >= coinsToAdd) {
            clearInterval(dropInterval);
            return;
        }
        
        dropSingleCoin(currentCoinCount);
        currentCoinCount++;
        addedCoins++;
    }, 400); // 每 400ms 掉一個硬幣
}

// 掉落單個硬幣
function dropSingleCoin(index) {
    const container = document.getElementById('coinStackContainer');
    const coin = document.createElement('div');
    coin.className = 'stacked-coin';
    
    // 計算堆疊高度
    const coinHeight = 15; // 每個硬幣的堆疊高度
    const stackHeight = index * coinHeight;
    
    // 設置最終位置
    coin.style.bottom = `${stackHeight}px`;
    
    // 添加到容器
    container.appendChild(coin);
    
    // 播放音效（如果有）
    playCoinSound();
    
    // 硬幣掉落完成後添加彈跳效果
    setTimeout(() => {
        coin.classList.add('bounce');
        setTimeout(() => {
            coin.classList.remove('bounce');
        }, 500);
    }, 800);
}

// 初始化硬幣堆疊（無動畫，用於頁面載入）
function initCoinStack(totalCoins) {
    const container = document.getElementById('coinStackContainer');
    container.innerHTML = '';
    
    const coinHeight = 15;
    
    for (let i = 0; i < totalCoins; i++) {
        const coin = document.createElement('div');
        coin.className = 'stacked-coin';
        coin.style.bottom = `${i * coinHeight}px`;
        coin.style.animation = 'none'; // 取消動畫
        container.appendChild(coin);
    }
}

// ===== 今日獲得 Toast 提示 =====
function showTodayGainToast(amount) {
    const toast = document.getElementById('todayGainToast');
    const amountEl = document.getElementById('toastAmount');
    
    amountEl.textContent = amount;
    toast.classList.remove('hidden');
    
    // 3 秒後自動隱藏
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ===== 修改成功提示函式 =====
function showSuccessModal(reward) {
    // 不顯示彈窗，改用 Toast 提示
    showTodayGainToast(reward);
    
    // 硬幣會自動透過 updateUI -> updateCoinStack 一個個掉落
    // 不需要再手動觸發
    
    // 延遲自動關閉設定面板（等待硬幣掉落開始）
    setTimeout(() => {
        closeSettings();
    }, 1500);
}

// 在開發環境中暴露測試函式
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.testFillData = fillTestData;
    window.testCoinAnimation = () => triggerCoinAnimation(15);
    window.testShowPrint = () => {
        AppState.totalRewards = 100;
        AppState.updateUI();
    };
    console.log('🔧 開發模式：可使用測試函式');
    console.log('  - testFillData() : 填充測試資料');
    console.log('  - testCoinAnimation() : 測試硬幣動畫');
    console.log('  - testShowPrint() : 測試列印功能');
}

