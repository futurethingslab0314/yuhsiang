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
        const { userId = 'default-user', date, daysToAnalyze = 7, language = 'zh-TW', questionNumber = 1, previousAnswer = '' } = req.body || {};

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

        // 讀取使用者最近 N 天的日記內容 (僅對第一題有用，作為背景資訊)
        let recentDiaries = [];
        // 只有第一題需要讀取歷史日記增加豐富度，或者保持每次都讀取作為背景 tone check
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

        // 組合 prompt
        const { getGuidePrompt } = await import('../../api/config/prompts.js');
        const prompt = getGuidePrompt({
            targetLang,
            charLimit,
            userContext,
            questionNumber,
            previousAnswer
        });

        // 第一題需要較高的創造力 (1.1)，後續追問則維持穩定 (0.7)
        const temperature = parseInt(questionNumber) === 1 ? 1.1 : 0.7;

        // 所有題目皆已在 Prompt 中定義 Persona (DiaryContainer)，故使用 minimal system prompt 以避免干擾
        const systemContent = (parseInt(questionNumber) >= 1 && parseInt(questionNumber) <= 3)
            ? `你是一個輔助引導的 AI。請完全依照使用者的指令與角色設定生成回應。請使用 ${targetLang}。`
            : `你是一位深具同理心、溫暖且不過度熱情的心理陪伴專家。你的載體是一個放在家中的互動裝置，你的用戶是正在經歷憂鬱症狀的人。今天是晚間時刻。請使用 ${targetLang} 回應。`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: prompt }
            ],
            temperature: temperature,
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



