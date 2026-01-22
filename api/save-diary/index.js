import admin from 'firebase-admin';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

// ====================================
// 用心程度評分系統（三維度）- 伺服器端版本
// ====================================

// 情緒詞庫：籠統 vs 精細
const EMOTION_LEXICON = {
    // 籠統情緒詞（低分）
    vague: [
        '很煩', '不爽', '開心', '難過', '還好', '普通', '無聊', '累', 
        '煩', '爽', '好', '壞', '高興', '生氣', '傷心', '緊張',
        '很好', '很差', '不好', '不錯', '可以', '沒什麼', '就這樣'
    ],
    // 精細情緒詞（高分）
    granular: [
        // 複合情緒
        '混雜', '交織', '夾雜', '參雜', '矛盾', '複雜',
        // 細膩情緒狀態
        '委屈', '失落', '空虛', '焦躁', '惆悵', '茫然', '無力', 
        '挫折', '沮喪', '愧疚', '羞恥', '嫉妒', '憤恨', '怨恨',
        '感激', '欣慰', '釋然', '平靜', '安心', '踏實', '滿足',
        '期待', '興奮', '雀躍', '感動', '溫暖', '幸福', '珍惜',
        '被背叛', '被忽視', '被理解', '被接納', '被拒絕',
        // 身體感受描述
        '沈甸甸', '空蕩蕩', '悶悶的', '緊繃', '放鬆', '窒息', '透不過氣',
        '心揪', '心酸', '心寒', '心暖', '胸口', '喉嚨', '肩膀'
    ]
};

// 因果與洞察關鍵詞
const INSIGHT_KEYWORDS = {
    // 因果詞
    causal: [
        '因為', '所以', '導致', '造成', '使得', '讓我', '於是',
        '因此', '結果', '以至於', '之所以', '原因是', '是因為'
    ],
    // 洞察詞
    insight: [
        '發現', '理解', '明白', '意識到', '覺察', '體會', '領悟',
        '突然覺得', '這才知道', '原來', '其實', '想通', '看清',
        '認識到', '察覺', '感受到', '注意到', '學到', '懂了'
    ]
};

// 能動性關鍵詞
const AGENCY_PATTERNS = {
    // 內控（高分）：以「我」為主詞的反思
    internal: [
        '我覺得', '我認為', '我想', '我發現', '我決定', '我選擇',
        '我應該', '我可以', '我需要', '我希望', '我打算', '我願意',
        '我承認', '我接受', '我面對', '我嘗試', '我學會', '我理解',
        '對我來說', '讓我', '使我', '我自己'
    ],
    // 外控（低分）：歸因於外部
    external: [
        '都是', '害我', '逼我', '怪', '運氣', '命', '沒辦法',
        '不得不', '被迫', '只能', '無奈', '沒有選擇'
    ]
};

/**
 * 計算情緒顆粒度分數 (1-4)
 */
function calcEmotionalGranularity(text) {
    if (!text) return 1;
    
    let granularCount = 0;
    let vagueCount = 0;
    
    EMOTION_LEXICON.granular.forEach(word => {
        if (text.includes(word)) granularCount++;
    });
    
    EMOTION_LEXICON.vague.forEach(word => {
        if (text.includes(word)) vagueCount++;
    });
    
    const total = granularCount + vagueCount;
    if (total === 0) return 2;
    
    const granularRatio = granularCount / total;
    
    if (granularRatio >= 0.7) return 4;
    if (granularRatio >= 0.4) return 3;
    if (granularRatio >= 0.2) return 2;
    return 1;
}

/**
 * 計算因果洞察詞分數 (1-4)
 */
function calcCausalInsight(text) {
    if (!text) return 1;
    
    let causalCount = 0;
    let insightCount = 0;
    
    INSIGHT_KEYWORDS.causal.forEach(word => {
        const matches = text.match(new RegExp(word, 'g'));
        if (matches) causalCount += matches.length;
    });
    
    INSIGHT_KEYWORDS.insight.forEach(word => {
        const matches = text.match(new RegExp(word, 'g'));
        if (matches) insightCount += matches.length;
    });
    
    const total = causalCount + insightCount;
    
    if (total >= 4) return 4;
    if (total >= 2) return 3;
    if (total >= 1) return 2;
    return 1;
}

/**
 * 計算能動性分數 (1-4)
 */
function calcAgency(text) {
    if (!text) return 1;
    
    let internalCount = 0;
    let externalCount = 0;
    
    AGENCY_PATTERNS.internal.forEach(pattern => {
        const matches = text.match(new RegExp(pattern, 'g'));
        if (matches) internalCount += matches.length;
    });
    
    AGENCY_PATTERNS.external.forEach(pattern => {
        const matches = text.match(new RegExp(pattern, 'g'));
        if (matches) externalCount += matches.length;
    });
    
    const selfMentions = (text.match(/我/g) || []).length;
    const charCount = text.length;
    const selfRatio = selfMentions / (charCount / 20);
    
    const total = internalCount + externalCount;
    if (total === 0) {
        if (selfRatio >= 1) return 3;
        return 2;
    }
    
    const internalRatio = internalCount / total;
    
    if (internalRatio >= 0.7 && internalCount >= 2) return 4;
    if (internalRatio >= 0.5) return 3;
    if (internalRatio >= 0.3) return 2;
    return 1;
}

/**
 * 綜合分析回答品質 (1-4)
 */
function analyzeContentQuality(text) {
    if (!text) return 1;
    
    const charCount = text.length;
    if (charCount < 10) return 1;
    
    const granularityScore = calcEmotionalGranularity(text);
    const insightScore = calcCausalInsight(text);
    const agencyScore = calcAgency(text);
    
    const avgScore = (granularityScore + insightScore + agencyScore) / 3;
    
    let lengthBonus = 0;
    if (charCount >= 150) lengthBonus = 0.3;
    else if (charCount >= 100) lengthBonus = 0.2;
    else if (charCount >= 50) lengthBonus = 0.1;
    
    const finalScore = Math.min(4, avgScore + lengthBonus);
    
    console.log(`📊 品質分析: 顆粒度=${granularityScore}, 洞察=${insightScore}, 能動性=${agencyScore}, 長度加成=${lengthBonus}, 總分=${finalScore.toFixed(2)}`);
    
    return parseFloat(finalScore.toFixed(2));
}

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

        // 計算內容品質分數（用心程度）
        const qualityScore = analyzeContentQuality(finalContent);
        console.log(`📈 日記品質分數: ${qualityScore}`);

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
            qualityScore,  // 新增：用心程度分數 (1-4)
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
            qualityScore,  // 回傳品質分數給前端
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

