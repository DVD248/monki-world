// Moves a world from this Mac's data/ folder to the online copy, then prints each person's link
// for continuing their own seat there (the same kind of link as Settings → Continue on my phone).
//
//   npm run upload-world -- https://monki-world.<your-subdomain>.workers.dev
//
// Without file names it takes the most recently saved world in data/ (or MONKI_DATA_DIR); name
// files after the address to move others. A world that is already online is never replaced.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA = process.env.MONKI_DATA_DIR || path.join(ROOT, 'data');
const NAMES = { david: 'David', julia: 'Julia' };
const [site, ...named] = process.argv.slice(2);
if (!/^https?:\/\/[^/]/.test(site || '')) {
  console.error('Usage: npm run upload-world -- https://monki-world.<your-subdomain>.workers.dev [world file ...]');
  process.exit(1);
}
const origin = new URL(site).origin;

let files = named;
if (!files.length) {
  const found = await Promise.all((await readdir(DATA).catch(() => [])).filter(f => /^[a-f0-9]{24}\.json$/.test(f))
    .map(async f => ({ file: path.join(DATA, f), at: (await stat(path.join(DATA, f))).mtimeMs })));
  found.sort((a, b) => b.at - a.at);
  if (!found.length) { console.error(`No worlds found in ${DATA}.`); process.exit(1); }
  files = [found[0].file];
  if (found.length > 1) console.log(`Moving the most recently saved of ${found.length} worlds. To move another, name its file:\n${found.slice(1).map(f => `  ${f.file}`).join('\n')}`);
}

for (const file of files) {
  const room = JSON.parse(await readFile(file, 'utf8'));
  const response = await fetch(`${origin}/api/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room }) });
  const result = await response.json().catch(() => ({}));
  if (response.status !== 201 && response.status !== 409) {
    console.error(`${path.basename(file)}: ${result.error || `the server answered ${response.status}`}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`\nWorld ${room.id} ${response.status === 409 ? 'was already online (left as it is there)' : 'is online now'}.`);
  for (const [person, token] of Object.entries(room.members)) console.log(`  ${NAMES[person] || person}: ${origin}/#seat=${room.id}.${token}`);
}
console.log('\nOpen your own link on your phone and choose Continue here. The links are private keys: keep them between you two.');
