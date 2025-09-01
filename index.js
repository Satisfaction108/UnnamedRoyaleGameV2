const $ = (id) => document.getElementById(id)

const state = {
  user: null,
  premium: 'none',
  tankIndex: 0
}

function showLanding() {
  $('landing').style.display = 'grid'
  $('landing').style.opacity = '1'
  $('mainMenu').removeAttribute('data-show')
  $('userBadge').textContent = ''
}

function showMainMenu() {
  $('landing').style.display = 'none'
  $('mainMenu').setAttribute('data-show', 'true')
  $('accountName').textContent = state.user?.username || ''
  $('userBadge').textContent = state.user?.username ? `@${state.user.username}` : ''
}

/* overlay + dialogs */
function openModal(modalId) {
  $('overlay').setAttribute('data-open', 'true')
  const dlg = $(modalId)
  if (!dlg.open) dlg.showModal()
}
function closeModal(modalId) {
  $('overlay').removeAttribute('data-open')
  const dlg = $(modalId)
  if (dlg.open) dlg.close()
}

/* validation */
function validateUsername(u) { return /^[a-zA-Z0-9_]{3,20}$/.test(u) }
function validatePassword(p) {
  if (p.length < 6) return false
  if (!/\d/.test(p)) return false
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) return false
  if (!/[A-Z]/.test(p)) return false
  return true
}

/* fetch helper */
async function postJSON(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new Error('Invalid response')
  const data = await res.json()
  if (!res.ok || data.ok === false) throw new Error(data?.error || 'Request failed')
  return data
}

/* remember me */
function loadRemembered() {
  const remembered = localStorage.getItem('rememberMe') === '1'
  if (remembered) {
    const u = localStorage.getItem('rememberUser') || ''
    $('loginRemember').checked = true
    if (u) $('loginUsername').value = u
  } else {
    $('loginRemember').checked = false
  }
}
function saveRememberChoice(username) {
  const remember = $('loginRemember').checked
  if (remember) {
    localStorage.setItem('rememberMe', '1')
    if (username) localStorage.setItem('rememberUser', username)
  } else {
    localStorage.removeItem('rememberMe')
    localStorage.removeItem('rememberUser')
  }
}

/* bindings */
function bindLanding() {
  $('btnSignup').addEventListener('click', () => {
    $('signupError').textContent = ''
    $('signupForm').reset()
    openModal('modalSignup')
    $('signupUsername').focus()
  })
  $('btnLogin').addEventListener('click', () => {
    $('loginError').textContent = ''
    $('loginForm').reset()
    openModal('modalLogin')
    // load remembered username/choice
    setTimeout(loadRemembered, 0)
    $('loginUsername').focus()
  })
}

function bindModals() {
  $('loginCancel').addEventListener('click', () => closeModal('modalLogin'))
  $('signupCancel').addEventListener('click', () => closeModal('modalSignup'))

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    $('loginError').textContent = ''
    const username = $('loginUsername').value.trim()
    const password = $('loginPassword').value
    if (!validateUsername(username)) { $('loginError').textContent = 'Invalid username'; return }
    if (password.length < 6) { $('loginError').textContent = 'Invalid password'; return }
    try {
      const data = await postJSON('/api/login', { username, password })
      state.user = { username: data.username, premium: data.premium || 'none' }
      state.premium = state.user.premium
      saveRememberChoice(username)
      closeModal('modalLogin')
      showMainMenu()
    } catch (err) {
      $('loginError').textContent = String(err.message || err)
    }
  })

  $('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    $('signupError').textContent = ''
    const username = $('signupUsername').value.trim()
    const password = $('signupPassword').value
    const confirm = $('signupConfirm').value
    if (!validateUsername(username)) { $('signupError').textContent = '3–20 letters, numbers, underscores'; return }
    if (!validatePassword(password)) { $('signupError').textContent = 'Needs 6+ chars, number, special, uppercase'; return }
    if (password !== confirm) { $('signupError').textContent = 'Passwords do not match'; return }
    try {
      const data = await postJSON('/api/signup', { username, password })
      state.user = { username: data.username, premium: 'none' }
      state.premium = 'none'
      // if they signed up, respect remember me choice later during first login
      closeModal('modalSignup')
      showMainMenu()
    } catch (err) {
      $('signupError').textContent = String(err.message || err)
    }
  })
}

function bindMainMenu() {
  $('btnRefresh').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/me')
      if (!res.ok) throw new Error('Failed to refresh')
      const data = await res.json()
      state.user = { username: data.username, premium: data.premium || 'none' }
      $('accountName').textContent = state.user.username
      $('userBadge').textContent = `@${state.user.username}`
      $('statVal1').textContent = data.wins ?? 0
      $('statVal2').textContent = data.losses ?? 0
      $('statVal3').textContent = data.prisms ?? 0
    } catch (e) {
      console.warn(e)
    }
  })

  $('btnLogout').addEventListener('click', async () => {
    try { await fetch('/api/logout', { method: 'POST' }) } catch {}
    state.user = null
    showLanding()
  })

  const stall = (btn) => {
    btn.setAttribute('disabled', 'true')
    setTimeout(() => btn.removeAttribute('disabled'), 180)
  }

  $('prevTank').addEventListener('click', () => { nudgeTank(-1); stall($('prevTank')) })
  $('nextTank').addEventListener('click', () => { nudgeTank(1); stall($('nextTank')) })

  $('btnBattle').addEventListener('click', () => {
    $('btnBattle').disabled = true
    setTimeout(() => { $('btnBattle').disabled = false }, 600)
  })
}

/* tank nudge animation */
function nudgeTank(dir) {
  const card = $('tankCard')
  card.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(.985)' }, { transform: 'scale(1)' }],
    { duration: 180, easing: 'ease-out' }
  )
  state.tankIndex = (state.tankIndex + dir + 10) % 10
}

/* boot */
function init() {
  bindLanding()
  bindModals()
  bindMainMenu()

  // auto-show main menu if already logged in (server session cookie),
  // otherwise stay on landing. If remembered, prefill username on first open.
  fetch('/api/me')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.username) {
        state.user = { username: data.username, premium: data.premium || 'none' }
        showMainMenu()
      } else {
        showLanding()
      }
    })
    .catch(() => showLanding())
}

document.addEventListener('DOMContentLoaded', init)
