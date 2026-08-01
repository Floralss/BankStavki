// BLACK SOCIAL v5 — full fix
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, query, orderBy, limit, where, serverTimestamp, enableNetwork, disableNetwork } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBGFONUBgybQr0KCn_Ao_ZT9HkWVSU4jEw",
  authDomain: "black-social-af844.firebaseapp.com",
  projectId: "black-social-af844",
  storageBucket: "black-social-af844.firebasestorage.app",
  messagingSenderId: "296441938682",
  appId: "1:296441938682:web:096a3e642bd00116f7bf43",
  measurementId: "G-2PX2QMR8HS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const OWNER_EMAIL = "strepoomich27@gmail.com";

const DEFAULT_RANKS = [
  { id: "newbie", name: "Новичок", badge: "НОВИЧОК", color: "#6b6b7b", permissions: { canCreateTopic: true, canReply: true, canModerate: false, canManageUsers: false, canManageRanks: false, isAdmin: false, isOwner: false } },
  { id: "member", name: "Участник", badge: "УЧАСТНИК", color: "#3b82f6", permissions: { canCreateTopic: true, canReply: true, canModerate: false, canManageUsers: false, canManageRanks: false, isAdmin: false, isOwner: false } },
  { id: "leader", name: "Лидер", badge: "ЛИДЕР", color: "#f5c518", permissions: { canCreateTopic: true, canReply: true, canModerate: true, canManageUsers: false, canManageRanks: false, isAdmin: false, isOwner: false } },
  { id: "admin", name: "Администратор", badge: "ADMIN", color: "#ef4444", permissions: { canCreateTopic: true, canReply: true, canModerate: true, canManageUsers: true, canManageRanks: true, isAdmin: true, isOwner: false } },
  { id: "owner", name: "Владелец", badge: "ВЛАДЕЛЕЦ", color: "#a855f7", permissions: { canCreateTopic: true, canReply: true, canModerate: true, canManageUsers: true, canManageRanks: true, isAdmin: true, isOwner: true } }
];

const DEFAULT_CATEGORIES = [
  { id: "news", title: "Новости и объявления", description: "Официальные новости проекта", icon: "📢", order: 1 },
  { id: "general", title: "Общий раздел", description: "Свободное общение", icon: "💬", order: 2 },
  { id: "rp", title: "RolePlay", description: "RP-ситуации, биографии, отыгровки", icon: "🎭", order: 3 },
  { id: "orgs", title: "Организации", description: "Фракции, семьи, группировки", icon: "🏛️", order: 4 },
  { id: "help", title: "Помощь и жалобы", description: "Техническая поддержка и жалобы", icon: "🛡️", order: 5 }
];

let currentUser = null;
let currentUserData = null;
let ranksCache = {};
DEFAULT_RANKS.forEach(r => ranksCache[r.id] = r);

function toast(msg, type = "info") {
  const c = document.getElementById("toastContainer");
  if (!c) return;
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
function formatDate(ts) {
  if (!ts) return "";
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}
function getInitials(n) { return n ? n.substring(0, 2).toUpperCase() : "?"; }
function escapeHtml(t) { const d = document.createElement("div"); d.textContent = t || ""; return d.innerHTML; }
function isOwner(email) { return email && email.toLowerCase() === OWNER_EMAIL.toLowerCase(); }

function updateUI() {
  const headerActions = document.getElementById("headerActions");
  const userMenu = document.getElementById("userMenu");
  const createTopicBtn = document.getElementById("createTopicBtn");
  const adminLink = document.getElementById("adminLink");
  const profileLink = document.getElementById("profileLink");
  const settingsLink = document.getElementById("settingsLink");
  if (!headerActions || !userMenu) return;

  if (currentUser) {
    headerActions.style.cssText = "display:none!important";
    userMenu.style.cssText = "display:flex!important";
    const nick = currentUserData?.nickname || currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "User");
    const owner = isOwner(currentUser.email);
    const rankId = currentUserData?.rankId || (owner ? "owner" : "newbie");
    const rank = ranksCache[rankId] || DEFAULT_RANKS[0];
    const nameEl = document.getElementById("userName");
    const badgeEl = document.getElementById("userBadge");
    const avatarEl = document.getElementById("userAvatar");
    if (nameEl) nameEl.textContent = nick;
    if (badgeEl) { badgeEl.textContent = rank.badge; badgeEl.style.background = rank.color + "33"; badgeEl.style.color = rank.color; }
    if (avatarEl) {
      const photo = currentUserData?.photoURL || currentUser.photoURL;
      avatarEl.innerHTML = photo ? '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : getInitials(nick);
    }
    if (createTopicBtn) createTopicBtn.style.display = "inline-flex";
    if (adminLink) adminLink.style.display = (rank.permissions?.isAdmin || rank.permissions?.isOwner || owner) ? "inline-block" : "none";
    if (profileLink) profileLink.style.display = "inline-block";
    if (settingsLink) settingsLink.style.display = "inline-block";
  } else {
    headerActions.style.cssText = "display:flex!important";
    userMenu.style.cssText = "display:none!important";
    if (createTopicBtn) createTopicBtn.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
    if (profileLink) profileLink.style.display = "none";
    if (settingsLink) settingsLink.style.display = "none";
  }
}

