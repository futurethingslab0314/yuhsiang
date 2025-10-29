import OpenAI from 'openai';

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
        const { userName, date, locale } = req.body || {};

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const prompt = `請以溫和中立的一句短句，生成「今晚睡前的自我敘事引導語」，
語氣簡短、具體、避免評價，繁體中文，中文字數 12～22。
僅輸出最終文字，不要任何前後綴或解釋。`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: '你是一個簡潔溫和的日記引導助手，輸出繁體中文。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 80
        });

        const guideText = (completion.choices?.[0]?.message?.content || '').trim();

        if (!guideText) {
            throw new Error('生成引導語失敗');
        }

        res.status(200).json({ guideText });
    } catch (error) {
        console.error('生成引導語時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}



