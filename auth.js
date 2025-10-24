// auth.js

// helper: SHA-256 hash (returns hex string)
async function hashPassword(password) {
  if (window.crypto && crypto.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
    return hashHex;
  } else {
    // fallback (less secure) - base64
    return btoa(password);
  }
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem('users_v1')) || [];
  } catch(e) {
    return [];
  }
}

function saveUsers(arr) {
  localStorage.setItem('users_v1', JSON.stringify(arr));
}

function setCurrentUser(user) {
  // store minimal public info
  localStorage.setItem('current_user', JSON.stringify({ id: user.id, name: user.name, email: user.email }));
}

function getNextUserId() {
  const users = loadUsers();
  return users.length ? Math.max(...users.map(u=>u.id)) + 1 : 1;
}

/* DOM */
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const signupMsg = document.getElementById('signupMsg');
const loginMsg = document.getElementById('loginMsg');

function showLogin() {
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
}
function showSignup() {
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
}

tabLogin.addEventListener('click', showLogin);
tabSignup.addEventListener('click', showSignup);

/* Signup handler */
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupMsg.textContent = '';
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const pass = document.getElementById('signupPass').value;
  const pass2 = document.getElementById('signupPass2').value;

  if (!name || !email || !pass) { signupMsg.textContent = 'Please fill all fields.'; return; }
  if (pass.length < 6) { signupMsg.textContent = 'Password must be 6+ characters.'; return; }
  if (pass !== pass2) { signupMsg.textContent = "Passwords don't match."; return; }

  const users = loadUsers();
  if (users.some(u => u.email === email)) { signupMsg.textContent = 'An account with this email already exists.'; return; }

  const passHash = await hashPassword(pass);
  const newUser = { id: getNextUserId(), name, email, passwordHash: passHash, createdAt: Date.now() };
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);

  // success -> go to store
  window.location.href = 'index.html';
});

/* Login handler */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMsg.textContent = '';
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;

  if (!email || !pass) { loginMsg.textContent = 'Please enter email and password.'; return; }

  const users = loadUsers();
  const passHash = await hashPassword(pass);
  const user = users.find(u => u.email === email && u.passwordHash === passHash);

  if (!user) {
    loginMsg.textContent = 'Invalid credentials.';
    return;
  }

  setCurrentUser(user);
  window.location.href = 'index.html';
});

/* If user is already logged in, go to store quickly */
(function init() {
  try {
    const cur = localStorage.getItem('current_user');
    if (cur) {
      // already logged in - redirect to store
      // (user can click "Back to store" if they want to change account)
      // window.location.href = 'index.html';
    }
  } catch(e){}
})();
