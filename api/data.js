const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

function getClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    realtime: { transport: ws }
  });
}

module.exports = async (req, res) => {
  const supabase = getClient();
  const key = req.query.key;

  try {
    if (req.method === 'GET') {
      if (!key) return res.status(400).json({ error: 'Falta el parámetro key' });
      const { data, error } = await supabase
        .from('kv_store')
        .select('key, value')
        .eq('key', key)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'No encontrado' });
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { key: bodyKey, value } = req.body || {};
      if (!bodyKey) return res.status(400).json({ error: 'Falta key en el body' });
      if (JSON.stringify(value ?? null).length > 2000000) {
        return res.status(413).json({ error: 'El valor es demasiado grande' });
      }
      const { error } = await supabase
        .from('kv_store')
        .upsert({ key: bodyKey, value, updated_at: new Date().toISOString() });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ key: bodyKey, value });
    }

    if (req.method === 'DELETE') {
      if (!key) return res.status(400).json({ error: 'Falta el parámetro key' });
      const { error } = await supabase.from('kv_store').delete().eq('key', key);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ deleted: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
