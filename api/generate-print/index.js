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
            date = new Date().toISOString().slice(0, 10),
            daysToAnalyze = 7,  // Default to 7 days as requested
            language = 'zh-TW'
        } = req.body || {};

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // 讀取使用者最近的日記內容和統計數據
        let recentDiaries = [];
        let userStats = {};

        // 讀取最近的日記
        const diariesSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('diaries')
            .orderBy('date', 'desc')
            .limit(daysToAnalyze)
            .get();

        // Ensure we have correct chronological order (Oldest -> Recent) for the analysis logic
        recentDiaries = diariesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                date: data.dateString || data.date?.toDate?.()?.toISOString?.()?.slice(0, 10) || '',
                content: data.content?.slice(0, 150) || ''
            };
        }).reverse(); // API returns descending, we need ascending (Oldest to Newest) based on instructions

        // 讀取使用者統計
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            userStats = userDoc.data();
        }

        console.log(`📖 讀取到 ${recentDiaries.length} 筆最近日記`);


        // 組合 prompt
        let userHistorySummary = '';

        if (recentDiaries.length > 0) {
            const summaries = recentDiaries
                .map((entry, idx) => `Day ${idx + 1} (${entry.date}): ${entry.content.slice(0, 150)}...`)
                .join('\n');

            userHistorySummary = summaries;
        } else {
            // Fallback if no diaries found
            userHistorySummary = 'No recent diary records found. Assume a journey from emptiness to a small beginning.';
        }

        // 載入 Prompt Config
        const { getPrintPrompt } = await import('../../api/config/prompts.js');
        const promptGenPrompt = getPrintPrompt({
            targetLang: language === 'en-US' ? 'English' : 'Traditional Chinese',
            userHistorySummary
        });

        // 第一步：使用 GPT-4o 生成 DALL-E 的 Prompt (需要較強的邏輯推理)
        console.log('🎨 正在生成圖像描述...');
        const promptCompletion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: "You are a creative director describing scenes for an AI image generator." },
                { role: 'user', content: promptGenPrompt }
            ],
            temperature: 0.7,
        });

        const imagePrompt = (promptCompletion.choices?.[0]?.message?.content || '').trim();
        console.log(`🖼️ 圖像 Prompt: ${imagePrompt}`);

        if (!imagePrompt) {
            throw new Error('生成圖像描述失敗');
        }

        // 第二步：使用 DALL-E 3 生成圖像
        console.log('🖌️ 正在調用 DALL-E 生成圖像...');
        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: imagePrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "url"
        });

        const imageUrl = imageResponse.data[0].url;
        console.log(`✅ 圖像生成成功: ${imageUrl ? imageUrl.slice(0, 50) + '...' : 'Unknown URL'}`);

        // 記錄列印歷史
        try {
            await db
                .collection('users')
                .doc(userId)
                .collection('prints')
                .add({
                    type: 'image',
                    imagePrompt,
                    imageUrl,
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
            imageUrl,
            imagePrompt,
            printText: "[Image Generated]", // 為了兼容前端舊有 checks
            basedOnDiaries: recentDiaries.length,
            totalCoins: userStats.totalCoins || totalCoins
        });

    } catch (error) {
        console.error('生成列印內容時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}
