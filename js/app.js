// ===========================
// BLACK SOCIAL — Main App (v3 - forced UI update)
// ===========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  query, 
  orderBy, 
  limit,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

function toast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function getInitials(name) {
  return name ? name.substring(0, 2).toUpperCase() : "?";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function updateUI() {
  const headerActions = document.getElementById("headerActions");
  const userMenu = document.getElementById("userMenu");
  const createTopicBtn = document.getElementById("createTopicBtn");
  const adminLink = document.getElementById("adminLink");
  const profileLink = document.getElementById("profileLink");

  console.log("updateUI called, logged in:", !!currentUser, currentUser?.email);

  if (!headerActions || !userMenu) {
    console.warn("header elements not found");
    return;
  }

  if (currentUser) {
    headerActions.style.cssText = "display: none !important; visibility: hidden !important;";
    userMenu.style.cssText = "display: flex !important; visibility: visible !important;";

    const nick = currentUserData?.nickname || currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "User");
    const isOwner = currentUser.email && currentUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const rankId = currentUserData?.rankId || (isOwner ? "owner" : "newbie");
    const rank = ranksCache[rankId] || DEFAULT_RANKS.find(r => r.id === rankId) || DEFAULT_RANKS[0];

    const nameEl = document.getElementById("userName");
    const badgeEl = document.getElementById("userBadge");
    const avatarEl = document.getElementById("userAvatar");

    if (nameEl) nameEl.textContent = nick;
    if (badgeEl) {
      badgeEl.textContent = rank.badge || "НОВИЧОК";
      badgeEl.style.background = (rank.color || "#f5c518") + "33";
      badgeEl.style.color = rank.color || "#f5c518";
    }
    if (avatarEl) {
      const photo = currentUserData?.photoURL || currentUser.photoURL;
      if (photo) {
        avatarEl.innerHTML = '<img src="' + photo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
      } else {
        avatarEl.textContent = getInitials(nick);
      }
    }

    if (createTopicBtn) createTopicBtn.style.display = "inline-flex";
    if (adminLink) {
      adminLink.style.display = (rank.permissions?.isAdmin || rank.permissions?.isOwner || isOwner) ? "inline-block" : "none";
    }
    if (profileLink) profileLink.style.display = "inline-block";

  } else {
    headerActions.style.cssText = "display: flex !important; visibility: visible !important;";
    userMenu.style.cssText = "display: none !important; visibility: hidden !important;";
    if (createTopicBtn) createTopicBtn.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
    if (profileLink) profileLink.style.display = "none";
  }
}

async function ensureUserDoc(user, nickname = null) {
  const isOwner = user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const fallback = {
    uid: user.uid,
    email: user.email || "",
    nickname: nickname || user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    photoURL: user.photoURL || null,
    rankId: isOwner ? "owner" : "newbie",
    postsCount: 0,
    topicsCount: 0
  };

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      if (isOwner && data.rankId !== "owner") {
        try { await updateDoc(userRef, { rankId: "owner" }); data.rankId = "owner"; } catch(e) {}
      }
      return data;
    }

    await setDoc(userRef, {
      ...fallback,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
    if (isOwner) toast("Права владельца выданы!", "success");
    return fallback;
  } catch (err) {
    console.warn("ensureUserDoc error:", err.message);
    return fallback;
  }
}

onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user ? user.email : "null");

  if (user) {
    currentUser = user;
    currentUserData = await ensureUserDoc(user);
  } else {
    currentUser = null;
    currentUserData = null;
  }

  updateUI();
  setTimeout(updateUI, 300);
  setTimeout(updateUI, 800);

  loadCategories();
  loadRecentTopics();
});

const authModal = document.getElementById("authModal");
const topicModal = document.getElementById("topicModal");
const viewTopicModal = document.getElementById("viewTopicModal");

