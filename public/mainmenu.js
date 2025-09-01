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

function validateUsername(u) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(u)
}

function validatePassword(p) {
  if (p.length < 6) return false
  if (!/\d/.test(p)) return false
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) return false
  if (!/[A-Z]/.test(p)) return false
  return true
}

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new Error('Invalid response')
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || 'Request failed')
  return data
}

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

  $('prevTank').addEventListener('click', () => nudgeTank(-1))
  $('nextTank').addEventListener('click', () => nudgeTank(1))
  $('btnBattle').addEventListener('click', () => {
    $('btnBattle').disabled = true
    setTimeout(() => { $('btnBattle').disabled = false }, 600)
  })
}

function nudgeTank(dir) {
  const card = $('tankCard')
  card.animate([{ transform: 'scale(1)' }, { transform: 'scale(.98)' }, { transform: 'scale(1)' }], { duration: 180, easing: 'ease-out' })
  state.tankIndex = (state.tankIndex + dir + 10) % 10
}

function init() {
  bindLanding()
  bindModals()
  bindMainMenu()
  showLanding()
}

document.addEventListener('DOMContentLoaded', init)
