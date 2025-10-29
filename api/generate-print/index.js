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
        const { date = new Date().toISOString().slice(0,10), summary } = req.body || {};

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const prompt = `請輸出一則簡短的鼓勵訊息，作為熱感應紙籤列印內容。
要求：1-2 句繁體中文，積極但不空泛，避免命令語氣，不超過 40 字。
附上今天日期（YYYY/MM/DD）。只輸出最終文字。`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: '你是一個簡潔溫暖的鼓勵語助手，輸出繁體中文。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 80
        });

        const printText = (completion.choices?.[0]?.message?.content || '').trim();

        if (!printText) {
            throw new Error('生成列印內容失敗');
        }

        res.status(200).json({ printText });
    } catch (error) {
        console.error('生成列印內容時發生錯誤:', error);
        res.status(500).json({ error: error.message });
    }
}