async function ensureUserDoc(user, nickname) {
  const owner = isOwner(user.email);
  const fallback = { uid: user.uid, email: user.email || "", nickname: nickname || user.displayName || (user.email ? user.email.split("@")[0] : "User"), photoURL: user.photoURL || null, rankId: owner ? "owner" : "newbie" };
  try {
    await enableNetwork(db);
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (owner && data.rankId !== "owner") { try { await updateDoc(ref, { rankId: "owner" }); data.rankId = "owner"; } catch(e){} }
      return data;
    }
    await setDoc(ref, { ...fallback, createdAt: serverTimestamp(), lastLogin: serverTimestamp(), postsCount: 0, topicsCount: 0 });
    if (owner) toast("Права владельца выданы!", "success");
    return fallback;
  } catch (err) {
    console.warn("user doc:", err.message);
    return fallback;
  }
}

onAuthStateChanged(auth, async (user) => {
  console.log("Auth:", user ? user.email : "null");
  if (user) {
    currentUser = user;
    currentUserData = { nickname: user.displayName || (user.email ? user.email.split("@")[0] : "User"), rankId: isOwner(user.email) ? "owner" : "newbie", email: user.email, photoURL: user.photoURL };
    updateUI();
    ensureUserDoc(user).then(d => { currentUserData = d; updateUI(); });
  } else {
    currentUser = null; currentUserData = null; updateUI();
  }
  loadCategories();
  loadRecentTopics();
});

// Modals
const authModal = document.getElementById("authModal");
const topicModal = document.getElementById("topicModal");
const viewTopicModal = document.getElementById("viewTopicModal");
const profileModal = document.getElementById("profileModal");

document.getElementById("loginBtn")?.addEventListener("click", () => { authModal?.classList.add("active"); document.querySelector('[data-tab="login"]')?.click(); });
document.getElementById("registerBtn")?.addEventListener("click", () => { authModal?.classList.add("active"); document.querySelector('[data-tab="register"]')?.click(); });
document.getElementById("closeModal")?.addEventListener("click", () => authModal?.classList.remove("active"));
document.getElementById("closeTopicModal")?.addEventListener("click", () => topicModal?.classList.remove("active"));
document.getElementById("closeViewTopic")?.addEventListener("click", () => viewTopicModal?.classList.remove("active"));
document.getElementById("closeProfileModal")?.addEventListener("click", () => profileModal?.classList.remove("active"));

document.querySelectorAll(".auth-tabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const isLogin = tab.dataset.tab === "login";
    document.getElementById("loginForm").style.display = isLogin ? "block" : "none";
    document.getElementById("registerForm").style.display = isLogin ? "none" : "block";
  });
});

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;
  if (!email || !password) return;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = cred.user;
    currentUserData = { nickname: cred.user.displayName || email.split("@")[0], rankId: isOwner(email) ? "owner" : "newbie", email };
    authModal?.classList.remove("active");
    updateUI();
    toast("Успешный вход!", "success");
    ensureUserDoc(cred.user);
  } catch (err) {
    toast(err.code === "auth/user-not-found" ? "Пользователь не найден" : "Неверный email или пароль", "error");
  }
});

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("regNickname")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();
  const password = document.getElementById("regPassword")?.value;
  if (!nickname || !email || !password) return;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try { await updateProfile(cred.user, { displayName: nickname }); } catch(e){}
    currentUser = cred.user;
    currentUserData = { nickname, rankId: isOwner(email) ? "owner" : "newbie", email };
    authModal?.classList.remove("active");
    updateUI();
    toast("Аккаунт создан!", "success");
    ensureUserDoc(cred.user, nickname);
  } catch (err) {
    toast(err.code === "auth/email-already-in-use" ? "Email уже есть — используй «Вход»" : err.message, "error");
  }
});

async function googleAuth() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;
    currentUserData = { nickname: result.user.displayName || result.user.email.split("@")[0], rankId: isOwner(result.user.email) ? "owner" : "newbie", email: result.user.email, photoURL: result.user.photoURL };
    authModal?.classList.remove("active");
    updateUI();
    toast("Вход через Google!", "success");
    ensureUserDoc(result.user);
  } catch (err) {
    toast(err.code === "auth/unauthorized-domain" ? "Добавь floralss.github.io в Authorized domains" : err.message, "error");
  }
}
document.getElementById("googleLoginBtn")?.addEventListener("click", googleAuth);
document.getElementById("googleRegisterBtn")?.addEventListener("click", googleAuth);
document.getElementById("logoutBtn")?.addEventListener("click", async () => { await signOut(auth); currentUser = null; currentUserData = null; updateUI(); toast("Вы вышли"); });

