import { spawnSync } from 'node:child_process';

export function checkRuntime() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('需要 Node.js 22+，推荐安装 24 LTS：https://nodejs.org/zh-cn/download');
  const curl = spawnSync('curl', ['--version'], { encoding: 'utf8', windowsHide: true });
  if (curl.error || curl.status !== 0) throw new Error('找不到 curl。Windows 请运行 curl.exe --version；其他系统请安装 curl。见 docs/local-setup.md。');
  return { node: process.version, curl: curl.stdout.split(/\r?\n/)[0].split(' ').slice(0, 2).join(' ') };
}
try {
  const environment = checkRuntime();
  console.log(`free-tts 环境检查通过：Node ${environment.node}，${environment.curl}`);
  if (!process.argv.includes('--doctor')) await import('../server.mjs').then(m => m.startServer({ openBrowser: process.argv.includes('--open') }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
