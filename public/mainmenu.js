const $ = id => document.getElementById(id)

const state = {
  user: null,
  premium: 'none',
  tankIndex: 0,
  ws: null,
  wsBuffer: [],
  inQueue: false
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
  $('queueScreen').hidden = true
  $('gameView').hidden = true
  const tla = $('topLeftActions'); if (tla) tla.style.display = 'none'
}
function showMainMenu(){
  $('landing').style.display = 'none'
  $('mainMenu').setAttribute('data-show','true')
  $('accountName').textContent = state.user?.username || ''
  $('userBadge').textContent = state.user?.username ? state.user.username : ''
  const brand = $('brandMini'); if (brand) brand.textContent = ''
  $('queueScreen').hidden = true
  $('gameView').hidden = true
  const tla = $('topLeftActions'); if (tla) tla.style.display = 'inline-flex'
  updatePassToggle()
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
  if(!res.ok || data.ok===false) {
    const code = data?.error || 'request_failed'
    const err = new Error(toFriendlyError(code))
    err.code = code
    throw err
  }
  return data
}

function toFriendlyError(input){
  const s = String(input||'').toLowerCase()
  const map = {
    username_taken: 'The username is taken!',
    invalid_username: 'Invalid username. Use 3–20 letters, numbers, or underscores.',
    invalid_password: 'Invalid password. Needs 6+ chars, number, special, uppercase.',
    bad_credentials: 'Incorrect username or password.',
    signup_failed: 'Could not sign up. Please try again.',
    login_failed: 'Could not log in. Please try again.',
    not_logged_in: 'You are not logged in.',
    password_change_failed: 'Could not update your password.',
    invalid_input: 'Invalid input.'
  }
  return map[s] || input
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

function updatePassToggle(){
  const t = $('accountPassToggle')
  if (!t) return
  const { on, p } = getRememberCreds()
  t.disabled = !(on && p)
  if (t.disabled){
    const span = $('accountPasswordValue')
    if (span) span.textContent = '••••••••'
    t.textContent = 'Show'
  }
}

// ----- Settings UI & Modals (injected at runtime) -----
function openSuccessModal(message){
  if (!$('modalSuccess')) return
  $('successMessage').textContent = message || 'Success'
  openModal('modalSuccess')
}
function openErrorModal(message){
  if (!$('modalError')) return
  const msg = toFriendlyError(message || 'An error occurred')
  const t = $('errorTitle'); if (t) t.textContent = 'Something went wrong'
  $('errorMessage').textContent = msg
  openModal('modalError')
}
function openDrawer(open){
  const d = $('settingsDrawer'); if(!d) return
  if (open) d.setAttribute('data-open','true'); else d.removeAttribute('data-open')
}
function switchDrawerTab(which){
  const a = $('tabAccount'), b = $('tabLogout')
  const pa = $('panelAccount'), pb = $('panelLogout')
  if(!a||!b||!pa||!pb) return
  if (which==='logout'){
    a.classList.remove('active'); a.setAttribute('aria-selected','false')
    b.classList.add('active'); b.setAttribute('aria-selected','true')
    pa.hidden = true; pb.hidden = false
  } else {
    b.classList.remove('active'); b.setAttribute('aria-selected','false')
    a.classList.add('active'); a.setAttribute('aria-selected','true')
    pb.hidden = true; pa.hidden = false
  }
}
async function refreshDrawerData(){
  try{
    const res = await fetch('/api/me')
    if(!res.ok) throw new Error('Failed to load account')
    const data = await res.json()
    $('drawerUsername') && ($('drawerUsername').textContent = data.username || '-')
    $('drawerWins') && ($('drawerWins').textContent = data.wins ?? 0)
    $('drawerLosses') && ($('drawerLosses').textContent = data.losses ?? 0)
    $('drawerPrisms') && ($('drawerPrisms').textContent = data.prisms ?? 0)
    // also mirror into main card if present
    $('statVal1') && ($('statVal1').textContent = data.wins ?? 0)
    $('statVal2') && ($('statVal2').textContent = data.losses ?? 0)
    $('statVal3') && ($('statVal3').textContent = data.prisms ?? 0)
  }catch(e){ /* ignore */ }
}
async function doLogout(){
  try{ await fetch('/api/logout',{ method:'POST' }) }catch(e){}
  state.user = null
  openDrawer(false)
  showLanding()
}
async function handleResetSubmit(e){
  e.preventDefault()
  const current = $('resetCurrent').value
  const next = $('resetNew').value
  if(!validatePassword(next)) { openErrorModal('Needs 6+ chars, number, special, uppercase'); return }
  try{
    await postJSON('/api/password',{ currentPassword: current, newPassword: next })
    closeModal('modalResetPassword')
    openSuccessModal('Password updated successfully')
    if (rememberChecked() && state.user?.username) saveRememberCreds(state.user.username, next)
  }catch(err){
    openErrorModal(String(err.message||err))
  }
}
function createSettingsUI(){
  // Top-left action icons
  const topBar = $('topBar'), brand = $('brandMini')
  if (topBar && brand && !$('topLeftActions')){
    const c = document.createElement('div')
    c.id = 'topLeftActions'
    c.innerHTML = `
      <button id="btnSettings" class="iconBtn" title="Settings" aria-label="Settings">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="currentColor"></path>
          <path d="M19.4 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.06 7.06 0 0 0-1.63-.94l-.38-2.65A.5.5 0 0 0 13 2h-4a.5.5 0 0 0-.49.41l-.38 2.65c-.58.23-1.12.54-1.63.94l-2.5-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64L3.1 11.06c-.04.31-.06.63-.06.94s.02.63.06.94l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.69.24l2.49-1c.5.4 1.05.72 1.63.95l.38 2.64c.05.25.26.43.49.43h4c.24 0 .45-.18.49-.42l.38-2.65c.58-.23 1.12-.54 1.63-.94l2.49 1c.26.1.55 0 .69-.24l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.66Z" fill="currentColor"></path>
        </svg>
      </button>
      <a id="btnDiscord" class="iconBtn" href="https://discord.gg/jpFWEPUZ" target="_blank" rel="noopener noreferrer" title="Discord" aria-label="Discord">
        <svg viewBox="0 0 245 240" width="24" height="24" aria-hidden="true">
          <path fill="currentColor" d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zm36.2 0c-5.7 0-10.2 5-10.2 11.1s4.6 11.1 10.2 11.1c5.7 0 10.2-5 10.2-11.1s-4.5-11.1-10.2-11.1z"></path>
          <path fill="currentColor" d="M189.5 20h-134C24.1 20 0 44.1 0 73.6v92.8C0 196.9 24.1 221 53.6 221h113.2l-5.3-18.6 12.8 11.9 12.1 11.2 21.6 19V73.6C208 44.1 183.9 20 154.4 20h35.1zM163 156s-4.2-5-7.7-9.4c15.3-4.3 21.2-13.9 21.2-13.9-4.8 3.1-9.4 5.2-13.5 6.7-5.9 2.5-11.5 4.1-17 5-11.2 2.1-21.5 1.5-30.3-.1-6.7-1.3-12.5-3.1-17.3-5-2.7-1.1-5.6-2.4-8.5-4.1-.4-.2-.8-.3-1.2-.5-.3-.2-.5-.3-.8-.5-.4-.2-.7-.4-1-.6-.2-.1-.3-.2-.5-.3-2.2-1.4-3.4-2.3-3.4-2.3s5.6 9.4 20.5 13.8c-3.4 4.4-7.8 9.7-7.8 9.7-25.8-.8-35.6-17.7-35.6-17.7 0-37.5 16.8-67.9 16.8-67.9 16.8-12.6 32.8-12.2 32.8-12.2l1.2 1.4c-21 6-30.7 15.3-30.7 15.3s2.6-1.4 7-3.4c12.7-5.5 22.8-7 27-7.4.7-.1 1.3-.2 2-.2 7.2-.9 15.2-1.1 23.3-.2 10.9 1.3 22.6 4.7 34.5 11.6 0 0-9.2-8.7-29.1-14.7l1.7-1.9s16-.4 32.8 12.2c0 0 16.8 30.4 16.8 67.9 0 .1-9.9 16.9-35.7 17.7z"></path>
        </svg>
      </a>
      <button id="btnChangelog" class="iconBtn" title="Changelog" aria-label="Changelog">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path fill="currentColor" d="M5 3h11a3 3 0 0 1 3 3v13.5a.5.5 0 0 1-.8.4L15 18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2a0 0 0 0 0 0 0v11a0 0 0 0 0 0 0h9.5l2.5 1.9V6a1 1 0 0 0-1-1H5zm2 3h8v1H7V8zm0 3h8v1H7v-1zm0 3h5v1H7v-1z"></path>
        </svg>
      </button>
    `
    topBar.insertBefore(c, brand)
    // hidden until login
    c.style.display = 'none'
  }
  // Settings drawer
  if (!$('settingsDrawer')){
    const wrap = document.createElement('aside')
    wrap.id = 'settingsDrawer'
    wrap.innerHTML = `
      <div id="drawerBackdrop"></div>
      <div id="drawerPanel">
        <div id="drawerHeader">
          <div id="drawerTitle">Settings</div>
          <button id="drawerClose" class="iconBtn" aria-label="Close Settings">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M6.4 5l12.2 12.2-1.4 1.4L5 6.4 6.4 5Zm12.2 1.4L6.4 18.6 5 17.2 17.2 5l1.4 1.4Z"/></svg>
          </button>
        </div>
        <div id="drawerTabs" role="tablist">
          <button id="tabAccount" role="tab" aria-selected="true" class="tab active">Account</button>
          <button id="tabLogout" role="tab" aria-selected="false" class="tab">Logout</button>
        </div>
        <div id="drawerPanels">
          <section id="panelAccount" role="tabpanel">
            <div class="kv"><span class="k">Username</span><span class="v" id="drawerUsername">-</span></div>
            <div class="kv passwordRow">
              <span class="k">Password</span>
              <span class="v"><span id="accountPasswordValue">••••••••</span> <button id="accountPassToggle" class="btnGhost small" type="button">Show</button></span>
            </div>
            <div class="actionsRow">
              <button id="btnOpenReset" class="btnPrimary small" type="button">Reset Password</button>
            </div>
            <div class="statsBlock">
              <div class="stat"><span>Wins</span><span id="drawerWins">0</span></div>
              <div class="stat"><span>Losses</span><span id="drawerLosses">0</span></div>
              <div class="stat"><span>Prisms</span><span id="drawerPrisms">0</span></div>
            </div>
          </section>
          <section id="panelLogout" role="tabpanel" hidden>
            <p class="muted">You will be returned to the landing screen.</p>
            <div class="actionsRow">
              <button id="drawerLogoutBtn" class="btnSecondary" type="button">Log Out</button>
            </div>
          </section>
        </div>
      </div>`
    document.body.appendChild(wrap)
  }
  // Extra modals
  if (!$('modalResetPassword')){
    const d = document.createElement('dialog')
    d.id = 'modalResetPassword'
    d.innerHTML = `
      <div id="modalResetInner" class="modalBox">
        <h2 id="resetTitle">Reset Password</h2>
        <form id="resetForm" autocomplete="off">
          <div class="fieldRow">
            <label for="resetCurrent">Current Password</label>
            <input id="resetCurrent" type="password" minlength="6" required />
          </div>
          <div class="fieldRow">
            <label for="resetNew">New Password</label>
            <input id="resetNew" type="password" minlength="6" required />
          </div>
          <div class="modalActions">
            <button id="resetSubmit" class="btnPrimary" type="submit">Update</button>
            <button id="resetCancel" class="btnGhost" type="button">Cancel</button>
          </div>
        </form>
      </div>`
    document.body.appendChild(d)
  }
  if (!$('modalError')){
    const d = document.createElement('dialog')
    d.id = 'modalError'
    d.innerHTML = `
      <div id="modalErrorInner" class="modalBox error">
        <h2 id="errorTitle">Something went wrong</h2>
        <p id="errorMessage">An unknown error occurred.</p>
        <div class="modalActions">
          <button id="errorOk" class="btnSecondary" type="button">OK</button>
        </div>
      </div>`
    document.body.appendChild(d)
  }
  if (!$('modalSuccess')){
    const d = document.createElement('dialog')
    d.id = 'modalSuccess'
    d.innerHTML = `
      <div id="modalSuccessInner" class="modalBox success">
        <h2 id="successTitle">Success</h2>
        <p id="successMessage">Operation completed.</p>
        <div class="modalActions">
          <button id="successOk" class="btnPrimary" type="button">OK</button>
        </div>
      </div>`
    document.body.appendChild(d)
  }
  if (!$('modalChangelog')){
    const d = document.createElement('dialog')
    d.id = 'modalChangelog'
    d.innerHTML = `
      <div id="modalChangelogInner" class="modalBox">
        <h2 id="changelogTitle">Changelog</h2>
        <div id="changelogBody" class="muted">No entries yet.</div>
        <div class="modalActions">
          <button id="changelogClose" class="btnGhost" type="button">Close</button>
        </div>
      </div>`
    document.body.appendChild(d)
  }
  // Bind interactions (idempotent)
  if (!$('settingsDrawer')?.dataset.bound){
    $('settingsDrawer').dataset.bound = '1'
    $('btnSettings')?.addEventListener('click', ()=>{ openDrawer(true); refreshDrawerData() })
    $('drawerClose')?.addEventListener('click', ()=> openDrawer(false))
    $('drawerBackdrop')?.addEventListener('click', ()=> openDrawer(false))
    $('tabAccount')?.addEventListener('click', ()=> switchDrawerTab('account'))
    $('tabLogout')?.addEventListener('click', ()=> switchDrawerTab('logout'))
    $('drawerLogoutBtn')?.addEventListener('click', doLogout)
    $('btnOpenReset')?.addEventListener('click', ()=>{ openModal('modalResetPassword'); $('resetCurrent')?.focus() })
    $('resetCancel')?.addEventListener('click', ()=> closeModal('modalResetPassword'))
    $('resetForm')?.addEventListener('submit', handleResetSubmit)
    $('errorOk')?.addEventListener('click', ()=> closeModal('modalError'))
    $('successOk')?.addEventListener('click', ()=> closeModal('modalSuccess'))
    $('changelogClose')?.addEventListener('click', ()=> closeModal('modalChangelog'))
    $('btnChangelog')?.addEventListener('click', ()=> openModal('modalChangelog'))
    $('accountPassToggle')?.addEventListener('click', ()=>{
      const span = $('accountPasswordValue')
      const t = $('accountPassToggle')
      const { on, p } = getRememberCreds()
      if (on && p){
        if (t.textContent === 'Show'){ span.textContent = p; t.textContent = 'Hide' }
        else { span.textContent = '••••••••'; t.textContent = 'Show' }
      } else {
        notify('Password not saved on this device. Use Remember me at login to enable Show.')
      }
    })
    updatePassToggle()
  }
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
    if(!validateUsername(username)){ openErrorModal('invalid_username'); return }
    if(password.length<6){ openErrorModal('invalid_password'); return }
    try{
      const data = await postJSON('/api/login',{ username, password })
      state.user = { username:data.username, premium:data.premium||'none' }
      if($('loginRemember')?.checked) saveRememberCreds(username,password)
      closeModal('modalLogin')
      showMainMenu()
      notify('Logged In!'); openSuccessModal('Logged In!')
    }catch(err){
      const msg = String(err.message||err); openErrorModal(msg)
    }
  })

  $('signupForm').addEventListener('submit',async e=>{
    e.preventDefault()
    $('signupError').textContent=''
    const username = $('signupUsername').value.trim()
    const password = $('signupPassword').value
    const confirm = $('signupConfirm').value
    if(!validateUsername(username)){ openErrorModal('invalid_username'); return }
    if(!validatePassword(password)){ openErrorModal('invalid_password'); return }
    if(password!==confirm){ openErrorModal('Passwords do not match'); return }
    try{
      const data = await postJSON('/api/signup',{ username, password })
      state.user = { username:data.username, premium:'none' }
      closeModal('modalSignup')
      showMainMenu()
      notify('Logged In!'); openSuccessModal('Account created and logged in!')
    }catch(err){
      const msg = String(err.message||err); openErrorModal(msg)
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
      $('userBadge').textContent = state.user.username
      $('statVal1').textContent = data.wins ?? 0
      $('statVal2').textContent = data.losses ?? 0
      $('statVal3').textContent = data.prisms ?? 0
      $('drawerUsername') && ($('drawerUsername').textContent = state.user.username)
      $('drawerWins') && ($('drawerWins').textContent = data.wins ?? 0)
      $('drawerLosses') && ($('drawerLosses').textContent = data.losses ?? 0)
      $('drawerPrisms') && ($('drawerPrisms').textContent = data.prisms ?? 0)
      notify('Successfully Refreshed Stats!'); openSuccessModal('Successfully refreshed stats!')
    }catch(e){}
  })

  $('btnLogout').addEventListener('click',async()=>{
    await doLogout()
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
    if (window.GameClient) window.GameClient.exit()
    showMainMenu()
  })

  window.__onMatchEnd = ()=>{ showMainMenu(); notify('Match ended') }
}

