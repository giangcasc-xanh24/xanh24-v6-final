import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

let lastRequestTime = 0;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query as { path: string[] };
  const endpoint = path? path.join('/') : '';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (endpoint === 'oauth2/token') {
    return res.json({ access_token: `mock_token_${Date.now()}`, token_type: 'Bearer', expires_in: 86400, errorCode: 0, errorDesc: 'Thanh cong' });
  }

  if (endpoint === 'msimapi/shareTraffic') {
    const now = Date.now();
    if (now - lastRequestTime < 60000) {
      const retryAfter = Math.ceil((60000 - (now - lastRequestTime)) / 1000);
      try {
        await supabase.from('vnpt_logs').insert({
          endpoint: 'msimapi/shareTraffic',
          request_body: req.body,
          response_body: { errorCode: 422, errorDesc: 'Gui qua nhieu yeu cau lien tuc', retryAfter },
          error_code: 422,
          error_desc: 'Gui qua nhieu yeu cau lien tuc',
          transaction_id: null,
          msisdn: req.body?.toMsisdn || null
        });
      } catch(e){ console.log('log err', e) }
      return res.status(429).json({ errorCode: 422, errorDesc: 'Gui qua nhieu yeu cau lien tuc', retryAfter, error: 'Rate limiting 1 req/phut - BullMQ concurrency 1' });
    }
    lastRequestTime = now;

    const { fromMsisdn, toMsisdn, amount, note } = req.body;
    if (!toMsisdn ||!amount) {
      return res.status(400).json({ errorCode: 2, errorDesc: 'Loi tham so - Thieu toMsisdn/amount' });
    }

    const transactionId = `TXN_MOCK_${Date.now()}_KSZZH`;

    const { data: config } = await supabase.from('vnpt_config').select('*').limit(1).single();
    const currentBalance = config?.balance_mb || 512000;
    const newBalance = Math.max(0, currentBalance - amount);

    if (config) {
      await supabase.from('vnpt_config').update({ balance_mb: newBalance, updated_at: new Date().toISOString() }).eq('id', config.id);
    }

    try {
      await supabase.from('data_orders').insert({
        mssv: '2021001234',
        to_msisdn: toMsisdn,
        amount_mb: amount,
        price_xu: amount === 1024? 5000 : amount === 2048? 9000 : 20000,
        price_vnd: amount === 1024? 50000 : amount === 2048? 90000 : 200000,
        status: 'SUCCESS',
        transaction_id: transactionId,
        error_code: 0,
        error_desc: 'Thanh cong',
        from_msisdn: fromMsisdn,
        note: note,
        expire_date: new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0]
      });
    } catch(e){ console.log('insert data_orders err', e) }

    try {
      await supabase.from('vnpt_logs').insert({
        endpoint: 'msimapi/shareTraffic',
        request_body: req.body,
        response_body: { errorCode: 0, errorDesc: 'Thanh cong', transactionId, balance: newBalance },
        error_code: 0,
        error_desc: 'Thanh cong',
        transaction_id: transactionId,
        msisdn: toMsisdn
      });
    } catch(e){ console.log('insert logs err', e) }

    try {
      const { data: codeRow } = await supabase.from('data_codes').select('*').eq('status','AVAILABLE').limit(1).single();
      if (codeRow) {
        await supabase.from('data_codes').update({ status: 'USED', used_at: new Date().toISOString(), to_msisdn: toMsisdn }).eq('id', codeRow.id);
      }
    } catch(e){ console.log('update code err', e) }

    return res.json({
      errorCode: 0,
      errorDesc: 'Thanh cong',
      transactionId,
      fromMsisdn,
      toMsisdn,
      amount,
      balance: newBalance,
      status: 'SUCCESS',
      effectiveDate: new Date().toISOString().split('T')[0],
      expireDate: new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0],
      note
    });
  }

  return res.json({ errorCode: 0, errorDesc: 'Mock OK', endpoint });
}
