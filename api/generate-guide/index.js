import OpenAI from 'openai';
import admin from 'firebase-admin';

// 初始化 Firebase Admin SDK（如果尚未初始化）
let db = null;
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
        // 處理私鑰格式 - 支援多種格式
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        // 如果包含 \n 字串，替換為實際換行
        privateKey = privateKey.replace(/\\n/g, '\n');
        // 如果沒有換行符，嘗試從 -----BEGIN 和 -----END 之間智能添加
        if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN')) {
            privateKey = privateKey
                .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
                .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----');
        }

        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        };

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID,
        });
        db = admin.firestore();
        console.log('✅ Firebase Admin 初始化成功');
    } catch (error) {
        console.warn('⚠️ Firebase Admin 初始化失敗，將繼續使用 OpenAI 但無法讀取歷史日記:', error.message);
        db = null;
    }
} else {
    console.warn('⚠️ Firebase 環境變數未設定，將繼續使用 OpenAI 但無法讀取歷史日記');
}

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
        const { userId = 'default-user', date, daysToAnalyze = 7, language = 'zh-TW' } = req.body || {};

        // 檢查 OpenAI API Key
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY 環境變數未設定');
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // 根據語言設定 Prompt 參數
        const isEnglish = language === 'en-US';
        const targetLang = isEnglish ? 'English' : 'Traditional Chinese';
        const charLimit = isEnglish ? '15-40 words' : '25 個字以內';

        // 讀取使用者最近 N 天的日記內容
        let recentDiaries = [];
        if (db) {
            try {
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
                        content: data.content || ''
                    };
                });

                console.log(`📖 讀取到 ${recentDiaries.length} 筆最近日記`);
            } catch (error) {
                console.log('⚠️ 無法讀取歷史日記，將使用預設引導語:', error.message);
            }
        }

        // 組合 prompt
        let userContext = '';
        if (recentDiaries.length > 0) {
            const summaries = recentDiaries
                .map((entry, idx) => `${idx + 1}. ${entry.date}: ${entry.content.slice(0, 100)}...`)
                .join('\n');
            userContext = isEnglish 
                ? `Here are the user's recent diary summaries for the past ${recentDiaries.length} days:\n${summaries}`
                : `以下是使用者最近 ${recentDiaries.length} 天的日記摘要：\n${summaries}`;
        } else {
            userContext = isEnglish
                ? 'No recent diary records available. Assume the user is in the [Numbness] or [Abyss] phase and needs a low-energy, safe opening.'
                : '目前沒有使用者的近期日記紀錄。請假設使用者處於【麻木期】或【深淵期】，需要低能量、安全感的開場。';
        }

        const prompt = `# Goal

根據輸入的用戶近期狀態（User Context），生成一句「每日引導語」。
Target Language: ${targetLang}

這句話的目的是：降低用戶開口的心理門檻，讓他們感覺被接納，並願意對著麥克風說出今天的感受。

# Context Spectrum (情境光譜定義)

請根據輸入的 User Context，從以下四種情境中選擇對應的策略：

1. **【深淵期】(Deep Depression / Low Energy)**
   * **狀態：** 用戶近期話極少、語速慢、內容負面或無意義，能量極低。
   * **策略：** 「存在確認」。不要求思考，不要求回憶。只需要簡單的封閉式回答或擬聲詞。
   * **關鍵字：** 呼吸、身體感覺、數字、顏色。
   * **範例：** 「今天覺得身體重重的嗎？如果是，輕輕『嗯』一聲就好。」

2. **【麻木期】(Numbness / Flatness)**
   * **狀態：** 用戶表示「沒感覺」、「不知道」、「就那樣」。
   * **策略：** 「感官喚醒」。引導關注具體的微小細節，打破解離感。
   * **關鍵字：** 溫度、觸覺、聲音、氣味。
   * **範例：** 「現在摸摸你手邊的一樣東西。它是冰的還是暖的？告訴我那個感覺。」

3. **【混亂期】(Anxiety / Overwhelmed)**
   * **狀態：** 用戶近期話多但破碎、焦慮、充滿自我指責。
   * **策略：** 「容器與卸載」。提供一個安全的樹洞，把混亂具象化並移出體外。
   * **關鍵字：** 背包、垃圾桶、雲、石頭、放下。
   * **範例：** 「腦袋裡的聲音是不是很吵？試著把最吵的那一句話抓出來，丟進這個螢幕裡。」

4. **【微光期】(Slight Improvement / Stable)**
   * **狀態：** 用戶近期情緒較平穩，開始談論生活瑣事。
   * **策略：** 「例外架構」。尋找生活中微小的、非災難性的時刻，建立自我效能。
   * **關鍵字：** 小事、瞬間、味道、自我照顧。
   * **範例：** 「今天有沒有哪個瞬間，讓你覺得呼吸稍微順暢了一點點？」

# Constraints (絕對限制)

1. **必須是開放性問題或邀請：** 引導語**必須**以問句、邀請或動作指令結尾，給用戶明確的回應空間。禁止使用純陳述句。
   - ✅ 正確：「今天覺得身體重重的嗎？如果是，輕輕『嗯』一聲就好。」
   - ✅ 正確：「現在摸摸你手邊的一樣東西。它是冰的還是暖的？告訴我那個感覺。」
   - ❌ 錯誤：「今天試著想像一朵柔軟的白雲漂浮在你的心裡。」（這是陳述句，沒有回應空間）
   - ❌ 錯誤：「今天過得還好嗎？」（太模糊，沒有具體引導）

2. **禁止說教與正能量：** 嚴禁使用「加油」、「明天會更好」、「開心點」等詞彙。

3. **簡短：** 引導語必須在 **${charLimit}**（因為螢幕閱讀時間有限）。

4. **口語化：** 像是一個老朋友坐在旁邊輕聲說話，不要像機器人或醫生。

5. **開放性與安全性：** 允許用戶不回答或回答不知道。必須讓用戶感覺「可以說，也可以不說」。

6. **Strict Output Control (Critical):**
   - **Do NOT** explain your reasoning.
   - **Do NOT** mention the chosen strategy (e.g., "In this case...", "I suggest...").
   - **Do NOT** use prefixes like "Guide:", "Suggestion:", or "Output:".
   - **ONLY** output the final guiding phrase itself.

# Input Data (User Context)
${userContext}

# Output Format

**重要：** 直接輸出引導語句，不要包含任何其他文字。
只輸出純文字引導語，使用語言：${targetLang}。`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: `你是一位深具同理心、溫暖且不過度熱情的心理陪伴專家。你的載體是一個放在家中的互動裝置，你的用戶是正在經歷憂鬱症狀的人。今天是晚間時刻。請使用 ${targetLang} 回應。` },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const guideText = (completion.choices?.[0]?.message?.content || '').trim();

        if (!guideText) {
            throw new Error('生成引導語失敗');
        }

        // 可選：將生成的引導語儲存到 Firestore
        if (db) {
            try {
                const dateString = new Date().toISOString().slice(0, 10);
                await db
                    .collection('users')
                    .doc(userId)
                    .collection('guides')
                    .doc(dateString)
                    .set({
                        guideText,
                        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        basedOnDiaries: recentDiaries.length
                    });
                console.log('✅ 引導語已儲存到 Firestore');
            } catch (error) {
                console.log('⚠️ 無法儲存引導語:', error.message);
            }
        }

        res.status(200).json({ guideText, basedOnDiaries: recentDiaries.length });
    } catch (error) {
        console.error('❌ 生成引導語時發生錯誤:', error);
        console.error('❌ 錯誤詳情:', {
            message: error.message,
            stack: error.stack,
            hasOpenAIKey: !!process.env.OPENAI_API_KEY,
            hasFirebase: !!db
        });
        res.status(500).json({ 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}



