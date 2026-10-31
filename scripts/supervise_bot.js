// One supervisor owns one bot process. The loopback lock prevents duplicate launches.
const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const root = path.resolve(__dirname, '..');
const lock = net.createServer();
let child, stopping = false, restarting = false, unhealthySince = null;
let startedAt = 0;
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
const log = message => fs.appendFileSync(path.join(root, 'logs/supervisor.log'), `${new Date().toISOString()} ${message}\n`);

function status() {
  return new Promise(resolve => {
    const request = http.get('http://127.0.0.1:8888/api/status', response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    request.setTimeout(5000, () => request.destroy());
    request.on('error', () => resolve(null));
  });
}

async function start() {
  if (stopping || child) return;
  // Never compete with a manually running bot using the same WhatsApp profile.
  if (await status()) { setTimeout(start, 20_000); return; }
  const output = fs.openSync(path.join(root, 'logs/bot-runtime.log'), 'a');
  child = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: root, windowsHide: true, stdio: ['ignore', output, output]
  });
  fs.closeSync(output);
  startedAt = Date.now();
  unhealthySince = null;
  log(`Started bot pid=${child.pid}`);
  child.once('error', error => log(`Spawn error: ${error.message}`));
  child.once('exit', (code, signal) => {
    log(`Bot exited code=${code} signal=${signal}`);
    child = null;
    if (!stopping && !restarting) setTimeout(start, 5000);
  });
}

function stopChild() {
  const ownedPid = child?.pid;
  if (!ownedPid) return Promise.resolve();
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(ownedPid), '/T', '/F'], { windowsHide: true }, error => {
        if (error) log(`Stop failed: ${error.message}`);
        resolve();
      });
    } else { child.kill('SIGTERM'); resolve(); }
  });
}

let checking = false;
const watchdog = setInterval(async () => {
  if (checking || !child || stopping || restarting) return;
  checking = true;
  try {
    const live = await status();
    const healthy = live && (live.status === 'READY' || live.status === 'QR_READY' || live.authenticationRequired);
    if (healthy) { unhealthySince = null; return; }
    unhealthySince ||= Date.now();
    if (Date.now() - Math.max(unhealthySince, startedAt) < 180_000) return;
    restarting = true;
    log('Connection/HTTP unhealthy for 180s; restarting owned bot process.');
    await stopChild();
    restarting = false;
    setTimeout(start, 5000);
  } finally { checking = false; }
}, 20_000);

async function shutdown() {
  stopping = true;
  clearInterval(watchdog);
  await stopChild();
  lock.close(() => process.exit(0));
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
lock.on('error', error => {
  if (error.code === 'EADDRINUSE') log('Supervisor already running; duplicate stopped.');
  else log(error.message);
  process.exit(error.code === 'EADDRINUSE' ? 0 : 1);
});
lock.listen(8889, '127.0.0.1', () => { log('Supervisor ready'); void start(); });
