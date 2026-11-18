/* =====================================================================
   J.A.R.V.I.S. HOLO WINDOW SYSTEM
   Dynamic windows + live widgets that the agent opens, updates, moves,
   animates and closes by itself.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 5.2: theme accent for things that cannot use CSS variables (three.js materials, SVG strokes, chart.js)
const cssVar = (n, d) => { try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d; } catch { return d; } };
const accCss = () => cssVar('--cyan', '#2de2ff'); const acc2Css = () => cssVar('--cyan2', '#7ff3ff');
const accHex = () => parseInt(accCss().replace('#', ''), 16);
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import L from 'leaflet';
import Chart from 'chart.js/auto';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DEG = Math.PI / 180;
// (5.2) accent is read when a window is created, see accHex()
const PALETTE = ['#2de2ff', '#ffb02e', '#3dffa8', '#ff6bd5', '#a78bfa', '#ff5d6c', '#f5e663', '#5aa9ff'];
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const arr = (v, n, d) => { const a = Array.isArray(v) ? v.map(Number) : []; while (a.length < n) a.push(d); return a; };

Chart.defaults.color = '#9fc9db';
Chart.defaults.borderColor = 'rgba(var(--acc-rgb,45,226,255),.12)';
Chart.defaults.font.family = 'Rajdhani, system-ui, sans-serif';
Chart.defaults.font.size = 13;

/* ------------------------------------------------------------------ */
const STYLE = `
.hw-layer{position:fixed;inset:0;pointer-events:none;z-index:15}
.hw{position:absolute;display:flex;flex-direction:column;pointer-events:auto;min-width:240px;min-height:160px;
  background:linear-gradient(160deg,rgba(9,32,50,.78),rgba(3,12,22,.82));border:1px solid rgba(var(--acc-rgb,45,226,255),.35);
  border-radius:14px;box-shadow:0 0 0 1px rgba(var(--acc-rgb,45,226,255),.06),0 18px 50px rgba(0,0,0,.55),0 0 32px rgba(var(--acc-rgb,45,226,255),.12);
  backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);overflow:hidden;
  transform-origin:50% 0;animation:hwIn .55s cubic-bezier(.2,.9,.2,1);transition:box-shadow .3s,border-color .3s}
.hw.closing{animation:hwOut .35s ease-in forwards}
@keyframes hwIn{0%{opacity:0;transform:perspective(900px) rotateX(-28deg) scale(.82);filter:brightness(2.5) blur(4px)}
  60%{opacity:1;filter:brightness(1.3)}100%{transform:none;filter:none}}
@keyframes hwOut{to{opacity:0;transform:perspective(900px) rotateX(18deg) scale(.85);filter:brightness(2) blur(6px)}}
.hw::before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
  background:linear-gradient(90deg,transparent,rgba(var(--acc-rgb,45,226,255),.5),transparent) top/100% 1px no-repeat,
  repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px);z-index:3}
.hw .hw-scan{position:absolute;left:0;right:0;height:90px;top:-90px;pointer-events:none;z-index:3;
  background:linear-gradient(180deg,transparent,rgba(var(--acc-rgb,45,226,255),.16),transparent);animation:hwScan 1.1s ease-out 1}
@keyframes hwScan{to{top:110%}}
.hw.focus{border-color:rgba(var(--acc-rgb,45,226,255),.75);box-shadow:0 0 0 1px rgba(var(--acc-rgb,45,226,255),.2),0 18px 50px rgba(0,0,0,.55),0 0 44px rgba(var(--acc-rgb,45,226,255),.28)}
.hw.flash{animation:hwFlash .9s ease-out}
@keyframes hwFlash{30%{box-shadow:0 0 0 2px var(--cyan,#2de2ff),0 0 60px rgba(var(--acc-rgb,45,226,255),.7)}}
.hw-h{display:flex;align-items:center;gap:8px;padding:8px 10px 8px 12px;border-bottom:1px solid rgba(var(--acc-rgb,45,226,255),.16);cursor:grab;user-select:none;touch-action:none;flex:0 0 auto;position:relative}
.hw-h b{flex:1;min-width:0;font:700 11px Orbitron,sans-serif;letter-spacing:.22em;color:var(--cyan2,#7ff3ff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hw-dot{width:8px;height:8px;border-radius:50%;background:var(--cyan,#2de2ff);box-shadow:0 0 10px var(--cyan,#2de2ff);animation:hwDot 1.6s infinite}
@keyframes hwDot{50%{opacity:.35}}
.hw-badge{font:600 9.5px Orbitron,sans-serif;letter-spacing:.12em;padding:3px 7px;border-radius:3px;border:1px solid currentColor;color:var(--cyan,#2de2ff);white-space:nowrap;max-width:46%;overflow:hidden;text-overflow:ellipsis}
.hw-badge:empty{display:none}
.hw-badge.warn{color:#ffb02e}.hw-badge.ok{color:#3dffa8}.hw-badge.err{color:#ff5d6c}
.hw-btns{display:flex;gap:4px}
.hw-btns button{width:26px;height:26px;border-radius:7px;border:1px solid rgba(var(--acc-rgb,45,226,255),.25);background:rgba(0,0,0,.25);color:var(--cyan2,#7ff3ff);display:grid;place-items:center;cursor:pointer;padding:0}
.hw-btns svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round}
.hw-prog{position:absolute;left:0;bottom:-1px;height:2px;width:0;background:linear-gradient(90deg,var(--cyan,#2de2ff),var(--cyan2,#7ff3ff));box-shadow:0 0 10px var(--cyan,#2de2ff);transition:width .5s}
.hw-body{position:relative;flex:1;min-height:0;overflow:auto;color:#cfefff;font:500 15px Rajdhani,system-ui,sans-serif}
.hw-body canvas.gl{display:block;width:100%;height:100%;touch-action:none}
.hw-lbls{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.hw-lbl{position:absolute;transform:translate(-50%,-130%);font:600 11px Orbitron,sans-serif;letter-spacing:.08em;color:#fff;
  padding:3px 7px;border-radius:4px;background:rgba(2,10,18,.75);border:1px solid rgba(var(--acc-rgb,45,226,255),.55);white-space:nowrap;transition:opacity .25s}
.hw-lbl.hl{border-color:#ffb02e;color:#ffd38a;box-shadow:0 0 14px rgba(255,176,46,.6);font-size:13px;z-index:2}
.hw-hint{position:absolute;left:10px;bottom:8px;font:600 10px Orbitron,sans-serif;letter-spacing:.12em;color:rgba(127,243,255,.55);pointer-events:none}
.hw.max{position:fixed!important;inset:0!important;width:auto!important;height:auto!important;border-radius:0;z-index:45!important}
.hw.min .hw-body{display:none}.hw.min{min-height:0;height:auto!important}
/* mobile stage */
.hw-stage{position:absolute;inset:0 6px 4px;display:none;flex-direction:column;z-index:4}
.hw-stage.on{display:flex}
.hw-tabs{display:flex;gap:6px;overflow-x:auto;padding:0 2px 6px;scrollbar-width:none;flex:0 0 auto}
.hw-tabs::-webkit-scrollbar{display:none}
.hw-tab{flex:0 0 auto;font:600 10px Orbitron,sans-serif;letter-spacing:.12em;color:var(--cyan2,#7ff3ff);background:rgba(6,22,36,.6);border:1px solid rgba(var(--acc-rgb,45,226,255),.25);
  padding:6px 10px;border-radius:14px;cursor:pointer;backdrop-filter:blur(8px)}
.hw-tab.on{background:rgba(var(--acc-rgb,45,226,255),.2);border-color:var(--cyan,#2de2ff);box-shadow:0 0 12px rgba(var(--acc-rgb,45,226,255),.35)}
.hw-stage .hw-wrap{position:relative;flex:1;min-height:0}
.hw-stage .hw{position:absolute;inset:0;width:auto!important;height:auto!important;min-width:0}
.hw-stage .hw.hidden{display:none}
.hw-stage .hw-h{cursor:default}
/* widgets */
.w-pad{padding:12px 14px}
.w-md p{margin:.35em 0}.w-md ul{margin:.3em 0;padding-left:1.2em}.w-md b{color:#fff}.w-md img{max-width:100%;border-radius:8px}
.w-map{position:absolute;inset:0;background:#02060c}
.w-map .leaflet-container{background:#02060c;font-family:Rajdhani}
.w-map .leaflet-tile-pane{filter:invert(1) hue-rotate(185deg) saturate(.55) brightness(.78) contrast(1.15)}
.w-pin{width:16px;height:16px;border-radius:50%;background:var(--cyan,#2de2ff);border:2px solid #fff;box-shadow:0 0 0 4px rgba(var(--acc-rgb,45,226,255),.3),0 0 18px var(--cyan,#2de2ff)}
.w-pin.hl{background:#ffb02e;box-shadow:0 0 0 6px rgba(255,176,46,.35),0 0 26px #ffb02e;animation:pinP 1s infinite}
@keyframes pinP{50%{transform:scale(1.35)}}
.w-map .leaflet-popup-content-wrapper,.w-map .leaflet-popup-tip{background:rgba(3,14,24,.92);color:#cfefff;border:1px solid rgba(var(--acc-rgb,45,226,255),.4)}
.w-map .leaflet-popup-content{font:600 14px Rajdhani;margin:8px 12px}
.w-routeinfo{position:absolute;left:10px;top:10px;z-index:500;background:rgba(3,14,24,.85);border:1px solid rgba(var(--acc-rgb,45,226,255),.4);border-radius:10px;padding:8px 12px;font:600 14px Rajdhani;color:#fff;backdrop-filter:blur(8px)}
.w-routeinfo span{display:block;font:600 9.5px Orbitron;letter-spacing:.15em;color:var(--cyan2,#7ff3ff)}
.w-chart{position:absolute;inset:8px 10px 10px}
.w-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;padding:12px}
.w-kpi{border:1px solid rgba(var(--acc-rgb,45,226,255),.22);border-radius:10px;padding:10px;background:linear-gradient(160deg,rgba(var(--acc-rgb,45,226,255),.08),transparent);animation:kpiIn .6s both}
@keyframes kpiIn{from{opacity:0;transform:translateY(10px)}}
.w-kpi span{display:block;font:600 9.5px Orbitron;letter-spacing:.14em;color:#6f97ad;text-transform:uppercase}
.w-kpi b{display:block;font:700 22px Orbitron;color:#fff;margin-top:4px;text-shadow:0 0 12px rgba(var(--acc-rgb,45,226,255),.5)}
.w-kpi i{font-style:normal;font-size:13px;font-weight:600}.w-kpi i.up{color:#3dffa8}.w-kpi i.down{color:#ff5d6c}
.w-kpi.hl{border-color:#ffb02e;box-shadow:0 0 18px rgba(255,176,46,.45)}
.w-items{padding:0 12px 12px}
.ao-head{padding:10px 12px 4px;font:600 10px Orbitron;letter-spacing:.14em;color:#6f97ad}.ao-head b{color:#fff;font-size:13px}.ao-head span{color:#ffb02e}
.ao-floor{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:8px 12px 14px;background:repeating-linear-gradient(90deg,transparent 0 46px,rgba(var(--acc-rgb,45,226,255),.035) 46px 47px)}
.ao-desk{display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(var(--acc-rgb,45,226,255),.2);border-radius:12px;padding:10px;background:linear-gradient(160deg,rgba(var(--acc-rgb,45,226,255),.07),rgba(0,0,0,.25));animation:kpiIn .5s both;position:relative;overflow:hidden}
.ao-desk::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(var(--acc-rgb,45,226,255),.25)}
.ao-desk.arbeitet::after{background:linear-gradient(90deg,transparent,var(--cyan,#2de2ff),transparent);background-size:200% 100%;animation:aoScan 1.4s linear infinite}
@keyframes aoScan{to{background-position:-200% 0}}
.ao-bot{flex:0 0 46px;height:58px;position:relative}
.ao-head2{width:30px;height:24px;margin:0 auto;border-radius:9px 9px 7px 7px;background:#0c2232;border:1px solid rgba(var(--acc-rgb,45,226,255),.5);display:flex;justify-content:center;gap:6px;align-items:center}
.ao-head2 i{width:5px;height:5px;border-radius:50%;background:var(--cyan,#2de2ff);box-shadow:0 0 6px var(--cyan,#2de2ff)}
.ao-screen{margin-top:5px;height:24px;border-radius:4px;background:#04121c;border:1px solid rgba(var(--acc-rgb,45,226,255),.35);padding:4px;display:flex;flex-direction:column;gap:3px}
.ao-screen span{height:2px;border-radius:2px;background:rgba(var(--acc-rgb,45,226,255),.35);width:70%}.ao-screen span:nth-child(2){width:45%}.ao-screen span:nth-child(3){width:60%}
.ao-desk.arbeitet .ao-head2{animation:aoBob .9s ease-in-out infinite}.ao-desk.arbeitet .ao-screen span{background:var(--cyan,#2de2ff);animation:aoType 1.1s steps(4) infinite}
.ao-desk.arbeitet .ao-screen span:nth-child(2){animation-delay:.3s}.ao-desk.arbeitet .ao-screen span:nth-child(3){animation-delay:.6s}
@keyframes aoBob{50%{transform:translateY(2px)}}@keyframes aoType{0%{width:10%}100%{width:85%}}
.ao-desk.wartet .ao-head2 i,.ao-desk.bereit .ao-head2 i{animation:aoBlink 4s infinite}@keyframes aoBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.ao-desk.fehler{border-color:rgba(255,93,108,.6)}.ao-desk.fehler .ao-head2 i{background:#ff5d6c;box-shadow:0 0 6px #ff5d6c}
.ao-desk.pausiert{opacity:.5}.ao-desk.fertig .ao-head2 i{background:#3dffa8;box-shadow:0 0 6px #3dffa8}
.ao-desk.hl{border-color:#ffb02e;box-shadow:0 0 18px rgba(255,176,46,.45)}
.ao-info{min-width:0;flex:1}.ao-name{font:700 12px Orbitron;letter-spacing:.06em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-role{font-size:12px;color:#6f97ad;margin-top:1px}.ao-task{font-size:13.5px;color:#cfefff;margin-top:4px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ao-bar{height:4px;border-radius:3px;background:rgba(var(--acc-rgb,45,226,255),.15);margin-top:6px;overflow:hidden}.ao-bar i{display:block;height:100%;background:var(--cyan,#2de2ff);transition:width .6s}
.ao-foot{display:flex;justify-content:space-between;gap:8px;margin-top:6px;align-items:baseline}.ao-foot em{font:600 9px Orbitron;letter-spacing:.14em;font-style:normal;color:var(--cyan,#2de2ff)}
.ao-desk.fehler .ao-foot em{color:#ff5d6c}.ao-desk.wartet .ao-foot em,.ao-desk.pausiert .ao-foot em{color:#6f97ad}.ao-desk.fertig .ao-foot em{color:#3dffa8}.ao-foot small{font-size:11.5px;color:#6f97ad;text-align:right}
.w-item{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid rgba(var(--acc-rgb,45,226,255),.1)}
.w-item .st{flex:0 0 auto;width:10px;height:10px;border-radius:50%;margin-top:5px;background:var(--cyan,#2de2ff);box-shadow:0 0 8px currentColor}
.w-item .st.ok{background:#3dffa8}.w-item .st.warn{background:#ffb02e}.w-item .st.err{background:#ff5d6c}
.w-item b{display:block;color:#fff}.w-item small{color:#8fb6c9;font-size:13.5px}
.w-mini{height:170px;position:relative;margin:0 12px 12px}
.w-steps{padding:12px 14px}
.w-ring{display:flex;align-items:center;gap:14px;margin-bottom:10px}
.w-ring svg{width:64px;height:64px;transform:rotate(-90deg)}
.w-ring circle{fill:none;stroke-width:6}.w-ring .bg{stroke:rgba(var(--acc-rgb,45,226,255),.12)}.w-ring .fg{stroke:var(--cyan,#2de2ff);stroke-linecap:round;transition:stroke-dashoffset .6s;filter:drop-shadow(0 0 6px var(--cyan,#2de2ff))}
.w-ring b{font:700 20px Orbitron;color:#fff}.w-ring small{display:block;color:#6f97ad;font:600 10px Orbitron;letter-spacing:.14em}
.w-step{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(var(--acc-rgb,45,226,255),.08);transition:background .3s}
.w-step .ic{flex:0 0 22px;height:22px;border-radius:50%;display:grid;place-items:center;font:700 11px Orbitron;border:1.5px solid rgba(var(--acc-rgb,45,226,255),.4);color:var(--cyan2,#7ff3ff)}
.w-step.running .ic{border-color:#ffb02e;border-top-color:transparent;animation:spin .8s linear infinite}
.w-step.done .ic{background:#3dffa8;border-color:#3dffa8;color:#02060c}
.w-step.error .ic{background:#ff5d6c;border-color:#ff5d6c;color:#02060c}
.w-step.needs_user .ic{border-color:#ff6bd5;color:#ff6bd5;animation:hwDot 1s infinite}
.w-step b{display:block;font-weight:600;color:#fff}.w-step small{color:#8fb6c9}
.w-step.flash{background:rgba(var(--acc-rgb,45,226,255),.1)}
@keyframes spin{to{transform:rotate(360deg)}}
.w-opts{display:grid;gap:10px;padding:12px}
.w-opt{position:relative;border:1px solid rgba(var(--acc-rgb,45,226,255),.25);border-radius:12px;padding:12px;background:linear-gradient(160deg,rgba(var(--acc-rgb,45,226,255),.07),rgba(0,0,0,.2));animation:kpiIn .5s both;cursor:pointer;transition:transform .2s,border-color .2s}
.w-opt:hover{transform:translateY(-2px);border-color:var(--cyan,#2de2ff)}
.w-opt.hl{border-color:#ffb02e;box-shadow:0 0 22px rgba(255,176,46,.4)}
.w-opt.sel{border-color:#3dffa8;box-shadow:0 0 22px rgba(61,255,168,.4)}
.w-opt h4{margin:0 0 2px;font:700 15px Rajdhani;color:#fff;padding-right:80px}
.w-opt .price{position:absolute;right:12px;top:10px;font:700 17px Orbitron;color:var(--cyan2,#7ff3ff)}
.w-opt small{color:#8fb6c9}
.w-opt .tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.w-opt .tags span{font-size:11.5px;padding:2px 7px;border-radius:10px;background:rgba(var(--acc-rgb,45,226,255),.12);color:#9fe9ff}
.w-opt .acts{display:flex;gap:8px;margin-top:10px}
.w-opt .acts button,.w-opt .acts a{font:600 10px Orbitron;letter-spacing:.12em;padding:8px 10px;border-radius:6px;border:1px solid var(--cyan,#2de2ff);background:transparent;color:var(--cyan,#2de2ff);text-decoration:none;cursor:pointer}
.w-opt .acts button{background:var(--cyan,#2de2ff);color:#02060c}
.w-q{padding:12px 14px 0;color:#fff;font-weight:600}
.w-cal{padding:10px 12px}
.w-day{margin-bottom:10px}
.w-day h5{margin:6px 0;font:700 10.5px Orbitron;letter-spacing:.16em;color:#6f97ad}
.w-ev{display:flex;gap:10px;padding:8px 10px;margin:5px 0;border-left:3px solid var(--cyan,#2de2ff);border-radius:0 8px 8px 0;background:rgba(var(--acc-rgb,45,226,255),.06);animation:kpiIn .4s both}
.w-ev .t{font:700 12px Orbitron;color:var(--cyan2,#7ff3ff);min-width:52px}
.w-ev b{color:#fff;font-weight:600}.w-ev small{display:block;color:#8fb6c9}
.w-ev.added{border-color:#3dffa8;background:rgba(61,255,168,.1);animation:evNew 1.6s}
.w-ev.moved{border-color:#ffb02e;background:rgba(255,176,46,.1);animation:evNew 1.6s}
.w-ev.removed{border-color:#ff5d6c;opacity:.55;text-decoration:line-through}
.w-ev a{margin-left:auto;align-self:center;font:600 9.5px Orbitron;color:var(--cyan,#2de2ff);text-decoration:none;border:1px solid rgba(var(--acc-rgb,45,226,255),.4);padding:4px 6px;border-radius:5px;white-space:nowrap}
@keyframes evNew{0%{transform:scale(.9);box-shadow:0 0 0 0 rgba(61,255,168,.6)}50%{box-shadow:0 0 24px 2px rgba(61,255,168,.5)}}
.w-files{display:flex;flex-direction:column;height:100%}
.w-files .src{flex:0 0 auto;max-height:42%;overflow:auto;padding:10px 12px;display:flex;flex-wrap:wrap;gap:6px;border-bottom:1px solid rgba(var(--acc-rgb,45,226,255),.12)}
.w-file{font:600 12px Rajdhani;padding:4px 8px;border-radius:6px;background:rgba(var(--acc-rgb,45,226,255),.1);border:1px solid rgba(var(--acc-rgb,45,226,255),.25);color:#cfefff;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}
.w-file.err{border-color:#ff5d6c;color:#ff9aa4}
.w-file.fly{position:fixed;z-index:80;pointer-events:none;transition:transform .7s cubic-bezier(.5,0,.2,1),opacity .7s}
.w-files .bins{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;padding:10px 12px}
.w-bin{border:1px dashed rgba(var(--acc-rgb,45,226,255),.35);border-radius:10px;padding:8px;min-height:70px}
.w-bin h6{margin:0 0 6px;font:700 10px Orbitron;letter-spacing:.12em;color:var(--cyan2,#7ff3ff);display:flex;justify-content:space-between}
.w-bin.pulse{animation:binP .5s}
@keyframes binP{50%{border-color:#3dffa8;box-shadow:0 0 18px rgba(61,255,168,.4)}}
.w-bin .w-file{display:block;margin:3px 0;font-size:11.5px;background:rgba(61,255,168,.1);border-color:rgba(61,255,168,.35)}
.w-big{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:100%;padding:20px;text-align:center}
.w-big button{font:700 12px Orbitron;letter-spacing:.15em;padding:14px 18px;border-radius:8px;border:0;background:var(--cyan,#2de2ff);color:#02060c;box-shadow:0 0 22px rgba(var(--acc-rgb,45,226,255),.5);cursor:pointer}
.w-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent}
`;

