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

// Enhanced Notification System
const NotificationSystem = {
  // Create notification with type and animation
  show(message, type = 'default', duration = 3000) {
    let stack = $('notifyStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'notifyStack';
      document.body.appendChild(stack);
    }
    
    const el = document.createElement('div');
    el.className = `notify notify-entering`;
    
    // Add type-specific classes
    if (type === 'success') el.classList.add('notify-success');
    else if (type === 'error') el.classList.add('notify-error');
    else if (type === 'warning') el.classList.add('notify-warning');
    else if (type === 'info') el.classList.add('notify-info');
    
    el.textContent = message;
    stack.appendChild(el);
    
    // Remove entering class after animation
    setTimeout(() => {
      el.classList.remove('notify-entering');
    }, 500);
    
    // Auto-remove notification
    setTimeout(() => {
      this.remove(el);
    }, duration);
    
    return el;
  },
  
  // Remove notification with exit animation
  remove(el) {
    if (!el || !el.parentNode) return;
    
    el.classList.add('leaving');
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, 300);
  },
  
  // Convenience methods
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  },
  
  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  },
  
  warning(message, duration = 3500) {
    return this.show(message, 'warning', duration);
  },
  
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }
};

// Legacy function for backwards compatibility
function notify(msg, type = 'success') {
  return NotificationSystem.show(msg, type);
}

// Tab Animation System
const TabAnimations = {
  // Track animating tabs
  animatingTabs: new Set(),
  
  // Switch between tab panels with animation
  async switchTab(fromPanelId, toPanelId, animationType = 'fade') {
    const fromPanel = $(fromPanelId);
    const toPanel = $(toPanelId);
    
    if (!fromPanel || !toPanel || this.animatingTabs.has(fromPanelId) || this.animatingTabs.has(toPanelId)) {
      return;
    }
    
    this.animatingTabs.add(fromPanelId);
    this.animatingTabs.add(toPanelId);
    
    // Determine animation classes
    const exitClass = animationType === 'slide' ? 'tab-slide-exiting' : 'tab-exiting';
    const enterClass = animationType === 'slide' ? 'tab-slide-entering' : 'tab-entering';
    const exitDuration = animationType === 'slide' ? 250 : 200;
    const enterDuration = animationType === 'slide' ? 300 : 250;
    
    // Start exit animation on current panel
    fromPanel.classList.add(exitClass);
    
    // After exit animation starts, show and animate in new panel
    setTimeout(() => {
      fromPanel.hidden = true;
      fromPanel.classList.remove(exitClass);
      
      toPanel.hidden = false;
      toPanel.classList.add(enterClass);
      
      // Clean up after enter animation
      setTimeout(() => {
        toPanel.classList.remove(enterClass);
        this.animatingTabs.delete(fromPanelId);
        this.animatingTabs.delete(toPanelId);
      }, enterDuration);
    }, exitDuration);
  },
  
  // Animate tab button state changes
  animateTabButton(buttonId, isActive) {
    const button = $(buttonId);
    if (!button) return;
    
    if (isActive) {
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
    } else {
      button.classList.remove('active');
      button.setAttribute('aria-selected', 'false');
    }
  },
  
  // Complete tab switch with button and panel animations
  async switchTabComplete(fromButtonId, toButtonId, fromPanelId, toPanelId, animationType = 'fade') {
    // Update button states
    this.animateTabButton(fromButtonId, false);
    this.animateTabButton(toButtonId, true);
    
    // Switch panels with animation
    await this.switchTab(fromPanelId, toPanelId, animationType);
  }
};

// Progressive Page Reveal Animation System
const PageAnimations = {
  // Track animation states
  animatingPages: new Set(),
  
  // Animate page transition from landing to main menu
  async transitionToMainMenu() {
    if (this.animatingPages.has('landing-to-main')) return;
    this.animatingPages.add('landing-to-main');
    
    const landing = $('landing');
    const mainMenu = $('mainMenu');
    
    // Start exit animation on landing
    landing.classList.add('page-exiting');
    
    // After landing starts exiting, show and animate main menu
    setTimeout(() => {
      landing.style.display = 'none';
      landing.classList.remove('page-exiting');
      
      mainMenu.setAttribute('data-show', 'true');
      mainMenu.classList.add('page-entering');
      
      // Start progressive reveal of main menu elements
      this.revealMainMenuElements();
      
      // Clean up page transition
      setTimeout(() => {
        mainMenu.classList.remove('page-entering');
        this.animatingPages.delete('landing-to-main');
      }, 500);
    }, 400);
  },
  
  // Animate page transition from main menu to landing
  async transitionToLanding() {
    if (this.animatingPages.has('main-to-landing')) return;
    this.animatingPages.add('main-to-landing');
    
    const landing = $('landing');
    const mainMenu = $('mainMenu');
    
    // Start exit animation on main menu
    mainMenu.classList.add('page-exiting');
    
    // Reset main menu element states
    this.resetMainMenuElements();
    
    // After main menu starts exiting, show and animate landing
    setTimeout(() => {
      mainMenu.removeAttribute('data-show');
      mainMenu.classList.remove('page-exiting');
      
      landing.style.display = 'grid';
      landing.style.opacity = '1';
      landing.classList.add('page-entering');
      
      // Clean up page transition
      setTimeout(() => {
        landing.classList.remove('page-entering');
        this.animatingPages.delete('main-to-landing');
      }, 500);
    }, 400);
  },
  
  // Progressive reveal of main menu elements
  revealMainMenuElements() {
    const elements = [
      $('topBar'),
      $('mainContent'),
      $('selectorWrap')
    ].filter(el => el);
    
    elements.forEach((element, index) => {
      element.classList.add('reveal-item');
      
      setTimeout(() => {
        element.classList.add('reveal-animate');
        
        // Clean up after animation
        setTimeout(() => {
          element.classList.remove('reveal-item', 'reveal-animate');
        }, 600 + (index * 100));
      }, index * 100);
    });
  },
  
  // Reset main menu elements for next animation
  resetMainMenuElements() {
    const elements = [
      $('topBar'),
      $('mainContent'), 
      $('selectorWrap')
    ].filter(el => el);
    
    elements.forEach(element => {
      element.classList.remove('reveal-item', 'reveal-animate');
    });
  },
  
  // Show loading state animation
  showLoadingState(elementId) {
    const element = $(elementId);
    if (element) {
      element.classList.add('loading-state');
    }
  },
  
  // Hide loading state animation
  hideLoadingState(elementId) {
    const element = $(elementId);
    if (element) {
      element.classList.remove('loading-state');
    }
  }
};

function showLanding(){
  // Use new animation system for smooth transition
  PageAnimations.transitionToLanding();
  
  // Update UI state
  $('userBadge').textContent = ''
  $('queueScreen').hidden = true
  $('gameView').hidden = true
  const tla = $('topLeftActions'); if (tla) tla.style.display = 'none'
}

function showMainMenu(){
  // Use new animation system for smooth transition
  PageAnimations.transitionToMainMenu();
  
  // Update UI state
  $('accountName').textContent = state.user?.username || ''
  $('userBadge').textContent = state.user?.username ? state.user.username : ''
  const brand = $('brandMini'); if (brand) brand.textContent = ''
  $('queueScreen').hidden = true
  $('gameView').hidden = true
  const tla = $('topLeftActions'); if (tla) tla.style.display = 'inline-flex'
  updatePassToggle()
}

// Enhanced Modal Animation System
const ModalAnimations = {
  // Track animation states
  animatingModals: new Set(),
  
  // Open modal with smooth animation
  async openModal(id) {
    const dialog = $(id);
    if (!dialog || dialog.open || this.animatingModals.has(id)) return;
    
    this.animatingModals.add(id);
    $('overlay').setAttribute('data-open', 'true');
    
    // Show modal immediately but invisible
    dialog.style.opacity = '0';
    dialog.showModal();
    
    // Add entering animation class
    dialog.classList.add('modal-entering');
    const modalInner = dialog.querySelector('.modalBox, #modalLoginInner, #modalSignupInner');
    if (modalInner) {
      modalInner.classList.add('modal-entering');
    }
    
    // Remove animation class after animation completes
    setTimeout(() => {
      dialog.style.opacity = '';
      dialog.classList.remove('modal-entering');
      if (modalInner) modalInner.classList.remove('modal-entering');
      this.animatingModals.delete(id);
    }, 400);
  },
  
  // Close modal with smooth animation
  async closeModal(id) {
    const dialog = $(id);
    if (!dialog || !dialog.open || this.animatingModals.has(id)) return;
    
    this.animatingModals.add(id);
    
    // Add exiting animation class
    dialog.classList.add('modal-exiting');
    const modalInner = dialog.querySelector('.modalBox, #modalLoginInner, #modalSignupInner');
    if (modalInner) {
      modalInner.classList.add('modal-exiting');
    }
    
    // Close modal after animation completes
    setTimeout(() => {
      dialog.close();
      dialog.classList.remove('modal-exiting');
      if (modalInner) modalInner.classList.remove('modal-exiting');
      $('overlay').removeAttribute('data-open');
      this.animatingModals.delete(id);
    }, 300);
  }
};

// Legacy functions for backwards compatibility
function openModal(id) { 
  ModalAnimations.openModal(id);
}

function closeModal(id) { 
  ModalAnimations.closeModal(id);
}

// Enhanced validation functions with detailed feedback
function validateUsername(u) { 
  return /^[a-zA-Z0-9_]{3,20}$/.test(u) 
}