document.getElementById("loginBtn")?.addEventListener("click", () => {
  authModal?.classList.add("active");
  document.querySelector('[data-tab="login"]')?.click();
});
document.getElementById("registerBtn")?.addEventListener("click", () => {
  authModal?.classList.add("active");
  document.querySelector('[data-tab="register"]')?.click();
});
document.getElementById("closeModal")?.addEventListener("click", () => authModal?.classList.remove("active"));
document.getElementById("closeTopicModal")?.addEventListener("click", () => topicModal?.classList.remove("active"));
document.getElementById("closeViewTopic")?.addEventListener("click", () => viewTopicModal?.classList.remove("active"));

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
    currentUserData = await ensureUserDoc(cred.user);
    authModal?.classList.remove("active");
    updateUI();
    setTimeout(updateUI, 100);
    setTimeout(updateUI, 500);
    toast("Успешный вход!", "success");
  } catch (err) {
    console.error(err);
    let msg = err.message;
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") msg = "Неверный email или пароль";
    if (err.code === "auth/user-not-found") msg = "Пользователь не найден";
    toast("Ошибка входа: " + msg, "error");
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
    try { await updateProfile(cred.user, { displayName: nickname }); } catch(e) {}
    currentUser = cred.user;
    currentUserData = await ensureUserDoc(cred.user, nickname);
    authModal?.classList.remove("active");
    updateUI();
    setTimeout(updateUI, 100);
    toast("Аккаунт создан!", "success");
  } catch (err) {
    console.error(err);
    let msg = err.message;
    if (err.code === "auth/email-already-in-use") msg = "Этот email уже зарегистрирован. Используй вкладку «Вход»";
    if (err.code === "auth/weak-password") msg = "Пароль слишком слабый (мин. 6 символов)";
    toast("Ошибка: " + msg, "error");
  }
});

async function googleAuth() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    currentUser = result.user;
    currentUserData = await ensureUserDoc(result.user);
    authModal?.classList.remove("active");
    updateUI();
    setTimeout(updateUI, 100);
    toast("Вход через Google!", "success");
  } catch (err) {
    console.error(err);
    let msg = err.message;
    if (err.code === "auth/popup-closed-by-user") msg = "Окно закрыто";
    if (err.code === "auth/unauthorized-domain") msg = "Добавь floralss.github.io в Authorized domains";
    toast("Ошибка Google: " + msg, "error");
  }
}
document.getElementById("googleLoginBtn")?.addEventListener("click", googleAuth);
document.getElementById("googleRegisterBtn")?.addEventListener("click", googleAuth);

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  currentUser = null;
  currentUserData = null;
  updateUI();
  toast("Вы вышли");
});

async function loadCategories() {
  const container = document.getElementById("categoriesList");
  if (!container) return;

  renderDefaultCategories(container);

  try {
    const snap = await getDocs(collection(db, "categories"));
    if (!snap.empty) {
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
    } else {
      for (const cat of DEFAULT_CATEGORIES) {
        try { await setDoc(doc(db, "categories", cat.id), cat); } catch(e) {}
      }
      renderDefaultCategories(container);
    }
  } catch (err) {
    console.warn("categories error:", err.message);
  }
}

function renderDefaultCategories(container) {
  container.innerHTML = "";
  DEFAULT_CATEGORIES.forEach(cat => {
    const el = document.createElement("div");
    el.className = "category-card";
    el.innerHTML = '<div class="category-icon">' + cat.icon + '</div><div class="category-info"><div class="category-title">' + cat.title + '</div><div class="category-desc">' + cat.description + '</div></div>';
    container.appendChild(el);
  });
}

async function loadRecentTopics() {
  const container = document.getElementById("topicsList");
  if (!container) return;

  container.innerHTML = '<div class="loading">Тем пока нет. Войдите и создайте первую!</div>';

  try {
    const snap = await getDocs(query(collection(db, "topics"), orderBy("createdAt", "desc"), limit(15)));
    if (snap.empty) return;

    container.innerHTML = "";
    snap.forEach(docSnap => {
      const topic = docSnap.data();
      const authorName = topic.authorNickname || "Аноним";
      const el = document.createElement("div");
      el.className = "topic-item";
      el.innerHTML = '<div class="topic-avatar">' + getInitials(authorName) + '</div><div class="topic-body"><div class="topic-title">' + escapeHtml(topic.title) + '</div><div class="topic-meta"><span class="author">' + escapeHtml(authorName) + '</span> · ' + formatDate(topic.createdAt) + '</div></div><div class="topic-stats">' + (topic.repliesCount || 0) + ' отв.</div>';
      el.addEventListener("click", () => openTopic(docSnap.id));
      container.appendChild(el);
    });
  } catch (err) {
    console.warn("topics error:", err.message);
  }
}