/* ------------------------------------------------------------------ */
/* shared three helpers                                                  */
function makeGL(body) {
  const canvas = document.createElement('canvas'); canvas.className = 'gl'; body.append(canvas);
  const lbls = document.createElement('div'); lbls.className = 'hw-lbls'; body.append(lbls);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotateSpeed = 1.2;
  let interacted = false;
  controls.addEventListener('start', () => { interacted = true; controls.autoRotate = false; });
  const resize = () => {
    const w = body.clientWidth, h = body.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(body); resize();
  const labels = new Map(); // key -> {el, obj, hl}
  const v = new THREE.Vector3();
  function label(key, text, obj, offsetY = 0) {
    let l = labels.get(key);
    if (!l) { const el = document.createElement('div'); el.className = 'hw-lbl'; lbls.append(el); l = { el, obj, off: offsetY }; labels.set(key, l); }
    l.el.textContent = text; l.obj = obj; l.off = offsetY; return l;
  }
  function updateLabels(occluder) {
    const w = body.clientWidth, h = body.clientHeight;
    for (const l of labels.values()) {
      l.obj.getWorldPosition(v); v.y += l.off;
      let hidden = false;
      if (occluder) { // hide labels on far side of globe
        const camDir = camera.position.clone().normalize();
        hidden = v.clone().normalize().dot(camDir) < 0.15;
      }
      v.project(camera);
      l.el.style.left = ((v.x + 1) / 2) * w + 'px'; l.el.style.top = ((1 - v.y) / 2) * h + 'px';
      l.el.style.opacity = hidden || v.z > 1 ? 0 : 1;
    }
  }
  let alive = true, raf;
  const tickers = [];
  const clock = new THREE.Clock();
  function loop() {
    if (!alive) return; raf = requestAnimationFrame(loop);
    if (!body.offsetParent || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    tickers.forEach((f) => f(dt, t));
    controls.update(); renderer.render(scene, camera);
  }
  loop();
  // smooth camera tween
  function tween(toPos, toTarget, ms = 1200) {
    const p0 = camera.position.clone(), t0 = controls.target.clone(), start = performance.now();
    return new Promise((res) => {
      tickers.push(function tw() {
        const k = Math.min(1, (performance.now() - start) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        camera.position.lerpVectors(p0, toPos, e); if (toTarget) controls.target.lerpVectors(t0, toTarget, e);
        if (k >= 1) { tickers.splice(tickers.indexOf(tw), 1); res(); }
      });
    });
  }
  return {
    renderer, scene, camera, controls, tickers, label, labels, updateLabels, tween, lbls,
    get interacted() { return interacted; },
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); scene.traverse((o) => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose?.()); }); },
  };
}

const ll2v = (lat, lon, r = 1) => {
  const phi = (90 - lat) * DEG, th = (lon + 180) * DEG;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
};

/* ------------------------------------------------------------------ */
/* WIDGETS                                                               */
const W = {};

