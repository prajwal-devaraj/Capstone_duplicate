
// Lightweight 'auth' & navigation helpers using localStorage (to mimic src/lib/auth.ts)
const KEY='ss_user', ONB='ss_onboarding';

function getUser(){ try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function setUser(u){ localStorage.setItem(KEY, JSON.stringify(u)) }
function clearUser(){ localStorage.removeItem(KEY); setOnboarding('none') }
function isAuthed(){ return !!getUser() }
function getOnboarding(){ return localStorage.getItem(ONB) || 'none' }
function setOnboarding(s){ localStorage.setItem(ONB, s) }

// Protect pages that require auth: call protect() on those pages
function protect(){
  if(!isAuthed()){
    // keep where we tried to go
    sessionStorage.setItem('redirect_after_login', location.pathname);
    location.href = '/login.html';
  }
}

// Simple helpers
function qs(sel){ return document.querySelector(sel) }
function qsa(sel){ return [...document.querySelectorAll(sel)] }

// Shared UI actions
function logout(){
  clearUser();
  location.href = '/login.html';
}

function renderSidebar(active){
  const el = qs('#sidebar');
  if(!el) return;
  el.innerHTML = `
    <div class="card" style="position:sticky; top:16px">
      <h2 style="margin-top:0">SmartSpend</h2>
      <div class="grid" style="gap:8px">
        ${link('Dashboard','/dashboard.html', active)}
        ${link('Transactions','/transactions.html', active)}
        ${link('Bills','/bills.html', active)}
        ${link('Insights','/insights.html', active)}
        ${link('Goals','/goals.html', active)}
        ${link('Accumulates','/accumulates.html', active)}
        <div class="badge">Profile</div>
        ${link('Overview','/profile.html', active)}
        ${link('Notifications','/profile-notifications.html', active)}
        ${link('Goal Prefs','/profile-goals.html', active)}
      </div>
      <div style="margin-top:16px">
        <button onclick="logout()">Log out</button>
      </div>
    </div>`;
  function link(label,href,active){
    const cls = href.endsWith(active) ? 'style="border-color:#38bdf8"' : '';
    return `<a ${cls} href="${href}">${label}</a>`
  }
}
