module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET 요청만 지원합니다.' });
    return;
  }

  const { text } = req.query;

  if (!text) {
    res.status(400).json({ error: 'text 쿼리 파라미터가 필요합니다.' });
    return;
  }

  try {
    const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        target_lang: 'KO',
      }),
    });

    if (!deeplResponse.ok) {
      const detail = await deeplResponse.text();
      res.status(deeplResponse.status).json({ error: 'DeepL 요청이 실패했습니다.', detail });
      return;
    }

    const data = await deeplResponse.json();
    const translatedText = data.translations?.[0]?.text ?? '';

    res.status(200).json({ translatedText });
  } catch (err) {
    res.status(500).json({ error: '서버 처리 중 오류가 발생했습니다.' });
  }
};