/* ---------- 3D GLOBE ---------- */
W.globe = async (body, data, ctx) => {
  const g = makeGL(body);
  const { scene, camera, controls } = g;
  camera.position.set(0, 0.6, 3.2); controls.enablePan = false; controls.minDistance = 1.35; controls.maxDistance = 8; controls.autoRotate = true;
  const tex = new THREE.TextureLoader().load(ctx.asset('earth-day.jpg')); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const earthMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uC: { value: new THREE.Color(accHex()) } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uC; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 t=texture2D(map,vUv).rgb; float l=dot(t,vec3(.3,.59,.11));
        float land=smoothstep(0.16,0.32,l+ (t.r-t.b)*0.6);
        vec3 base=mix(vec3(0.005,0.04,0.075), mix(uC*0.32, uC*0.85, smoothstep(0.3,0.7,l)), land);
        base += uC*0.18*smoothstep(0.85,1.0,l);
        float f=pow(1.-max(dot(vN,vV),0.),3.); gl_FragColor=vec4(base + uC*f*0.9,1.); }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMat);
  const globe = new THREE.Group(); globe.add(earth); scene.add(globe);
  // lat/lon grid
  const gp = [];
  for (let lat = -60; lat <= 60; lat += 30) for (let lo = 0; lo < 360; lo += 4) gp.push(ll2v(lat, lo, 1.004), ll2v(lat, lo + 4, 1.004));
  for (let lo = 0; lo < 360; lo += 30) for (let la = -88; la < 88; la += 4) gp.push(ll2v(la, lo, 1.004), ll2v(la + 4, lo, 1.004));
  globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp), new THREE.LineBasicMaterial({ color: accHex(), transparent: true, opacity: 0.12 })));
  // atmosphere
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.14, 64, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vN; void main(){ float i=pow(0.72-dot(vN,vec3(0,0,1.)),3.); gl_FragColor=vec4(0.18,0.85,1.,1.)*i*1.6; }`,
  }));
  scene.add(atm);
  // stars
  const sp = new Float32Array(1500 * 3); for (let i = 0; i < sp.length; i++) sp[i] = (Math.random() - 0.5) * 80;
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0x9fe9ff, size: 0.06, transparent: true, opacity: 0.7 }));
  scene.add(stars);

  const markers = new Map(); const arcs = [];
  const markerGroup = new THREE.Group(); globe.add(markerGroup);
  // data callouts with leader lines (reference: scene 2) – values come from the agent's real data
  const co = document.createElement('div'); co.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  co.innerHTML = '<svg style="position:absolute;inset:0;width:100%;height:100%"></svg><div class="g-cards"></div><div class="g-count" style="position:absolute;left:14px;top:10px;font:700 clamp(20px,3vw,34px) Orbitron;color:#fff;text-shadow:0 0 16px rgba(var(--acc-rgb,45,226,255),.6)"></div><div class="g-count-l" style="position:absolute;left:15px;top:clamp(36px,5vw,50px);font:600 9.5px Orbitron;letter-spacing:.16em;color:var(--cyan2,#7ff3ff)"></div><div class="g-note" style="position:absolute;left:14px;bottom:10px;max-width:60%;font:600 10px Orbitron;letter-spacing:.08em;color:#ffb02e"></div>';
  body.append(co);
  const coSvg = co.querySelector('svg'), coCards = co.querySelector('.g-cards');
  const callouts = []; // {mk, el, line}
  function addCallout(mk) {
    if (!mk.m.wert && !mk.m.info) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;width:150px;padding:6px 9px;border-radius:8px;background:rgba(4,16,26,.82);border:1px solid rgba(var(--acc-rgb,45,226,255),.35);backdrop-filter:blur(6px);transition:opacity .3s;animation:kpiIn .5s both';
    el.innerHTML = `<b style="display:block;font:700 9.5px Orbitron;letter-spacing:.08em;color:var(--cyan2,#7ff3ff)">${esc(mk.m.label || '')}</b><span style="font:700 15px Rajdhani;color:#fff">${esc(mk.m.wert || '')}</span>${mk.m.info ? `<small style="display:block;font:500 11.5px Rajdhani;color:#9fc9db;line-height:1.2">${esc(mk.m.info)}</small>` : ''}`;
    coCards.append(el);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); line.setAttribute('fill', 'none'); line.setAttribute('stroke', mk.m.color || accCss()); line.setAttribute('stroke-opacity', '0.7'); line.setAttribute('stroke-width', '1.2'); coSvg.append(line);
    callouts.push({ mk, el, line });
  }
  const vtmp = new THREE.Vector3();
  function layoutCallouts() {
    const w = body.clientWidth, h = body.clientHeight; const camDir = camera.position.clone().normalize();
    const vis = callouts.map((c) => { c.mk.dot.getWorldPosition(vtmp); const front = vtmp.clone().normalize().dot(camDir) > 0.1; const p = vtmp.clone().project(camera); return { c, front, x: (p.x + 1) / 2 * w, y: (1 - p.y) / 2 * h }; });
    const left = vis.filter((v) => v.front && v.x < w / 2).sort((a, b) => a.y - b.y), right = vis.filter((v) => v.front && v.x >= w / 2).sort((a, b) => a.y - b.y);
    const place = (list, side) => list.forEach((v, i) => { const top0 = co.querySelector('.g-count').textContent ? 92 : 50; const slotH = Math.min(78, (h - top0 - 30) / Math.max(list.length, 1)); const y = top0 + i * slotH; const x = side ? w - 160 : 10;
      v.c.el.style.left = x + 'px'; v.c.el.style.top = y + 'px'; v.c.el.style.opacity = 1; const ax = side ? x : x + 150, ay = y + 16;
      v.c.line.setAttribute('points', `${ax},${ay} ${ax + (side ? -24 : 24)},${ay} ${v.x},${v.y}`); v.c.line.style.opacity = 1; });
    place(left, false); place(right, true);
    vis.filter((v) => !v.front).forEach((v) => { v.c.el.style.opacity = 0; v.c.line.style.opacity = 0; });
  }
  function addMarker(m) {
    const col = new THREE.Color(m.color || '#ffb02e');
    const grp = new THREE.Group();
    const pos = ll2v(m.lat, m.lon, 1); grp.position.copy(pos); grp.lookAt(pos.clone().multiplyScalar(2));
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), new THREE.MeshBasicMaterial({ color: col }));
    pillar.rotation.x = Math.PI / 2; pillar.position.z = 0.07; grp.add(pillar);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 16), new THREE.MeshBasicMaterial({ color: col })); dot.position.z = 0.14; grp.add(dot);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.028, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide })); grp.add(ring);
    markerGroup.add(grp);
    const key = m.label || `${m.lat},${m.lon}`;
    const rec = { grp, dot, ring, m, hl: false }; markers.set(key.toLowerCase(), rec);
    if (m.wert || m.info) addCallout(rec); else if (m.label) g.label('m:' + key, m.label, dot, 0.02);
  }
  function addArc(a) {
    const A = ll2v(a.from[0], a.from[1], 1), B = ll2v(a.to[0], a.to[1], 1);
    const mid = A.clone().add(B).multiplyScalar(0.5); const d = A.distanceTo(B);
    mid.normalize().multiplyScalar(1 + d * 0.45);
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
    const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.004, 6), new THREE.MeshBasicMaterial({ color: a.color || accCss(), transparent: true, opacity: 0.85 }));
    line.geometry.setDrawRange(0, 0); globe.add(line);
    const comet = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' })); globe.add(comet);
    const total = line.geometry.index.count; const start = performance.now();
    arcs.push({ line, comet, curve, total, start });
  }
  g.tickers.push((dt, t) => {
    for (const mk of markers.values()) {
      const s = 1 + ((t * 0.8) % 1) * (mk.hl ? 5 : 2.5); mk.ring.scale.setScalar(s); mk.ring.material.opacity = 1 - ((t * 0.8) % 1);
      mk.dot.scale.setScalar(mk.hl ? 1.8 + Math.sin(t * 6) * 0.4 : 1);
    }
    for (const a of arcs) {
      const k = Math.min(1, (performance.now() - a.start) / 1600);
      a.line.geometry.setDrawRange(0, Math.floor(a.total * k));
      a.comet.position.copy(a.curve.getPoint((t * 0.35) % 1));
    }
    stars.rotation.y += dt * 0.004;
  });
  async function resolve(list) {
    const out = [];
    for (const m of list || []) {
      if (typeof m.lat !== 'number' && (m.ort || m.label)) { const p = await ctx.geocode(m.ort || m.label).catch(() => null); if (p) out.push({ ...m, lat: p.lat, lon: p.lon, label: m.label || p.name }); }
      else if (typeof m.lat === 'number') out.push(m);
    }
    return out;
  }
  async function flyTo(lat, lon, dist = 3.0) {
    controls.autoRotate = false;
    const target = ll2v(lat, lon, 1).applyQuaternion(globe.quaternion).normalize().multiplyScalar(dist);
    await g.tween(target, new THREE.Vector3(0, 0, 0), 1600);
  }
  async function apply(d = {}) {
    const ms = await resolve(d.markers);
    ms.forEach(addMarker);
    const ptOf = async (x) => { if (Array.isArray(x)) return x; const r = (await resolve([{ ort: x }]))[0]; return r ? [r.lat, r.lon] : null; };
    for (const a of d.arcs || []) { const f = await ptOf(a.from), t = await ptOf(a.to); if (f && t) addArc({ ...a, from: f, to: t }); }
    if (d.zähler || d.zaehler) { const z = d.zähler || d.zaehler; co.querySelector('.g-count').textContent = z.wert ?? ''; co.querySelector('.g-count-l').textContent = (z.label || '').toUpperCase(); }
    if (d.hinweis) co.querySelector('.g-note').textContent = d.hinweis;
    const focus = d.focus ? (typeof d.focus.lat === 'number' ? d.focus : (await resolve([{ ort: d.focus.ort || d.focus }]))[0]) : ms[0];
    if (focus) flyTo(focus.lat, focus.lon);
    return { marker_gesetzt: ms.map((m) => `${m.label} (${m.lat.toFixed(2)}, ${m.lon.toFixed(2)})`) };
  }
  const info = await apply(data);
  return {
    info,
    update: apply,
    async act(a, args = {}) {
      if (a === 'highlight' || a === 'fokus') {
        const key = String(args.ziel || args.label || '').toLowerCase();
        const mk = [...markers.entries()].find(([k]) => k.includes(key))?.[1];
        markers.forEach((x) => { x.hl = false; g.labels.get('m:' + (x.m.label || ''))?.el.classList.remove('hl'); });
        if (mk) { mk.hl = true; g.labels.get('m:' + (mk.m.label || ''))?.el.classList.add('hl'); await flyTo(mk.m.lat, mk.m.lon, 2.7); return 'hervorgehoben'; }
        if (args.lat != null) { await flyTo(args.lat, args.lon); return 'fokussiert'; }
        const p = await ctx.geocode(args.ziel).catch(() => null); if (p) { addMarker({ lat: p.lat, lon: p.lon, label: p.name }); await flyTo(p.lat, p.lon); return 'neuer Marker + fokussiert'; }
        throw new Error('Ziel nicht gefunden');
      }
      if (a === 'drehen') { controls.autoRotate = args.an !== false; return 'ok'; }
      if (a === 'zoom') { const f = num(args.faktor, 1.5); g.tween(camera.position.clone().multiplyScalar(1 / f), null, 800); return 'ok'; }
      throw new Error('Unbekannte Aktion für globe: ' + a);
    },
    destroy: g.destroy,
    tick: () => { g.updateLabels(true); if (callouts.length) layoutCallouts(); },
    glTick: g,
  };
};

/* ---------- 3D MODEL (procedural, any topic) ---------- */
function gearShape(r, teeth, depth) {
  const s = new THREE.Shape(); const n = Math.max(6, teeth | 0);
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * Math.PI * 2, rr = i % 4 < 2 ? r : r - depth;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true); s.holes.push(hole);
  return s;
}
function geomFor(p) {
  const s = p.size || p.groesse || [];
  switch (p.shape || p.form) {
    case 'sphere': case 'kugel': return new THREE.SphereGeometry(num(s[0], 0.5), 48, 32);
    case 'cylinder': case 'zylinder': { const a = arr(s, 3, 0.3); return new THREE.CylinderGeometry(a[0], s.length > 2 ? a[1] : a[0], s.length > 2 ? a[2] : num(s[1], 1), 48); }
    case 'cone': case 'kegel': { const a = arr(s, 2, 0.4); return new THREE.ConeGeometry(a[0], a[1] || 1, 48); }
    case 'torus': case 'ring3d': { const a = arr(s, 2, 0.4); return new THREE.TorusGeometry(a[0], a[1] || 0.1, 24, 96); }
    case 'capsule': case 'kapsel': { const a = arr(s, 2, 0.25); return new THREE.CapsuleGeometry(a[0], a[1] || 0.6, 12, 24); }
    case 'plane': case 'ebene': { const a = arr(s, 2, 1); return new THREE.PlaneGeometry(a[0], a[1]); }
    case 'ring': { const a = arr(s, 2, 0.3); return new THREE.RingGeometry(a[0], a[1] || 0.5, 64); }
    case 'gear': case 'zahnrad': { const a = arr(s, 3, 0.5); const g = new THREE.ExtrudeGeometry(gearShape(a[0], a[1] || 16, a[0] * 0.15), { depth: a[2] || 0.15, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }); g.center(); return g; }
    case 'tube': case 'rohr': { const pts = (p.path || p.pfad || [[0, 0, 0], [1, 0, 0]]).map((q) => new THREE.Vector3(...arr(q, 3, 0))); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, num(s[0], 0.05), 12); }
    case 'icosahedron': case 'ikosaeder': return new THREE.IcosahedronGeometry(num(s[0], 0.5), num(s[1], 0));
    case 'octahedron': return new THREE.OctahedronGeometry(num(s[0], 0.5));
    case 'knot': return new THREE.TorusKnotGeometry(num(s[0], 0.4), num(s[1], 0.12), 128, 16);
    default: { const a = arr(s, 3, 0.5); return new THREE.BoxGeometry(a[0], a[1], a[2]); }
  }
}
W.model3d = async (body, data, ctx) => {
  const g = makeGL(body);
  const { scene, camera, controls, renderer } = g;
  renderer.toneMappingExposure = 1.05;
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0x9fe9ff, 0x061018, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(accHex(), 1.4); rim.position.set(-4, 2, -3); scene.add(rim);
  const grid = new THREE.PolarGridHelper(4, 16, 8, 64, accHex(), accHex()); grid.material.transparent = true; grid.material.opacity = 0.18; scene.add(grid);
  controls.autoRotate = true;
  const root = new THREE.Group(); scene.add(root);
  const parts = new Map();
  let exploded = 0, explodeTarget = 0, xray = false;

  function build(d) {
    root.clear(); parts.clear(); g.labels.forEach((l) => l.el.remove()); g.labels.clear();
    const list = d.parts || d.teile || [];
    for (const p of list) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.color || p.farbe || '#9fdcff'), metalness: num(p.metal ?? p.metall, 0.55), roughness: num(p.rough ?? p.rau, 0.35),
        transparent: p.opacity != null, opacity: num(p.opacity, 1), emissive: new THREE.Color(p.emissive || '#000000'), emissiveIntensity: p.emissive ? 1.2 : 0,
        side: (p.shape === 'plane' || p.shape === 'ring') ? THREE.DoubleSide : THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geomFor(p), mat);
      const pos = arr(p.pos || p.position, 3, 0), rot = arr(p.rot || p.rotation, 3, 0), sc = p.scale ? arr(p.scale, 3, 1) : [1, 1, 1];
      mesh.position.set(...pos); mesh.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG); mesh.scale.set(...sc);
      mesh.userData = { id: String(p.id ?? parts.size), label: p.label || p.name || p.id, base: mesh.position.clone(), anim: p.anim || p.animation || {}, baseColor: mat.color.clone(), baseOpacity: mat.opacity, baseEmissive: mat.emissive.clone(), baseEI: mat.emissiveIntensity };
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), new THREE.LineBasicMaterial({ color: accHex(), transparent: true, opacity: 0.18 }));
      mesh.add(edges); mesh.userData.edges = edges;
      parts.set(mesh.userData.id.toLowerCase(), mesh);
    }
    for (const p of list) {
      const m = parts.get(String(p.id ?? '').toLowerCase()); if (!m) continue;
      const parent = p.parent && parts.get(String(p.parent).toLowerCase());
      (parent || root).add(m);
    }
    for (const m of parts.values()) if (!m.parent) root.add(m);
    if (d.labels !== false) for (const m of parts.values()) if (m.userData.label) g.label('p:' + m.userData.id, m.userData.label, m, 0);
    // frame
    const box = new THREE.Box3().setFromObject(root); const size = box.getSize(new THREE.Vector3()).length() || 2; const c = box.getCenter(new THREE.Vector3());
    root.userData.center = c; root.userData.size = size;
    grid.position.y = box.min.y - 0.02; grid.scale.setScalar(Math.max(0.5, size / 4));
    camera.near = size / 200; camera.far = size * 50; camera.updateProjectionMatrix();
    camera.position.copy(c).add(new THREE.Vector3(0.9, 0.55, 1.1).normalize().multiplyScalar(size * 1.25));
    controls.target.copy(c);
    if (d.explode || d.explodiert) explodeTarget = 1;
    if (d.autorotate === false) controls.autoRotate = false;
  }
  build(data);
  g.tickers.push((dt, t) => {
    exploded += (explodeTarget - exploded) * 0.08;
    const c = root.userData.center || new THREE.Vector3();
    for (const m of parts.values()) {
      const a = m.userData.anim, b = m.userData.base;
      m.position.copy(b);
      if (exploded > 0.001 && m.parent === root) { const dir = b.clone().sub(c); if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0); m.position.add(dir.normalize().multiplyScalar(exploded * (root.userData.size || 2) * 0.35)); }
      if (a.spin) { const s = arr(a.spin, 3, 0); m.rotation.x += s[0] * dt; m.rotation.y += s[1] * dt; m.rotation.z += s[2] * dt; }
      if (a.slide) { const ax = a.slide.axis || 'y'; m.position[ax] += Math.sin(t * num(a.slide.speed, 2) + num(a.slide.phase, 0)) * num(a.slide.amp, 0.2); }
      if (a.bob) m.position.y += Math.sin(t * 2) * num(a.bob, 0.05);
      if (a.orbit) { const r = num(a.orbit.radius, 1), sp = num(a.orbit.speed, 1); m.position.x = b.x + Math.cos(t * sp) * r; m.position.z = b.z + Math.sin(t * sp) * r; }
      if (m.userData.hl) m.material.emissiveIntensity = 0.6 + Math.sin(t * 5) * 0.4;
    }
  });
  function clearHL() {
    for (const m of parts.values()) {
      m.userData.hl = false; m.material.emissive.copy(m.userData.baseEmissive); m.material.emissiveIntensity = m.userData.baseEI;
      m.material.opacity = xray ? 0.25 : m.userData.baseOpacity; m.material.transparent = xray || m.userData.baseOpacity < 1;
      m.userData.edges.material.opacity = xray ? 0.6 : 0.18;
      g.labels.get('p:' + m.userData.id)?.el.classList.remove('hl');
    }
  }
  return {
    info: { teile: [...parts.values()].map((m) => m.userData.id) },
    update(d) { if (d.parts || d.teile) build(d); else { if (d.explode != null) explodeTarget = d.explode ? 1 : 0; } return 'aktualisiert'; },
    async act(a, args = {}) {
      if (a === 'highlight' || a === 'fokus') {
        const ids = [].concat(args.ziel || args.teil || args.teile || []).map((x) => String(x).toLowerCase());
        clearHL();
        const hits = [...parts.values()].filter((m) => ids.some((id) => m.userData.id.toLowerCase() === id || String(m.userData.label).toLowerCase().includes(id)));
        if (!hits.length) throw new Error('Teil nicht gefunden. Vorhanden: ' + [...parts.keys()].join(', '));
        for (const m of parts.values()) if (!hits.includes(m)) { m.material.transparent = true; m.material.opacity = 0.18; }
        for (const m of hits) {
          m.userData.hl = true; m.material.emissive.set('#ffb02e'); m.material.opacity = 1;
          const l = g.labels.get('p:' + m.userData.id) || g.label('p:' + m.userData.id, m.userData.label, m, 0); l.el.classList.add('hl');
        }
        if (args.kamera !== false) {
          const wp = hits[0].getWorldPosition(new THREE.Vector3()); const size = root.userData.size || 2;
          const dir = camera.position.clone().sub(controls.target).normalize();
          controls.autoRotate = false; g.tween(wp.clone().add(dir.multiplyScalar(size * 1.05)), wp, 1100);
        }
        return 'hervorgehoben: ' + hits.map((m) => m.userData.id).join(', ');
      }
      if (a === 'orbit' || a === 'dolly') {   // 5.2: hand gestures
        const off = camera.position.clone().sub(controls.target);
        if (a === 'dolly') { const f = Math.min(2, Math.max(0.5, +args.faktor || 1)); off.setLength(Math.min(500, Math.max(0.05, off.length() / f))); }
        else { const sp = new THREE.Spherical().setFromVector3(off); sp.theta -= +args.dx || 0; sp.phi = Math.min(Math.PI - 0.15, Math.max(0.15, sp.phi - (+args.dy || 0))); off.setFromSpherical(sp); }
        camera.position.copy(controls.target).add(off); controls.autoRotate = false; return 'ok';
      }
      if (a === 'reset') { clearHL(); explodeTarget = 0; const c = root.userData.center, s = root.userData.size; await g.tween(c.clone().add(new THREE.Vector3(0.9, 0.55, 1.1).normalize().multiplyScalar(s * 1.25)), c, 900); return 'ok'; }
      if (a === 'explode' || a === 'explosion') { explodeTarget = args.an === false ? 0 : 1; return 'ok'; }
      if (a === 'drehen') {
        if (args.grad != null) { const axis = args.achse || 'y'; const q0 = root.rotation[axis], q1 = q0 + num(args.grad, 90) * DEG, st = performance.now();
          g.tickers.push(function r() { const k = Math.min(1, (performance.now() - st) / 900); root.rotation[axis] = q0 + (q1 - q0) * (1 - Math.pow(1 - k, 3)); if (k >= 1) g.tickers.splice(g.tickers.indexOf(r), 1); }); }
        else controls.autoRotate = args.an !== false; return 'ok';
      }
      if (a === 'zoom') { const f = num(args.faktor, 1.5); const dir = camera.position.clone().sub(controls.target); await g.tween(controls.target.clone().add(dir.multiplyScalar(1 / f)), null, 700); return 'ok'; }
      if (a === 'xray' || a === 'röntgen') { xray = args.an !== false; clearHL(); return 'ok'; }
      if (a === 'animation') { for (const m of parts.values()) { if (args.an === false) { m.userData._a = m.userData.anim; m.userData.anim = {}; } else if (m.userData._a) m.userData.anim = m.userData._a; } return 'ok'; }
      throw new Error('Unbekannte Aktion für model3d: ' + a);
    },
    destroy() { pm.dispose(); g.destroy(); },
    tick: () => g.updateLabels(false),
  };
};

/* ---------- LIVE MAP ---------- */
W.map = async (body, data, ctx) => {
  const div = document.createElement('div'); div.className = 'w-map'; body.append(div);
  const map = L.map(div, { zoomControl: false, attributionControl: true }).setView([47.37, 8.54], 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  const ro = new ResizeObserver(() => map.invalidateSize()); ro.observe(body);
  const markers = new Map(); let routeLayer = null, info = null;
  const pin = (hl) => L.divIcon({ className: '', html: `<div class="w-pin${hl ? ' hl' : ''}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
  async function pt(p) {
    if (typeof p === 'string') p = { ort: p };
    if (typeof p.lat === 'number') return p;
    const r = await ctx.geocode(p.ort || p.label); if (!r) throw new Error('Ort nicht gefunden: ' + (p.ort || p.label));
    return { ...p, lat: r.lat, lon: r.lon, label: p.label || r.name };
  }
  async function route(wps, profile = 'driving') {
    const pts = []; for (const w of wps) pts.push(await pt(w));
    const coords = pts.map((p) => `${p.lon},${p.lat}`).join(';');
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
    const j = await r.json(); if (j.code !== 'Ok') throw new Error('Routing fehlgeschlagen: ' + j.code);
    const line = j.routes[0].geometry.coordinates.map(([x, y]) => [y, x]);
    routeLayer?.remove();
    const glow = L.polyline([], { color: accCss(), weight: 9, opacity: 0.25 }), core = L.polyline([], { color: acc2Css(), weight: 3.5 });
    routeLayer = L.layerGroup([glow, core]).addTo(map);
    pts.forEach((p, i) => addMarker({ ...p, label: p.label || (i ? 'Ziel' : 'Start') }));
    map.flyToBounds(L.latLngBounds(line), { padding: [30, 30], duration: 1.2 });
    // animate the route being drawn (real geometry from OSRM)
    let k = 0; const step = Math.max(1, Math.floor(line.length / 90));
    await new Promise((res) => { const iv = setInterval(() => { k = Math.min(line.length, k + step); glow.setLatLngs(line.slice(0, k)); core.setLatLngs(line.slice(0, k)); if (k >= line.length) { clearInterval(iv); res(); } }, 16); });
    const km = j.routes[0].distance / 1000, min = j.routes[0].duration / 60;
    info = { distanz_km: +km.toFixed(1), fahrzeit_min: Math.round(min), quelle: 'OSRM (Auto)' };
    let box = body.querySelector('.w-routeinfo'); if (!box) { box = document.createElement('div'); box.className = 'w-routeinfo'; body.append(box); }
    box.innerHTML = `<span>ROUTE · AUTO</span>${km.toFixed(1)} km · ${min >= 60 ? Math.floor(min / 60) + ' h ' : ''}${Math.round(min % 60)} min`;
    return info;
  }
  function addMarker(m) {
    const key = (m.label || `${m.lat},${m.lon}`).toLowerCase();
    markers.get(key)?.remove();
    const mk = L.marker([m.lat, m.lon], { icon: pin(false) }).addTo(map);
    if (m.label) mk.bindPopup(`<b>${esc(m.label)}</b>${m.text ? '<br>' + esc(m.text) : ''}`);
    markers.set(key, mk); return mk;
  }
  async function apply(d = {}) {
    const out = {};
    const ms = []; for (const m of d.markers || []) { try { ms.push(await pt(m)); } catch (e) { out.fehler = (out.fehler || []).concat(e.message); } }
    ms.forEach(addMarker);
    if (d.route?.length >= 2) Object.assign(out, await route(d.route));
    else if (ms.length > 1) map.flyToBounds(L.latLngBounds(ms.map((m) => [m.lat, m.lon])), { padding: [40, 40], duration: 1.2 });
    else if (ms.length === 1) map.flyTo([ms[0].lat, ms[0].lon], num(d.zoom, 13), { duration: 1.4 });
    if (d.center) { const c = await pt(d.center); map.flyTo([c.lat, c.lon], num(d.zoom, 12), { duration: 1.4 }); }
    out.marker = ms.map((m) => m.label);
    return out;
  }
  const result = await apply(data);
  return {
    info: result,
    update: apply,
    async act(a, args = {}) {
      if (a === 'highlight' || a === 'fokus') {
        const key = String(args.ziel || '').toLowerCase();
        let hit = [...markers.entries()].find(([k]) => k.includes(key))?.[1];
        markers.forEach((m) => m.setIcon(pin(false)));
        if (!hit) { const p = await pt({ ort: args.ziel }); hit = addMarker(p); }
        hit.setIcon(pin(true)); map.flyTo(hit.getLatLng(), num(args.zoom, 14), { duration: 1.2 }); hit.openPopup(); return 'hervorgehoben';
      }
      if (a === 'route') return await route(args.wegpunkte || args.route || []);
      if (a === 'zoom') { map.setZoom(map.getZoom() + (num(args.faktor, 2) > 1 ? 1 : -1)); return 'ok'; }
      throw new Error('Unbekannte Aktion für map: ' + a);
    },
    destroy() { ro.disconnect(); map.remove(); },
  };
};