// Profile
document.getElementById("profileLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const nick = currentUserData?.nickname || "User";
  const rankId = currentUserData?.rankId || (isOwner(currentUser.email) ? "owner" : "newbie");
  const rank = ranksCache[rankId] || DEFAULT_RANKS[0];
  const box = document.getElementById("profileContent");
  if (box) {
    box.innerHTML = `
      <div class="profile-card" style="max-width:100%;margin:0 auto;">
        <div class="avatar">${getInitials(nick)}</div>
        <div class="info">
          <div class="nickname">${escapeHtml(nick)}</div>
          <div class="rank-badge" style="background:${rank.color}">${rank.badge}</div>
          <div style="margin-top:12px;color:var(--text-secondary);font-size:0.9rem;">
            Email: ${escapeHtml(currentUser.email || "")}<br>
            Ранг: ${escapeHtml(rank.name)}
          </div>
        </div>
      </div>`;
  }
  profileModal?.classList.add("active");
});

// Categories
function renderDefaultCategories(container) {
  container.innerHTML = "";
  DEFAULT_CATEGORIES.forEach(cat => {
    const el = document.createElement("div");
    el.className = "category-card";
    el.innerHTML = `<div class="category-icon">${cat.icon}</div><div class="category-info"><div class="category-title">${cat.title}</div><div class="category-desc">${cat.description}</div></div>`;
    container.appendChild(el);
  });
}

async function loadCategories() {
  const container = document.getElementById("categoriesList");
  if (!container) return;
  container.innerHTML = '<div class="loading">Загрузка разделов...</div>';
  try {
    await enableNetwork(db);
    const snap = await getDocs(collection(db, "categories"));
    if (snap.empty) {
      container.innerHTML = '<div class="loading">Разделов пока нет. Создайте их в <a href="admin.html" style="color:var(--accent)">Админ-панели</a></div>';
      return;
    }
    const cats = [];
    snap.forEach(d => cats.push({ id: d.id, ...d.data() }));
    cats.sort((a, b) => (a.order || 0) - (b.order || 0));
    container.innerHTML = "";
    cats.forEach(cat => {
      const el = document.createElement("div");
      el.className = "category-card";
      el.innerHTML = '<div class="category-icon">' + (cat.icon || "📁") + '</div><div class="category-info"><div class="category-title">' + escapeHtml(cat.title) + '</div><div class="category-desc">' + escapeHtml(cat.description || "") + '</div></div>';
      container.appendChild(el);
    });
  } catch (err) {
    console.warn("categories:", err.message);
    container.innerHTML = '<div class="loading">Не удалось загрузить разделы. Создайте их в <a href="admin.html" style="color:var(--accent)">Админ-панели</a><br><small style="color:#ef4444">' + err.message + '</small></div>';
  }
}

async function loadRecentTopics() {
  const container = document.getElementById("topicsList");
  if (!container) return;
  container.innerHTML = '<div class="loading">Тем пока нет</div>';
  try {
    await enableNetwork(db);
    const snap = await getDocs(query(collection(db, "topics"), orderBy("createdAt", "desc"), limit(20)));
    if (snap.empty) return;
    container.innerHTML = "";
    snap.forEach(docSnap => {
      const t = docSnap.data();
      const statusBadge = t.status === "closed" ? ' <span style="color:#ef4444;font-size:0.75rem;">[Закрыта]</span>' : (t.status === "important" ? ' <span style="color:#f5c518;font-size:0.75rem;">[Важно]</span>' : "");
      const el = document.createElement("div");
      el.className = "topic-item";
      el.innerHTML = `<div class="topic-avatar">${getInitials(t.authorNickname)}</div><div class="topic-body"><div class="topic-title">${escapeHtml(t.title)}${statusBadge}</div><div class="topic-meta"><span class="author">${escapeHtml(t.authorNickname || "")}</span> · ${formatDate(t.createdAt)}</div></div><div class="topic-stats">${t.repliesCount || 0} отв.</div>`;
      el.onclick = () => openTopic(docSnap.id);
      container.appendChild(el);
    });
  } catch (err) { console.warn("topics:", err.message); }
}

