const OpenAI = require('openai');
const admin = require('firebase-admin');

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

module.exports = async function handler(req, res) {
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
        let prompt = '';
        if (recentDiaries.length > 0) {
            const summaries = recentDiaries
                .map((entry, idx) => `${idx + 1}. ${entry.date}: ${entry.content}`)
                .join('\n');

            prompt = `使用者已累積 ${totalCoins} 枚金幣，完成了 ${recentDiaries.length} 次日記記錄。

以下是最近的日記內容摘要：
${summaries}

請根據這些內容，生成一段不超過 40 字的繁體中文鼓勵話，語氣真誠、溫暖，針對他這段時間的努力與內容給予肯定。
附上今天日期 ${date.replace(/-/g, '/')}。
只輸出最終文字，不要任何前後綴或解釋。`;
        } else {
            prompt = `使用者已累積 ${totalCoins} 枚金幣。
請輸出一則簡短的鼓勵訊息，作為熱感應紙籤列印內容。
要求：1-2 句繁體中文，積極但不空泛，避免命令語氣，不超過 40 字。
附上今天日期 ${date.replace(/-/g, '/')}。只輸出最終文字。`;
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: '你是一個簡潔溫暖的鼓勵語助手，輸出繁體中文。根據使用者的日記內容和累積成就，提供個人化且真誠的鼓勵。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 100
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



