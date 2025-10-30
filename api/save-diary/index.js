import admin from 'firebase-admin';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

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
    // 設定 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: '只允許 POST 請求' 
        });
    }

    try {
        const {
            userId = 'default-user',
            content,               // 純文字（若前端已做轉寫）
            audioBase64,           // 前端傳來的 base64 音訊（dataURL 或純 base64 皆可）
            mode = 'text',         // 'text' | 'audio' | 'stt'
            duration = 0,
            date = new Date().toISOString()
        } = req.body || {};

        let finalContent = content || '';

        // 若有音訊，先用 OpenAI 轉文字
        if (!finalContent && audioBase64) {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY 未設定，無法進行語音轉文字');
            }

            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            // 去除 dataURL 前綴
            const base64String = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
            const buffer = Buffer.from(base64String, 'base64');

            // 嘗試使用 webm 做檔名與 MIME
            const file = await toFile(buffer, 'audio.webm', { type: 'audio/webm' });

            // 使用 Whisper 轉寫
            const transcript = await openai.audio.transcriptions.create({
                file,
                model: 'whisper-1',
                // 可選：language: 'zh'
            });
            finalContent = (transcript.text || '').trim();
        }

        // 驗證：至少要有文字內容
        if (!finalContent) {
            return res.status(400).json({
                success: false,
                error: '缺少可儲存的內容（content 或 audioBase64）'
            });
        }

        const now = new Date();
        const dateString = now.toISOString().slice(0, 10);

        // 獎勵金幣數（可根據內容長度調整）
        const coinsEarned = 150;

        // 準備日記記錄資料
        const diaryData = {
            userId,
            date: admin.firestore.Timestamp.fromDate(new Date(date)),
            dateString,
            content: finalContent,
            mode: audioBase64 ? 'stt' : mode,
            audioUrl: null,
            duration,
            coins: coinsEarned,
            processed: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // 儲存到 Firestore: users/{userId}/diaries/{autoId}
        const diaryRef = await db
            .collection('users')
            .doc(userId)
            .collection('diaries')
            .add(diaryData);

        console.log(`✅ 日記已儲存，文件 ID: ${diaryRef.id}`);

        // 更新使用者統計資料
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
            totalCoins: admin.firestore.FieldValue.increment(coinsEarned),
            totalDiaries: admin.firestore.FieldValue.increment(1),
            lastDiaryDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`✅ 使用者統計已更新`);

        return res.status(200).json({
            success: true,
            message: '日記已成功儲存',
            diaryId: diaryRef.id,
            coinsEarned,
            data: {
                ...diaryData,
                date: now.toISOString()
            }
        });

    } catch (error) {
        console.error('儲存日記時發生錯誤:', error);
        return res.status(500).json({
            success: false,
            error: '內部伺服器錯誤',
            details: error.message
        });
    }
}