document.getElementById("createTopicBtn")?.addEventListener("click", async () => {
  if (!currentUser) { toast("Сначала войдите", "error"); return; }
  const select = document.getElementById("topicCategory");
  select.innerHTML = "";
  try {
    await enableNetwork(db);
    const snap = await getDocs(collection(db, "categories"));
    if (!snap.empty) {
      const cats = [];
      snap.forEach(d => cats.push({ id: d.id, ...d.data() }));
      cats.sort((a,b) => (a.order||0)-(b.order||0));
      cats.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id; opt.textContent = c.title;
        select.appendChild(opt);
      });
    } else {
      const opt = document.createElement("option");
      opt.value = "general"; opt.textContent = "Общий (создайте разделы в админке)";
      select.appendChild(opt);
    }
  } catch {
    const opt = document.createElement("option");
    opt.value = "general"; opt.textContent = "Общий";
    select.appendChild(opt);
  }
  const statusSel = document.getElementById("topicStatus");
  if (statusSel) statusSel.value = "open";
  topicModal?.classList.add("active");
});

document.getElementById("createTopicForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const categoryId = document.getElementById("topicCategory")?.value || "general";
  const title = document.getElementById("topicTitle")?.value.trim();
  const content = document.getElementById("topicContent")?.value.trim();
  const status = document.getElementById("topicStatus")?.value || "open";
  if (!title || !content) return;
  const cat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);

  try {
    await enableNetwork(db);
    const topicRef = await addDoc(collection(db, "topics"), {
      title, content, categoryId, categoryTitle: cat ? cat.title : "",
      authorId: currentUser.uid, authorNickname: currentUserData?.nickname || "User",
      authorRankId: currentUserData?.rankId || "newbie",
      createdAt: serverTimestamp(), repliesCount: 0, status
    });
    await addDoc(collection(db, "posts"), {
      topicId: topicRef.id, content,
      authorId: currentUser.uid, authorNickname: currentUserData?.nickname || "User",
      authorRankId: currentUserData?.rankId || "newbie", createdAt: serverTimestamp(), isFirst: true
    });
    topicModal?.classList.remove("active");
    document.getElementById("createTopicForm")?.reset();
    toast("Тема создана!", "success");
    loadRecentTopics();
  } catch (err) {
    console.error(err);
    toast("Ошибка создания темы: " + err.message + " (проверь Rules и интернет)", "error");
  }
});

async function openTopic(topicId) {
  const contentEl = document.getElementById("topicViewContent");
  contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
  viewTopicModal?.classList.add("active");
  try {
    await enableNetwork(db);
    const topicSnap = await getDoc(doc(db, "topics", topicId));
    if (!topicSnap.exists()) { contentEl.innerHTML = '<div class="loading">Тема не найдена</div>'; return; }
    const topic = topicSnap.data();
    const postsSnap = await getDocs(query(collection(db, "posts"), where("topicId", "==", topicId), orderBy("createdAt", "asc")));
    let postsHtml = "";
    postsSnap.forEach(p => {
      const post = p.data();
      const rank = ranksCache[post.authorRankId] || DEFAULT_RANKS[0];
      postsHtml += `<div class="post"><div class="post-author"><div class="avatar">${getInitials(post.authorNickname)}</div><div class="name">${escapeHtml(post.authorNickname)}</div><div class="badge" style="background:${rank.color};color:#0a0a0c">${rank.badge}</div></div><div class="post-content"><div class="text">${escapeHtml(post.content)}</div><div class="post-date">${formatDate(post.createdAt)}</div></div></div>`;
    });
    const statusText = topic.status === "closed" ? "Закрыта" : (topic.status === "important" ? "Важно" : "Открыта");
    contentEl.innerHTML = `<div class="topic-header"><h2>${escapeHtml(topic.title)}</h2><div class="meta">Автор: <span style="color:var(--accent)">${escapeHtml(topic.authorNickname)}</span> · Статус: ${statusText}</div></div>${postsHtml}` +
      (currentUser && topic.status !== "closed" ? `<div class="reply-form"><form id="replyForm"><div class="form-group"><textarea id="replyContent" rows="4" required placeholder="Ваш ответ..."></textarea></div><button type="submit" class="btn btn-primary">Отправить</button></form></div>` : (topic.status === "closed" ? '<p style="color:var(--text-muted)">Тема закрыта</p>' : '<p style="color:var(--text-muted)">Войдите, чтобы ответить</p>'));

    document.getElementById("replyForm")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const content = document.getElementById("replyContent")?.value.trim();
      if (!content) return;
      try {
        await addDoc(collection(db, "posts"), { topicId, content, authorId: currentUser.uid, authorNickname: currentUserData?.nickname || "User", authorRankId: currentUserData?.rankId || "newbie", createdAt: serverTimestamp() });
        toast("Ответ добавлен", "success");
        openTopic(topicId);
      } catch (err) { toast(err.message, "error"); }
    });
  } catch (err) { contentEl.innerHTML = '<div class="loading">Ошибка: ' + err.message + '</div>'; }
}

console.log("BLACK SOCIAL v5 loaded");