/* ---------- ANIMATED CHART ---------- */
function chartCfg(d) {
  const kind = d.kind || d.typ || 'bar';
  const ds = (d.datasets || []).map((s, i) => {
    const c = s.color || PALETTE[i % PALETTE.length];
    const multi = ['pie', 'doughnut', 'polarArea'].includes(kind);
    return {
      label: s.label, data: s.data,
      borderColor: multi ? '#02060c' : c,
      backgroundColor: multi ? (s.data || []).map((_, j) => PALETTE[j % PALETTE.length] + 'cc') : kind === 'line' || kind === 'radar' ? c + '33' : c + 'aa',
      fill: kind === 'line' ? true : undefined, tension: 0.35, borderWidth: 2, pointRadius: kind === 'line' ? 3 : undefined, borderRadius: kind === 'bar' ? 6 : undefined,
    };
  });
  return {
    type: kind, data: { labels: d.labels || [], datasets: ds },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 1400, easing: 'easeOutQuart' },
      plugins: { legend: { display: ds.length > 1 || ['pie', 'doughnut', 'polarArea'].includes(kind) }, title: { display: !!d.title, text: d.title, color: acc2Css(), font: { family: 'Orbitron', size: 11 } } },
      scales: ['pie', 'doughnut', 'polarArea', 'radar'].includes(kind) ? {} : { y: { beginAtZero: d.beginAtZero !== false, ticks: { callback: (v) => v + (d.unit || '') } } },
      indexAxis: d.horizontal ? 'y' : 'x',
    },
  };
}
W.chart = async (body, data) => {
  const box = document.createElement('div'); box.className = 'w-chart'; const cv = document.createElement('canvas'); box.append(cv); body.append(box);
  let chart = new Chart(cv, chartCfg(data));
  return {
    info: 'Diagramm angezeigt',
    update(d) {
      if (d.kind && d.kind !== chart.config.type) { chart.destroy(); chart = new Chart(cv, chartCfg(d)); return 'neu gezeichnet'; }
      const c = chartCfg({ ...d, kind: chart.config.type });
      if (d.labels) chart.data.labels = c.data.labels;
      if (d.datasets) c.data.datasets.forEach((s, i) => { if (chart.data.datasets[i]) Object.assign(chart.data.datasets[i], { data: s.data, label: s.label ?? chart.data.datasets[i].label }); else chart.data.datasets.push(s); });
      chart.update(); return 'aktualisiert';
    },
    act(a, args = {}) {
      if (a === 'highlight' || a === 'fokus') {
        const idx = typeof args.index === 'number' ? args.index : chart.data.labels.findIndex((l) => String(l).toLowerCase().includes(String(args.ziel || '').toLowerCase()));
        if (idx < 0) throw new Error('Datenpunkt nicht gefunden');
        const els = chart.data.datasets.map((_, i) => ({ datasetIndex: i, index: idx }));
        chart.setActiveElements(els); chart.tooltip.setActiveElements(els, { x: 0, y: 0 }); chart.update(); return 'hervorgehoben';
      }
      if (a === 'hinzufügen') { chart.data.labels.push(args.label); chart.data.datasets.forEach((s, i) => s.data.push([].concat(args.werte ?? args.wert)[i])); chart.update(); return 'ok'; }
      throw new Error('Unbekannte Aktion für chart: ' + a);
    },
    destroy() { chart.destroy(); },
  };
};

/* ---------- DASHBOARD ---------- */
W.dashboard = async (body, data) => {
  const charts = [];
  function countUp(el, to, suffix, dec) {
    const st = performance.now(), from = 0;
    const f = () => { const k = Math.min(1, (performance.now() - st) / 1200), e = 1 - Math.pow(1 - k, 3); el.textContent = (from + (to - from) * e).toLocaleString('de-CH', { maximumFractionDigits: dec, minimumFractionDigits: dec }) + suffix; if (k < 1) requestAnimationFrame(f); };
    f();
  }
  function render(d) {
    charts.forEach((c) => c.destroy()); charts.length = 0; body.innerHTML = '';
    if (d.summary || d.text) { const p = document.createElement('div'); p.className = 'w-pad w-md'; p.innerHTML = ctxMd(d.summary || d.text); body.append(p); }
    const k = document.createElement('div'); k.className = 'w-kpis';
    (d.kpis || []).forEach((x, i) => {
      const el = document.createElement('div'); el.className = 'w-kpi'; el.style.animationDelay = i * 0.08 + 's'; el.dataset.label = String(x.label).toLowerCase();
      const t = x.trend === 'up' || x.trend === 'hoch' ? 'up' : x.trend === 'down' || x.trend === 'runter' ? 'down' : '';
      el.innerHTML = `<span>${esc(x.label)}</span><b></b>${x.delta != null ? `<i class="${t}">${t === 'up' ? '▲' : t === 'down' ? '▼' : ''} ${esc(x.delta)}</i>` : ''}`;
      k.append(el);
      const v = typeof x.value === 'number' ? x.value : parseFloat(String(x.value).replace(',', '.'));
      if (isFinite(v) && typeof x.value === 'number') countUp(el.querySelector('b'), v, x.unit ? ' ' + x.unit : '', Number.isInteger(v) ? 0 : 1);
      else el.querySelector('b').textContent = (x.value ?? '') + (x.unit ? ' ' + x.unit : '');
    });
    if ((d.kpis || []).length) body.append(k);
    for (const c of d.charts || []) {
      const b = document.createElement('div'); b.className = 'w-mini'; const cv = document.createElement('canvas'); b.append(cv); body.append(b);
      charts.push(new Chart(cv, chartCfg(c)));
    }
    if ((d.items || []).length) {
      const l = document.createElement('div'); l.className = 'w-items';
      l.innerHTML = d.items.map((it) => `<div class="w-item" data-t="${esc(String(it.title).toLowerCase())}"><i class="st ${esc(it.status || '')}"></i><div><b>${esc(it.title)}</b><small>${esc(it.text || '')}</small></div></div>`).join('');
      body.append(l);
    }
  }
  let ctxMd = (s) => esc(s);
  return {
    init(ctx) { ctxMd = ctx.md; render(data); },
    info: 'Dashboard angezeigt',
    update(d) { render(d); return 'aktualisiert'; },
    act(a, args = {}) {
      if (a === 'highlight' || a === 'fokus') {
        const z = String(args.ziel || '').toLowerCase();
        body.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
        const el = body.querySelector(`.w-kpi[data-label*="${CSS.escape(z)}"]`) || body.querySelector(`.w-item[data-t*="${CSS.escape(z)}"]`);
        if (!el) throw new Error('Element nicht gefunden'); el.classList.add('hl'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return 'hervorgehoben';
      }
      throw new Error('Unbekannte Aktion für dashboard: ' + a);
    },
    destroy() { charts.forEach((c) => c.destroy()); },
  };
};

/* ---------- TASKS / LIVE PROGRESS ---------- */
W.tasks = async (body, data) => {
  let steps = [], log = [];
  const ICON = { pending: '', running: '', done: '✓', error: '!', needs_user: '?' };
  function render() {
    const done = steps.filter((s) => s.status === 'done').length, total = steps.length || 1, pct = Math.round((done / total) * 100);
    const C = 2 * Math.PI * 26;
    body.innerHTML = `<div class="w-steps"><div class="w-ring"><svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="26"/><circle class="fg" cx="32" cy="32" r="26" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / total)}"/></svg><div><b>${pct}%</b><small>${done} / ${steps.length} ERLEDIGT</small></div></div>
      ${steps.map((s, i) => `<div class="w-step ${esc(s.status || 'pending')}" data-id="${esc(s.id)}"><div class="ic">${ICON[s.status] ?? ''}${!s.status || s.status === 'pending' ? i + 1 : ''}</div><div><b>${esc(s.title)}</b>${s.detail ? `<small>${esc(s.detail)}</small>` : ''}</div></div>`).join('')}</div>`;
    return pct;
  }
  function set(d) {
    if (d.steps || d.schritte) steps = (d.steps || d.schritte).map((s, i) => ({ id: String(s.id ?? i + 1), title: s.title || s.titel, status: s.status || 'pending', detail: s.detail }));
    const one = d.step || d.schritt;
    if (one) {
      const id = String(one.id); let s = steps.find((x) => x.id === id);
      if (!s) { s = { id, title: one.title || one.titel || id }; steps.push(s); }
      Object.assign(s, { status: one.status ?? s.status, detail: one.detail ?? s.detail, title: one.title || one.titel || s.title });
    }
    const pct = render();
    if (one) body.querySelector(`.w-step[data-id="${CSS.escape(String(one.id))}"]`)?.classList.add('flash');
    return pct;
  }
  const p = set(data);
  return {
    info: 'Aufgabenübersicht angezeigt', progress: () => Math.round((steps.filter((s) => s.status === 'done').length / (steps.length || 1)) * 100),
    update(d) { set(d); return 'aktualisiert'; },
    act(a, args = {}) { if (a === 'highlight') { const el = body.querySelector(`.w-step[data-id="${CSS.escape(String(args.ziel))}"]`); el?.classList.add('flash'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return 'ok'; } throw new Error('Unbekannte Aktion für tasks: ' + a); },
    destroy() {},
  };
};

/* ---------- 5.9 AGENT OFFICE: every helper of JARVIS at its own desk (live) ---------- */
W.agenten = async (body, data) => {
  const ST = { arbeitet: 'ARBEITET', bereit: 'BEREIT', wartet: 'WARTET', fehler: 'FEHLER', pausiert: 'PAUSIERT', fertig: 'FERTIG' };
  let d = data || {};
  function render() {
    const list = d.agenten || d.agents || [];
    const busy = list.filter((a) => a.status === 'arbeitet').length;
    body.innerHTML = `<div class="ao-head"><b>${list.length}</b> AGENTEN · <b>${busy}</b> ARBEITEN GERADE${d.hinweis ? ` · <span>${esc(d.hinweis)}</span>` : ''}</div><div class="ao-floor">${list.map((a, i) => `
      <div class="ao-desk ${esc(ST[a.status] ? a.status : 'bereit')}" data-t="${esc(String(a.name || '').toLowerCase())}" style="animation-delay:${i * 0.06}s">
        <div class="ao-bot"><div class="ao-head2"><i></i><i></i></div><div class="ao-screen"><span></span><span></span><span></span></div></div>
        <div class="ao-info"><div class="ao-name">${esc(a.symbol || '🤖')} ${esc(a.name || 'Agent')}</div><div class="ao-role">${esc(a.rolle || '')}</div>
          <div class="ao-task">${esc(a.aufgabe || '')}</div>${a.fortschritt != null ? `<div class="ao-bar"><i style="width:${Math.max(0, Math.min(100, +a.fortschritt || 0))}%"></i></div>` : ''}
          <div class="ao-foot"><em>${ST[a.status] || 'BEREIT'}</em>${a.naechste ? `<small>${esc(a.naechste)}</small>` : ''}</div></div></div>`).join('') || '<p class="hint" style="padding:14px">Noch keine Agenten – lege Wächter oder Routinen an.</p>'}</div>`;
  }
  render();
  return {
    info: 'Agenten-Büro angezeigt',
    update(n) { d = { ...d, ...n }; render(); return 'aktualisiert'; },
    act(a, args = {}) {
      if (a === 'highlight' || a === 'fokus') {
        body.querySelectorAll('.ao-desk.hl').forEach((e) => e.classList.remove('hl'));
        const el = body.querySelector(`.ao-desk[data-t*="${CSS.escape(String(args.ziel || '').toLowerCase())}"]`);
        el?.classList.add('hl'); el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return el ? 'hervorgehoben' : 'nicht gefunden';
      }
      throw new Error('Unbekannter Befehl: ' + a);
    },
    destroy() {},
  };
};

/* ---------- OPTIONS / BOOKING PREP ---------- */
W.options = async (body, data, ctx) => {
  let d = data;
  function render() {
    body.innerHTML = (d.frage || d.question ? `<div class="w-q">${esc(d.frage || d.question)}</div>` : '') + `<div class="w-opts">${(d.items || d.optionen || []).map((o, i) => `
      <div class="w-opt" data-i="${i}" data-t="${esc(String(o.title || o.titel).toLowerCase())}" style="animation-delay:${i * 0.07}s">
        ${o.price || o.preis ? `<div class="price">${esc(o.price || o.preis)}</div>` : ''}
        <h4>${esc(o.title || o.titel)}</h4><small>${esc(o.subtitle || o.untertitel || '')}${o.rating ? ' · ★ ' + esc(o.rating) : ''}</small>
        ${o.details ? `<div style="margin-top:6px;font-size:14px">${esc(o.details)}</div>` : ''}
        ${(o.tags || []).length ? `<div class="tags">${o.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="acts"><button data-pick="${i}">AUSWÄHLEN</button>${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">ANBIETER ÖFFNEN</a>` : ''}</div>
      </div>`).join('')}</div>`;
  }
  render();
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]'); if (!b) return;
    const o = (d.items || d.optionen)[+b.dataset.pick];
    body.querySelectorAll('.w-opt').forEach((x) => x.classList.remove('sel')); b.closest('.w-opt').classList.add('sel');
    ctx.emit({ typ: 'auswahl', option: o.title || o.titel, details: o });
  });
  return {
    info: 'Optionen angezeigt. Auswahl des Nutzers kommt als UI-Ereignis.',
    update(nd) { d = { ...d, ...nd }; render(); return 'aktualisiert'; },
    act(a, args = {}) {
      if (a === 'highlight' || a === 'fokus') { const z = String(args.ziel || '').toLowerCase(); body.querySelectorAll('.w-opt').forEach((x) => x.classList.toggle('hl', x.dataset.t.includes(z) || x.dataset.i === String(args.index))); body.querySelector('.w-opt.hl')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return 'ok'; }
      throw new Error('Unbekannte Aktion für options: ' + a);
    },
    destroy() {},
  };
};

