

const playBtn = document.getElementById("playBtn");
const block3 = document.getElementById("block3");
const block3Default = document.getElementById("block3Default");
const resultArea = document.getElementById("resultArea");
const logTableBody = document.getElementById("logTableBody");
const diffInfo = document.getElementById("diffInfo");

const LS_KEY = "cp7_var15_events";


const RADIUS = 10;
const DIAM = RADIUS * 2;
const TICK_MS = 25;


let workEl = null;
let animEl = null;
let msgEl = null;
let startBtn = null;
let reloadBtn = null;
let closeBtn = null;


let ballY = null;
let ballR = null;


let timer = null;
let running = false;
let step = 1;
let dirIndex = 0;
let evNo = 0;


function nowISO() {
  return new Date().toISOString();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}


function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function lsSet(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}


function sendImmediateToServer(message) {
  const payload = new URLSearchParams();
  payload.set("no", String(evNo));
  payload.set("msg", message);

  
  if (navigator.sendBeacon) {
    const blob = new Blob([payload.toString()], { type: "application/x-www-form-urlencoded" });
    navigator.sendBeacon("api/log_immediate.php", blob);
    return;
  }

  fetch("api/log_immediate.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
    keepalive: true
  }).catch(() => {});
}


function logEvent(message) {
  evNo += 1;

  if (msgEl) msgEl.textContent = `#${evNo} ${message}`;

  
  const arr = lsGet();
  arr.push({ no: evNo, time_local: nowISO(), msg: message });
  lsSet(arr);

  
  sendImmediateToServer(message);
}


function clearTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function setReadyUI() {
  running = false;
  clearTimer();
  step = 1;
  dirIndex = 0;

  startBtn.disabled = false;
  startBtn.style.display = "";
  reloadBtn.style.display = "none";
  if (msgEl) msgEl.textContent = "Ready";
}

function setRunningUI() {
  running = true;
  startBtn.disabled = true;
  startBtn.style.display = "";
  reloadBtn.style.display = "none";
}

function setStoppedUI() {
  running = false;
  clearTimer();

  
  startBtn.style.display = "none";
  reloadBtn.style.display = "";
}


function showWork() {
  
  block3Default.style.display = "none";

  
  resultArea.classList.add("hidden");
  logTableBody.innerHTML = "";
  diffInfo.textContent = "";

  workEl = document.createElement("div");
  workEl.className = "work";
  workEl.innerHTML = `
    <div class="controls">
      <div>
        <button class="btn sm" id="closeBtn">✖ close</button>
      </div>
      <div>
        <button class="btn sm primary" id="startBtn">start</button>
        <button class="btn sm" id="reloadBtn" style="display:none;">reload</button>
      </div>
      <div class="msg" id="msg">Ready</div>
    </div>
    <div class="anim" id="anim"></div>
  `;

  block3.appendChild(workEl);

  animEl = workEl.querySelector("#anim");
  msgEl = workEl.querySelector("#msg");
  startBtn = workEl.querySelector("#startBtn");
  reloadBtn = workEl.querySelector("#reloadBtn");
  closeBtn = workEl.querySelector("#closeBtn");

  startBtn.addEventListener("click", onStart);
  reloadBtn.addEventListener("click", onReload);
  closeBtn.addEventListener("click", onClose);

  
  createBallsRandom();
  setReadyUI();

  logEvent("play clicked → work shown");
}

function hideWorkAndShowResults() {
  clearTimer();
  running = false;

  if (workEl) workEl.remove();
  workEl = null;

  
  block3Default.style.display = "";
  resultArea.classList.remove("hidden");
}


function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createBallsRandom() {
  animEl.innerHTML = "";

  ballY = document.createElement("div");
  ballR = document.createElement("div");

  ballY.className = "ball yellow";
  ballR.className = "ball red";

  animEl.appendChild(ballY);
  animEl.appendChild(ballR);

  placeRandom(ballY);
  placeRandom(ballR);

  
  let tries = 0;
  while (ballsCollide() && tries < 40) {
    placeRandom(ballR);
    tries++;
  }

  logEvent("circles placed at random positions");
}

function placeRandom(ball) {
  const rect = animEl.getBoundingClientRect();
  const maxX = Math.max(0, Math.floor(rect.width - DIAM));
  const maxY = Math.max(0, Math.floor(rect.height - DIAM));

  ball.style.left = `${randInt(0, maxX)}px`;
  ball.style.top = `${randInt(0, maxY)}px`;
}

function getCenter(ball) {
  const x = parseFloat(ball.style.left || "0") + RADIUS;
  const y = parseFloat(ball.style.top || "0") + RADIUS;
  return { x, y };
}

