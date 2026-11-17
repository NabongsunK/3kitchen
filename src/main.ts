import { App, H, W } from './game/app';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const app = new App(ctx);

function resize(): void {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
  canvas.width = Math.round(W * scale * dpr);
  canvas.height = Math.round(H * scale * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  app.click(((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height);
});

window.addEventListener('keydown', (e) => {
  if (['Tab', ' ', 'Backspace', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  if (!e.repeat) app.key(e.key);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  app.update(dt);
  app.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