function nudgeTank(dir){
  const card = $('tankCard')
  card.animate([{transform:'scale(1)'},{transform:'scale(.985)'},{transform:'scale(1)'}],{ duration:180, easing:'ease-out' })
  state.tankIndex = (state.tankIndex + dir + 10) % 10
}

function showQueue(){ $('queueScreen').hidden = false; $('queueCountNum').textContent = '1' }
function hideQueue(){ $('queueScreen').hidden = true }

function ensureSocket(){
  if (state.ws && (state.ws.readyState === 0 || state.ws.readyState === 1)) return
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${location.host}/ws`
  const ws = new WebSocket(url)
  state.ws = ws
  window.__wsRef = ws

  ws.onopen = () => {
    const buf = state.wsBuffer.splice(0)
    for (const m of buf) try { ws.send(JSON.stringify(m)) } catch {}
  }
  ws.onerror = () => notify('Can’t connect to server. Is it running?')
  ws.onclose = () => {}

ws.onmessage = ev => {
  let m = null
  try { m = JSON.parse(ev.data) } catch { return }
  if (!m) return
  console.log('[WS<-]', m.type)

  if (window.GameClient && window.GameClient.handle(m)) return
  if (m.type === 'hello') return
  if (m.type === 'queueCount') $('queueCountNum').textContent = String(m.n)
}

}
function sendWS(obj){
  const ws = state.ws
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj))
  else state.wsBuffer.push(obj)
}

async function boot(){
  createSettingsUI(); bindLanding(); bindModals(); bindMainMenu()
  try{
    const res = await fetch('/api/me')
    if(res.ok){
      const data = await res.json()
      if(data && data.username){
        state.user = { username:data.username, premium:data.premium||'none' }
        showMainMenu()
        await refreshDrawerData()
        return
      }
    }
  }catch(e){}
  const { on, u, p } = getRememberCreds()
  if(on && u && p){
    try{
      const data = await postJSON('/api/login',{ username:u, password:p })
      state.user = { username:data.username, premium:data.premium||'none' }
      showMainMenu()
      notify('Automatically Logged In!'); openSuccessModal('Automatically logged in!')
      return
    }catch(e){}
  }
  showLanding()
}
document.addEventListener('DOMContentLoaded', boot)
