import CryptoJS from 'crypto-js';
import fetch     from 'node-fetch';

export default async function handler(req, res) {
  const { seokey } = req.query;
  if (!seokey) return res.status(400).json({ error: 'seokey required' });

  try {
    /* 1 – fetch the HTML */
    const html = await fetch(`https://gaana.com/song/${seokey}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.text());

    /* 2 – locate “window.REDUX_DATA = {” */
    const anchor = 'window.REDUX_DATA = ';
    const start  = html.indexOf(anchor);
    if (start === -1) throw Error('REDUX_DATA not found');

    /* 3 – brace-count to find the real end of the JSON object */
    let i     = start + anchor.length;
    let depth = 0;
    let end   = -1;

    for (; i < html.length; i++) {
      const c = html[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) throw Error('JSON block not closed');

    const jsonText = html.slice(start + anchor.length, end);

    /* 4 – parse */
    const data = JSON.parse(jsonText);

    /* 5 – grab encrypted message */
    const msg =
      data.song?.songDetail?.tracks?.[0]?.urls?.high?.message ||
      data.song?.songDetail?.tracks?.[0]?.urls?.auto?.message;
    if (!msg) throw Error('encrypted message not found');

    /* 6 – decrypt */
    const KEY = CryptoJS.enc.Utf8.parse('g@1n!(f1#r.0$)&%');
    const IV  = CryptoJS.enc.Utf8.parse('asd!@#!@#@!12312');
    const url = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(msg) },
      KEY,
      { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);

    /* 7 – force HTTPS so the browser won’t complain */
    const safeUrl = url.startsWith('http:') ? url.replace('http:', 'https:') : url;

    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).json({ url: safeUrl });
  } catch (e) {
    console.error('STREAM-API error →', e.message);
    return res.status(500).json({ error: e.message });
  }
}