function validatePassword(p) { 
  return p.length >= 6 && /\d/.test(p) && /[!@#$%^&*(),.?":{}|<>]/.test(p) && /[A-Z]/.test(p) 
}

// Real-time validation system
const ValidationSystem = {
  // Add validation message to field
  showValidation(fieldId, message, type = 'error') {
    const field = $(fieldId)
    if (!field) return
    
    const fieldRow = field.closest('.fieldRow')
    if (!fieldRow) return
    
    // Remove existing validation
    this.clearValidation(fieldId)
    
    // Add validation state to field row
    fieldRow.classList.remove('valid', 'invalid')
    fieldRow.classList.add(type === 'success' ? 'valid' : 'invalid')
    
    // Create validation message
    const validationMsg = document.createElement('div')
    validationMsg.className = `validation-message ${type}`
    validationMsg.textContent = message
    fieldRow.appendChild(validationMsg)
    
    // Show with animation
    setTimeout(() => validationMsg.classList.add('show'), 10)
  },
  
  // Clear validation for field
  clearValidation(fieldId) {
    const field = $(fieldId)
    if (!field) return
    
    const fieldRow = field.closest('.fieldRow')
    if (!fieldRow) return
    
    fieldRow.classList.remove('valid', 'invalid')
    const existingMsg = fieldRow.querySelector('.validation-message')
    if (existingMsg) {
      existingMsg.classList.remove('show')
      setTimeout(() => existingMsg.remove(), 200)
    }
  },
  
  // Validate username with detailed feedback
  validateUsernameDetailed(username) {
    if (!username) return { valid: false, message: 'Username is required' }
    if (username.length < 3) return { valid: false, message: 'Username must be at least 3 characters' }
    if (username.length > 20) return { valid: false, message: 'Username must be 20 characters or less' }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: 'Username can only contain letters, numbers, and underscores' }
    return { valid: true, message: 'Username looks good!' }
  },
  
  // Validate password with detailed feedback
  validatePasswordDetailed(password) {
    if (!password) return { valid: false, message: 'Password is required' }
    if (password.length < 6) return { valid: false, message: 'Password must be at least 6 characters' }
    if (!/\d/.test(password)) return { valid: false, message: 'Password must contain at least one number' }
    if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { valid: false, message: 'Password must contain at least one special character' }
    return { valid: true, message: 'Password is strong!' }
  },
  
  // Validate password confirmation
  validatePasswordConfirm(password, confirm) {
    if (!confirm) return { valid: false, message: 'Please confirm your password' }
    if (password !== confirm) return { valid: false, message: 'Passwords do not match' }
    return { valid: true, message: 'Passwords match!' }
  }
}

async function postJSON(path, body, context = ''){
  try {
    const res = await fetch(path, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body),
      // Add timeout for better error handling
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    const type = res.headers.get('content-type') || ''
    if (!type.includes('application/json')) {
      const err = new Error('Server returned invalid response format')
      err.code = 'invalid_response'
      throw err
    }
    
    const data = await res.json()
    
    if (!res.ok || data.ok === false) {
      const code = data?.error || 'request_failed'
      const err = new Error(ErrorHandler.getErrorInfo(code).message)
      err.code = code
      err.status = res.status
      throw err
    }
    
    return data
  } catch (error) {
    // Enhanced error handling for different failure types
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Please check your connection.')
      timeoutError.code = 'network_error'
      throw timeoutError
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Network connection failed. Please check your internet connection.')
      networkError.code = 'network_error'
      throw networkError
    }
    
    // Re-throw with context if available
    if (context) {
      error.context = context
    }
    
    throw error
  }
}

// Enhanced Error Handling System
const ErrorHandler = {
  // Error type classifications
  errorTypes: {
    NETWORK: 'network',
    VALIDATION: 'validation', 
    AUTHENTICATION: 'authentication',
    SERVER: 'server',
    CLIENT: 'client'
  },
  
  // Enhanced error mapping with categories and actions
  errorMap: {
    username_taken: {
      message: 'This username is already taken. Please choose a different one.',
      type: 'validation',
      action: 'Try a different username'
    },
    invalid_username: {
      message: 'Username must be 3-20 characters using only letters, numbers, and underscores.',
      type: 'validation',
      action: 'Check username format'
    },
    invalid_password: {
      message: 'Password must be at least 6 characters with uppercase, number, and special character.',
      type: 'validation',
      action: 'Strengthen your password'
    },
    bad_credentials: {
      message: 'Incorrect username or password.',
      type: 'authentication',
      action: 'Check your login details'
    },
    signup_failed: {
      message: 'Account creation failed. Please try again.',
      type: 'server',
      action: 'Try again in a moment'
    },
    login_failed: {
      message: 'Login failed. Please check your connection and try again.',
      type: 'server',
      action: 'Check connection and retry'
    },
    not_logged_in: {
      message: 'Your session has expired. Please log in again.',
      type: 'authentication',
      action: 'Log in again'
    },
    password_change_failed: {
      message: 'Password update failed. Please try again.',
      type: 'server',
      action: 'Try again in a moment'
    },
    invalid_input: {
      message: 'Please check your input and try again.',
      type: 'validation',
      action: 'Verify your input'
    },
    network_error: {
      message: 'Network connection failed. Please check your internet connection.',
      type: 'network',
      action: 'Check your connection'
    },
    server_error: {
      message: 'Server error occurred. Please try again later.',
      type: 'server',
      action: 'Try again later'
    },
    session_expired: {
      message: 'Your session has expired. Please log in again.',
      type: 'authentication',
      action: 'Log in again'
    }
  },
  
  // Get enhanced error info
  getErrorInfo(errorCode) {
    const code = String(errorCode || '').toLowerCase()
    return this.errorMap[code] || {
      message: errorCode || 'An unexpected error occurred.',
      type: 'client',
      action: 'Please try again'
    }
  },
  
  // Handle different types of errors appropriately
  handleError(error, context = '') {
    const errorInfo = this.getErrorInfo(error.code || error.message)
    
    console.error(`[${context}] Error:`, error, errorInfo)
    
    // Different handling based on error type
    switch (errorInfo.type) {
      case this.errorTypes.AUTHENTICATION:
        this.handleAuthError(errorInfo, context)
        break
      case this.errorTypes.NETWORK:
        this.handleNetworkError(errorInfo, context)
        break
      case this.errorTypes.SERVER:
        this.handleServerError(errorInfo, context)
        break
      case this.errorTypes.VALIDATION:
        this.handleValidationError(errorInfo, context)
        break
      default:
        this.handleGenericError(errorInfo, context)
    }
    
    return errorInfo
  },
  
  // Handle authentication errors
  handleAuthError(errorInfo, context) {
    NotificationSystem.error(errorInfo.message)
    
    // If session expired, redirect to login
    if (errorInfo.message.includes('session') || errorInfo.message.includes('expired')) {
      setTimeout(() => {
        if (state.user) {
          doLogout()
        }
      }, 2000)
    }
  },
  
  // Handle network errors
  handleNetworkError(errorInfo, context) {
    // Show connection status
    if (window.ConnectionMonitor) {
      ConnectionMonitor.setStatus('reconnecting')
    }
    
    NotificationSystem.error(errorInfo.message, 5000)
    
    // Show retry option for network errors
    const retryNotification = NotificationSystem.show(
      `${errorInfo.action} or click to retry`, 
      'warning', 
      10000
    )
    
    if (retryNotification) {
      retryNotification.classList.add('retry-available')
      retryNotification.addEventListener('click', () => {
        NotificationSystem.remove(retryNotification)
        // Trigger retry based on context
        this.triggerRetry(context)
      })
    }
  },
  
  // Handle server errors
  handleServerError(errorInfo, context) {
    NotificationSystem.error(errorInfo.message)
    
    // For server errors, suggest trying again later
    setTimeout(() => {
      NotificationSystem.info(errorInfo.action)
    }, 3000)
  },
  
  // Handle validation errors
  handleValidationError(errorInfo, context) {
    // Validation errors are usually handled by the ValidationSystem
    // This is a fallback for unhandled validation errors
    NotificationSystem.warning(errorInfo.message)
  },
  
  // Handle generic errors
  handleGenericError(errorInfo, context) {
    NotificationSystem.error(errorInfo.message)
    openErrorModal(errorInfo.message)
  },
  
  // Trigger retry based on context
  triggerRetry(context) {
    switch (context) {
      case 'account-refresh':
        const refreshBtn = $('btnRefreshAccount') || $('btnRefresh')
        if (refreshBtn) refreshBtn.click()
        break
      case 'login':
        NotificationSystem.info('Please try logging in again')
        break
      case 'password-change':
        NotificationSystem.info('Please try changing your password again')
        break
      default:
        NotificationSystem.info('Please try your action again')
    }
  }
}

