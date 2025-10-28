# 日記獎勵系統 - API 串接指南

## 📋 目錄
1. [系統架構](#系統架構)
2. [Firebase 設定](#firebase-設定)
3. [ChatGPT API 設定](#chatgpt-api-設定)
4. [錄音功能串接](#錄音功能串接)
5. [熱感應印表機串接](#熱感應印表機串接)
6. [測試指令使用](#測試指令使用)

---

## 🏗️ 系統架構

### 資料流程
```
使用者 → 實體開關 → 錄音 → Firebase Storage → Firestore
                                    ↓
                             ChatGPT 分析
                                    ↓
                              引導語生成 / 紙籤內容
                                    ↓
                              熱感應印表機
```

### 狀態機
```
IDLE (待機) → RECORDING (錄音中) → PROCESSING (處理中) → REWARD (獎勵) → PRINT_READY (列印)
     ↑                                                                          ↓
     └──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔥 Firebase 設定

### 1. 安裝 Firebase SDK

```html
<!-- 在 diary-reward.html 中加入 -->
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js"></script>
```

### 2. Firebase 初始化

```javascript
// Firebase 配置（使用你現有的設定）
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
```

### 3. Firestore 資料結構

```javascript
// users/{userId}/recordings/{recordingId}
{
    userId: "user123",
    date: Timestamp,
    duration: 120,          // 秒
    audioUrl: "gs://...",   // Storage URL
    transcription: "...",   // 語音轉文字（選用）
    coinsEarned: 3,
    processed: true
}

// users/{userId}/profile
{
    totalCoins: 30,
    totalRecordings: 10,
    lastRecordingDate: Timestamp,
    printHistory: [...]
}

// users/{userId}/guides
{
    date: "2025-10-28",
    guideText: "今天有什麼讓你感到開心的事情嗎？",
    used: true,
    generatedBy: "chatgpt"
}
```

### 4. 上傳錄音到 Firebase Storage

```javascript
async function uploadRecording(audioBlob, userId) {
    try {
        const timestamp = Date.now();
        const filename = `recordings/${userId}/${timestamp}.webm`;
        const storageRef = storage.ref(filename);
        
        // 上傳檔案
        const snapshot = await storageRef.put(audioBlob);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        // 儲存記錄到 Firestore
        const recordingData = {
            userId: userId,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            duration: audioDuration,
            audioUrl: downloadURL,
            coinsEarned: 3,
            processed: false
        };
        
        await db.collection('users')
            .doc(userId)
            .collection('recordings')
            .add(recordingData);
        
        console.log('✅ 錄音上傳成功:', downloadURL);
        return downloadURL;
        
    } catch (error) {
        console.error('❌ 上傳失敗:', error);
        throw error;
    }
}
```

### 5. 更新使用者金幣數

```javascript
async function updateUserCoins(userId, coinsToAdd) {
    try {
        const userRef = db.collection('users').doc(userId);
        
        await userRef.update({
            totalCoins: firebase.firestore.FieldValue.increment(coinsToAdd),
            lastRecordingDate: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ 金幣更新成功');
        
    } catch (error) {
        console.error('❌ 更新失敗:', error);
    }
}
```

---

## 🤖 ChatGPT API 設定

### 1. 獲取每日引導語

```javascript
async function fetchDailyGuide(userId) {
    try {
        // 方式一：從 Firestore 讀取預先生成的引導語
        const today = new Date().toISOString().split('T')[0];
        const guideDoc = await db.collection('users')
            .doc(userId)
            .collection('guides')
            .doc(today)
            .get();
        
        if (guideDoc.exists && !guideDoc.data().used) {
            return guideDoc.data().guideText;
        }
        
        // 方式二：即時呼叫 ChatGPT API（透過後端）
        const response = await fetch('/api/generateGuide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        return data.guideText;
        
    } catch (error) {
        console.error('❌ 獲取引導語失敗:', error);
        return '今天過得如何？分享一下吧！';
    }
}
```

### 2. 後端 API 範例（Vercel Function）

```javascript
// api/generateGuide/index.js
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { userId } = req.body;
    
    try {
        // 獲取使用者歷史記錄（可選）
        // const userHistory = await getUserHistory(userId);
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "你是一個溫暖的日記引導助手，幫助使用者反思和記錄生活。請生成一個簡短、溫暖的引導問題，鼓勵使用者分享今天的經歷或感受。"
                },
                {
                    role: "user",
                    content: "請給我一個今天的日記引導問題"
                }
            ],
            max_tokens: 100,
            temperature: 0.8
        });
        
        const guideText = completion.choices[0].message.content;
        
        res.status(200).json({ guideText });
        
    } catch (error) {
        console.error('生成引導語失敗:', error);
        res.status(500).json({ error: 'Failed to generate guide' });
    }
}
```

### 3. 生成列印內容

```javascript
// api/generatePrintContent/index.js
export default async function handler(req, res) {
    const { userId, totalCoins } = req.body;
    
    try {
        // 獲取使用者最近的錄音記錄
        const recentRecordings = await getRecentRecordings(userId, 10);
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "你是一個溫暖的日記助手。根據使用者的記錄習慣和成就，生成一段鼓勵性的訊息，用於列印在紙籤上。訊息應該簡短、溫暖、具有個人化。"
                },
                {
                    role: "user",
                    content: `使用者已經記錄了 ${recentRecordings.length} 次，累積了 ${totalCoins} 枚金幣。請生成一段鼓勵訊息。`
                }
            ],
            max_tokens: 150
        });
        
        const printContent = {
            date: new Date().toLocaleDateString('zh-TW'),
            message: completion.choices[0].message.content,
            stats: {
                totalRecordings: recentRecordings.length,
                totalCoins: totalCoins
            }
        };
        
        res.status(200).json(printContent);
        
    } catch (error) {
        console.error('生成列印內容失敗:', error);
        res.status(500).json({ error: 'Failed to generate print content' });
    }
}
```

---

## 🎤 錄音功能串接

### 1. Web Audio API 錄音

```javascript
let mediaRecorder;
let audioChunks = [];
let audioStream;