/* ---------- CALENDAR (fed by the real JARVIS calendar store) ---------- */
W.calendar = async (body, data) => {
  function render(d) {
    const evs = (d.events || []).slice().sort((a, b) => new Date(a.start) - new Date(b.start));
    const removed = d.removed || [];
    const all = evs.concat(removed.map((r) => ({ ...r, _removed: true })));
    const days = {};
    for (const e of all) { const k = new Date(e.start).toDateString(); (days[k] ||= []).push(e); }
    const keys = Object.keys(days).sort((a, b) => new Date(a) - new Date(b));
    body.innerHTML = `<div class="w-cal">${keys.length ? '' : '<p style="color:#6f97ad">Keine Termine.</p>'}${keys.map((k) => `<div class="w-day"><h5>${new Date(k).toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase()}</h5>
      ${days[k].map((e) => `<div class="w-ev ${e._removed ? 'removed' : (d.added || []).includes(e.id) ? 'added' : (d.moved || []).includes(e.id) ? 'moved' : ''}" data-id="${esc(e.id)}">
        <div class="t">${new Date(e.start).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</div>
        <div><b>${esc(e.titel)}</b><small>${esc([e.ort, e.dauer_min ? e.dauer_min + ' min' : ''].filter(Boolean).join(' · '))}</small></div>
        ${e._removed ? '' : `<a href="${esc(e.gcal)}" target="_blank" rel="noopener">GOOGLE ↗</a>`}</div>`).join('')}</div>`).join('')}</div>`;
    body.querySelector('.added,.moved')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  render(data);
  return { info: 'Kalender angezeigt', update(d) { render(d); return 'aktualisiert'; }, act(a, args) { if (a === 'highlight') { const el = body.querySelector(`.w-ev[data-id="${CSS.escape(String(args.ziel))}"]`); el?.classList.add('moved'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return 'ok'; } throw new Error('Unbekannte Aktion'); }, destroy() {} };
};

/* ---------- FILE ORGANIZER (animation driven by real FS operations) ---------- */
W.files = async (body, data, ctx) => {
  let d = data;
  const ext = (n) => (n.split('.').pop() || '').slice(0, 5);
  function render() {
    if (d.phase === 'pick' || !d.files) {
      body.innerHTML = `<div class="w-big"><div style="font:700 13px Orbitron;letter-spacing:.2em;color:var(--cyan2,#7ff3ff)">ORDNERZUGRIFF ERFORDERLICH</div>
        <div style="color:#8fb6c9;max-width:320px">${esc(d.hinweis || 'Gib JARVIS einen Ordner frei. Der Browser fragt dich nach Lese- und Schreibrechten.')}</div>
        ${d.supported === false ? '' : '<button data-pick>ORDNER FREIGEBEN</button>'}</div>`;
      return;
    }
    const placed = new Set(Object.values(d.bins || {}).flat());
    body.innerHTML = `<div class="w-files"><div class="src">${d.files.filter((f) => !placed.has(f)).map((f) => `<span class="w-file" data-f="${esc(f)}">${esc(f)}</span>`).join('') || '<span style="color:#3dffa8;font:600 11px Orbitron;letter-spacing:.12em">ALLE DATEIEN SORTIERT</span>'}</div>
      <div class="bins">${Object.entries(d.bins || {}).map(([c, fs]) => `<div class="w-bin" data-c="${esc(c)}"><h6><span>📁 ${esc(c)}</span><span>${fs.length}</span></h6>${fs.map((f) => `<span class="w-file">${esc(f)}</span>`).join('')}</div>`).join('')}</div></div>`;
  }
  render();
  body.addEventListener('click', (e) => { if (e.target.closest('[data-pick]')) ctx.emit({ typ: 'ordner_wählen' }); });
  return {
    info: 'Dateifenster offen',
    update(nd) { d = { ...d, ...nd }; render(); return 'ok'; },
    async act(a, args = {}) {
      if (a === 'kategorien') { d.bins = Object.fromEntries((args.kategorien || []).map((c) => [c, d.bins?.[c] || []])); render(); return 'ok'; }
      if (a === 'verschoben') { // called ONLY after the real move succeeded (or failed)
        const src = body.querySelector(`.w-file[data-f="${CSS.escape(args.datei)}"]`);
        if (!args.ok) { src?.classList.add('err'); if (src) src.title = args.fehler || 'Fehler'; return 'ok'; }
        let bin = body.querySelector(`.w-bin[data-c="${CSS.escape(args.kategorie)}"]`);
        d.bins ||= {}; d.bins[args.kategorie] ||= [];
        if (!bin) { render(); bin = body.querySelector(`.w-bin[data-c="${CSS.escape(args.kategorie)}"]`); }
        if (src && bin) {
          const r1 = src.getBoundingClientRect(), r2 = bin.getBoundingClientRect();
          const fly = src.cloneNode(true); fly.classList.add('fly'); fly.style.left = r1.left + 'px'; fly.style.top = r1.top + 'px'; document.body.append(fly);
          src.style.visibility = 'hidden';
          requestAnimationFrame(() => { fly.style.transform = `translate(${r2.left + 10 - r1.left}px,${r2.top + 24 - r1.top}px) scale(.85)`; fly.style.opacity = '0.2'; });
          await new Promise((r) => setTimeout(r, 650)); fly.remove();
        }
        d.bins[args.kategorie].push(args.datei); render();
        body.querySelector(`.w-bin[data-c="${CSS.escape(args.kategorie)}"]`)?.classList.add('pulse');
        return 'ok';
      }
      throw new Error('Unbekannte Aktion für files: ' + a);
    },
    destroy() {},
  };
};


/* ---------- FILE SORTER 3D (reference: scene 4) – every flight = one CONFIRMED file operation ---------- */
const FS_CSS = `
.fs{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,1fr);grid-template-rows:auto 1fr auto;gap:0 14px;padding:14px 16px 12px;background:radial-gradient(ellipse at 78% 55%,rgba(var(--acc-rgb,45,226,255),.10),transparent 60%),radial-gradient(ellipse at 20% 0%,rgba(255,138,92,.07),transparent 50%)}
.fs-head{grid-column:1/3}
.fs-eyebrow{font:600 10px Orbitron,sans-serif;letter-spacing:.18em;color:#6f97ad;text-transform:uppercase}
.fs-title{font:700 clamp(22px,3.1vw,40px)/1.05 Rajdhani,sans-serif;color:#eef8ff;margin:4px 0 8px;letter-spacing:-.01em}
.fs-title em{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-weight:400;color:var(--cyan2,#7ff3ff);text-shadow:0 0 18px rgba(var(--acc-rgb,45,226,255),.45)}
.fs-counts{display:flex;gap:18px;flex-wrap:wrap}
.fs-counts div{min-width:62px}.fs-counts b{display:block;font:700 22px Orbitron,sans-serif;color:#fff;font-variant-numeric:tabular-nums;transition:color .3s}
.fs-counts span{font:600 9px Orbitron,sans-serif;letter-spacing:.14em;color:#6f97ad;text-transform:uppercase}
.fs-counts b.bump{color:var(--cyan2,#7ff3ff);text-shadow:0 0 12px var(--cyan,#2de2ff)}
.fs-grid{overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));grid-auto-rows:minmax(118px,1fr);gap:10px;align-content:stretch;padding:10px 2px 4px}
.fs-tile{position:relative;border:1px solid rgba(var(--acc-rgb,45,226,255),.16);border-radius:12px;padding:8px 9px 9px;background:linear-gradient(160deg,rgba(14,34,52,.85),rgba(6,16,26,.85));min-height:96px;transition:border-color .3s,box-shadow .3s,transform .3s}
.fs-tile.hit{border-color:var(--cyan,#2de2ff);box-shadow:0 0 0 1px rgba(var(--acc-rgb,45,226,255),.3),0 0 22px rgba(var(--acc-rgb,45,226,255),.28);transform:translateY(-1px)}
.fs-tile.done{border-color:rgba(61,255,168,.45)}
.fs-tile h6{margin:0 0 6px;display:flex;align-items:center;gap:6px;font:700 10.5px Rajdhani,sans-serif;letter-spacing:.04em;color:#dff6ff;text-transform:uppercase}
.fs-tile h6 i{width:14px;height:11px;border-radius:2px;background:#ff8a5c;box-shadow:0 0 8px rgba(255,138,92,.6);flex:0 0 auto;position:relative}
.fs-tile h6 i::before{content:"";position:absolute;left:0;top:-3px;width:7px;height:4px;border-radius:2px 2px 0 0;background:#ff8a5c}
.fs-tile h6 b{margin-left:auto;font:700 10px Orbitron,sans-serif;color:var(--cyan2,#7ff3ff);font-variant-numeric:tabular-nums}
.fs-thumbs{display:grid;grid-template-columns:repeat(6,1fr);gap:3px;margin-bottom:14px}
.fs-thumbs canvas,.fs-thumbs .more{width:100%;aspect-ratio:1;border-radius:3px;display:block}
.fs-thumbs .more{display:grid;place-items:center;font:700 9px Orbitron;color:var(--cyan2,#7ff3ff);background:rgba(var(--acc-rgb,45,226,255),.1)}
.fs-tile small{position:absolute;left:9px;bottom:5px;font:600 9px Orbitron;letter-spacing:.08em;color:#5f8296}
.fs-tile.err{border-color:#ff5d6c}
.fs-cloud{position:relative;min-height:220px}
.fs-cloud canvas{position:absolute;inset:0;width:100%;height:100%}
.fs-foot{grid-column:1/3;display:flex;align-items:center;gap:12px;padding-top:8px}
.fs-bar{flex:1;height:6px;border-radius:4px;background:rgba(var(--acc-rgb,45,226,255),.12);overflow:hidden}
.fs-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--cyan,#2de2ff),var(--cyan2,#7ff3ff));box-shadow:0 0 12px var(--cyan,#2de2ff);transition:width .25s}
.fs-foot span{font:600 10.5px Orbitron;letter-spacing:.08em;color:#9fd9ec;white-space:nowrap;font-variant-numeric:tabular-nums}
.fs-fly{position:fixed;z-index:90;width:30px;height:30px;border-radius:4px;pointer-events:none;box-shadow:0 0 14px rgba(var(--acc-rgb,45,226,255),.7);transition:transform .75s cubic-bezier(.45,0,.2,1),opacity .75s;will-change:transform}
.fs-head-flash{position:absolute;left:0;right:0;top:42%;text-align:center;font:800 clamp(40px,8vw,110px) Rajdhani,sans-serif;color:#fff;letter-spacing:-.02em;text-shadow:0 0 30px var(--cyan,#2de2ff),0 0 80px rgba(var(--acc-rgb,45,226,255),.6);pointer-events:none;animation:fsFlash 1.6s ease-out forwards;z-index:5}
@keyframes fsFlash{0%{opacity:0;transform:scale(.7);filter:blur(8px)}20%{opacity:1;transform:scale(1);filter:none}70%{opacity:1}100%{opacity:0;transform:scale(1.15);filter:blur(4px)}}
.fs-pick{grid-column:1/3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center}
.fs-pick button{font:700 12px Orbitron;letter-spacing:.15em;padding:14px 18px;border-radius:8px;border:0;background:var(--cyan,#2de2ff);color:#02060c;box-shadow:0 0 22px rgba(var(--acc-rgb,45,226,255),.5);cursor:pointer}
@media (max-width:700px){.fs{grid-template-columns:1fr;grid-template-rows:auto 34% 1fr auto}.fs-cloud{grid-row:2;min-height:0}.fs-grid{grid-row:3;grid-template-columns:repeat(2,minmax(0,1fr))}.fs-head,.fs-foot{grid-column:1}.fs-counts{gap:10px}.fs-counts b{font-size:17px}}
`;
const TYPE_COL = { Bilder: '#ff8a5c', Screenshots: '#ffb02e', Videos: '#ff5d8f', Audio: '#a78bfa', Dokumente: '#5aa9ff', Tabellen: '#3dffa8', Präsentationen: '#ffd166', Archive: '#c3a37a', Programme: '#ff5d6c', Code: acc2Css(), Schriften: '#e6e6e6', Sonstiges: '#8aa0ad' };
async function fileThumb(f, cat) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const col = TYPE_COL[cat] || '#8aa0ad';
  if (f.file && /^image\/(png|jpe?g|webp|gif|bmp)/.test(f.file.type) && f.file.size < 25e6) {
    try { const bmp = await createImageBitmap(f.file, { resizeWidth: 64, resizeHeight: 64, resizeQuality: 'low' }); g.drawImage(bmp, 0, 0, 64, 64); bmp.close?.(); return c; } catch {}
  }
  g.fillStyle = '#0d1d2b'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = col; g.fillRect(0, 0, 64, 14); g.globalAlpha = 0.25; for (let i = 0; i < 5; i++) g.fillRect(8, 22 + i * 7, 48 - (i % 3) * 10, 3); g.globalAlpha = 1;
  g.fillStyle = '#fff'; g.font = '700 13px sans-serif'; g.textAlign = 'center'; g.fillText((f.name.split('.').pop() || '?').slice(0, 4).toUpperCase(), 32, 58);
  return c;
}
W.filesorter = async (body, data, ctx) => {
  if (!document.getElementById('fs-css')) { const st = document.createElement('style'); st.id = 'fs-css'; st.textContent = FS_CSS; document.head.append(st); }
  const root = document.createElement('div'); root.className = 'fs'; body.append(root);
  let files = [], cats = [], counts = {}, planned = {}, done = 0, total = 0, errors = 0, folder = data.ordner || 'Ordner';
  const byName = new Map();
  // ---- 3D cloud (instanced billboards sampling a thumbnail atlas) ----
  let three = null;
  function initCloud(host) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const canvas = renderer.domElement; host.append(canvas);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100); camera.position.set(0, 0, 9);
    const atlas = document.createElement('canvas'); atlas.width = atlas.height = 2048; const ag = atlas.getContext('2d');
    const tex = new THREE.CanvasTexture(atlas); tex.colorSpace = THREE.SRGBColorSpace;
    const MAX = 1024, cells = 32;
    const geo = new THREE.PlaneGeometry(0.34, 0.34);
    const iCenter = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3), iUv = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2), iAlive = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1);
    const ig = new THREE.InstancedBufferGeometry(); ig.index = geo.index; ig.attributes.position = geo.attributes.position; ig.attributes.uv = geo.attributes.uv;
    ig.setAttribute('iCenter', iCenter); ig.setAttribute('iUv', iUv); ig.setAttribute('iAlive', iAlive); ig.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { map: { value: tex }, uRot: { value: 0 }, uTime: { value: 0 } },
      vertexShader: `attribute vec3 iCenter; attribute vec2 iUv; attribute float iAlive; uniform float uRot; uniform float uTime; varying vec2 vUv; varying float vA; varying float vDepth;
        void main(){ float c=cos(uRot), s=sin(uRot); vec3 p=vec3(iCenter.x*c+iCenter.z*s, iCenter.y, -iCenter.x*s+iCenter.z*c);
          p *= 1.0 + 0.03*sin(uTime*1.3 + iCenter.y*4.0);
          vec4 mv=modelViewMatrix*vec4(p,1.0); mv.xy += position.xy*iAlive*(0.85+0.35*smoothstep(-3.0,3.0,p.z));
          vUv = iUv + uv/32.0; vA=iAlive; vDepth=smoothstep(-3.2,3.2,p.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vA; varying float vDepth; void main(){ if(vA<0.01) discard; vec4 t=texture2D(map,vUv); gl_FragColor=vec4(t.rgb*(0.45+0.75*vDepth), (0.35+0.65*vDepth)*vA); }` });
    const cloud = new THREE.Mesh(ig, mat); cloud.frustumCulled = false; scene.add(cloud);
    // agent orb
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 48), new THREE.ShaderMaterial({ transparent: true, uniforms: { t: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float t; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-max(dot(vN,vV),0.),2.5); vec3 c=mix(vec3(0.02,0.05,0.09),vec3(0.18,0.89,1.0),f)+vec3(1.)*pow(max(dot(vN,vec3(.3,.4,.85)),0.),40.)*.8; gl_FragColor=vec4(c,1.); }` }));
    scene.add(orb);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.25, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float t; varying vec2 vUv; void main(){ float d=length(vUv-.5)*2.; float a=smoothstep(1.,.55,d)*(0.35+0.15*sin(t*3.)); gl_FragColor=vec4(0.18,0.89,1.,a); }` }));
    scene.add(halo);
    let n = 0, rot = 0, work = 0, expected = 300;
    const centers = [];
    function add(thumb) {
      if (n >= MAX) return -1; const i = n++;
      // fibonacci sphere slot
      // true Fibonacci sphere over the expected total (even coverage, no spiral)
      const N = Math.max(expected, n), y = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963229728653, R = 2.5 + ((i * 7919) % 11) * 0.03;
      const v = [R * rr * Math.cos(th), R * y, R * rr * Math.sin(th)]; centers[i] = v; iCenter.setXYZ(i, ...v);
      const cx = i % cells, cy = Math.floor(i / cells); ag.drawImage(thumb, cx * 64, cy * 64, 64, 64);
      iUv.setXY(i, cx / cells, 1 - (cy + 1) / cells); iAlive.setX(i, 1); ig.instanceCount = n;
      iCenter.needsUpdate = iUv.needsUpdate = iAlive.needsUpdate = true; tex.needsUpdate = true; return i;
    }
    function screenPos(i) {
      const [x, y, z] = centers[i]; const c = Math.cos(rot), s = Math.sin(rot); const v = new THREE.Vector3(x * c + z * s, y, -x * s + z * c).project(camera);
      const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, front: v.z < 0.99 };
    }
    function kill(i) { if (i < 0) return; iAlive.setX(i, 0); iAlive.needsUpdate = true; work = 1; }
    const ro = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = 9 / Math.min(1, camera.aspect * 1.1); camera.updateProjectionMatrix(); }); ro.observe(host);
    let alive = true; const clock = new THREE.Clock();
    (function loop() { if (!alive) return; requestAnimationFrame(loop); if (!host.offsetParent) return; const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
      work *= 0.97; rot += dt * (0.12 + work * 0.9); mat.uniforms.uRot.value = rot; mat.uniforms.uTime.value = t; halo.material.uniforms.t.value = t; halo.scale.setScalar(1 + work * 0.35 + Math.sin(t * 2) * 0.03); orb.scale.setScalar(1 + work * 0.12);
      renderer.render(scene, camera); })();
    return { add, kill, screenPos, expect(k) { expected = Math.min(MAX, Math.max(1, k)); }, destroy() { alive = false; ro.disconnect(); renderer.dispose(); } };
  }
  // ---- DOM ----
  const fmt = (x) => x.toLocaleString('de-CH');
  function renderShell(phase) {
    if (phase === 'pick') {
      root.innerHTML = `<div class="fs-pick"><div class="fs-eyebrow">DATEI-SYSTEM</div><div class="fs-title">Gib mir einen <em>Ordner</em> frei</div><div style="color:#8fb6c9;max-width:380px">${esc(data.hinweis || 'Der Browser fragt nach Lese- und Schreibrechten. Jede Bewegung hier entspricht einer echten, geprüften Dateioperation.')}</div>${data.supported === false ? '' : '<button data-pick>ORDNER FREIGEBEN</button>'}</div>`;
      return;
    }
    root.innerHTML = `<div class="fs-head"><div class="fs-eyebrow"></div><div class="fs-title">Sortiere Ihren <em></em> Ordner</div><div class="fs-counts"></div></div>
      <div class="fs-grid"></div><div class="fs-cloud"></div><div class="fs-foot"><div class="fs-bar"><i></i></div><span>BEREIT</span></div>`;
    root.querySelector('.fs-title em').textContent = folder;
    three?.destroy(); three = initCloud(root.querySelector('.fs-cloud'));
  }
  function eyebrow(t) { const e = root.querySelector('.fs-eyebrow'); if (e) e.textContent = t; }
  function renderCounts() {
    const top = [...cats].sort((a, b) => (planned[b] || 0) - (planned[a] || 0)).slice(0, 5);
    const el = root.querySelector('.fs-counts'); if (!el) return;
    el.innerHTML = top.map((c) => `<div data-c="${esc(c)}"><b>${fmt(counts[c] || 0)}</b><span>${esc(c)}</span></div>`).join('');
  }
  function renderTiles() {
    const g = root.querySelector('.fs-grid'); if (!g) return;
    g.innerHTML = cats.map((c) => `<div class="fs-tile" data-c="${esc(c)}"><h6><i></i>${esc(c)}<b>${fmt(counts[c] || 0)}</b></h6><div class="fs-thumbs"></div><small>${fmt(planned[c] || 0)} GEPLANT</small></div>`).join('');
  }
  function progress(text) { const b = root.querySelector('.fs-bar i'), s = root.querySelector('.fs-foot span'); if (b) b.style.width = (total ? (done / total) * 100 : 0) + '%'; if (s) s.textContent = text || `${fmt(done)} / ${fmt(total)} VERSCHOBEN & GEPRÜFT${errors ? ' · ' + errors + ' FEHLER' : ''}`; }
  function flash(text) { const d = document.createElement('div'); d.className = 'fs-head-flash'; d.textContent = text; root.append(d); setTimeout(() => d.remove(), 1700); }
  // ---- flight queue: animate only confirmed operations; batch when the backlog is large ----
  const queue = []; let inflight = 0;
  function pump() {
    while (inflight < 18 && queue.length) {
      const job = queue.shift(); const batch = queue.length > 120 ? queue.splice(0, Math.min(queue.length, Math.ceil(queue.length / 40))) : [];
      fly(job, batch);
    }
  }
  function bumpCount(cat, k) {
    counts[cat] = (counts[cat] || 0) + k;
    const tile = root.querySelector(`.fs-tile[data-c="${CSS.escape(cat)}"]`);
    if (tile) { tile.querySelector('h6 b').textContent = fmt(counts[cat]); tile.classList.add('hit'); clearTimeout(tile._t); tile._t = setTimeout(() => tile.classList.remove('hit'), 400); if (counts[cat] >= (planned[cat] || 0) && planned[cat]) { tile.classList.add('done'); if (!tile._flashed && planned[cat] >= Math.max(5, total * 0.08)) { tile._flashed = true; flash(cat); } } }
    const cb = root.querySelector(`.fs-counts div[data-c="${CSS.escape(cat)}"] b`); if (cb) { cb.textContent = fmt(counts[cat]); cb.classList.add('bump'); setTimeout(() => cb.classList.remove('bump'), 250); }
  }
  function addThumb(tile, f) {
    const box = tile.querySelector('.fs-thumbs'); const shown = box.querySelectorAll('canvas').length;
    if (shown < 17) { const c = document.createElement('canvas'); c.width = c.height = 32; c.getContext('2d').drawImage(f.thumb, 0, 0, 32, 32); box.append(c); }
    else { let m = box.querySelector('.more'); if (!m) { m = document.createElement('div'); m.className = 'more'; box.append(m); } m.textContent = '+' + fmt((counts[f.cat] || 0) - 17); }
  }
  function fly(job, batch) {
    const all = [job, ...batch]; inflight++;
    const f = byName.get(job.datei); const tile = root.querySelector(`.fs-tile[data-c="${CSS.escape(job.kategorie)}"]`);
    all.forEach((j) => { const ff = byName.get(j.datei); if (ff) { ff.cat = j.kategorie; three?.kill(ff.idx); } });
    const finish = () => { inflight--; all.forEach((j) => { const ff = byName.get(j.datei); bumpCount(j.kategorie, 1); if (ff && tile) addThumb(tile, ff); }); progress(); pump(); };
    if (!f || !tile || !three || !body.offsetParent) return finish();
    const from = f.idx >= 0 ? three.screenPos(f.idx) : null; const to = tile.querySelector('.fs-thumbs').getBoundingClientRect();
    if (!from) return finish();
    const el = document.createElement('canvas'); el.width = el.height = 32; el.className = 'fs-fly'; el.getContext('2d').drawImage(f.thumb, 0, 0, 32, 32);
    el.style.left = from.x - 15 + 'px'; el.style.top = from.y - 15 + 'px'; document.body.append(el);
    if (batch.length) el.style.boxShadow = `0 0 0 2px var(--cyan,#2de2ff), 0 0 ${10 + batch.length}px rgba(var(--acc-rgb,45,226,255),.8)`;
    requestAnimationFrame(() => { el.style.transform = `translate(${to.left + 8 - from.x}px,${to.top + 6 - from.y}px) scale(.6) rotate(${(Math.random() - 0.5) * 40}deg)`; el.style.opacity = '0.25'; });
    setTimeout(() => { el.remove(); finish(); }, 760);
  }
  renderShell(data.phase === 'pick' || !data.dateien ? 'pick' : 'scan');
  root.addEventListener('click', (e) => { if (e.target.closest('[data-pick]')) ctx.emit({ typ: 'ordner_wählen' }); });
  return {
    info: 'Datei-Ansicht offen',
    meta: () => ({ ordner: folder, dateien: files.length, verschoben: done, kategorien: cats }),
    progress: () => (total ? Math.round((done / total) * 100) : 0),
    async update(d) {
      if (d.dateien) {   // real scan result (File objects stay in the browser; never sent to the AI)
        folder = d.ordner || folder; renderShell('scan');
        files = d.dateien; byName.clear(); done = 0; total = 0; errors = 0; counts = {};
        const bytes = files.reduce((a, f) => a + (f.size || 0), 0);
        eyebrow(`${folder} · ${fmt(files.length)} Dateien · ${bytes >= 1e9 ? (bytes / 1e9).toFixed(2) + ' GB' : Math.max(0.01, bytes / 1e6).toFixed(bytes < 1e7 ? 2 : 0) + ' MB'}`);
        progress('LESE VORSCHAUBILDER …');
        three.expect(files.length);
        for (let i = 0; i < files.length; i++) { const f = files[i]; f.thumb = await fileThumb(f, d.kategorieVon?.(f) || 'Sonstiges'); f.idx = three.add(f.thumb); byName.set(f.name, f); if (i % 40 === 0) await new Promise((r) => setTimeout(r)); }
        progress(`${fmt(files.length)} DATEIEN ERFASST`);
      }
      return 'ok';
    },
    async act(a, args = {}) {
      if (a === 'kategorien') { cats = args.liste.map((x) => x.name); planned = Object.fromEntries(args.liste.map((x) => [x.name, x.anzahl])); total = args.liste.reduce((s, x) => s + x.anzahl, 0); counts = {}; done = 0; renderCounts(); renderTiles(); progress(); return 'ok'; }
      if (a === 'verschoben') {           // called ONLY after the real move was verified (or failed)
        if (!args.ok) { errors++; const t = root.querySelector(`.fs-tile[data-c="${CSS.escape(args.kategorie)}"]`); t?.classList.add('err'); progress(); return 'ok'; }
        done++; queue.push(args); pump(); return 'ok';
      }
      if (a === 'fertig') { const wait = () => new Promise((r) => { const iv = setInterval(() => { if (!queue.length && !inflight) { clearInterval(iv); r(); } }, 100); }); await wait(); progress(args.text); if (args.titel) flash(args.titel); return 'ok'; }
      if (a === 'highlight') { const t = root.querySelector(`.fs-tile[data-c="${CSS.escape(args.ziel)}"]`); t?.classList.add('hit'); t?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return t ? 'ok' : 'Kategorie nicht gefunden'; }
      throw new Error('Unbekannte Aktion für filesorter: ' + a);
    },
    destroy() { three?.destroy(); },
  };
};


