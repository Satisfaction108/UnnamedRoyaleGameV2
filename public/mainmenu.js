const $ = id => document.getElementById(id)

const state = {
  user: null,
  premium: 'none',
  tankIndex: 0,
  ws: null,
  wsBuffer: [],
  inQueue: false,
  inGame: false,
  myId: null,
  players: [],
  canvas: null,
  ctx: null,
  keys: { w:false, a:false, s:false, d:false },
  anim: null
}

const K = { remember:'rememberMe', user:'rememberUser', pass:'rememberPass' }

function notify(msg){
  let stack = $('notifyStack')
  if(!stack){
    stack = document.createElement('div')
    stack.id = 'notifyStack'
    document.body.appendChild(stack)
  }
  const el = document.createElement('div')
  el.className = 'notify'
  el.textContent = msg
  stack.appendChild(el)
  setTimeout(()=>{ el.classList.add('leaving'); setTimeout(()=>el.remove(),180) }, 2200)
}

function showLanding(){
  $('landing').style.display = 'grid'
  $('landing').style.opacity = '1'
  $('mainMenu').removeAttribute('data-show')
  $('userBadge').textContent = ''
}
function showMainMenu(){
  hideQueue()
  hideGame()
  $('landing').style.display = 'none'
  $('mainMenu').setAttribute('data-show','true')
  $('accountName').textContent = state.user?.username || ''
  $('userBadge').textContent = state.user?.username ? `@${state.user.username}` : ''
}

function openModal(id){ $('overlay').setAttribute('data-open','true'); const d=$(id); if(!d.open) d.showModal() }
function closeModal(id){ $('overlay').removeAttribute('data-open'); const d=$(id); if(d.open) d.close() }

