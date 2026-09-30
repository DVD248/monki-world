import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
// Started clean, so a file deleted from public/ is not published from an older build.
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/shared/',root),{recursive:true});
await cp(new URL('public/',root),new URL('dist/',root),{recursive:true});
await cp(new URL('shared/',root),new URL('dist/shared/',root),{recursive:true});
// Cloudflare reads this file instead of serving it: the same headers server.mjs sends.
await writeFile(new URL('dist/_headers',root),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n');
console.log('Built dist/: the files the online copy (worker/index.mjs) serves.');