async function startRecording() {
    try {
        // 請求麥克風權限
        audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            } 
        });
        
        // 建立 MediaRecorder
        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('stop', async () => {
            // 建立音訊 Blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // 上傳到 Firebase
            await uploadRecording(audioBlob, currentUserId);
            
            // 停止音訊串流
            audioStream.getTracks().forEach(track => track.stop());
        });
        
        mediaRecorder.start();
        console.log('🎤 開始錄音');
        
    } catch (error) {
        console.error('❌ 錄音失敗:', error);
        alert('無法存取麥克風，請檢查權限設定');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('⏹️ 停止錄音');
    }
}

// 在 diary-reward.html 中整合
function handleRecordingStart() {
    if (AppState.isRecording) return;
    
    AppState.isRecording = true;
    AppState.currentState = SystemState.RECORDING;
    
    // 更新 UI
    document.getElementById('voiceIndicator').classList.add('active');
    hideGuideMessage();
    
    // 開始錄音
    startRecording();
    
    // 播放音效
    playSound('start');
    
    updateDebugInfo();
}

function handleRecordingEnd() {
    if (!AppState.isRecording) return;
    
    AppState.isRecording = false;
    AppState.currentState = SystemState.PROCESSING;
    
    // 更新 UI
    document.getElementById('voiceIndicator').classList.remove('active');
    
    // 停止錄音
    stopRecording();
    
    // 播放音效
    playSound('end');
    
    updateDebugInfo();
}
```

### 2. 樹莓派實體開關整合

如果在樹莓派上運行，可以透過 Python 後端監聽 GPIO：

```python
# raspberrypi-dsi/button_handler_pigpio.py 已存在
# 在按鈕事件中觸發前端的錄音功能

import pigpio
from web_controller_dsi import WebController

class ButtonHandler:
    def __init__(self, button_pin=17):
        self.pi = pigpio.pi()
        self.button_pin = button_pin
        self.web_controller = WebController()
        
        # 設定按鈕
        self.pi.set_mode(button_pin, pigpio.INPUT)
        self.pi.set_pull_up_down(button_pin, pigpio.PUD_UP)
        
        # 監聽按鈕事件
        self.pi.callback(button_pin, pigpio.EITHER_EDGE, self.button_callback)
    
    def button_callback(self, gpio, level, tick):
        if level == 0:  # 按下
            self.web_controller.trigger_recording_start()
        else:  # 放開
            self.web_controller.trigger_recording_end()
```

---

## 🖨️ 熱感應印表機串接

### 1. Python 控制印表機

```python
# 新增: raspberrypi-dsi/printer_manager.py
from escpos.printer import Serial
import textwrap

class PrinterManager:
    def __init__(self, port='/dev/serial0', baudrate=9600):
        self.printer = Serial(
            devfile=port,
            baudrate=baudrate,
            bytesize=8,
            parity='N',
            stopbits=1,
            timeout=1.0
        )
    
    def print_receipt(self, content):
        """
        列印紙籤
        
        Args:
            content: dict 包含 date, message, stats
        """
        try:
            # 標題
            self.printer.set(align='center', text_type='B', width=2, height=2)
            self.printer.text('✨ 你的成就 ✨\n')
            self.printer.text('\n')
            
            # 日期
            self.printer.set(align='center', text_type='normal', width=1, height=1)
            self.printer.text(f'{content["date"]}\n')
            self.printer.text('-' * 32 + '\n\n')
            
            # 訊息內容
            self.printer.set(align='left', text_type='normal')
            wrapped_message = textwrap.fill(content['message'], width=32)
            self.printer.text(wrapped_message + '\n\n')
            
            # 統計資訊
            self.printer.text(f'累積記錄: {content["stats"]["totalRecordings"]} 次\n')
            self.printer.text(f'累積金幣: {content["stats"]["totalCoins"]} 枚\n')
            self.printer.text('\n')
            
            # 分隔線
            self.printer.text('-' * 32 + '\n')
            self.printer.text('繼續保持，記錄生活！\n')
            
            # 切紙
            self.printer.cut()
            
            print('✅ 列印成功')
            
        except Exception as e:
            print(f'❌ 列印失敗: {e}')
    
    def test_print(self):
        """測試列印"""
        self.printer.text('測試列印\n')
        self.printer.text('Test Print\n')
        self.printer.cut()
