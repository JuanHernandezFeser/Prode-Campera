const MAX_PROMPT_LENGTH = 12000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Falta el prompt' });
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `El mensaje es demasiado largo (máximo ${MAX_PROMPT_LENGTH} caracteres)` });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en las variables de entorno' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Error de la API de Gemini' });
    }

    const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('\n');
    if (!text) {
      return res.status(502).json({ error: 'La API no devolvió texto' });
    }

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'La API tardó demasiado en responder' : e.message;
    return res.status(500).json({ error: msg });
  }
};
