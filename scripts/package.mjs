import { readdir, readFile, mkdir, lstat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const allowed = ['package.json', 'README.md', 'README.en.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', '.gitignore', '.gitattributes', 'server.mjs', 'server.test.mjs', 'release.test.mjs', 'site.test.mjs', 'online.test.mjs', 'start.sh', '启动free-tts.command', '启动free-tts.bat', 'public', 'site', 'lib', 'scripts', 'docs', '.github'];
export async function sourceFiles(root = ROOT) {
  const files = [];
  async function visit(relative) {
    const info = await lstat(path.join(root, relative));
    if (info.isSymbolicLink()) throw new Error('源码包拒绝符号链接。');
    if (info.isDirectory()) {
      for (const item of await readdir(path.join(root, relative), { withFileTypes: true })) {
        if (item.isSymbolicLink()) throw new Error('源码包拒绝符号链接。');
        if (item.name.startsWith('.') && relative !== '.github') continue;
        await visit(`${relative}/${item.name}`);
      }
    } else if (info.isFile()) {
      if (/(?:\.env(?:\.|$)|\.(?:mp3|wav|log|tmp)$|\.DS_Store$|Thumbs\.db$)/i.test(relative)) return;
      files.push({ name: relative, mode: info.mode, data: await readFile(path.join(root, relative)) });
    }
  }
  for (const item of allowed) await visit(item);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}
const crcTable = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(data) { let crc = 0xffffffff; for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
export function makeZip(files) {
  const locals = []; const central = []; let offset = 0;
  for (const file of files) {
    const name = Buffer.from(`free-tts/${file.name}`); const crc = crc32(file.data);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(0x21, 12); header.writeUInt32LE(crc, 14); header.writeUInt32LE(file.data.length, 18); header.writeUInt32LE(file.data.length, 22); header.writeUInt16LE(name.length, 26);
    locals.push(header, name, file.data);
    const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(0x314, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800, 8); entry.writeUInt16LE(0x21, 14); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(file.data.length, 20); entry.writeUInt32LE(file.data.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(((file.mode & 0xffff) << 16) >>> 0, 38); entry.writeUInt32LE(offset, 42);
    central.push(entry, name); offset += header.length + name.length + file.data.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
export async function packageSource(root = ROOT) {
  const files = await sourceFiles(root);
  const { version } = JSON.parse(await readFile(path.join(root, 'package.json')));
  const destination = path.join(root, '.local', 'releases', `free-tts-${version}.zip`);
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await writeFile(destination, makeZip(files), { mode: 0o600 });
  return { destination, count: files.length };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await packageSource(); console.log(`源码包已生成（${result.count} 个文件）：${result.destination}\n只打包源码白名单，未上传或发布。`);
}