```

### 2. 前端觸發列印

```javascript
async function executePrint() {
    try {
        console.log('🖨️ 執行列印程序...');
        
        // 從 ChatGPT 獲取列印內容
        const response = await fetch('/api/generatePrintContent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                totalCoins: AppState.totalCoins
            })
        });
        
        const printContent = await response.json();
        
        // 觸發樹莓派列印
        await fetch('/api/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(printContent)
        });
        
        console.log('✅ 列印命令已發送');
        
    } catch (error) {
        console.error('❌ 列印失敗:', error);
    }
}
```

### 3. 樹莓派 API 端點

```python
# 新增: raspberrypi-dsi/api_routes.py
from flask import Flask, request, jsonify
from printer_manager import PrinterManager

app = Flask(__name__)
printer = PrinterManager()

@app.route('/api/print', methods=['POST'])
def handle_print():
    try:
        content = request.json
        printer.print_receipt(content)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

---

## 🧪 測試指令使用

### Console 測試指令

在瀏覽器 Console 中輸入以下指令進行測試：

```javascript
// 1. 查看所有可用指令
help()

// 2. 開啟除錯模式（顯示左上角狀態）
debug()

// 3. 測試引導語
showGuide()    // 顯示引導語
hideGuide()    // 隱藏引導語

// 4. 測試錄音流程
startRecord()  // 模擬開始錄音
stopRecord()   // 模擬停止錄音（會觸發金幣掉落）

// 5. 測試金幣系統
addCoins(3)    // 增加 3 枚金幣
addCoins(30)   // 增加 30 枚（會觸發列印）
resetCoins()   // 重置金幣數

// 6. 測試列印通知
showPrint()    // 顯示列印通知
hidePrint()    // 隱藏列印通知

// 7. 查看當前狀態
getState()     // 顯示完整狀態資訊

// 8. 設定列印門檻
setThreshold(10)   // 設定為 10 枚金幣
setThreshold(30)   // 預設為 30 枚
```

### 測試流程範例

```javascript
// 完整流程測試
debug()                 // 開啟除錯模式
showGuide()             // 1. 顯示引導語
setTimeout(() => {
    startRecord()       // 2. 開始錄音
}, 3000);
setTimeout(() => {
    stopRecord()        // 3. 停止錄音（獲得金幣）
}, 6000);

// 快速達到列印門檻
setThreshold(6)         // 設定低門檻
addCoins(6)             // 立即觸發列印
```

---

## 📝 實作檢查清單

### Phase 1: 基礎功能
- [x] 金幣掉落動畫（網格化）
- [x] 引導語顯示介面
- [x] 列印通知介面
- [x] 狀態管理系統
- [x] Console 測試指令
- [ ] LocalStorage 金幣持久化

### Phase 2: 錄音功能
- [ ] Web Audio API 整合
- [ ] 錄音權限請求
- [ ] 音訊視覺化（可選）
- [ ] 實體開關整合（樹莓派）

### Phase 3: Firebase 串接
- [ ] Firebase SDK 整合
- [ ] Firestore 資料結構建立
- [ ] 錄音上傳功能
- [ ] 金幣同步功能
- [ ] 使用者認證（可選）

### Phase 4: ChatGPT 整合
- [ ] 每日引導語生成
- [ ] 列印內容生成
- [ ] Vercel Functions 部署
- [ ] API Key 安全管理

### Phase 5: 印表機整合
- [ ] Python 印表機控制
- [ ] API 端點建立
- [ ] 列印格式設計
- [ ] 錯誤處理

### Phase 6: 測試與優化
- [ ] 完整流程測試
- [ ] 錯誤處理完善
- [ ] 效能優化
- [ ] 使用者體驗優化

---

## 🔐 安全性注意事項

1. **API Keys 管理**
   - 不要將 API Keys 直接寫在前端程式碼
   - 使用環境變數（`.env`）
   - 透過後端 API 呼叫 ChatGPT

2. **Firebase 安全規則**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth.uid == userId;
       }
     }
   }
   ```

3. **錄音資料隱私**
   - 確保錄音檔案只有使用者本人能存取
   - 考慮設定自動刪除舊錄音的規則

---

## 📞 支援資源

- Firebase 文件: https://firebase.google.com/docs
- OpenAI API 文件: https://platform.openai.com/docs
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Python ESC/POS: https://python-escpos.readthedocs.io/

---

## 🎯 下一步

1. 開啟 `diary-reward.html`
2. 按 F12 打開開發者工具
3. 在 Console 輸入 `help()` 查看測試指令
4. 使用 `debug()` 開啟除錯模式
5. 測試各個功能流程
6. 根據此文件逐步串接 API

祝開發順利！🚀

