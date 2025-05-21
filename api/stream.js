import CryptoJS from 'crypto-js';
import fetch from 'node-fetch';   // Vercel Edge Runtime needs this in CommonJS

export default async function handler(req, res) {
  const { seokey } = req.query;
  if (!seokey) return res.status(400).json({ error: 'seokey required' });

  try {
    /* 1. fetch the song page HTML */
    const html = await fetch(`https://gaana.com/song/${seokey}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.text());

    /* 2. pull out window.REDUX_DATA JSON safely */
    const start = html.indexOf('window.REDUX_DATA = ');
    if (start === -1) throw Error('REDUX_DATA not found');

    const jsonStart = start + 'window.REDUX_DATA = '.length;
    const jsonEnd   = html.indexOf(';</script>', jsonStart);
    const jsonText  = html.slice(jsonStart, jsonEnd).trim();

    const data  = JSON.parse(jsonText);
    const msg   =
      data.song?.songDetail?.tracks?.[0]?.urls?.high?.message ||
      data.song?.songDetail?.tracks?.[0]?.urls?.auto?.message;

    if (!msg) throw Error('encrypted message not found');

    /* 3. decrypt */
    const KEY = CryptoJS.enc.Utf8.parse('g@1n!(f1#r.0$)&%');
    const IV  = CryptoJS.enc.Utf8.parse('asd!@#!@#@!12312');
    const url = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(msg) },
      KEY,
      { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);

    /* 4. return plain HTTPS stream URL */
    return res.status(200).json({ url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}