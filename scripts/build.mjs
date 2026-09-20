import {cp,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('dist/shared/',root),{recursive:true});
await cp(new URL('public/',root),new URL('dist/',root),{recursive:true});
await cp(new URL('shared/',root),new URL('dist/shared/',root),{recursive:true});
console.log('Static preview built in dist/. Shared play uses npm start and a persistent server.');
