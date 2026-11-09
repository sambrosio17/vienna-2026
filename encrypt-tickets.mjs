// node encrypt-tickets.mjs <srcDir> <outDir>   (password in env TICKET_PASS)
import { webcrypto as c } from 'node:crypto';
import fs from 'node:fs'; import path from 'node:path';
const [src, out] = process.argv.slice(2); const pass = process.env.TICKET_PASS;
if (!pass) throw new Error('TICKET_PASS missing');
const ITER = 600000, salt = c.getRandomValues(new Uint8Array(16));
const base = await c.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await c.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const enc = async buf => { const iv = c.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await c.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf)); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return o; };
fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(src).filter(f => /\.(jpg|pdf)$/.test(f)).sort();
for (const f of files) fs.writeFileSync(path.join(out, f + '.enc'), await enc(fs.readFileSync(path.join(src, f))));
const b64 = u => Buffer.from(u).toString('base64');
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), check: b64(await enc(new TextEncoder().encode('vienna26-ok'))), files }, null, 1));
console.log('encrypted', files.length, 'files');
