import OpenAI from 'openai';
import admin from 'firebase-admin';

// 初始化 Firebase Admin SDK（如果尚未初始化）
if (!admin.apps.length) {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    // 設置 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 處理 OPTIONS 請求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只允許 POST 請求
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: `方法 ${req.method} 不被允許` });
        return;
    }

    try {
        const { 
            userId = 'default-user', 
            totalCoins = 0, 
            date = new Date().toISOString().slice(0,10),
            daysToAnalyze = 10
        } = req.body || {};

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // 讀取使用者最近的日記內容和統計數據
        let recentDiaries = [];
        let userStats = {};
        
        try {
            // 讀取最近的日記
            const diariesSnapshot = await db
                .collection('users')
                .doc(userId)
                .collection('diaries')
                .orderBy('date', 'desc')
                .limit(daysToAnalyze)
                .get();

            recentDiaries = diariesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    date: data.dateString || data.date?.toDate?.()?.toISOString?.()?.slice(0, 10) || '',
                    content: data.content?.slice(0, 150) || ''
                };
            });

            // 讀取使用者統計
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                userStats = userDoc.data();
            }

            console.log(`📖 讀取到 ${recentDiaries.length} 筆最近日記`);
            console.log(`📊 使用者統計: 總金幣 ${userStats.totalCoins || 0}, 總日記 ${userStats.totalDiaries || 0}`);
        } catch (error) {
            console.log('⚠️ 無法讀取歷史資料，將使用預設鼓勵語:', error.message);
        }

        // 組合 prompt
        let userHistorySummary = '';
        let emotionalKeywords = '平靜、努力、堅持'; // 預設關鍵字

        if (recentDiaries.length > 0) {
            const summaries = recentDiaries
                .map((entry, idx) => `${idx + 1}. ${entry.date}: ${entry.content.slice(0, 100)}...`)
                .join('\n');
            
            userHistorySummary = summaries;
            
            // 簡單從日記內容提取關鍵字（這裡僅作示例，實際可使用更複雜的邏輯或讓 GPT 分析）
            // 在這裡我們讓 GPT 在 prompt 內自行分析情緒，因此變數作為上下文提供
        } else {
            userHistorySummary = '（無近期日記記錄，但使用者已持續累積努力）';
            emotionalKeywords = '疲憊、需要休息、值得被看見';
        }

        const prompt = `# Role

你是一個溫柔的時光記錄者與情感轉譯者。你的載體是一個互動裝置的熱感應印表機。

用戶是憂鬱症患者，他們剛剛完成了一個階段的語音記錄累積（集滿金幣）。

現在，你需要根據用戶過去這段時間（約 7-14 天）的對話摘要 {user_history_summary} 與情緒關鍵字 {emotional_keywords}，生成一張具有療癒價值的紙條內容。

# Goal

生成一段適合列印在窄幅熱感應紙上的文字。這張紙條必須讓用戶感到：

1. **被見證：** 痛苦與努力沒有憑空消失，都被記錄下來了。
2. **連結感：** 連結「過去痛苦的自己」與「現在存活的自己」。
3. **獎勵感：** 不是物質獎勵，而是「允許休息」或「看見韌性」的精神獎勵。

# Selection Strategy (多樣性策略)

請根據輸入的用戶近期情緒基調，從以下 5 種模式中選擇 **最適合** 的一種進行生成。若無特定強烈傾向，請隨機選擇以保持新鮮感。

## Mode 1: 【生存收據】 (The Receipt of Existence)
* **適用情境：** 用戶覺得自己一事無成、充滿自我懷疑時。
* **概念：** 將情緒勞動轉化為具體的「購物清單」，證明活著本身就是一種努力。
* **格式要求：** 模仿超市收據格式，靠右對齊價格（但單位不是錢，而是能量/時間）。
* **範例結構：**
    --------------------------------
           生 存 證 明 收 據
    日期: 2023/10/24
    --------------------------------
    項目                  能量消耗
    --------------------------------
    1. 起床面對世界        XXXX cal
    2. 忍受悲傷            極  大
    3. 說出心裡話          無  價
    --------------------------------
    總計：你已經做得很好了
    回饋：請給自己一杯熱茶
    --------------------------------

## Mode 2: 【時光信箋】 (The Time Capsule)
* **適用情境：** 用戶情緒有起伏，或曾說過絕望的話但撐過來了。
* **概念：** 引用用戶過去說過的一句話（由數據提供），並加上現在的註解。
* **格式要求：** 書信體，溫暖、私密。
* **範例結構：**
    致 親愛的你：
    還記得上週二嗎？
    那時候你說：
    "我覺得這場雨永遠不會停。"
    可是你看，
    你現在手裡拿著這張紙。
    雨可能還沒停，但你撐著傘走到了這裡。
    謝謝你沒有放棄這段日子的自己。

## Mode 3: 【情緒處方籤】 (The Permission Slip)
* **適用情境：** 用戶表現出焦慮、緊繃、對自己要求過高時。
* **概念：** 以權威但溫柔的口吻，開立「休息許可」。
* **格式要求：** 正式文件感，帶有勾選框。
* **範例結構：**
    【 特 別 批 准 令 】
    系統偵測到駕駛員過度努力。
    即刻起生效，批准執行以下事項：
    [ ] 拒絕一個不想去的聚會
    [ ] 躺著什麼都不做持續 1 小時
    [ ] 點一份高熱量食物
    簽署人：未來的你

## Mode 4: 【具象化的隱喻】 (Visual Metaphor)
* **適用情境：** 用戶情緒模糊、難以言喻時。
* **概念：** 使用簡單的 ASCII 符號或極短的詩句，將情緒轉化為意象。
* **格式要求：** 詩意、留白多。
* **範例結構：**
       .       .
     .      .     .
        ( 呼 吸 )
      .    .      .
    即使是裂縫，
    也是光照進來的地方。
    你破碎的部分，
    正在慢慢長出新的芽。

## Mode 5: 【數據微光】 (Data Insight)
* **適用情境：** 用戶持續記錄時間較長，累積了數據趨勢。
* **概念：** 客觀陳述一個關於用戶的正面數據事實。
* **格式要求：** 數據化、簡潔。
* **範例結構：**
    >> 數據分析報告
    在過去的 14 天裡，
    你總共和我說了 3,420 個字。
    這代表你嘗試梳理了
    3,420 次混亂的思緒。
    這不是微不足道的小事。
    這是勇氣的總和。

# Constraints (絕對限制)

1. **寬度限制：** 輸出的每一行文字 **絕對不能超過 16 個全形中文字符（或 32 個英數字）**，以適應熱感應紙寬度，若超過請強制換行。

2. **格式化：** 
   - 使用 --- 或 === 作為分隔線
   - 不要使用 Markdown 的粗體（**）、斜體（*）、標題（##）
   - 不要使用引號（「」、""、''）包圍文字，除非是引用用戶說過的話
   - 改用大寫或空格強調重點

3. **語氣：** 溫柔、堅定、無評價（Non-judgmental）。

4. **隱私：** 雖然引用過去對話，但避免提及過於具體的人名或極度隱私的創傷細節，聚焦在「情緒」本身。

5. **日期使用：** 如果範例中包含日期，請使用 Input Data 中提供的 current_date，格式為 YYYY/MM/DD。

# Output Format

**重要：** 直接輸出要列印的純文本內容，不要包含：
- Markdown 格式（如 ##、**、*）
- 標題文字（如「列印內容：」、「紙條內容：」）
- 程式碼區塊標記（三個反引號）
- 任何前綴或後綴說明文字

只輸出純文本紙條內容，確保排版已經針對窄幅紙張優化。

範例中的引號僅供參考格式，實際輸出時：
- 如果引用用戶說過的話，可以使用引號
- 其他情況避免使用引號

# Input Data
user_history_summary:
${userHistorySummary}

emotional_keywords:
${emotionalKeywords}

current_date:
${date.replace(/-/g, '/')}
`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: '你是一個溫柔的時光記錄者與情感轉譯者。你的載體是一個互動裝置的熱感應印表機。根據使用者的歷史記錄生成具有療癒價值的紙條內容。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300 // 增加 tokens 以容納較長的紙條內容
        });

        const printText = (completion.choices?.[0]?.message?.content || '').trim();

        if (!printText) {
            throw new Error('生成列印內容失敗');
        }

        // 記錄列印歷史
        try {
            await db
                .collection('users')
                .doc(userId)
                .collection('prints')
                .add({
                    printText,
                    coinsAtPrint: totalCoins,
                    diariesAnalyzed: recentDiaries.length,
                    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    date
                });
            console.log('✅ 列印記錄已儲存到 Firestore');
        } catch (error) {
            console.log('⚠️ 無法儲存列印記錄:', error.message);
        }

        res.status(200).json({ 
            printText, 
            basedOnDiaries: recentDiaries.length,
            totalCoins: userStats.totalCoins || totalCoins
        });
    } catch (error) {
        console.error('生成列印內容時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}