function ballsCollide() {
  const a = getCenter(ballY);
  const b = getCenter(ballR);
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return (dx * dx + dy * dy) <= (DIAM * DIAM);
}


function dirVector(d) {
  switch (d) {
    case 0: return { dx: 1, dy: 0 };  // R
    case 1: return { dx: 0, dy: 1 };  // D
    case 2: return { dx: -1, dy: 0 }; // L
    default:return { dx: 0, dy: -1 }; // U
  }
}

function oppositeDir(d) {
  return (d + 2) % 4;
}

function moveBall(ball) {
  const rect = animEl.getBoundingClientRect();
  const maxX = Math.max(0, rect.width - DIAM);
  const maxY = Math.max(0, rect.height - DIAM);

  let x = parseFloat(ball.style.left || "0");
  let y = parseFloat(ball.style.top || "0");

  
  const v = dirVector(dirIndex);
  let nx = x + v.dx * step;
  let ny = y + v.dy * step;

  let hitWall = false;

  
  if (nx < 0 || nx > maxX) {
    nx = Math.max(0, Math.min(nx, maxX));
    hitWall = true;
  }
  if (ny < 0 || ny > maxY) {
    ny = Math.max(0, Math.min(ny, maxY));
    hitWall = true;
  }

  if (hitWall) {
    dirIndex = oppositeDir(dirIndex);
    logEvent(`wall touched → direction reversed to ${["R","D","L","U"][dirIndex]}`);

    
    const v2 = dirVector(dirIndex);
    nx = x + v2.dx * step;
    ny = y + v2.dy * step;

    
    nx = Math.max(0, Math.min(nx, maxX));
    ny = Math.max(0, Math.min(ny, maxY));
  }

  ball.style.left = `${nx}px`;
  ball.style.top = `${ny}px`;
}


function tick() {
  if (!running) return;

  
  moveBall(ballY);
  moveBall(ballR);

  logEvent(`move: step=${step}, dir=${["R","D","L","U"][dirIndex]}`);

  if (ballsCollide()) {
    logEvent("collision → animation stopped");
    setStoppedUI();
    return;
  }

  
  step += 1;

  
  dirIndex = (dirIndex + 1) % 4;
}


function onStart() {
  if (running) return;
  setRunningUI();
  logEvent("start clicked → animation started");
  timer = setInterval(tick, TICK_MS);
}

function onReload() {
  createBallsRandom();
  setReadyUI(); 
  logEvent("reload clicked → new random positions");
}

async function onClose() {
  clearTimer();
  running = false;

  logEvent("close clicked → render logs table");

  try {
    const [serverLog, localLog] = await Promise.all([
      readServerLog(),
      Promise.resolve(lsGet())
    ]);
    renderLogs(localLog, serverLog);
    showTimeDiffInfo(localLog, serverLog);
  } catch (e) {
    console.error(e);
  } finally {
    hideWorkAndShowResults();
  }
}


async function readServerLog() {
  const res = await fetch("api/read_server_log.php", { cache: "no-store" });
  if (!res.ok) throw new Error("read_server_log failed");
  return await res.json(); 
}


function renderLogs(localLog, serverLog) {
  logTableBody.innerHTML = "";

  const n = Math.max(localLog.length, serverLog.length);
  for (let i = 0; i < n; i++) {
    const l = localLog[i];
    const s = serverLog[i];

    const left = l ? `#${l.no}<br><b>${l.time_local}</b><br>${escapeHtml(l.msg)}` : "";
    const right = s ? `#${s.no}<br><b>${s.time_server}</b><br>${escapeHtml(s.msg)}` : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${left}</td><td>${right}</td>`;
    logTableBody.appendChild(tr);
  }
}

function showTimeDiffInfo(localLog, serverLog) {
  const parse = (t) => {
    const d = new Date(t);
    return isNaN(d) ? null : d.getTime();
  };

  const l0 = localLog[0]?.time_local ? parse(localLog[0].time_local) : null;
  const l1 = localLog.at(-1)?.time_local ? parse(localLog.at(-1).time_local) : null;

  const s0 = serverLog[0]?.time_server ? parse(serverLog[0].time_server) : null;
  const s1 = serverLog.at(-1)?.time_server ? parse(serverLog.at(-1).time_server) : null;

  if (l0 && l1 && s0 && s1) {
    diffInfo.textContent =
      `Local span: ${((l1 - l0)/1000).toFixed(3)}s, Server span: ${((s1 - s0)/1000).toFixed(3)}s`;
  } else {
    diffInfo.textContent = "";
  }
}


playBtn.addEventListener("click", async () => {
  
  localStorage.removeItem(LS_KEY);
  evNo = 0;

  try { await fetch("api/clear_server_log.php", { cache: "no-store" }); } catch {}

  showWork();
});