/* ---------- RESEARCH LIVE: real web-search queries + sources as a growing network ---------- */
W.research = async (body, data) => {
  body.innerHTML = `<div style="position:absolute;inset:0"><svg class="rs-svg" style="position:absolute;inset:0;width:100%;height:100%"></svg><div class="rs-nodes" style="position:absolute;inset:0"></div><div class="rs-q" style="position:absolute;left:12px;top:10px;right:12px;font:600 12px Orbitron;letter-spacing:.08em;color:var(--cyan2,#7ff3ff)"></div></div>`;
  const svg = body.querySelector('.rs-svg'), nodes = body.querySelector('.rs-nodes'), qEl = body.querySelector('.rs-q');
  const queries = [], sources = [];
  function layout() {
    const W0 = body.clientWidth, H0 = body.clientHeight, cx = W0 / 2, cy = H0 / 2 + 10;
    svg.innerHTML = ''; nodes.innerHTML = '';
    const hub = document.createElement('div'); hub.style.cssText = `position:absolute;left:${cx - 34}px;top:${cy - 34}px;width:68px;height:68px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--cyan2,#7ff3ff),#0a3d55 60%,#02101c);box-shadow:0 0 30px rgba(var(--acc-rgb,45,226,255),.6)`; nodes.append(hub);
    const R = Math.min(W0, H0) * 0.36;
    sources.forEach((s, i) => {
      const a = (i / Math.max(sources.length, 6)) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R * (1 + (i % 2) * 0.12), y = cy + Math.sin(a) * R * 0.8;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); Object.entries({ x1: cx, y1: cy, x2: x, y2: y, stroke: s.err ? '#ff5d6c' : accCss(), 'stroke-opacity': 0.45, 'stroke-width': 1.2 }).forEach(([k, v]) => ln.setAttribute(k, v)); svg.append(ln);
      const c = document.createElement('a'); c.href = s.url; c.target = '_blank'; c.rel = 'noopener';
      c.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);max-width:170px;padding:6px 9px;border-radius:9px;background:rgba(6,22,36,.9);border:1px solid ${s.err ? '#ff5d6c' : 'rgba(var(--acc-rgb,45,226,255),.4)'};color:#dff6ff;text-decoration:none;font:600 11.5px Rajdhani;animation:kpiIn .5s both;box-shadow:0 0 14px rgba(var(--acc-rgb,45,226,255),.15)`;
      c.innerHTML = `<b style="display:block;font:700 9px Orbitron;letter-spacing:.08em;color:var(--cyan2,#7ff3ff)">${esc(s.domain)}</b>${esc((s.title || '').slice(0, 60))}`; nodes.append(c);
    });
    qEl.textContent = queries.length ? '⌕ ' + queries.slice(-3).join('  ·  ') : 'RECHERCHE';
  }
  new ResizeObserver(layout).observe(body);
  function add(d) {
    if (d.query && !queries.includes(d.query)) queries.push(d.query);
    for (const s of d.sources || []) { if (sources.some((x) => x.url === s.url)) continue; let dom = ''; try { dom = new URL(s.url).hostname.replace(/^www\./, ''); } catch {} sources.push({ ...s, domain: dom }); }
    if (d.error) sources.push({ url: '#', title: d.error, domain: 'FEHLER', err: true });
    layout();
  }
  add(data);
  return { info: 'Recherche-Netz offen', progress: () => null, meta: () => ({ suchen: queries.length, quellen: sources.length }), update(d) { add(d); return 'ok'; }, act() { return 'ok'; }, destroy() {} };
};

