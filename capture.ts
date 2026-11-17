// Takes the game's screenshots (Node 22, standard library only): serves game/, opens each scene in
// shots.json in a headless Chrome or Edge at 1280 x 720, and writes each frame as a PNG into the
// --out directory (a temporary folder by default). The frames are the game's own rendering of its
// ?shot= scenes, unedited; they are then saved as JPEG into screenshots/ to fit the 256 KiB cap.
//   node capture.ts --browser "<path to chrome or msedge>" [--out <dir>]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const option = (name: string, fallback: string) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const browser = option('--browser', 'chrome');
const out = option('--out', join(tmpdir(), 'last-mile-shots'));
const port = 8093;
const scenes: { name: string; query: string }[] = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

const server = spawn(process.execPath, [join(here, 'serve.ts'), '--port', String(port)], { stdio: 'ignore' });
await new Promise((done) => setTimeout(done, 800));
mkdirSync(out, { recursive: true });
try {
  for (const scene of scenes) {
    const target = join(out, `${scene.name}.png`);
    rmSync(target, { force: true });
    spawnSync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1280,720',
      '--virtual-time-budget=4000',
      `--screenshot=${target}`,
      `http://localhost:${port}/${scene.query}`,
    ], { stdio: 'ignore', timeout: 90000 });
    if (!existsSync(target)) throw new Error(`${scene.name}: the browser wrote no screenshot`);
    console.log(`${target}: ${statSync(target).size} bytes`);
  }
} finally {
  server.kill();
}