document.getElementById("createTopicBtn")?.addEventListener("click", () => {
  if (!currentUser) { toast("Сначала войдите", "error"); return; }
  const select = document.getElementById("topicCategory");
  select.innerHTML = "";
  DEFAULT_CATEGORIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.title;
    select.appendChild(opt);
  });
  topicModal?.classList.add("active");
});

document.getElementById("createTopicForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const categoryId = document.getElementById("topicCategory")?.value || "general";
  const title = document.getElementById("topicTitle")?.value.trim();
  const content = document.getElementById("topicContent")?.value.trim();
  if (!title || !content) return;

  const cat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);

  try {
    const topicRef = await addDoc(collection(db, "topics"), {
      title, content,
      categoryId,
      categoryTitle: cat ? cat.title : "",
      authorId: currentUser.uid,
      authorNickname: currentUserData?.nickname || "User",
      authorRankId: currentUserData?.rankId || "newbie",
      createdAt: serverTimestamp(),
      repliesCount: 0
    });

    await addDoc(collection(db, "posts"), {
      topicId: topicRef.id,
      content,
      authorId: currentUser.uid,
      authorNickname: currentUserData?.nickname || "User",
      authorRankId: currentUserData?.rankId || "newbie",
      createdAt: serverTimestamp(),
      isFirst: true
    });

    topicModal?.classList.remove("active");
    document.getElementById("createTopicForm")?.reset();
    toast("Тема создана!", "success");
    loadRecentTopics();
  } catch (err) {
    toast("Ошибка: " + err.message, "error");
  }
});

async function openTopic(topicId) {
  const contentEl = document.getElementById("topicViewContent");
  contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
  viewTopicModal?.classList.add("active");

  try {
    const topicSnap = await getDoc(doc(db, "topics", topicId));
    if (!topicSnap.exists()) {
      contentEl.innerHTML = '<div class="loading">Тема не найдена</div>';
      return;
    }
    const topic = topicSnap.data();
    const postsSnap = await getDocs(query(collection(db, "posts"), where("topicId", "==", topicId), orderBy("createdAt", "asc")));

    let postsHtml = "";
    postsSnap.forEach(p => {
      const post = p.data();
      const rank = ranksCache[post.authorRankId] || DEFAULT_RANKS[0];
      postsHtml += '<div class="post"><div class="post-author"><div class="avatar">' + getInitials(post.authorNickname) + '</div><div class="name">' + escapeHtml(post.authorNickname) + '</div><div class="badge" style="background:' + rank.color + ';color:#0a0a0c">' + rank.badge + '</div></div><div class="post-content"><div class="text">' + escapeHtml(post.content) + '</div><div class="post-date">' + formatDate(post.createdAt) + '</div></div></div>';
    });

    contentEl.innerHTML = '<div class="topic-header"><h2>' + escapeHtml(topic.title) + '</h2><div class="meta">Автор: <span style="color:var(--accent)">' + escapeHtml(topic.authorNickname) + '</span></div></div>' + postsHtml + (currentUser ? '<div class="reply-form"><form id="replyForm"><div class="form-group"><textarea id="replyContent" rows="4" required placeholder="Ваш ответ..."></textarea></div><button type="submit" class="btn btn-primary">Отправить</button></form></div>' : '<p style="color:var(--text-muted)">Войдите, чтобы ответить</p>');

    document.getElementById("replyForm")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const content = document.getElementById("replyContent")?.value.trim();
      if (!content) return;
      try {
        await addDoc(collection(db, "posts"), {
          topicId, content,
          authorId: currentUser.uid,
          authorNickname: currentUserData?.nickname || "User",
          authorRankId: currentUserData?.rankId || "newbie",
          createdAt: serverTimestamp()
        });
        toast("Ответ добавлен", "success");
        openTopic(topicId);
      } catch (err) {
        toast("Ошибка: " + err.message, "error");
      }
    });
  } catch (err) {
    contentEl.innerHTML = '<div class="loading">Ошибка: ' + err.message + '</div>';
  }
}

DEFAULT_RANKS.forEach(r => ranksCache[r.id] = r);
updateUI();
loadCategories();
loadRecentTopics();

console.log("BLACK SOCIAL v3 loaded");