/* ---------- BROWSER LIVE: what the PC agent is really doing ---------- */
W.browserlive = async (body, data) => {
  body.innerHTML = `<div style="position:absolute;inset:0;display:grid;grid-template-rows:auto 1fr;gap:8px;padding:10px 12px"><div class="bl-url" style="display:flex;gap:8px;align-items:center;padding:7px 10px;border-radius:9px;background:rgba(0,0,0,.35);border:1px solid rgba(var(--acc-rgb,45,226,255),.25);font:600 12px Rajdhani;color:#cfefff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"></div><div style="display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:10px;min-height:0"><div class="bl-shot" style="border-radius:9px;border:1px solid rgba(var(--acc-rgb,45,226,255),.2);background:#04101a center/contain no-repeat;min-height:120px;display:grid;place-items:center;color:#3e6578;font:600 10px Orbitron">KEINE VORSCHAU</div><div class="bl-steps" style="overflow:auto;font:500 13px Rajdhani"></div></div></div>`;
  const steps = [];
  function render() {
    body.querySelector('.bl-steps').innerHTML = steps.slice(-14).map((s) => `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid rgba(var(--acc-rgb,45,226,255),.08);animation:kpiIn .35s both"><i style="flex:0 0 8px;height:8px;margin-top:5px;border-radius:50%;background:${{ ok: '#3dffa8', err: '#ff5d6c', lock: '#ffb02e', run: accCss() }[s.st]};box-shadow:0 0 8px currentColor"></i><div><b style="color:#fff">${esc(s.a)}</b><br><small style="color:#8fb6c9">${esc(s.t || '')}</small></div></div>`).join('');
  }
  function add(d) {
    if (d.url) body.querySelector('.bl-url').innerHTML = `<span style="color:#3dffa8">●</span> ${esc(d.titel || '')} <span style="color:#6f97ad">${esc(d.url)}</span>`;
    if (d.bild) { const s = body.querySelector('.bl-shot'); s.textContent = ''; s.style.backgroundImage = `url(${d.bild})`; }
    if (d.schritt) { const last = steps[steps.length - 1]; if (last && last.st === 'run' && last.a === d.schritt.a) Object.assign(last, d.schritt); else steps.push(d.schritt); }
    render();
  }
  add(data);
  return { info: 'Browser-Live offen', meta: () => ({ schritte: steps.length }), update(d) { add(d); return 'ok'; }, act() { return 'ok'; }, destroy() {} };
};

/* ---------- INFO PANEL ---------- */
W.info = async (body, data, ctx) => {
  const render = (d) => { body.innerHTML = `<div class="w-pad w-md">${d.image ? `<img src="${esc(d.image)}" alt="">` : ''}${ctx.md(d.text || d.markdown || '')}</div>`; };
  render(data);
  return { info: 'Info angezeigt', update(d) { render(d); return 'ok'; }, act() { return 'ok'; }, destroy() {} };
};

/* ---------- CUSTOM (agent-written HTML/JS, sandboxed, with live bridge) ---------- */
const BRIDGE = `<script>(function(){var h={};window.JARVIS={on:function(n,f){h[n]=f},send:function(d){parent.postMessage({jarvisEvent:d},'*')}};
addEventListener('message',function(e){var m=e.data||{};if(m.jarvisAction){var f=h[m.jarvisAction];try{var r=f?f(m.args||{}):'kein Handler';parent.postMessage({jarvisReply:m.rid,ok:!!f,result:String(r)},'*')}catch(err){parent.postMessage({jarvisReply:m.rid,ok:false,result:String(err)},'*')}}});
window.onerror=function(msg){parent.postMessage({jarvisError:String(msg)},'*')};})();<\/script>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}<\/script>
<style>html,body{margin:0;background:transparent;color:#cfefff;font-family:Rajdhani,system-ui,sans-serif}</style>`;
W.custom = async (body, data, ctx) => {
  const f = document.createElement('iframe'); f.className = 'w-frame';
  f.setAttribute('sandbox', 'allow-scripts allow-popups allow-forms allow-modals');
  f.setAttribute('allow', 'accelerometer; gyroscope; fullscreen; autoplay');
  const errors = [];
  const pending = new Map();
  const onMsg = (e) => {
    if (e.source !== f.contentWindow) return; const m = e.data || {};
    if (m.jarvisEvent) ctx.emit(m.jarvisEvent);
    if (m.jarvisError) errors.push(m.jarvisError);
    if (m.jarvisReply && pending.has(m.jarvisReply)) { pending.get(m.jarvisReply)(m); pending.delete(m.jarvisReply); }
  };
  addEventListener('message', onMsg);
  const load = (html) => {
    const h = String(html || '');
    f.srcdoc = /<head[^>]*>/i.test(h) ? h.replace(/<head[^>]*>/i, (m) => m + BRIDGE) : BRIDGE + h;
  };
  load(data.html); body.append(f);
  await new Promise((r) => { f.onload = r; setTimeout(r, 2500); });
  await new Promise((r) => setTimeout(r, 600));
  return {
    info: errors.length ? { warnung: 'JS-Fehler in der Darstellung', fehler: errors.slice(0, 3) } : 'Darstellung läuft ohne JS-Fehler',
    async update(d) { errors.length = 0; if (d.html) { load(d.html); await new Promise((r) => { f.onload = r; setTimeout(r, 2500); }); await new Promise((r) => setTimeout(r, 500)); } return errors.length ? { fehler: errors.slice(0, 3) } : 'aktualisiert'; },
    act(a, args = {}) {
      const rid = Math.random().toString(36).slice(2);
      return new Promise((res, rej) => {
        pending.set(rid, (m) => (m.ok ? res(m.result) : rej(new Error('Darstellung: ' + m.result))));
        f.contentWindow.postMessage({ jarvisAction: a, args, rid }, '*');
        setTimeout(() => { if (pending.has(rid)) { pending.delete(rid); rej(new Error('Darstellung antwortet nicht')); } }, 3000);
      });
    },
    destroy() { removeEventListener('message', onMsg); },
  };
};