function validateUsername(u){ return /^[a-zA-Z0-9_]{3,20}$/.test(u) }
function validatePassword(p){ return p.length>=6 && /\d/.test(p) && /[!@#$%^&*(),.?":{}|<>]/.test(p) && /[A-Z]/.test(p) }

async function postJSON(path, body){
  const res = await fetch(path,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
  const type = res.headers.get('content-type') || ''
  if(!type.includes('application/json')) throw new Error('Invalid response')
  const data = await res.json()
  if(!res.ok || data.ok===false) throw new Error(data?.error || 'Request failed')
  return data
}

function rememberChecked(){ return localStorage.getItem(K.remember)==='1' }
function loadRememberUI(){
  const chk = $('loginRemember')
  const name = $('loginUsername')
  if (!chk || !name) return
  chk.checked = rememberChecked()
  const u = localStorage.getItem(K.user) || ''
  if(u) name.value = u
}
function setRememberFlag(on){
  if(on){ localStorage.setItem(K.remember,'1') } else {
    localStorage.removeItem(K.remember); localStorage.removeItem(K.user); localStorage.removeItem(K.pass)
  }
}
function saveRememberUser(u){ if(rememberChecked()) localStorage.setItem(K.user, u || '') }
function saveRememberCreds(u,p){
  if(rememberChecked()){
    localStorage.setItem(K.user, u || '')
    localStorage.setItem(K.pass, btoa(p || ''))
  }else{
    localStorage.removeItem(K.user); localStorage.removeItem(K.pass)
  }
}
function getRememberCreds(){
  const on = rememberChecked()
  const u = localStorage.getItem(K.user) || ''
  const pB64 = localStorage.getItem(K.pass)
  const p = pB64 ? atob(pB64) : ''
  return { on, u, p }
}

function bindLanding(){
  $('btnSignup').addEventListener('click',()=>{
    $('signupError').textContent=''; $('signupForm').reset()
    openModal('modalSignup'); $('signupUsername').focus()
  })
  $('btnLogin').addEventListener('click',()=>{
    $('loginError').textContent=''; $('loginForm').reset()
    openModal('modalLogin'); setTimeout(loadRememberUI,0); $('loginUsername').focus()
  })
}
function bindModals(){
  $('loginCancel').addEventListener('click',()=>closeModal('modalLogin'))
  $('signupCancel').addEventListener('click',()=>closeModal('modalSignup'))

  $('loginRemember')?.addEventListener('change',e=>{ setRememberFlag(e.target.checked); if(!e.target.checked){ $('loginUsername').value='' } })
  $('loginUsername')?.addEventListener('input',e=>{ if(rememberChecked()) saveRememberUser(e.target.value.trim()) })

  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault()
    $('loginError').textContent=''
    const username = $('loginUsername').value.trim()
    const password = $('loginPassword').value
    if(!validateUsername(username)){ $('loginError').textContent='Invalid username'; return }
    if(password.length<6){ $('loginError').textContent='Invalid password'; return }
    try{
      const data = await postJSON('/api/login',{ username, password })
      state.user = { username:data.username, premium:data.premium||'none' }
      state.premium = state.user.premium
      if($('loginRemember')?.checked) saveRememberCreds(username,password)
      closeModal('modalLogin')
      showMainMenu()
      notify('Logged In!')
    }catch(err){
      $('loginError').textContent = String(err.message||err)
    }
  })

  $('signupForm').addEventListener('submit',async e=>{
    e.preventDefault()
    $('signupError').textContent=''
    const username = $('signupUsername').value.trim()
    const password = $('signupPassword').value
    const confirm = $('signupConfirm').value
    if(!validateUsername(username)){ $('signupError').textContent='3–20 letters, numbers, underscores'; return }
    if(!validatePassword(password)){ $('signupError').textContent='Needs 6+ chars, number, special, uppercase'; return }
    if(password!==confirm){ $('signupError').textContent='Passwords do not match'; return }
    try{
      const data = await postJSON('/api/signup',{ username, password })
      state.user = { username:data.username, premium:'none' }
      state.premium = 'none'
      closeModal('modalSignup')
      showMainMenu()
      notify('Logged In!')
    }catch(err){
      $('signupError').textContent = String(err.message||err)
    }
  })
}
function bindMainMenu(){
  $('btnRefresh').addEventListener('click',async()=>{
    try{
      const res = await fetch('/api/me')
      if(!res.ok) throw new Error('Failed to refresh')
      const data = await res.json()
      state.user = { username:data.username, premium:data.premium||'none' }
      $('accountName').textContent = state.user.username
      $('userBadge').textContent = `@${state.user.username}`
      $('statVal1').textContent = data.wins ?? 0
      $('statVal2').textContent = data.losses ?? 0
      $('statVal3').textContent = data.prisms ?? 0
      notify('Successfully Refreshed Stats!')
    }catch(e){}
  })

  $('btnLogout').addEventListener('click',async()=>{
    try{ await fetch('/api/logout',{ method:'POST' }) }catch(e){}
    state.user = null
    showLanding()
  })

  const stall = btn => { btn.setAttribute('disabled','true'); setTimeout(()=>btn.removeAttribute('disabled'),180) }
  $('prevTank').addEventListener('click',()=>{ nudgeTank(-1); stall($('prevTank')) })
  $('nextTank').addEventListener('click',()=>{ nudgeTank(1); stall($('nextTank')) })

  $('btnBattle').addEventListener('click',()=>{
    if(!state.user){ notify('Log in first'); return }
    ensureSocket()
    showQueue()
    state.inQueue = true
    sendWS({ type:'joinQueue' })
    $('btnBattle').disabled = true
    setTimeout(()=>{ $('btnBattle').disabled=false },600)
  })

  $('btnQueueCancel').addEventListener('click',()=>{
    sendWS({ type:'leaveQueue' })
    state.inQueue = false
    hideQueue()
  })

  $('btnExitGame').addEventListener('click',()=>{
    sendWS({ type:'leaveGame' })
    stopGame()
    showMainMenu()
  })
}

function nudgeTank(dir){
  const card = $('tankCard')
  card.animate([{transform:'scale(1)'},{transform:'scale(.985)'},{transform:'scale(1)'}],{ duration:180, easing:'ease-out' })
  state.tankIndex = (state.tankIndex + dir + 10) % 10
}

function showQueue(){
  $('queueScreen').hidden = false
  $('queueCountNum').textContent = '1'
}
function hideQueue(){ $('queueScreen').hidden = true }

function showGame(){
  $('gameView').hidden = false
  $('mainMenu').removeAttribute('data-show')
}
function hideGame(){ $('gameView').hidden = true }

function ensureSocket(){
  if (state.ws && (state.ws.readyState === 0 || state.ws.readyState === 1)) return
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${location.host}/ws`
  const ws = new WebSocket(url)
  state.ws = ws
ws.onopen = () => {
  const buf = state.wsBuffer.splice(0)
  for (const m of buf) try { ws.send(JSON.stringify(m)) } catch {}
}

ws.onerror = () => {
  notify('Can’t connect to server. Is it running?')
}

ws.onclose = () => {}

ws.onmessage = ev => {
    let m = null
    try { m = JSON.parse(ev.data) } catch { return }
    if (!m) return
    if (m.type === 'hello') {}
    if (m.type === 'queueCount') $('queueCountNum').textContent = String(m.n)
    if (m.type === 'queued') {}
    if (m.type === 'matchStart') {
      state.inQueue = false
      state.inGame = true
      state.myId = m.you
      startGame(m.w, m.h)
    }
    if (m.type === 'state') {
      state.players = m.players || []
    }
    if (m.type === 'matchEnd') {
      stopGame()
      hideGame()
      showMainMenu()
      notify('Match ended')
    }
  }
}
function sendWS(obj){
  const ws = state.ws
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj))
  else state.wsBuffer.push(obj)
}

function startGame(w, h){
  hideQueue()
  showGame()
  state.canvas = $('gameCanvas')
  state.ctx = state.canvas.getContext('2d')
  state.canvas.width = w
  state.canvas.height = h
  window.addEventListener('keydown', onKey, { passive:false })
  window.addEventListener('keyup', onKey, { passive:false })
  loop()
}
function stopGame(){
  state.inGame = false
  try { cancelAnimationFrame(state.anim) } catch {}
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
  state.players = []
}
function onKey(e){
  const k = e.key.toLowerCase()
  if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k)) e.preventDefault()
  let changed = false
  if (e.type === 'keydown') {
    if (k==='w'||k==='arrowup') { if(!state.keys.w){ state.keys.w=true; changed=true } }
    if (k==='a'||k==='arrowleft') { if(!state.keys.a){ state.keys.a=true; changed=true } }
    if (k==='s'||k==='arrowdown') { if(!state.keys.s){ state.keys.s=true; changed=true } }
    if (k==='d'||k==='arrowright') { if(!state.keys.d){ state.keys.d=true; changed=true } }
  } else {
    if (k==='w'||k==='arrowup') { if(state.keys.w){ state.keys.w=false; changed=true } }
    if (k==='a'||k==='arrowleft') { if(state.keys.a){ state.keys.a=false; changed=true } }
    if (k==='s'||k==='arrowdown') { if(state.keys.s){ state.keys.s=false; changed=true } }
    if (k==='d'||k==='arrowright') { if(state.keys.d){ state.keys.d=false; changed=true } }
  }
  if (changed) sendWS({ type:'input', ...state.keys })
}
function loop(){
  if (!state.inGame) return
  const ctx = state.ctx, c = state.canvas
  ctx.clearRect(0,0,c.width,c.height)
  ctx.fillStyle = '#0ea5e9'
  state.players.forEach(p=>{
    const r = 14
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI*2)
    ctx.fill()
  })
  state.anim = requestAnimationFrame(loop)
}

async function boot(){
  bindLanding(); bindModals(); bindMainMenu()
  try{
    const res = await fetch('/api/me')
    if(res.ok){
      const data = await res.json()
      if(data && data.username){
        state.user = { username:data.username, premium:data.premium||'none' }
        showMainMenu()
        return
      }
    }
  }catch(e){}
  const { on, u, p } = getRememberCreds()
  if(on && u && p){
    try{
      const data = await postJSON('/api/login',{ username:u, password:p })
      state.user = { username:data.username, premium:data.premium||'none' }
      state.premium = state.user.premium
      showMainMenu()
      notify('Automatically Logged In!')
      return
    }catch(e){}
  }
  showLanding()
}
document.addEventListener('DOMContentLoaded', boot)