function toFriendlyError(input){
  return ErrorHandler.getErrorInfo(input).message
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
async function refreshDrawerData(forceRefresh = false){
  try{
    // Use enhanced account data manager with sync
    await AccountDataManager.syncAllData(forceRefresh)
    
  }catch(e){ 
    console.warn('Failed to refresh drawer data:', e)
    
    // Show user-friendly error message
    if (e.message.includes('Session expired')) {
      NotificationSystem.error('Session expired. Please log in again.')
    } else if (!e.message.includes('already in progress')) {
      NotificationSystem.error('Failed to load account data. Please try again.')
    }
    
    throw e // Re-throw for caller handling
  }
}

// Helper function to update progress bars with animation
function updateStatProgress(progressId, value, maxValue) {
  const progressBar = $(progressId)
  if (!progressBar) return
  
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0
  
  // Animate the progress bar
  setTimeout(() => {
    progressBar.style.width = `${percentage}%`
  }, 100)
}

// Helper function to update win rate circle
function updateWinRateCircle(winRate) {
  const circle = $('winRateCircle')
  if (!circle) return
  
  const degrees = (winRate / 100) * 360
  circle.style.setProperty('--win-rate-deg', `${degrees}deg`)
  
  // Add color based on win rate
  if (winRate >= 70) {
    circle.style.background = `conic-gradient(var(--success) 0deg, var(--success) ${degrees}deg, rgba(255,255,255,0.1) ${degrees}deg)`
  } else if (winRate >= 50) {
    circle.style.background = `conic-gradient(var(--warning) 0deg, var(--warning) ${degrees}deg, rgba(255,255,255,0.1) ${degrees}deg)`
  } else {
    circle.style.background = `conic-gradient(var(--error) 0deg, var(--error) ${degrees}deg, rgba(255,255,255,0.1) ${degrees}deg)`
  }
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch (e) {
    return null
  }
}
async function doLogout(){
  try{ await fetch('/api/logout',{ method:'POST' }) }catch(e){}
  
  // Clean up account data management
  AccountDataManager.stopPeriodicRefresh()
  AccountDataManager.clearCache()
  
  state.user = null
  openDrawer(false)
  showLanding()
}
// Enhanced Account Data Management System
const AccountDataManager = {
  // Loading states for different operations
  loadingStates: new Set(),
  
  // Cache for account data with timestamp
  cache: {
    data: null,
    timestamp: 0,
    maxAge: 30000 // 30 seconds cache
  },
  
  // Enhanced password update with better validation and feedback
  async updatePassword(currentPassword, newPassword) {
    if (this.loadingStates.has('password-update')) {
      throw new Error('Password update already in progress')
    }
    
    this.loadingStates.add('password-update')
    
    try {
      // Enhanced validation
      if (!currentPassword || currentPassword.length < 1) {
        throw new Error('Current password is required')
      }
      
      const passwordValidation = ValidationSystem.validatePasswordDetailed(newPassword)
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message)
      }
      
      // Check if new password is different from current
      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password')
      }
      
      // Make API call with enhanced error handling
      const result = await postJSON('/api/password', { 
        currentPassword, 
        newPassword 
      }, 'password-change')
      
      // Update stored credentials if "Remember me" is enabled
      if (rememberChecked() && state.user?.username) {
        saveRememberCreds(state.user.username, newPassword)
        updatePassToggle() // Refresh password toggle state
      }
      
      return result
    } finally {
      this.loadingStates.delete('password-update')
    }
  },
  
  // Enhanced account data fetching with caching and better error handling
  async fetchAccountData(forceRefresh = false) {
    if (this.loadingStates.has('account-fetch')) {
      throw new Error('Account data fetch already in progress')
    }
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && this.cache.data && 
        (Date.now() - this.cache.timestamp) < this.cache.maxAge) {
      return this.cache.data
    }
    
    this.loadingStates.add('account-fetch')
    
    try {
      const response = await fetch('/api/me', {
        method: 'GET',
        headers: { 
          'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=30',
          'If-None-Match': this.cache.etag || ''
        },
        signal: AbortSignal.timeout(8000) // 8 second timeout
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          // Clear cache and session
          this.clearCache()
          state.user = null
          const error = new Error('Session expired. Please log in again.')
          error.code = 'session_expired'
          throw error
        }
        if (response.status === 304) {
          // Not modified - return cached data
          return this.cache.data
        }
        
        const error = new Error(`Failed to fetch account data (${response.status})`)
        error.code = response.status >= 500 ? 'server_error' : 'client_error'
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      
      // Validate response data
      if (!data || typeof data.username !== 'string') {
        const error = new Error('Invalid account data received from server')
        error.code = 'invalid_response'
        throw error
      }
      
      // Update cache
      this.cache.data = data
      this.cache.timestamp = Date.now()
      this.cache.etag = response.headers.get('etag') || ''
      
      return data
    } catch (error) {
      // Enhanced error handling for different failure types
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Account data request timed out')
        timeoutError.code = 'network_error'
        throw timeoutError
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Network connection failed while fetching account data')
        networkError.code = 'network_error'
        throw networkError
      }
      
      // Re-throw with context
      error.context = 'account-fetch'
      throw error
    } finally {
      this.loadingStates.delete('account-fetch')
    }
  },
  
  // Clear cached data
  clearCache() {
    this.cache.data = null
    this.cache.timestamp = 0
    this.cache.etag = ''
  },
  
  // Get cached data if available and fresh
  getCachedData() {
    if (this.cache.data && (Date.now() - this.cache.timestamp) < this.cache.maxAge) {
      return this.cache.data
    }
    return null
  },
  
  // Update UI components with account data
  updateAccountUI(accountData) {
    try {
      // Update state
      state.user = { 
        username: accountData.username, 
        premium: accountData.premium || 'none' 
      }
      
      // Update main UI elements
      const elements = {
        'accountName': accountData.username,
        'userBadge': accountData.username,
        'statVal1': accountData.wins ?? 0,
        'statVal2': accountData.losses ?? 0,
        'statVal3': accountData.prisms ?? 0
      }
      
      Object.entries(elements).forEach(([id, value]) => {
        const element = $(id)
        if (element) element.textContent = value
      })
      
      // Update drawer elements if they exist
      this.updateDrawerUI(accountData)
      
    } catch (error) {
      console.error('Failed to update account UI:', error)
      throw new Error('Failed to update interface with account data')
    }
  },
  
  // Update drawer UI elements
  updateDrawerUI(accountData) {
    const drawerElements = {
      'drawerUsername': accountData.username,
      'drawerJoinDate': formatDate(accountData.joinDate || accountData.createdAt),
      'drawerLastLogin': formatDate(accountData.lastLogin),
      'drawerWins': accountData.wins ?? 0,
      'drawerLosses': accountData.losses ?? 0,
      'drawerPrisms': accountData.prisms ?? 0,
      'drawerTotalGames': (accountData.wins ?? 0) + (accountData.losses ?? 0),
      'drawerAvgScore': accountData.averageScore ?? 0,
      'drawerTwoFactor': accountData.twoFactorEnabled ? 'Enabled' : 'Disabled'
    }
    
    Object.entries(drawerElements).forEach(([id, value]) => {
      const element = $(id)
      if (element) element.textContent = value
    })
    
    // Update win rate
    const wins = accountData.wins ?? 0
    const losses = accountData.losses ?? 0
    const totalGames = wins + losses
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
    
    const winRateElement = $('drawerWinRate')
    if (winRateElement) winRateElement.textContent = `${winRate}%`
    
    // Update progress bars with animation
    updateStatProgress('winsProgress', wins, Math.max(wins, losses, accountData.prisms ?? 0, 100))
    updateStatProgress('lossesProgress', losses, Math.max(wins, losses, accountData.prisms ?? 0, 100))
    updateStatProgress('prismsProgress', accountData.prisms ?? 0, Math.max(wins, losses, accountData.prisms ?? 0, 100))
    
    // Update win rate circle
    updateWinRateCircle(winRate)
  },
  
  // Check if operation is in progress
  isLoading(operation) {
    return this.loadingStates.has(operation)
  },
  
  // Sync data across all UI components consistently
  async syncAllData(forceRefresh = false) {
    try {
      const data = await this.fetchAccountData(forceRefresh)
      this.updateAccountUI(data)
      
      // Trigger any additional UI updates
      this.notifyDataUpdate(data)
      
      return data
    } catch (error) {
      console.error('Failed to sync account data:', error)
      throw error
    }
  },
  
  // Notify other parts of the app about data updates
  notifyDataUpdate(data) {
    // Update password toggle state
    updatePassToggle()
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('accountDataUpdated', { 
      detail: { data } 
    }))
  },
  
  // Periodic data refresh for active sessions
  startPeriodicRefresh() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
    
    // Refresh every 5 minutes if user is active
    this.refreshInterval = setInterval(async () => {
      if (state.user && document.visibilityState === 'visible') {
        try {
          await this.syncAllData(false) // Use cache if available
        } catch (error) {
          console.warn('Periodic refresh failed:', error)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes
  },
  
  // Stop periodic refresh
  stopPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }
}

async function handleResetSubmit(e){
  e.preventDefault()
  const current = $('resetCurrent').value
  const next = $('resetNew').value
  const confirm = $('resetConfirm').value
  
  // Clear any existing validation
  ValidationSystem.clearValidation('resetCurrent')
  ValidationSystem.clearValidation('resetNew')
  ValidationSystem.clearValidation('resetConfirm')
  
  // Client-side validation
  if (!current) {
    ValidationSystem.showValidation('resetCurrent', 'Current password is required', 'error')
    $('resetCurrent').focus()
    return
  }
  
  const passwordValidation = ValidationSystem.validatePasswordDetailed(next)
  if (!passwordValidation.valid) {
    ValidationSystem.showValidation('resetNew', passwordValidation.message, 'error')
    $('resetNew').focus()
    return
  }
  
  const confirmValidation = ValidationSystem.validatePasswordConfirm(next, confirm)
  if (!confirmValidation.valid) {
    ValidationSystem.showValidation('resetConfirm', confirmValidation.message, 'error')
    $('resetConfirm').focus()
    return
  }
  
  const submitBtn = $('resetSubmit')
  const originalText = submitBtn.textContent
  
  try{
    // Show loading state
    submitBtn.disabled = true
    submitBtn.textContent = 'Updating Password...'
    submitBtn.classList.add('loading')
    PageAnimations.showLoadingState('resetSubmit')
    
    // Use enhanced password update system
    await AccountDataManager.updatePassword(current, next)
    
    // Clear form and close modal
    $('resetForm').reset()
    closeModal('modalResetPassword')
    
    // Show success feedback
    NotificationSystem.success('Password updated successfully!')
    
    // Refresh account data to ensure consistency
    try {
      await refreshDrawerData()
    } catch (refreshError) {
      console.warn('Failed to refresh account data after password change:', refreshError)
    }
    
  }catch(err){
    const errorInfo = ErrorHandler.handleError(err, 'password-change')
    const message = errorInfo.message
    
    // Enhanced error handling with specific field targeting
    if (message.toLowerCase().includes('current') || 
        message.toLowerCase().includes('incorrect') || 
        message.toLowerCase().includes('bad_credentials')) {
      ValidationSystem.showValidation('resetCurrent', 'Current password is incorrect', 'error')
      $('resetCurrent').focus()
    } else if (message.toLowerCase().includes('password must') || 
               message.toLowerCase().includes('invalid_password') ||
               message.toLowerCase().includes('different')) {
      ValidationSystem.showValidation('resetNew', message, 'error')
      $('resetNew').focus()
    } else if (errorInfo.type !== 'network') {
      // Don't show modal for network errors (already handled by ErrorHandler)
      openErrorModal(message)
    }
  }finally{
    // Reset loading state
    PageAnimations.hideLoadingState('resetSubmit')
    submitBtn.disabled = false
    submitBtn.textContent = originalText
    submitBtn.classList.remove('loading')
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
  // Enhanced Settings drawer with card-based layout
  if (!$('settingsDrawer')){
    const wrap = document.createElement('aside')
    wrap.id = 'settingsDrawer'
    wrap.innerHTML = `
      <div id="drawerBackdrop"></div>
      <div id="drawerPanel">
        <div id="drawerHeader">
          <div id="drawerTitle">Account Settings</div>
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
            <!-- Profile Information Card -->
            <div class="account-section">
              <div class="section-title">Profile Information</div>
              <div class="kv">
                <span class="k">Username</span>
                <span class="v" id="drawerUsername">-</span>
              </div>
              <div class="kv">
                <span class="k">Member Since</span>
                <span class="v" id="drawerJoinDate">-</span>
              </div>
              <div class="kv">
                <span class="k">Last Login</span>
                <span class="v" id="drawerLastLogin">-</span>
              </div>
            </div>

            <!-- Security Settings Card -->
            <div class="account-section">
              <div class="section-title">Security Settings</div>
              <div class="kv passwordRow">
                <span class="k">Password</span>
                <span class="v">
                  <span id="accountPasswordValue">••••••••</span> 
                  <button id="accountPassToggle" class="btnGhost small" type="button">Show</button>
                </span>
              </div>
              <div class="kv">
                <span class="k">Two-Factor Auth</span>
                <span class="v" id="drawerTwoFactor">Disabled</span>
              </div>
              <div class="actionsRow">
                <button id="btnOpenReset" class="btnPrimary small" type="button">Change Password</button>
                <button id="btnTwoFactor" class="btnSecondary small" type="button" disabled>Enable 2FA</button>
              </div>
            </div>

            <!-- Game Statistics Card -->
            <div class="account-section">
              <div class="section-title">Game Statistics</div>
              <div class="statsBlock">
                <div class="stat">
                  <svg class="stat-icon wins" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span class="stat-value" id="drawerWins">0</span>
                  <span class="stat-label">Wins</span>
                  <div class="stat-progress">
                    <div class="stat-progress-bar" id="winsProgress" style="width: 0%"></div>
                  </div>
                </div>
                <div class="stat">
                  <svg class="stat-icon losses" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 6.59L15.59 7 12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/>
                  </svg>
                  <span class="stat-value" id="drawerLosses">0</span>
                  <span class="stat-label">Losses</span>
                  <div class="stat-progress">
                    <div class="stat-progress-bar" id="lossesProgress" style="width: 0%"></div>
                  </div>
                </div>
                <div class="stat">
                  <svg class="stat-icon prisms" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l8 4v12l-8 4-8-4V6l8-4zm0 2.18L6.82 6 12 8.82 17.18 6 12 4.18zM5 7.5v8.66l6 3V10.5l-6-3zm8 11.66l6-3V7.5l-6 3v8.66z"/>
                  </svg>
                  <span class="stat-value" id="drawerPrisms">0</span>
                  <span class="stat-label">Prisms</span>
                  <div class="stat-progress">
                    <div class="stat-progress-bar" id="prismsProgress" style="width: 0%"></div>
                  </div>
                </div>
              </div>
              <div class="kv">
                <span class="k">Win Rate</span>
                <span class="v">
                  <div class="win-rate-display">
                    <div class="win-rate-circle" id="winRateCircle">
                      <span id="drawerWinRate">0%</span>
                    </div>
                  </div>
                </span>
              </div>
              <div class="kv">
                <span class="k">Total Games</span>
                <span class="v" id="drawerTotalGames">0</span>
              </div>
              <div class="kv">
                <span class="k">Average Score</span>
                <span class="v" id="drawerAvgScore">0</span>
              </div>
            </div>

            <!-- Account Actions Card -->
            <div class="account-section">
              <div class="section-title">Account Actions</div>
              <div class="actionsRow">
                <button id="btnRefreshAccount" class="btnTertiary small" type="button">Refresh Data</button>
                <button id="btnExportData" class="btnGhost small" type="button" disabled>Export Data</button>
              </div>
            </div>
          </section>
          
          <section id="panelLogout" role="tabpanel" hidden>
            <div class="account-section">
              <div class="section-title">Logout</div>
              <p class="muted" style="margin-bottom: var(--space-lg);">You will be returned to the landing screen and your session will be ended.</p>
              <div class="actionsRow">
                <button id="drawerLogoutBtn" class="btnSecondary" type="button">Log Out</button>
                <button id="btnCancelLogout" class="btnGhost" type="button" onclick="switchDrawerTab('account')">Cancel</button>
              </div>
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
        <h2 id="resetTitle">Change Password</h2>
        <p class="modal-description">Enter your current password and choose a new secure password.</p>
        <form id="resetForm" autocomplete="off">
          <div class="fieldRow">
            <label for="resetCurrent">Current Password</label>
            <input id="resetCurrent" type="password" minlength="1" required autocomplete="current-password" />
          </div>
          <div class="fieldRow">
            <label for="resetNew">New Password</label>
            <input id="resetNew" type="password" minlength="6" required autocomplete="new-password" />
            <div class="field-hint">Must be at least 6 characters with uppercase, number, and special character</div>
          </div>
          <div class="fieldRow">
            <label for="resetConfirm">Confirm New Password</label>
            <input id="resetConfirm" type="password" minlength="6" required autocomplete="new-password" />
          </div>
          <div class="modalActions">
            <button id="resetSubmit" class="btnPrimary" type="submit">Update Password</button>
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
    $('btnOpenReset')?.addEventListener('click', ()=>{ 
      openModal('modalResetPassword'); 
      $('resetCurrent')?.focus();
      // Clear any existing validation when opening
      ValidationSystem.clearValidation('resetCurrent')
      ValidationSystem.clearValidation('resetNew')
      ValidationSystem.clearValidation('resetConfirm')
      // Clear form
      $('resetForm')?.reset()
    })
    $('resetCancel')?.addEventListener('click', ()=> closeModal('modalResetPassword'))
    $('resetForm')?.addEventListener('submit', handleResetSubmit)
    
    // Real-time validation for password reset form
    $('resetCurrent')?.addEventListener('input', (e) => {
      const current = e.target.value
      if (current.length > 0) {
        ValidationSystem.clearValidation('resetCurrent')
      }
    })
    
    $('resetNew')?.addEventListener('input', (e) => {
      const newPassword = e.target.value
      if (newPassword.length > 0) {
        const validation = ValidationSystem.validatePasswordDetailed(newPassword)
        if (validation.valid) {
          ValidationSystem.showValidation('resetNew', validation.message, 'success')
        } else if (newPassword.length >= 3) {
          ValidationSystem.showValidation('resetNew', validation.message, 'error')
        }
        
        // Also validate confirm password if it has content
        const confirm = $('resetConfirm')?.value
        if (confirm) {
          const confirmValidation = ValidationSystem.validatePasswordConfirm(newPassword, confirm)
          if (confirmValidation.valid) {
            ValidationSystem.showValidation('resetConfirm', confirmValidation.message, 'success')
          } else {
            ValidationSystem.showValidation('resetConfirm', confirmValidation.message, 'error')
          }
        }
      } else {
        ValidationSystem.clearValidation('resetNew')
        ValidationSystem.clearValidation('resetConfirm')
      }
    })
    
    $('resetConfirm')?.addEventListener('input', (e) => {
      const confirm = e.target.value
      const newPassword = $('resetNew')?.value || ''
      
      if (confirm.length > 0) {
        const validation = ValidationSystem.validatePasswordConfirm(newPassword, confirm)
        if (validation.valid) {
          ValidationSystem.showValidation('resetConfirm', validation.message, 'success')
        } else {
          ValidationSystem.showValidation('resetConfirm', validation.message, 'error')
        }
      } else {
        ValidationSystem.clearValidation('resetConfirm')
      }
    })
    $('errorOk')?.addEventListener('click', ()=> closeModal('modalError'))
    $('successOk')?.addEventListener('click', ()=> closeModal('modalSuccess'))
    $('changelogClose')?.addEventListener('click', ()=> closeModal('modalChangelog'))
    $('btnChangelog')?.addEventListener('click', ()=> openModal('modalChangelog'))
    
    // Enhanced account actions
    $('btnRefreshAccount')?.addEventListener('click', async ()=>{
      const btn = $('btnRefreshAccount')
      const originalText = btn.textContent
      
      try {
        // Prevent multiple simultaneous refreshes
        if (AccountDataManager.isLoading('account-fetch')) {
          NotificationSystem.warning('Account refresh already in progress')
          return
        }
        
        btn.disabled = true
        btn.textContent = 'Refreshing...'
        btn.classList.add('loading')
        PageAnimations.showLoadingState('btnRefreshAccount')
        
        await refreshDrawerData(true) // Force refresh
        NotificationSystem.success('Account data refreshed!')
        
      } catch (e) {
        // Enhanced error handling for drawer refresh
        ErrorHandler.handleError(e, 'account-refresh')
      } finally {
        PageAnimations.hideLoadingState('btnRefreshAccount')
        btn.disabled = false
        btn.textContent = originalText
        btn.classList.remove('loading')
      }
    })
    
    $('accountPassToggle')?.addEventListener('click', ()=>{
      const span = $('accountPasswordValue')
      const t = $('accountPassToggle')
      const { on, p } = getRememberCreds()
      if (on && p){
        if (t.textContent === 'Show'){ span.textContent = p; t.textContent = 'Hide' }
        else { span.textContent = '••••••••'; t.textContent = 'Show' }
      } else {
        NotificationSystem.warning('Password not saved on this device. Use "Remember me" at login to enable Show.')
      }
    })
    
    // Placeholder for future features
    $('btnTwoFactor')?.addEventListener('click', ()=>{
      NotificationSystem.info('Two-factor authentication coming soon!')
    })
    
    $('btnExportData')?.addEventListener('click', ()=>{
      NotificationSystem.info('Data export feature coming soon!')
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

  // Enhanced real-time validation for login form
  $('loginUsername')?.addEventListener('input', (e) => {
    const username = e.target.value.trim()
    if (username.length > 0) {
      const validation = ValidationSystem.validateUsernameDetailed(username)
      if (validation.valid) {
        ValidationSystem.showValidation('loginUsername', validation.message, 'success')
      } else {
        ValidationSystem.showValidation('loginUsername', validation.message, 'error')
      }
    } else {
      ValidationSystem.clearValidation('loginUsername')
    }
  })

  $('loginPassword')?.addEventListener('input', (e) => {
    const password = e.target.value
    if (password.length > 0) {
      const validation = ValidationSystem.validatePasswordDetailed(password)
      if (validation.valid) {
        ValidationSystem.showValidation('loginPassword', validation.message, 'success')
      } else if (password.length >= 3) { // Only show detailed feedback after user starts typing
        ValidationSystem.showValidation('loginPassword', validation.message, 'error')
      }
    } else {
      ValidationSystem.clearValidation('loginPassword')
    }
  })

  // Enhanced real-time validation for signup form
  $('signupUsername')?.addEventListener('input', (e) => {
    const username = e.target.value.trim()
    if (username.length > 0) {
      const validation = ValidationSystem.validateUsernameDetailed(username)
      if (validation.valid) {
        ValidationSystem.showValidation('signupUsername', validation.message, 'success')
      } else {
        ValidationSystem.showValidation('signupUsername', validation.message, 'error')
      }
    } else {
      ValidationSystem.clearValidation('signupUsername')
    }
  })

  $('signupPassword')?.addEventListener('input', (e) => {
    const password = e.target.value
    if (password.length > 0) {
      const validation = ValidationSystem.validatePasswordDetailed(password)
      if (validation.valid) {
        ValidationSystem.showValidation('signupPassword', validation.message, 'success')
      } else if (password.length >= 3) {
        ValidationSystem.showValidation('signupPassword', validation.message, 'error')
      }
    } else {
      ValidationSystem.clearValidation('signupPassword')
    }
    
    // Also validate confirm password if it has content
    const confirm = $('signupConfirm')?.value
    if (confirm) {
      const confirmValidation = ValidationSystem.validatePasswordConfirm(password, confirm)
      if (confirmValidation.valid) {
        ValidationSystem.showValidation('signupConfirm', confirmValidation.message, 'success')
      } else {
        ValidationSystem.showValidation('signupConfirm', confirmValidation.message, 'error')
      }
    }
  })

  $('signupConfirm')?.addEventListener('input', (e) => {
    const confirm = e.target.value
    const password = $('signupPassword')?.value || ''
    
    if (confirm.length > 0) {
      const validation = ValidationSystem.validatePasswordConfirm(password, confirm)
      if (validation.valid) {
        ValidationSystem.showValidation('signupConfirm', validation.message, 'success')
      } else {
        ValidationSystem.showValidation('signupConfirm', validation.message, 'error')
      }
    } else {
      ValidationSystem.clearValidation('signupConfirm')
    }
  })

  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault()
    $('loginError').textContent=''
    const username = $('loginUsername').value.trim()
    const password = $('loginPassword').value
    const submitBtn = $('loginSubmit');
    const originalText = submitBtn.textContent;
    
    if(!validateUsername(username)){ openErrorModal('invalid_username'); return }
    if(password.length<6){ openErrorModal('invalid_password'); return }
    
    try{
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging In...';
      PageAnimations.showLoadingState('loginSubmit');
      
      const data = await postJSON('/api/login', { username, password }, 'login')
      state.user = { username:data.username, premium:data.premium||'none' }
      if($('loginRemember')?.checked) saveRememberCreds(username,password)
      closeModal('modalLogin')
      showMainMenu()
      
      // Fetch full account data and start periodic refresh
      try {
        await AccountDataManager.syncAllData(true)
        AccountDataManager.startPeriodicRefresh()
      } catch (syncError) {
        console.warn('Failed to sync account data after login:', syncError)
        NotificationSystem.warning('Logged in successfully, but failed to load account details')
      }
      
      NotificationSystem.success('Logged In!')
    }catch(err){
      ErrorHandler.handleError(err, 'login')
    }finally{
      // Reset loading state
      PageAnimations.hideLoadingState('loginSubmit');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  })

  $('signupForm').addEventListener('submit',async e=>{
    e.preventDefault()
    $('signupError').textContent=''
    const username = $('signupUsername').value.trim()
    const password = $('signupPassword').value
    const confirm = $('signupConfirm').value
    const submitBtn = $('signupSubmit');
    const originalText = submitBtn.textContent;
    
    if(!validateUsername(username)){ openErrorModal('invalid_username'); return }
    if(!validatePassword(password)){ openErrorModal('invalid_password'); return }
    if(password!==confirm){ openErrorModal('Passwords do not match'); return }
    
    try{
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';
      PageAnimations.showLoadingState('signupSubmit');
      
      const data = await postJSON('/api/signup', { username, password }, 'signup')
      state.user = { username:data.username, premium:'none' }
      closeModal('modalSignup')
      showMainMenu()
      
      // Fetch full account data and start periodic refresh
      try {
        await AccountDataManager.syncAllData(true)
        AccountDataManager.startPeriodicRefresh()
      } catch (syncError) {
        console.warn('Failed to sync account data after signup:', syncError)
        NotificationSystem.warning('Account created successfully, but failed to load account details')
      }
      
      NotificationSystem.success('Account Created!')
    }catch(err){
      ErrorHandler.handleError(err, 'signup')
    }finally{
      // Reset loading state
      PageAnimations.hideLoadingState('signupSubmit');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  })
}
function bindMainMenu(){
  $('btnRefresh').addEventListener('click',async()=>{
    const btn = $('btnRefresh');
    const originalText = btn.textContent;
    
    try{
      // Show loading state
      btn.disabled = true;
      btn.textContent = 'Refreshing...';
      PageAnimations.showLoadingState('btnRefresh');
      PageAnimations.showLoadingState('accountStats');
      
      // Use enhanced account data manager with force refresh
      await AccountDataManager.syncAllData(true)
      
      NotificationSystem.success('Account data refreshed!')
      
    }catch(e){
      ErrorHandler.handleError(e, 'account-refresh')
    }finally{
      // Hide loading state
      PageAnimations.hideLoadingState('btnRefresh');
      PageAnimations.hideLoadingState('accountStats');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  })

  $('btnLogout').addEventListener('click',async()=>{
    await doLogout()
  })

  const stall = btn => { btn.setAttribute('disabled','true'); setTimeout(()=>btn.removeAttribute('disabled'),180) }
  $('prevTank').addEventListener('click',()=>{ nudgeTank(-1); stall($('prevTank')) })
  $('nextTank').addEventListener('click',()=>{ nudgeTank(1); stall($('nextTank')) })

  $('btnBattle').addEventListener('click',()=>{
    if(!state.user){ NotificationSystem.warning('Please log in first'); return }
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

  window.__onMatchEnd = ()=>{ showMainMenu(); NotificationSystem.info('Match ended') }
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
  
  // Initialize connection monitoring
  ConnectionMonitor.init()
  
  // Check for existing session first
  try{
    const data = await AccountDataManager.fetchAccountData()
    if(data && data.username){
      state.user = { username: data.username, premium: data.premium || 'none' }
      showMainMenu()
      AccountDataManager.updateAccountUI(data)
      AccountDataManager.startPeriodicRefresh()
      return
    }
  }catch(e){
    console.log('No existing session found')
  }
  
  // Try auto-login with remembered credentials
  const { on, u, p } = getRememberCreds()
  if(on && u && p){
    try{
      const data = await postJSON('/api/login',{ username:u, password:p })
      state.user = { username:data.username, premium:data.premium||'none' }
      showMainMenu()
      
      // Fetch full account data and start periodic refresh
      try {
        await AccountDataManager.syncAllData(true)
        AccountDataManager.startPeriodicRefresh()
      } catch (syncError) {
        console.warn('Failed to sync account data after auto-login:', syncError)
      }
      
      NotificationSystem.success('Welcome Back!')
      return
    }catch(e){
      console.log('Auto-login failed:', e)
    }
  }
  
  showLanding()
}
// Handle visibility changes for better data management
document.addEventListener('visibilitychange', () => {
  if (state.user) {
    if (document.visibilityState === 'visible') {
      // Page became visible - refresh data if stale
      const cachedData = AccountDataManager.getCachedData()
      if (!cachedData) {
        AccountDataManager.syncAllData(false).catch(e => 
          console.warn('Failed to refresh data on visibility change:', e)
        )
      }
    }
  }
})

// Connection Status Monitor
const ConnectionMonitor = {
  statusElement: null,
  isOnline: navigator.onLine,
  
  init() {
    // Create status indicator
    this.statusElement = document.createElement('div')
    this.statusElement.className = 'connection-status'
    this.statusElement.id = 'connectionStatus'
    document.body.appendChild(this.statusElement)
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.setStatus('online'))
    window.addEventListener('offline', () => this.setStatus('offline'))
    
    // Initial status
    if (!navigator.onLine) {
      this.setStatus('offline')
    }
  },
  
  setStatus(status) {
    if (!this.statusElement) return
    
    this.statusElement.className = `connection-status ${status}`
    
    switch (status) {
      case 'online':
        this.statusElement.textContent = 'Connection restored'
        this.show()
        setTimeout(() => this.hide(), 3000)
        this.isOnline = true
        break
      case 'offline':
        this.statusElement.textContent = 'No internet connection'
        this.show()
        this.isOnline = false
        break
      case 'reconnecting':
        this.statusElement.textContent = 'Reconnecting...'
        this.show()
        break
    }
  },
  
  show() {
    if (this.statusElement) {
      this.statusElement.classList.add('show')
    }
  },
  
  hide() {
    if (this.statusElement) {
      this.statusElement.classList.remove('show')
    }
  }
}

// Handle page unload to clean up
window.addEventListener('beforeunload', () => {
  AccountDataManager.stopPeriodicRefresh()
})

// ===== ACCESSIBILITY ENHANCEMENTS =====

// Keyboard Navigation Manager
const KeyboardNavigation = {
  // Track if user is navigating with keyboard
  isKeyboardUser: false,
  
  // Initialize keyboard navigation
  init() {
    // Detect keyboard usage
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        this.isKeyboardUser = true
        document.body.classList.add('keyboard-navigation')
      }
    })
    
    // Detect mouse usage
    document.addEventListener('mousedown', () => {
      this.isKeyboardUser = false
      document.body.classList.remove('keyboard-navigation')
    })
    
    // Add skip link
    this.addSkipLink()
    
    // Setup modal focus trapping
    this.setupModalFocusTrapping()
    
    // Setup arrow key navigation for tank selector
    this.setupTankSelectorNavigation()
    
    // Setup form navigation
    this.setupFormNavigation()
  },
  
  // Add skip link for screen readers
  addSkipLink() {
    const skipLink = document.createElement('a')
    skipLink.href = '#mainContent'
    skipLink.className = 'skip-link'
    skipLink.textContent = 'Skip to main content'
    skipLink.addEventListener('click', (e) => {
      e.preventDefault()
      const target = document.getElementById('mainContent') || document.querySelector('main')
      if (target) {
        target.focus()
        target.scrollIntoView({ behavior: 'smooth' })
      }
    })
    document.body.insertBefore(skipLink, document.body.firstChild)
  },
  
  // Setup focus trapping for modals
  setupModalFocusTrapping() {
    const modals = ['modalLogin', 'modalSignup']
    
    modals.forEach(modalId => {
      const modal = $(modalId)
      if (!modal) return
      
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeModal(modalId)
          return
        }
        
        if (e.key === 'Tab') {
          this.trapFocus(e, modal)
        }
      })
    })
  },
  
  // Trap focus within modal
  trapFocus(e, modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  },
  
  // Setup tank selector arrow key navigation
  setupTankSelectorNavigation() {
    const tankCard = $('tankCard')
    if (!tankCard) return
    
    tankCard.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prevBtn = $('prevTank')
        if (prevBtn) prevBtn.click()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const nextBtn = $('nextTank')
        if (nextBtn) nextBtn.click()
      }
    })
    
    // Make tank card focusable
    tankCard.setAttribute('tabindex', '0')
    tankCard.setAttribute('role', 'listbox')
    tankCard.setAttribute('aria-label', 'Tank selection. Use arrow keys to navigate.')
  },
  
  // Setup form navigation enhancements
  setupFormNavigation() {
    // Auto-focus first input when modal opens
    const forms = document.querySelectorAll('form')
    forms.forEach(form => {
      const modal = form.closest('dialog')
      if (modal) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
              if (modal.hasAttribute('open')) {
                setTimeout(() => {
                  const firstInput = form.querySelector('input:not([type="hidden"])')
                  if (firstInput) firstInput.focus()
                }, 100)
              }
            }
          })
        })
        observer.observe(modal, { attributes: true })
      }
    })
    
    // Enhanced form validation feedback
    const inputs = document.querySelectorAll('input')
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateInput(input)
      })
      
      input.addEventListener('input', () => {
        // Clear validation on input
        const fieldRow = input.closest('.fieldRow')
        if (fieldRow) {
          fieldRow.classList.remove('valid', 'invalid')
          const validationMsg = fieldRow.querySelector('.validation-message')
          if (validationMsg) validationMsg.remove()
        }
      })
    })
  },
  
  // Validate individual input
  validateInput(input) {
    const fieldRow = input.closest('.fieldRow')
    if (!fieldRow) return
    
    let isValid = true
    let message = ''
    
    if (input.hasAttribute('required') && !input.value.trim()) {
      isValid = false
      message = 'This field is required'
    } else if (input.type === 'email' && input.value && !this.isValidEmail(input.value)) {
      isValid = false
      message = 'Please enter a valid email address'
    } else if (input.type === 'password' && input.value && input.value.length < 6) {
      isValid = false
      message = 'Password must be at least 6 characters'
    }
    
    if (isValid && input.value.trim()) {
      fieldRow.classList.add('valid')
      fieldRow.classList.remove('invalid')
    } else if (!isValid) {
      fieldRow.classList.add('invalid')
      fieldRow.classList.remove('valid')
      this.showValidationMessage(fieldRow, message)
    }
  },
  
  // Show validation message
  showValidationMessage(fieldRow, message) {
    // Remove existing message
    const existingMsg = fieldRow.querySelector('.validation-message')
    if (existingMsg) existingMsg.remove()
    
    // Add new message
    const msgEl = document.createElement('div')
    msgEl.className = 'validation-message error'
    msgEl.textContent = message
    msgEl.setAttribute('role', 'alert')
    fieldRow.appendChild(msgEl)
    
    // Show with animation
    setTimeout(() => msgEl.classList.add('show'), 10)
  },
  
  // Email validation helper
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}

// Focus Management System
const FocusManager = {
  // Stack to track focus history
  focusStack: [],
  
  // Save current focus
  saveFocus() {
    const activeElement = document.activeElement
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement)
    }
  },
  
  // Restore previous focus
  restoreFocus() {
    const previousFocus = this.focusStack.pop()
    if (previousFocus && typeof previousFocus.focus === 'function') {
      try {
        previousFocus.focus()
      } catch (e) {
        // Element might not be focusable anymore
        console.warn('Could not restore focus:', e)
      }
    }
  },
  
  // Focus first focusable element in container
  focusFirst(container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length > 0) {
      focusable[0].focus()
    }
  },
  
  // Announce to screen readers
  announce(message, priority = 'polite') {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message
    
    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }
}

// Enhanced Modal System with Accessibility
const AccessibleModal = {
  // Open modal with accessibility features
  async open(modalId) {
    const modal = $(modalId)
    if (!modal) return
    
    // Save current focus
    FocusManager.saveFocus()
    
    // Open modal with animation
    await ModalAnimations.openModal(modalId)
    
    // Set focus to first input or button
    setTimeout(() => {
      FocusManager.focusFirst(modal)
    }, 100)
    
    // Announce modal opening
    const title = modal.querySelector('h1, h2, h3, h4, h5, h6')
    if (title) {
      FocusManager.announce(`${title.textContent} dialog opened`)
    }
  },
  
  // Close modal with accessibility features
  async close(modalId) {
    const modal = $(modalId)
    if (!modal) return
    
    // Announce modal closing
    const title = modal.querySelector('h1, h2, h3, h4, h5, h6')
    if (title) {
      FocusManager.announce(`${title.textContent} dialog closed`)
    }
    
    // Close modal with animation
    await ModalAnimations.closeModal(modalId)
    
    // Restore previous focus
    FocusManager.restoreFocus()
  }
}

// Enhanced Notification System with Accessibility
const AccessibleNotifications = {
  // Show notification with accessibility features
  show(message, type = 'info', duration = 3000) {
    const notification = NotificationSystem.show(message, type, duration)
    
    // Announce to screen readers
    let priority = 'polite'
    if (type === 'error') priority = 'assertive'
    
    FocusManager.announce(message, priority)
    
    return notification
  },
  
  // Convenience methods
  success(message, duration = 3000) {
    return this.show(message, 'success', duration)
  },
  
  error(message, duration = 4000) {
    return this.show(message, 'error', duration)
  },
  
  warning(message, duration = 3500) {
    return this.show(message, 'warning', duration)
  },
  
  info(message, duration = 3000) {
    return this.show(message, 'info', duration)
  }
}

// Reduced Motion Detection
const MotionPreferences = {
  // Check if user prefers reduced motion
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  },
  
  // Initialize motion preferences
  init() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    // Set initial state
    this.updateMotionPreference(mediaQuery.matches)
    
    // Listen for changes
    mediaQuery.addEventListener('change', (e) => {
      this.updateMotionPreference(e.matches)
    })
  },
  
  // Update motion preference
  updateMotionPreference(reducedMotion) {
    if (reducedMotion) {
      document.body.classList.add('reduced-motion')
      // Disable complex animations
      document.documentElement.style.setProperty('--duration-fast', '0.01ms')
      document.documentElement.style.setProperty('--duration-normal', '0.01ms')
      document.documentElement.style.setProperty('--duration-slow', '0.01ms')
    } else {
      document.body.classList.remove('reduced-motion')
      // Restore normal animation durations
      document.documentElement.style.removeProperty('--duration-fast')
      document.documentElement.style.removeProperty('--duration-normal')
      document.documentElement.style.removeProperty('--duration-slow')
    }
  }
}

// Override existing modal functions with accessible versions
const originalOpenModal = window.openModal
const originalCloseModal = window.closeModal

window.openModal = function(modalId) {
  return AccessibleModal.open(modalId)
}

window.closeModal = function(modalId) {
  return AccessibleModal.close(modalId)
}

// Override notification system
window.notify = function(message, type = 'success') {
  return AccessibleNotifications.show(message, type)
}

// ===== ANIMATION PERFORMANCE OPTIMIZATION =====

// Performance Monitor
const PerformanceMonitor = {
  // Performance metrics
  metrics: {
    fps: 0,
    frameTime: 0,
    animationCount: 0,
    lastFrameTime: 0
  },
  
  // Performance thresholds
  thresholds: {
    lowFPS: 30,
    highFrameTime: 33.33, // 30fps = 33.33ms per frame
    maxAnimations: 10
  },
  
  // Monitor element
  monitor: null,
  
  // Initialize performance monitoring
  init() {
    if (this.isDebugMode()) {
      this.createMonitor()
      this.startMonitoring()
    }
    
    this.optimizeForDevice()
    this.setupAnimationOptimization()
  },
  
  // Check if debug mode is enabled
  isDebugMode() {
    return localStorage.getItem('debug-performance') === 'true' || 
           window.location.search.includes('debug=performance')
  },
  
  // Create performance monitor UI
  createMonitor() {
    this.monitor = document.createElement('div')
    this.monitor.className = 'performance-monitor'
    this.monitor.innerHTML = `
      <div>FPS: <span id="fps-counter">--</span></div>
      <div>Frame: <span id="frame-time">--</span>ms</div>
      <div>Anims: <span id="anim-counter">0</span></div>
    `
    document.body.appendChild(this.monitor)
    
    // Show monitor
    setTimeout(() => this.monitor.classList.add('show'), 100)
  },
  
  // Start performance monitoring
  startMonitoring() {
    let frameCount = 0
    let lastTime = performance.now()
    
    const monitor = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime
      
      frameCount++
      
      // Update FPS every second
      if (deltaTime >= 1000) {
        this.metrics.fps = Math.round((frameCount * 1000) / deltaTime)
        this.metrics.frameTime = deltaTime / frameCount
        
        this.updateMonitorDisplay()
        this.checkPerformance()
        
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(monitor)
    }
    
    requestAnimationFrame(monitor)
  },
  
  // Update monitor display
  updateMonitorDisplay() {
    if (!this.monitor) return
    
    const fpsEl = this.monitor.querySelector('#fps-counter')
    const frameEl = this.monitor.querySelector('#frame-time')
    const animEl = this.monitor.querySelector('#anim-counter')
    
    if (fpsEl) fpsEl.textContent = this.metrics.fps
    if (frameEl) frameEl.textContent = this.metrics.frameTime.toFixed(1)
    if (animEl) animEl.textContent = this.metrics.animationCount
    
    // Update monitor status
    this.monitor.classList.remove('warning', 'error')
    if (this.metrics.fps < this.thresholds.lowFPS) {
      this.monitor.classList.add('warning')
    }
    if (this.metrics.fps < 20) {
      this.monitor.classList.add('error')
    }
  },
  
  // Check performance and optimize if needed
  checkPerformance() {
    if (this.metrics.fps < this.thresholds.lowFPS) {
      this.optimizeAnimations()
    }
    
    if (this.metrics.animationCount > this.thresholds.maxAnimations) {
      this.reduceAnimations()
    }
  },
  
  // Optimize for current device
  optimizeForDevice() {
    const deviceInfo = this.getDeviceInfo()
    
    if (deviceInfo.isLowEnd) {
      this.applyLowEndOptimizations()
    }
    
    if (deviceInfo.isMobile) {
      this.applyMobileOptimizations()
    }
    
    if (deviceInfo.hasHighRefreshRate) {
      this.applyHighRefreshRateOptimizations()
    }
  },
  
  // Get device information
  getDeviceInfo() {
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
    const isLowEnd = navigator.hardwareConcurrency <= 2 || navigator.deviceMemory <= 2
    const hasHighRefreshRate = window.screen && window.screen.refreshRate > 60
    
    return {
      isMobile,
      isLowEnd,
      hasHighRefreshRate,
      cores: navigator.hardwareConcurrency || 1,
      memory: navigator.deviceMemory || 1
    }
  },
  
  // Apply low-end device optimizations
  applyLowEndOptimizations() {
    document.documentElement.style.setProperty('--duration-fast', '50ms')
    document.documentElement.style.setProperty('--duration-normal', '150ms')
    document.documentElement.style.setProperty('--duration-slow', '250ms')
    
    // Disable complex background animations
    const bgGrid = document.getElementById('bgGrid')
    if (bgGrid) {
      bgGrid.style.animation = 'none'
      bgGrid.style.backgroundImage = 'linear-gradient(135deg, #0b0d12 0%, #131722 50%, #0f1419 100%)'
    }
    
    // Disable particle effects
    const landingInner = document.getElementById('landingInner')
    if (landingInner) {
      const style = document.createElement('style')
      style.textContent = '#landingInner::before { display: none !important; }'
      document.head.appendChild(style)
    }
  },
  
  // Apply mobile optimizations
  applyMobileOptimizations() {
    document.documentElement.style.setProperty('--duration-fast', '100ms')
    document.documentElement.style.setProperty('--duration-normal', '200ms')
    document.documentElement.style.setProperty('--duration-slow', '300ms')
    
    // Reduce animation complexity
    const style = document.createElement('style')
    style.textContent = `
      #bgGrid { animation-duration: 40s !important; }
      #landingInner::before { opacity: 0.4 !important; animation-duration: 12s !important; }
    `
    document.head.appendChild(style)
  },
  
  // Apply high refresh rate optimizations
  applyHighRefreshRateOptimizations() {
    document.documentElement.style.setProperty('--duration-fast', '120ms')
    document.documentElement.style.setProperty('--duration-normal', '250ms')
    document.documentElement.style.setProperty('--duration-slow', '400ms')
  },
  
  // Setup animation optimization
  setupAnimationOptimization() {
    // Track running animations
    this.trackAnimations()
    
    // Optimize animation timing
    this.optimizeAnimationTiming()
    
    // Setup intersection observer for performance
    this.setupIntersectionOptimization()
  },
  
  // Track running animations
  trackAnimations() {
    const originalAnimate = Element.prototype.animate
    const self = this
    
    Element.prototype.animate = function(...args) {
      self.metrics.animationCount++
      const animation = originalAnimate.apply(this, args)
      
      animation.addEventListener('finish', () => {
        self.metrics.animationCount = Math.max(0, self.metrics.animationCount - 1)
      })
      
      animation.addEventListener('cancel', () => {
        self.metrics.animationCount = Math.max(0, self.metrics.animationCount - 1)
      })
      
      return animation
    }
  },
  
  // Optimize animation timing based on performance
  optimizeAnimationTiming() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' && entry.duration > 16.67) {
          // Frame took longer than 60fps, optimize
          this.reduceAnimationComplexity()
        }
      })
    })
    
    if (window.PerformanceObserver) {
      observer.observe({ entryTypes: ['measure'] })
    }
  },
  
  // Setup intersection observer for performance
  setupIntersectionOptimization() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target
        
        if (entry.isIntersecting) {
          // Element is visible, enable animations
          element.classList.remove('animation-paused')
        } else {
          // Element is not visible, pause animations
          element.classList.add('animation-paused')
        }
      })
    }, {
      rootMargin: '50px'
    })
    
    // Observe animated elements
    const animatedElements = document.querySelectorAll('.animate-gpu, [class*="animate"]')
    animatedElements.forEach(el => observer.observe(el))
  },
  
  // Optimize animations when performance is low
  optimizeAnimations() {
    // Reduce animation durations
    document.documentElement.style.setProperty('--duration-fast', '50ms')
    document.documentElement.style.setProperty('--duration-normal', '100ms')
    document.documentElement.style.setProperty('--duration-slow', '200ms')
    
    // Disable non-essential animations
    const nonEssentialAnimations = document.querySelectorAll('.particle-effect, .background-animation')
    nonEssentialAnimations.forEach(el => {
      el.style.animation = 'none'
    })
  },
  
  // Reduce number of concurrent animations
  reduceAnimations() {
    const runningAnimations = document.querySelectorAll('[style*="animation"]')
    
    // Cancel oldest animations first
    Array.from(runningAnimations)
      .slice(0, Math.max(0, runningAnimations.length - this.thresholds.maxAnimations))
      .forEach(el => {
        el.style.animation = 'none'
      })
  },
  
  // Reduce animation complexity
  reduceAnimationComplexity() {
    // Switch to simpler animations
    const style = document.createElement('style')
    style.textContent = `
      .modal-entering { animation: optimizedFadeIn var(--duration-fast) ease-out both !important; }
      .modal-exiting { animation: optimizedFadeOut var(--duration-fast) ease-in both !important; }
      .notify-entering { animation: optimizedSlideUp var(--duration-fast) ease-out both !important; }
      .notify.leaving { animation: optimizedSlideDown var(--duration-fast) ease-in both !important; }
    `
    document.head.appendChild(style)
  }
}

// Animation Queue Manager
const AnimationQueue = {
  // Queue of pending animations
  queue: [],
  
  // Currently running animations
  running: new Set(),
  
  // Maximum concurrent animations
  maxConcurrent: 5,
  
  // Add animation to queue
  add(element, animationConfig, priority = 0) {
    const animation = {
      element,
      config: animationConfig,
      priority,
      id: Math.random().toString(36).substr(2, 9)
    }
    
    this.queue.push(animation)
    this.queue.sort((a, b) => b.priority - a.priority)
    
    this.processQueue()
    
    return animation.id
  },
  
  // Process animation queue
  processQueue() {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const animation = this.queue.shift()
      this.runAnimation(animation)
    }
  },
  
  // Run individual animation
  runAnimation(animation) {
    this.running.add(animation.id)
    
    const webAnimation = animation.element.animate(
      animation.config.keyframes,
      animation.config.options
    )
    
    webAnimation.addEventListener('finish', () => {
      this.running.delete(animation.id)
      this.processQueue()
    })
    
    webAnimation.addEventListener('cancel', () => {
      this.running.delete(animation.id)
      this.processQueue()
    })
    
    return webAnimation
  },
  
  // Cancel animation
  cancel(animationId) {
    // Remove from queue
    this.queue = this.queue.filter(anim => anim.id !== animationId)
    
    // Remove from running
    this.running.delete(animationId)
    
    this.processQueue()
  },
  
  // Clear all animations
  clear() {
    this.queue = []
    this.running.clear()
  }
}

// Browser Compatibility Manager
const BrowserCompatibility = {
  // Check browser capabilities
  init() {
    this.checkAnimationSupport()
    this.checkPerformanceSupport()
    this.applyFallbacks()
  },
  
  // Check animation support
  checkAnimationSupport() {
    const testEl = document.createElement('div')
    
    // Check for CSS animation support
    const hasAnimations = 'animation' in testEl.style
    const hasTransitions = 'transition' in testEl.style
    const hasTransforms = 'transform' in testEl.style
    const hasWillChange = 'willChange' in testEl.style
    
    if (!hasAnimations || !hasTransitions || !hasTransforms) {
      document.body.classList.add('no-animations')
    }
    
    if (!hasWillChange) {
      document.body.classList.add('no-will-change')
    }
  },
  
  // Check performance API support
  checkPerformanceSupport() {
    if (!window.performance || !window.performance.now) {
      document.body.classList.add('no-performance-api')
    }
    
    if (!window.requestAnimationFrame) {
      document.body.classList.add('no-raf')
    }
    
    if (!window.IntersectionObserver) {
      document.body.classList.add('no-intersection-observer')
    }
  },
  
  // Apply fallbacks for unsupported features
  applyFallbacks() {
    // Fallback for browsers without animation support
    if (document.body.classList.contains('no-animations')) {
      const style = document.createElement('style')
      style.textContent = `
        .modal-entering, .modal-exiting,
        .notify-entering, .notify.leaving,
        .page-entering, .page-exiting,
        .tab-entering, .tab-exiting,
        .reveal-animate {
          animation: none !important;
          transition: none !important;
        }
      `
      document.head.appendChild(style)
    }
    
    // Fallback for requestAnimationFrame
    if (document.body.classList.contains('no-raf')) {
      window.requestAnimationFrame = function(callback) {
        return setTimeout(callback, 16.67)
      }
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id)
      }
    }
  }
}

// ===== DEPLOYMENT READINESS SYSTEM =====

// Production Polish Manager
const ProductionPolish = {
  // Initialize production polish features
  init() {
    this.validateConsistency()
    this.optimizeForProduction()
    this.setupQualityAssurance()
    this.finalizeDeploymentReadiness()
  },
  
  // Validate visual consistency
  validateConsistency() {
    // Check for consistent spacing
    this.validateSpacing()
    
    // Check for consistent typography
    this.validateTypography()
    
    // Check for consistent colors
    this.validateColors()
    
    // Check for consistent animations
    this.validateAnimations()
  },
  
  // Validate spacing consistency
  validateSpacing() {
    const elements = document.querySelectorAll('*')
    const spacingIssues = []
    
    elements.forEach(el => {
      const styles = getComputedStyle(el)
      const margin = styles.margin
      const padding = styles.padding
      
      // Check for non-standard spacing values
      if (margin && !this.isStandardSpacing(margin)) {
        spacingIssues.push({ element: el, property: 'margin', value: margin })
      }
      if (padding && !this.isStandardSpacing(padding)) {
        spacingIssues.push({ element: el, property: 'padding', value: padding })
      }
    })
    
    if (spacingIssues.length > 0 && this.isDebugMode()) {
      console.warn('Spacing consistency issues found:', spacingIssues)
    }
  },
  
  // Check if spacing value follows design system
  isStandardSpacing(value) {
    const standardValues = ['0px', '4px', '8px', '16px', '24px', '32px', '48px', '64px']
    return standardValues.some(standard => value.includes(standard))
  },
  
  // Validate typography consistency
  validateTypography() {
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, button, input, label')
    const typographyIssues = []
    
    textElements.forEach(el => {
      const styles = getComputedStyle(el)
      const fontSize = styles.fontSize
      const fontWeight = styles.fontWeight
      const lineHeight = styles.lineHeight
      
      // Check for non-standard font sizes
      if (!this.isStandardFontSize(fontSize)) {
        typographyIssues.push({ element: el, property: 'fontSize', value: fontSize })
      }
      
      // Check for non-standard font weights
      if (!this.isStandardFontWeight(fontWeight)) {
        typographyIssues.push({ element: el, property: 'fontWeight', value: fontWeight })
      }
    })
    
    if (typographyIssues.length > 0 && this.isDebugMode()) {
      console.warn('Typography consistency issues found:', typographyIssues)
    }
  },
  
  // Check if font size follows design system
  isStandardFontSize(value) {
    const standardSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px']
    return standardSizes.includes(value)
  },
  
  // Check if font weight follows design system
  isStandardFontWeight(value) {
    const standardWeights = ['300', '400', '500', '600', '700', '800', '900']
    return standardWeights.includes(value)
  },
  
  // Validate color consistency
  validateColors() {
    const coloredElements = document.querySelectorAll('*')
    const colorIssues = []
    
    coloredElements.forEach(el => {
      const styles = getComputedStyle(el)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      
      // Check for hardcoded colors instead of CSS variables
      if (this.isHardcodedColor(color)) {
        colorIssues.push({ element: el, property: 'color', value: color })
      }
      if (this.isHardcodedColor(backgroundColor)) {
        colorIssues.push({ element: el, property: 'backgroundColor', value: backgroundColor })
      }
    })
    
    if (colorIssues.length > 0 && this.isDebugMode()) {
      console.warn('Color consistency issues found:', colorIssues)
    }
  },
  
  // Check if color is hardcoded instead of using CSS variables
  isHardcodedColor(value) {
    return value && 
           value !== 'rgba(0, 0, 0, 0)' && 
           value !== 'transparent' && 
           value !== 'inherit' && 
           value !== 'initial' && 
           !value.includes('var(')
  },
  
  // Validate animation consistency
  validateAnimations() {
    const animatedElements = document.querySelectorAll('[style*="animation"], [class*="animate"]')
    const animationIssues = []
    
    animatedElements.forEach(el => {
      const styles = getComputedStyle(el)
      const animationDuration = styles.animationDuration
      const transitionDuration = styles.transitionDuration
      
      // Check for non-standard animation durations
      if (animationDuration && !this.isStandardDuration(animationDuration)) {
        animationIssues.push({ element: el, property: 'animationDuration', value: animationDuration })
      }
      if (transitionDuration && !this.isStandardDuration(transitionDuration)) {
        animationIssues.push({ element: el, property: 'transitionDuration', value: transitionDuration })
      }
    })
    
    if (animationIssues.length > 0 && this.isDebugMode()) {
      console.warn('Animation consistency issues found:', animationIssues)
    }
  },
  
  // Check if duration follows design system
  isStandardDuration(value) {
    const standardDurations = ['0.15s', '0.3s', '0.5s', '0.75s', '150ms', '300ms', '500ms', '750ms']
    return standardDurations.includes(value) || value === '0s'
  },
  
  // Optimize for production
  optimizeForProduction() {
    // Remove debug classes
    document.body.classList.remove('debug', 'development')
    
    // Add production class
    document.body.classList.add('production')
    
    // Optimize images
    this.optimizeImages()
    
    // Optimize fonts
    this.optimizeFonts()
    
    // Clean up unused styles
    this.cleanupStyles()
  },
  
  // Optimize images for production
  optimizeImages() {
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      // Add loading optimization
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy')
      }
      
      // Add decoding optimization
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async')
      }
    })
  },
  
  // Optimize fonts for production
  optimizeFonts() {
    // Preload critical fonts
    const criticalFonts = [
      'Inter-Regular.woff2',
      'Inter-Medium.woff2',
      'Inter-SemiBold.woff2'
    ]
    
    criticalFonts.forEach(font => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.href = `/fonts/${font}`
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  },
  
  // Clean up unused styles
  cleanupStyles() {
    // Remove development-only styles
    const devStyles = document.querySelectorAll('style[data-dev]')
    devStyles.forEach(style => style.remove())
    
    // Optimize CSS custom properties
    this.optimizeCSSProperties()
  },
  
  // Optimize CSS custom properties
  optimizeCSSProperties() {
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    
    // Remove unused CSS variables (this is a simplified check)
    const allProperties = Array.from(computedStyle).filter(prop => prop.startsWith('--'))
    const usedProperties = new Set()
    
    // Check which properties are actually used
    const allElements = document.querySelectorAll('*')
    allElements.forEach(el => {
      const styles = getComputedStyle(el)
      allProperties.forEach(prop => {
        const value = styles.getPropertyValue(prop)
        if (value && value.includes('var(')) {
          usedProperties.add(prop)
        }
      })
    })
    
    if (this.isDebugMode()) {
      const unusedProperties = allProperties.filter(prop => !usedProperties.has(prop))
      if (unusedProperties.length > 0) {
        console.info('Unused CSS properties found:', unusedProperties)
      }
    }
  },
  
  // Setup quality assurance
  setupQualityAssurance() {
    // Monitor for runtime errors
    this.setupErrorMonitoring()
    
    // Monitor performance
    this.setupPerformanceMonitoring()
    
    // Monitor accessibility
    this.setupAccessibilityMonitoring()
  },
  
  // Setup error monitoring
  setupErrorMonitoring() {
    window.addEventListener('error', (event) => {
      console.error('Runtime error:', event.error)
      
      // In production, you might want to send this to an error tracking service
      if (this.isProduction()) {
        this.reportError(event.error)
      }
    })
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      if (this.isProduction()) {
        this.reportError(event.reason)
      }
    })
  },
  
  // Setup performance monitoring
  setupPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            console.info('Page load performance:', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              totalTime: entry.loadEventEnd - entry.navigationStart
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['navigation'] })
    }
  },
  
  // Setup accessibility monitoring
  setupAccessibilityMonitoring() {
    // Check for missing alt attributes
    const images = document.querySelectorAll('img:not([alt])')
    if (images.length > 0) {
      console.warn('Images missing alt attributes:', images)
    }
    
    // Check for missing labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
    const unlabeledInputs = Array.from(inputs).filter(input => {
      const label = document.querySelector(`label[for="${input.id}"]`)
      return !label
    })
    
    if (unlabeledInputs.length > 0) {
      console.warn('Inputs missing labels:', unlabeledInputs)
    }
    
    // Check for proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let lastLevel = 0
    const hierarchyIssues = []
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1))
      if (level > lastLevel + 1) {
        hierarchyIssues.push(heading)
      }
      lastLevel = level
    })
    
    if (hierarchyIssues.length > 0) {
      console.warn('Heading hierarchy issues:', hierarchyIssues)
    }
  },
  
  // Finalize deployment readiness
  finalizeDeploymentReadiness() {
    // Run final checks
    const checks = [
      this.checkCriticalElements(),
      this.checkPerformanceMetrics(),
      this.checkAccessibilityCompliance(),
      this.checkBrowserCompatibility()
    ]
    
    Promise.all(checks).then(results => {
      const allPassed = results.every(result => result.passed)
      
      if (allPassed) {
        document.body.classList.add('deployment-ready')
        console.info('✅ Application is ready for deployment')
        
        // Announce readiness
        if (FocusManager) {
          FocusManager.announce('Application fully loaded and optimized')
        }
      } else {
        console.warn('❌ Application has issues that should be resolved before deployment')
        results.forEach(result => {
          if (!result.passed) {
            console.warn(`- ${result.check}: ${result.message}`)
          }
        })
      }
    })
  },
  
  // Check critical elements
  checkCriticalElements() {
    return new Promise(resolve => {
      const criticalElements = ['landing', 'mainMenu', 'btnLogin', 'btnSignup', 'btnBattle']
      const missing = criticalElements.filter(id => !document.getElementById(id))
      
      resolve({
        check: 'Critical Elements',
        passed: missing.length === 0,
        message: missing.length > 0 ? `Missing elements: ${missing.join(', ')}` : 'All critical elements present'
      })
    })
  },
  
  // Check performance metrics
  checkPerformanceMetrics() {
    return new Promise(resolve => {
      if (PerformanceMonitor && PerformanceMonitor.metrics) {
        const fps = PerformanceMonitor.metrics.fps
        const passed = fps >= 30 || fps === 0 // 0 means not measured yet
        
        resolve({
          check: 'Performance',
          passed,
          message: passed ? `FPS: ${fps}` : `Low FPS: ${fps}`
        })
      } else {
        resolve({
          check: 'Performance',
          passed: true,
          message: 'Performance monitoring not available'
        })
      }
    })
  },
  
  // Check accessibility compliance
  checkAccessibilityCompliance() {
    return new Promise(resolve => {
      const issues = []
      
      // Check for missing alt attributes
      const imagesWithoutAlt = document.querySelectorAll('img:not([alt])')
      if (imagesWithoutAlt.length > 0) {
        issues.push(`${imagesWithoutAlt.length} images missing alt attributes`)
      }
      
      // Check for missing form labels
      const unlabeledInputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
      const unlabeled = Array.from(unlabeledInputs).filter(input => {
        return !document.querySelector(`label[for="${input.id}"]`)
      })
      if (unlabeled.length > 0) {
        issues.push(`${unlabeled.length} inputs missing labels`)
      }
      
      resolve({
        check: 'Accessibility',
        passed: issues.length === 0,
        message: issues.length > 0 ? issues.join(', ') : 'Accessibility checks passed'
      })
    })
  },
  
  // Check browser compatibility
  checkBrowserCompatibility() {
    return new Promise(resolve => {
      const features = [
        { name: 'CSS Grid', test: () => CSS.supports('display', 'grid') },
        { name: 'CSS Flexbox', test: () => CSS.supports('display', 'flex') },
        { name: 'CSS Custom Properties', test: () => CSS.supports('--test', 'value') },
        { name: 'Fetch API', test: () => 'fetch' in window },
        { name: 'Promise', test: () => 'Promise' in window },
        { name: 'Arrow Functions', test: () => {
          try { eval('() => {}'); return true } catch { return false }
        }}
      ]
      
      const unsupported = features.filter(feature => !feature.test())
      
      resolve({
        check: 'Browser Compatibility',
        passed: unsupported.length === 0,
        message: unsupported.length > 0 ? 
          `Unsupported features: ${unsupported.map(f => f.name).join(', ')}` : 
          'All features supported'
      })
    })
  },
  
  // Report error to monitoring service
  reportError(error) {
    // In a real application, you would send this to your error tracking service
    console.error('Reported error:', error)
  },
  
  // Check if in debug mode
  isDebugMode() {
    return localStorage.getItem('debug') === 'true' || 
           window.location.search.includes('debug=true')
  },
  
  // Check if in production
  isProduction() {
    return !this.isDebugMode() && 
           window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('127.0.0.1')
  }
}

// Initialize all systems
document.addEventListener('DOMContentLoaded', () => {
  KeyboardNavigation.init()
  MotionPreferences.init()
  PerformanceMonitor.init()
  BrowserCompatibility.init()
  ProductionPolish.init()
  
  // Add ARIA live regions if they don't exist
  if (!$('notifyStack')) {
    const notifyStack = document.createElement('div')
    notifyStack.id = 'notifyStack'
    notifyStack.setAttribute('aria-live', 'polite')
    notifyStack.setAttribute('aria-atomic', 'false')
    document.body.appendChild(notifyStack)
  }
  
  // Ensure proper heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `heading-${index + 1}`
    }
  })
  
  // Add landmark roles where missing
  const main = document.querySelector('main')
  if (main && !main.getAttribute('role')) {
    main.setAttribute('role', 'main')
  }
  
  // Announce page load completion
  setTimeout(() => {
    FocusManager.announce('Page loaded successfully')
  }, 1000)
})

document.addEventListener('DOMContentLoaded', boot)
