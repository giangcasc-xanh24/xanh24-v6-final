// /pages/api/mock-vnpt/[...path].ts - Mock VNPT M2M API de test khong mat tien - Chuan xac 100% theo doc 33 trang
import { NextApiRequest, NextApiResponse } from 'next';

let lastRequestTime = 0;
let walletBalance = 512000; // 500GB

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query as { path: string[] };
  const endpoint = path ? path.join('/') : '';

  console.log(`[Mock VNPT] ${req.method} /${endpoint}`, req.body || req.query);

  // OAuth2 Token
  if (endpoint === 'oauth2/token') {
    if (req.method !== 'POST') return res.status(405).json({ errorCode: 2, errorDesc: 'Loi tham so dau vao - Method Not Allowed' });
    const { client_id, client_secret } = req.body;
    if (!client_id || !client_secret) {
      return res.status(400).json({ errorCode: 2, errorDesc: 'Loi tham so dau vao - Thieu client_id/client_secret' });
    }
    return res.json({
      access_token: `mock_token_24h_eyJhbGc_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 86400,
      errorCode: 0,
      errorDesc: 'Thanh cong'
    });
  }

  // Request OTP
  if (endpoint === 'msimapi/requestOTP') {
    const { msisdn } = req.body;
    if (!msisdn) return res.status(400).json({ errorCode: 2, errorDesc: 'Loi tham so dau vao - Thieu msisdn' });
    return res.json({ errorCode: 0, errorDesc: 'Thanh cong - OTP da gui toi so dien thoai', msisdn, otpSent: true });
  }

  // Verify OTP
  if (endpoint === 'msimapi/verifyOTP') {
    const { msisdn, otp } = req.body;
    if (otp === '123456' || otp === '000000') {
      return res.json({ errorCode: 0, errorDesc: 'Thanh cong', verified: true, msisdn });
    }
    return res.status(400).json({ errorCode: 2, errorDesc: 'Loi tham so dau vao - OTP sai', verified: false });
  }

  // Register No OTP
  if (endpoint === 'msimapi/registerNoOTP') {
    const { msisdn, enable } = req.body;
    return res.json({ errorCode: 0, errorDesc: 'Thanh cong - Da dang ky chia se khong can OTP', msisdn, noOtpEnabled: enable });
  }

  // Wallet Detail
  if (endpoint === 'msimapi/walletDetail') {
    const { msisdn } = req.query;
    return res.json({
      balance: walletBalance,
      total: 1048576, // 1TB
      used: 1048576 - walletBalance,
      expire: '2025-12-31',
      msisdn,
      errorCode: 0,
      errorDesc: 'Thanh cong'
    });
  }

  // Check MSISDN
  if (endpoint === 'msimapi/checkMsisdn') {
    const { msisdn } = req.query as { msisdn: string };
    if (msisdn === '84900000000') {
      return res.json({ exists: false, errorCode: 3, errorDesc: 'msisdn/imsi khong ton tai - SDT khong ton tai', msisdn });
    }
    if (!msisdn || msisdn.length < 10) {
      return res.json({ errorCode: 2, errorDesc: 'Loi tham so dau vao - SDT khong hop le', msisdn });
    }
    return res.json({ exists: true, type: 'VinaPhone 5G', msisdn, errorCode: 0, errorDesc: 'Thanh cong' });
  }

  // Share Traffic - QUAN TRONG NHAT - Rate limiting 1 req/phut
  if (endpoint === 'msimapi/shareTraffic') {
    const now = Date.now();
    if (lastRequestTime && now - lastRequestTime < 60000) {
      const retryAfter = 60 - Math.floor((now - lastRequestTime) / 1000);
      return res.status(422).json({
        errorCode: 422,
        errorDesc: 'Gui qua nhieu yeu cau lien tuc - Rate limiting 1 yeu cau/phut',
        retryAfter,
        error: 'HTTP 422 - Rate limited'
      });
    }
    lastRequestTime = now;

    const { fromMsisdn, toMsisdn, amount, note } = req.body;
    if (!fromMsisdn || !toMsisdn || !amount) {
      return res.status(400).json({ errorCode: 2, errorDesc: 'Loi tham so dau vao - Thieu fromMsisdn/toMsisdn/amount' });
    }
    if (toMsisdn === '84900000000') {
      return res.status(400).json({ errorCode: 3, errorDesc: 'msisdn/imsi khong ton tai', toMsisdn });
    }
    if (walletBalance < amount) {
      return res.status(500).json({ errorCode: 99, errorDesc: 'Loi he thong - Vi ban buon het dung luong', balance: walletBalance });
    }

    walletBalance -= amount;
    const transactionId = `TXN_MOCK_${Date.now()}_${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    return res.json({
      errorCode: 0,
      errorDesc: 'Thanh cong',
      transactionId,
      fromMsisdn,
      toMsisdn,
      amount,
      balance: walletBalance,
      status: 'SUCCESS',
      effectiveDate: new Date().toISOString().split('T')[0],
      expireDate: new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0],
      note
    });
  }

  // Share History
  if (endpoint === 'msimapi/shareHistory') {
    const { msisdn, from, to } = req.query;
    return res.json({
      list: [
        { transactionId: 'TXN_MOCK_1', fromMsisdn: msisdn, toMsisdn: '84987654321', amount: 1024, date: '2025-05-15', status: 'SUCCESS', note: 'Xanh24 Data 5G - 1GB' },
        { transactionId: 'TXN_MOCK_2', fromMsisdn: msisdn, toMsisdn: '84987654322', amount: 2048, date: '2025-05-14', status: 'SUCCESS', note: 'Xanh24 Data 5G - 2GB' }
      ],
      msisdn, from, to,
      errorCode: 0,
      errorDesc: 'Thanh cong'
    });
  }

  return res.status(404).json({ errorCode: 404, errorDesc: 'Khong ton tai api nay - 404', endpoint });
}