/* ---------- SCENE: JV-SDK scenes (library models or AI-generated code) ---------- */
W.scene = async (body, data, ctx) => {
  const f = document.createElement('iframe'); f.className = 'w-frame';
  f.setAttribute('sandbox', 'allow-scripts allow-popups');
  f.setAttribute('allow', 'accelerometer; gyroscope; fullscreen; autoplay');
  body.append(f);
  let report = null, errors = [], waiters = [];
  const pending = new Map();
  const onMsg = (e) => {
    if (e.source !== f.contentWindow) return; const m = e.data || {};
    if (m.jarvisReady) { report = m.jarvisReady; waiters.forEach((w) => w()); waiters = []; }
    if (m.jarvisError) { errors.push(String(m.jarvisError).slice(0, 400)); if (!report) { waiters.forEach((w) => w()); waiters = []; } }
    if (m.jarvisEvent) ctx.emit(m.jarvisEvent);
    if (m.jarvisReply && pending.has(m.jarvisReply)) { pending.get(m.jarvisReply)(m); pending.delete(m.jarvisReply); }
  };
  addEventListener('message', onMsg);
  const call = (a, args = {}, ms = 8000) => new Promise((res, rej) => {
    const rid = Math.random().toString(36).slice(2);
    pending.set(rid, (m) => (m.ok ? res(m.result) : rej(new Error(m.result))));
    f.contentWindow.postMessage({ jarvisAction: a, args, rid }, '*');
    setTimeout(() => { if (pending.has(rid)) { pending.delete(rid); rej(new Error('Szene antwortet nicht')); } }, ms);
  });
  async function load(d) {
    report = null; errors = [];
    const lib = d.bibliothek || d.library;
    const code = String(d.code || '');
    if (!lib && !code.trim()) throw new Error('scene braucht daten.bibliothek (Modell-ID) oder daten.code (JV-Szenencode)');
    const opts = { title: (d.titel || d.title || '').toUpperCase() || undefined, source: d.quelle || (lib ? 'BIBLIOTHEK' : 'KI-GENERIERT · PROZEDURAL'), simplified: !!d.vereinfacht, umgebung: d.umgebung };
    const imports = { three: ctx.abs('js/three.js'), jv: ctx.abs('js/jv.js'), 'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/' };
    const run = lib ? `const lib = await import(${JSON.stringify(ctx.abs('lib/' + lib + '.js'))}); await lib.default(jv, THREE);`
                    : `window.THREE = THREE; await (async (jv) => {\n${code.replace(/<\/script/gi, '<\\/script')}\n})(jv);`; // THREE as global → code may redeclare it
    f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script type="importmap">${JSON.stringify({ imports })}<\/script>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@500;600&display=swap" rel="stylesheet"></head><body>
<script>window.onerror=function(m,s,l){parent.postMessage({jarvisError:m+' (Zeile '+l+')'},'*')};window.onunhandledrejection=function(e){parent.postMessage({jarvisError:String(e.reason&&e.reason.stack||e.reason)},'*')};<\/script>
<script type="module">import * as THREE from 'three'; import { createStage } from 'jv';
const jv = createStage(${JSON.stringify(opts)}); window.jv = jv;
try { ${run}
 await jv.ready(); } catch (e) { jv.fail(e); }<\/script></body></html>`;
    await new Promise((r) => { waiters.push(r); setTimeout(r, 25000); });
    if (!report) return { ok: false, fehler: errors.length ? errors : ['Szene meldet sich nicht (Timeout)'] };
    let snapshot = null; try { snapshot = await call('snapshot', { size: 720 }, 6000); } catch {}
    return { ok: !errors.length, bericht: report, fehler: errors, snapshot };
  }
  const first = await load(data);
  if (!first.ok && !first.bericht) { const e = new Error('Szene fehlgeschlagen: ' + first.fehler.join(' | ')); e.details = first; throw e; }
  return {
    info: first,
    meta: () => report && { teile: report.teile?.slice(0, 40), phasen: report.phasen, befehle: report.befehle, parameter: report.parameter },
    async update(d) { if (d.code || d.bibliothek) return await load(d); return 'nichts geändert (code oder bibliothek angeben)'; },
    act: (a, args = {}) => call(a, args),
    destroy() { removeEventListener('message', onMsg); },
  };
};

/* ===================================================================== */
/* WINDOW MANAGER                                                        */
/* ===================================================================== */
export const WINDOW_TYPES = Object.keys(W);

const IMMERSIVE = new Set(['scene', 'model3d', 'globe', 'custom', 'map', 'filesorter']);
export function createWM({ stageHost, md, geocode, asset, abs, onEvent, onChange }) {
  const st = document.createElement('style'); st.textContent = STYLE; document.head.append(st);
  const layer = document.createElement('div'); layer.className = 'hw-layer'; document.body.append(layer);
  const stage = document.createElement('div'); stage.className = 'hw-stage';
  const tabs = document.createElement('div'); tabs.className = 'hw-tabs';
  const wrap = document.createElement('div'); wrap.className = 'hw-wrap';
  stage.append(tabs, wrap); stageHost.append(stage);
  const desk = matchMedia('(min-width: 900px)');
  const wins = new Map();

  /* ===== LIVE ENGINE: agent orb travels to the window where real work happens; bursts; headlines ===== */
  const eng = document.createElement('div'); eng.innerHTML = `<style>
    .lv-orb{position:fixed;z-index:60;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;opacity:0;
      background:radial-gradient(circle at 35% 30%,#e9fdff 0,var(--cyan2,#7ff3ff) 18%,#0e5c78 52%,#03121e 72%);box-shadow:0 0 0 2px rgba(var(--acc-rgb,45,226,255),.25),0 0 28px rgba(var(--acc-rgb,45,226,255),.75),0 0 80px rgba(var(--acc-rgb,45,226,255),.35);
      transition:left .9s cubic-bezier(.5,0,.2,1),top .9s cubic-bezier(.5,0,.2,1),opacity .5s,transform .3s}
    .lv-orb.on{opacity:1}.lv-orb.work{animation:lvPulse .9s ease-in-out infinite}
    @keyframes lvPulse{50%{transform:scale(1.18);box-shadow:0 0 0 3px rgba(var(--acc-rgb,45,226,255),.35),0 0 40px rgba(var(--acc-rgb,45,226,255),.9),0 0 110px rgba(var(--acc-rgb,45,226,255),.45)}}
    .lv-p{position:fixed;z-index:59;width:4px;height:4px;border-radius:50%;background:#bff8ff;box-shadow:0 0 8px var(--cyan,#2de2ff);pointer-events:none;transition:transform .8s cubic-bezier(.3,.6,.2,1),opacity .8s}
    .lv-head{position:fixed;left:0;right:0;top:38%;z-index:70;text-align:center;pointer-events:none;font:800 clamp(38px,7vw,104px) Rajdhani,sans-serif;letter-spacing:.02em;color:#fff;text-shadow:0 0 26px var(--cyan,#2de2ff),0 0 90px rgba(var(--acc-rgb,45,226,255),.55);animation:fsFlash 1.9s ease-out forwards}
    .lv-head.warn{text-shadow:0 0 26px #ffb02e,0 0 90px rgba(255,176,46,.5)}.lv-head.err{text-shadow:0 0 26px #ff5d6c,0 0 90px rgba(255,93,108,.5)}
    @keyframes fsFlash{0%{opacity:0;transform:scale(.7);filter:blur(8px)}20%{opacity:1;transform:scale(1);filter:none}70%{opacity:1}100%{opacity:0;transform:scale(1.15);filter:blur(4px)}}
    .lv-prog{position:fixed;left:0;right:0;bottom:0;z-index:58;height:3px;background:rgba(var(--acc-rgb,45,226,255),.12);opacity:0;transition:opacity .4s}.lv-prog.on{opacity:1}
    .lv-prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--cyan,#2de2ff),var(--cyan2,#7ff3ff));box-shadow:0 0 14px var(--cyan,#2de2ff);transition:width .5s}
    .lv-prog b{position:absolute;right:12px;bottom:6px;font:600 10px Orbitron;letter-spacing:.12em;color:var(--cyan2,#7ff3ff)}
  </style><div class="lv-orb"></div><div class="lv-prog"><i></i><b></b></div>`;
  document.body.append(eng);
  const orbEl = eng.querySelector('.lv-orb'), progEl = eng.querySelector('.lv-prog');
  let orbHome = null, orbTimer;
  function homePos() { const c = document.querySelector('#core')?.getBoundingClientRect(); return c ? { x: c.left + c.width / 2, y: c.top + c.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 }; }
  function orbTo(id, working = true) {
    if (!desk.matches) return;           // phones: the 3D core already is the orb
    const w = wins.get(id); const r = w?.el.getBoundingClientRect();
    const p = r ? { x: r.left + r.width - 34, y: r.top + 52 } : homePos();
    orbEl.classList.add('on'); orbEl.classList.toggle('work', working); orbEl.style.left = p.x + 'px'; orbEl.style.top = p.y + 'px';
    clearTimeout(orbTimer); orbTimer = setTimeout(() => orbIdle(), 6000);
  }
  function orbIdle() { const p = homePos(); orbEl.classList.remove('work'); orbEl.style.left = p.x + 'px'; orbEl.style.top = p.y + 'px'; setTimeout(() => orbEl.classList.remove('on'), 900); }
  function burst(toRect) {
    if (!desk.matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const o = orbEl.classList.contains('on') ? orbEl.getBoundingClientRect() : null; const from = o ? { x: o.left + 23, y: o.top + 23 } : homePos();
    for (let i = 0; i < 34; i++) { const d = document.createElement('i'); d.className = 'lv-p'; d.style.left = from.x + 'px'; d.style.top = from.y + 'px'; document.body.append(d);
      const tx = toRect.left + Math.random() * toRect.width - from.x, ty = toRect.top + Math.random() * toRect.height - from.y;
      requestAnimationFrame(() => { d.style.transitionDelay = (i * 8) + 'ms'; d.style.transform = `translate(${tx}px,${ty}px) scale(${0.5 + Math.random()})`; d.style.opacity = '0'; });
      setTimeout(() => d.remove(), 1200); }
  }
  function headline(text, kind = '') { const h = document.createElement('div'); h.className = 'lv-head ' + kind; h.textContent = text; document.body.append(h); setTimeout(() => h.remove(), 2000); }
  function globalProgress(pct, label) { if (pct == null) { progEl.classList.remove('on'); return; } progEl.classList.add('on'); progEl.querySelector('i').style.width = Math.max(0, Math.min(100, pct)) + '%'; progEl.querySelector('b').textContent = label || Math.round(pct) + ' %'; }

  let z = 20, focused = null, cascade = 0;

  const ICONS = {
    close: '<path d="M6 6l12 12M18 6 6 18"/>', max: '<rect x="5" y="5" width="14" height="14" rx="2"/>', min: '<path d="M6 12h12"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/>',
  };
  const btn = (k, t) => `<button data-b="${k}" title="${t}" aria-label="${t}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></button>`;

  // Desktop: chat docks left, windows tile the free area (manual drag/position overrides tiling)
  function area() {
    const app = document.querySelector('#app')?.getBoundingClientRect();
    const x = app ? Math.round(app.right + 14) : 16;
    return { x, y: 14, w: Math.max(320, innerWidth - x - 14), h: innerHeight - 28 };
  }
  function layoutDesktop() {
    if (!desk.matches) return;
    const A = area(), gap = 12;
    const auto = [...wins.values()].filter((w) => !w.manual && !w.el.classList.contains('max') && w.el.parentElement === layer);
    const n = auto.length; if (!n) return;
    let rects;
    if (n === 1) rects = [[0, 0, 1, 1]];
    else if (n === 2) rects = A.w > A.h * 1.1 ? [[0, 0, .5, 1], [.5, 0, .5, 1]] : [[0, 0, 1, .5], [0, .5, 1, .5]];
    else if (n === 3) rects = [[0, 0, .58, 1], [.58, 0, .42, .5], [.58, .5, .42, .5]];
    else { const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols); rects = auto.map((_, i) => [(i % cols) / cols, Math.floor(i / cols) / rows, 1 / cols, 1 / rows]); }
    // keep the focused window in the biggest slot
    auto.sort((a, b) => (b === focused) - (a === focused) || a.order - b.order);
    auto.forEach((w, i) => {
      const [rx, ry, rw, rh] = rects[i];
      Object.assign(w.el.style, { transition: w.placed ? 'left .55s cubic-bezier(.2,.9,.2,1),top .55s cubic-bezier(.2,.9,.2,1),width .55s cubic-bezier(.2,.9,.2,1),height .55s cubic-bezier(.2,.9,.2,1)' : '',
        left: A.x + rx * A.w + (rx ? gap / 2 : 0) + 'px', top: A.y + ry * A.h + (ry ? gap / 2 : 0) + 'px',
        width: rw * A.w - (rx || rw < 1 ? gap / 2 : 0) + 'px', height: rh * A.h - (ry || rh < 1 ? gap / 2 : 0) + 'px', resize: 'both' });
      w.placed = true;
    });
  }
  function placeDesktop(w, pos) {
    const A = area();
    if (!pos) { w.manual = false; return layoutDesktop(); }
    w.manual = true;
    const half = { links: [0, 0, .5, 1], rechts: [.5, 0, .5, 1], oben: [0, 0, 1, .5], unten: [0, .5, 1, .5], mitte: [.15, .15, .7, .7] }[pos];
    const [rx, ry, rw, rh] = half || [num(pos.x, 50) / 100 * .5, num(pos.y, 20) / 100 * .5, .5, .5];
    Object.assign(w.el.style, { left: A.x + rx * A.w + 'px', top: A.y + ry * A.h + 'px', width: rw * A.w - 6 + 'px', height: rh * A.h - 6 + 'px', resize: 'both' });
    layoutDesktop();
  }
  addEventListener('resize', () => layoutDesktop());
  document.querySelector('#app')?.addEventListener('transitionend', (e) => { if (e.target.id === 'app') layoutDesktop(); });
  function mount(w) {
    if (desk.matches) { if (w.el.parentElement !== layer) { layer.append(w.el); document.body.classList.add('desk-win'); placeDesktop(w, w.pos); } }
    else if (w.el.parentElement !== wrap) { wrap.append(w.el); }
    sync();
  }
  function sync() {
    const mobileWins = !desk.matches && wins.size > 0;
    stage.classList.toggle('on', mobileWins);
    document.body.classList.toggle('has-win', mobileWins);
    document.body.classList.toggle('desk-win', desk.matches && wins.size > 0);
    document.body.classList.toggle('immersive', !desk.matches && !!focused && IMMERSIVE.has(focused.type) && wins.size > 0);
    tabs.innerHTML = '';
    if (!desk.matches) for (const w of wins.values()) {
      const t = document.createElement('button'); t.className = 'hw-tab' + (w === focused ? ' on' : ''); t.textContent = w.title; t.onclick = () => focus(w.id); tabs.append(t);
      w.el.classList.toggle('hidden', w !== focused);
    }
    onChange?.([...wins.keys()]);
  }
  desk.addEventListener('change', () => { for (const w of wins.values()) mount(w); });

  function focus(id) {
    const w = wins.get(id); if (!w) return false;
    focused = w; wins.forEach((x) => x.el.classList.toggle('focus', x === w)); w.el.style.zIndex = ++z;
    w.el.classList.remove('flash'); void w.el.offsetWidth; w.el.classList.add('flash');
    sync(); return true;
  }
  function drag(w) {
    const h = w.el.querySelector('.hw-h');
    h.addEventListener('pointerdown', (e) => {
      if (!desk.matches || e.target.closest('button') || w.el.classList.contains('max')) return;
      focus(w.id); h.setPointerCapture(e.pointerId); w.manual = true; w.el.style.transition = '';
      const ox = e.clientX - w.el.offsetLeft, oy = e.clientY - w.el.offsetTop;
      const mv = (ev) => { w.el.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - ox)) + 'px'; w.el.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - oy)) + 'px'; };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
    });
  }
  async function popOut(w) {
    if (!('documentPictureInPicture' in window)) throw new Error('Eigenständige Fenster werden von diesem Browser nicht unterstützt (Chrome/Edge am PC nötig).');
    const pip = await documentPictureInPicture.requestWindow({ width: w.el.offsetWidth || 480, height: w.el.offsetHeight || 400 });
    [...document.styleSheets].forEach((s) => { try { const st = document.createElement('style'); st.textContent = [...s.cssRules].map((r) => r.cssText).join('\n'); pip.document.head.append(st); } catch { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = s.href; pip.document.head.append(l); } });
    pip.document.body.style.cssText = 'margin:0;background:#02060c;height:100vh;display:flex';
    const parent = w.el.parentElement; w.el.classList.add('max'); pip.document.body.append(w.el);
    pip.addEventListener('pagehide', () => { w.el.classList.remove('max'); parent.append(w.el); mount(w); });
  }
  function setStatus(w, d = {}) {
    const st = d.status ?? d.badge;
    if (st !== undefined) {
      const b = w.el.querySelector('.hw-badge'); b.textContent = st || '';
      b.className = 'hw-badge ' + (/(fehl|error|nicht)/i.test(st) ? (/nicht best|nicht geb|vorbereitet/i.test(st) ? 'warn' : 'err') : /(bestätigt|erledigt|fertig|ok|live)/i.test(st) ? 'ok' : /(läuft|arbeit|warte|lädt)/i.test(st) ? 'warn' : '');
    }
    const p = d.progress ?? d.fortschritt ?? w.widget?.progress?.();
    if (p != null) w.el.querySelector('.hw-prog').style.width = Math.max(0, Math.min(100, p)) + '%';
  }

  async function open(spec) {
    const type = spec.type || spec.typ;
    if (!W[type]) throw new Error(`Unbekannter Fenstertyp "${type}". Verfügbar: ${Object.keys(W).join(', ')}`);
    const id = String(spec.id || type + '-' + Math.random().toString(36).slice(2, 6));
    if (wins.has(id)) { await wins.get(id).ready; const r = await update(id, spec.data || spec.daten || {}); if (spec.title || spec.titel) wins.get(id).el.querySelector('.hw-h b').textContent = spec.title || spec.titel; focus(id); return { id, aktualisiert: true, ergebnis: r }; }
    const el = document.createElement('section'); el.className = 'hw'; el.dataset.id = id;
    const title = spec.title || spec.titel || type.toUpperCase();
    el.innerHTML = `<div class="hw-h"><i class="hw-dot"></i><b>${esc(title)}</b><span class="hw-badge"></span><div class="hw-btns">${desk.matches && 'documentPictureInPicture' in window ? btn('pip', 'Als eigenes Fenster') : ''}${btn('max', 'Vollbild')}${btn('close', 'Schliessen')}</div><i class="hw-prog"></i></div><div class="hw-body"></div><div class="hw-scan"></div>`;
    let markReady; const ready = new Promise((r) => (markReady = r));
    const w = { ready, order: ++z, id, type, title, el, size: spec.size || spec.groesse || (type === 'scene' || type === 'globe' || type === 'model3d' || type === 'map' || type === 'custom' ? 'l' : 'm'), pos: spec.position };
    wins.set(id, w); mount(w); focus(id); drag(w);
    if (spec.maximiert && desk.matches) el.classList.add('max');
    requestAnimationFrame(() => { burst(el.getBoundingClientRect()); orbTo(id); });
    el.querySelector('.hw-btns').addEventListener('click', (e) => {
      const b = e.target.closest('button')?.dataset.b;
      if (b === 'close') close(id, true);
      if (b === 'max') el.classList.toggle('max');
      if (b === 'pip') popOut(w).catch((err) => alert(err.message));
    });
    el.addEventListener('pointerdown', () => focused !== w && focus(id));
    const body = el.querySelector('.hw-body');
    const ctx = { md, geocode, asset, abs, emit: (evt) => onEvent?.({ fenster: id, titel: title, ...evt }) };
    try {
      w.widget = await W[type](body, spec.data || spec.daten || {}, ctx);
      w.widget.init?.(ctx);
      if (w.widget.tick) { const loop = () => { if (!wins.has(id)) return; if (el.isConnected && body.offsetParent) w.widget.tick(); requestAnimationFrame(loop); }; loop(); }
    } catch (e) {
      body.innerHTML = `<div class="w-pad" style="color:#ff9aa4">⚠ ${esc(e.message)}</div>`;
      setStatus(w, { status: 'FEHLER' });
      markReady(); throw Object.assign(e, { windowId: id });
    }
    markReady();
    setStatus(w, spec.data || spec.daten || {});
    return { id, typ: type, ergebnis: w.widget.info };
  }
  async function update(id, data = {}) {
    const w = wins.get(id); if (!w) throw new Error('Fenster nicht gefunden: ' + id);
    await w.ready; if (!w.widget) throw new Error('Fenster konnte nicht aufgebaut werden: ' + id);
    const r = await w.widget.update(data); setStatus(w, data);
    if (data.title || data.titel) w.el.querySelector('.hw-h b').textContent = data.title || data.titel;
    return r;
  }
  async function act(id, action, args = {}) {
    const w = wins.get(id); if (!w) throw new Error('Fenster nicht gefunden: ' + id);
    await w.ready; if (!w.widget) throw new Error('Fenster konnte nicht aufgebaut werden: ' + id);
    if (action === 'fokus' && !args.ziel) { focus(id); return 'fokussiert'; }
    if (action !== 'highlight' || !desk.matches) focus(id);
    return await w.widget.act(action, args);
  }
  function close(id, byUser) {
    const w = wins.get(id); if (!w) return false;
    w.el.classList.add('closing'); wins.delete(id);
    if (focused === w) focused = [...wins.values()].pop() || null;
    setTimeout(() => { try { w.widget?.destroy(); } catch {} w.el.remove(); sync(); layoutDesktop(); if (focused) focus(focused.id); }, 340);
    if (byUser) onEvent?.({ fenster: id, titel: w.title, typ: 'geschlossen_vom_nutzer', still: true });
    sync(); return true;
  }
  function move(id, pos) {
    const w = wins.get(id); if (!w) throw new Error('Fenster nicht gefunden: ' + id);
    w.pos = pos; if (desk.matches) { w.el.style.transition = 'left .5s cubic-bezier(.2,.9,.2,1), top .5s cubic-bezier(.2,.9,.2,1), width .5s, height .5s'; placeDesktop(w, pos); }
    focus(id); return desk.matches ? 'verschoben' : 'auf dem Handy werden Fenster als Tabs gestapelt; Fenster fokussiert';
  }
  return {
    open, update, act, close, move, focus: (id) => focus(id) || (() => { throw new Error('Fenster nicht gefunden'); })(),
    list: () => [...wins.values()].map((w) => ({ id: w.id, typ: w.type, titel: w.title, fokus: w === focused, meta: w.widget?.meta?.() || undefined })),
    has: (id) => wins.has(id), report: (id) => wins.get(id)?.widget?.info, setStatus: (id, d) => wins.has(id) && setStatus(wins.get(id), d),
    get isDesktop() { return desk.matches; },
    closeAll() { [...wins.keys()].forEach((id) => close(id)); },
    orbTo, orbIdle, headline, globalProgress,
  };
}
