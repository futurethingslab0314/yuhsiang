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
        const { userId = 'default-user', date, daysToAnalyze = 7 } = req.body || {};

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // 讀取使用者最近 N 天的日記內容
        let recentDiaries = [];
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

        // 組合 prompt
        let prompt = '';
        if (recentDiaries.length > 0) {
            const summaries = recentDiaries
                .map((entry, idx) => `${idx + 1}. ${entry.date}: ${entry.content.slice(0, 100)}...`)
                .join('\n');

            prompt = `以下是使用者最近 ${recentDiaries.length} 天的日記摘要：
${summaries}

請根據這些內容，以溫和中立的一句短句，生成「今晚睡前的自我敘事引導語」，
語氣簡短、具體、避免評價，繁體中文，中文字數 12～22。
僅輸出最終文字，不要任何前後綴或解釋。`;
        } else {
            prompt = `請以溫和中立的一句短句，生成「今晚睡前的自我敘事引導語」，
語氣簡短、具體、避免評價，繁體中文，中文字數 12～22。
僅輸出最終文字，不要任何前後綴或解釋。`;
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: '你是一個簡潔溫和的日記引導助手，輸出繁體中文。根據使用者的歷史日記內容，提供個人化且具有連續性的引導語。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 80
        });

        const guideText = (completion.choices?.[0]?.message?.content || '').trim();

        if (!guideText) {
            throw new Error('生成引導語失敗');
        }

        // 可選：將生成的引導語儲存到 Firestore
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

        res.status(200).json({ guideText, basedOnDiaries: recentDiaries.length });
    } catch (error) {
        console.error('生成引導語時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}



