// ===========================
// BLACK SOCIAL — Main App (fixed)
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

// ========== FIREBASE CONFIG ==========
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

// Owner email
const OWNER_EMAIL = "strepoomich27@gmail.com";

// Default ranks
const DEFAULT_RANKS = [
  {
    id: "newbie",
    name: "Новичок",
    badge: "НОВИЧОК",
    color: "#6b6b7b",
    permissions: { canCreateTopic: true, canReply: true, canModerate: false, canManageUsers: false, canManageRanks: false, isAdmin: false, isOwner: false }
  },
  {
    id: "member",
    name: "Участник",
    badge: "УЧАСТНИК",
    color: "#3b82f6",
    permissions: { canCreateTopic: true, canReply: true, canModerate: false, canManageUsers: false, canManageRanks: false, isAdmin: false, isOwner: false }
  },
  {
    id: "leader",
    name: "Лидер",
    badge: "ЛИДЕР",
    color: "#f5c518",
    permissions: { canCreateTopic: true, canReply: true, canModerate: true, canManageUsers: false, canManageRanks: false, isAdmin: false, isOwner: false }
  },
  {
    id: "admin",
    name: "Администратор",
    badge: "ADMIN",
    color: "#ef4444",
    permissions: { canCreateTopic: true, canReply: true, canModerate: true, canManageUsers: true, canManageRanks: true, isAdmin: true, isOwner: false }
  },
  {
    id: "owner",
    name: "Владелец",
    badge: "ВЛАДЕЛЕЦ",
    color: "#a855f7",
    permissions: { canCreateTopic: true, canReply: true, canModerate: true, canManageUsers: true, canManageRanks: true, isAdmin: true, isOwner: true }
  }
];

const DEFAULT_CATEGORIES = [
  { id: "news", title: "Новости и объявления", description: "Официальные новости проекта", icon: "📢", order: 1 },
  { id: "general", title: "Общий раздел", description: "Свободное общение", icon: "💬", order: 2 },
  { id: "rp", title: "RolePlay", description: "RP-ситуации, биографии, отыгровки", icon: "🎭", order: 3 },
  { id: "orgs", title: "Организации", description: "Фракции, семьи, группировки", icon: "🏛️", order: 4 },
  { id: "help", title: "Помощь и жалобы", description: "Техническая поддержка и жалобы", icon: "🛡️", order: 5 }
];

// ========== STATE ==========
let currentUser = null;
let currentUserData = null;
let ranksCache = {};

// ========== UTILS ==========
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
  } catch {
    return "";
  }
}

function getInitials(name) {
  if (!name) return "?";
  return name.substring(0, 2).toUpperCase();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// ========== INIT DEFAULTS (safe) ==========
async function ensureDefaults() {
  try {
    // Ranks
    const ranksSnap = await getDocs(collection(db, "ranks"));
    if (ranksSnap.empty) {
      for (const rank of DEFAULT_RANKS) {
        await setDoc(doc(db, "ranks", rank.id), rank);
      }
    }
    // Load ranks cache
    const allRanks = await getDocs(collection(db, "ranks"));
    allRanks.forEach(d => { ranksCache[d.id] = d.data(); });

    // Categories
    const catSnap = await getDocs(collection(db, "categories"));
    if (catSnap.empty) {
      for (const cat of DEFAULT_CATEGORIES) {
        await setDoc(doc(db, "categories", cat.id), cat);
      }
    }
  } catch (err) {
    console.warn("ensureDefaults error (возможно правила):", err.message);
    // Fallback ranks so UI still works
    DEFAULT_RANKS.forEach(r => ranksCache[r.id] = r);
  }
}

// ========== AUTH ==========
async function createUserDocument(user, nickname = null) {
  const userRef = doc(db, "users", user.uid);
  try {
    const existing = await getDoc(userRef);
    if (existing.exists()) {
      return existing.data();
    }
  } catch (e) {
    console.warn("getDoc user error:", e.message);
  }

  const isOwner = user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const rankId = isOwner ? "owner" : "newbie";

  const userData = {
    uid: user.uid,
    email: user.email || "",
    nickname: nickname || user.displayName || (user.email ? user.email.split("@")[0] : "User"),
    photoURL: user.photoURL || null,
    rankId: rankId,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    postsCount: 0,
    topicsCount: 0
  };

  try {
    await setDoc(userRef, userData);
    if (isOwner) toast("Добро пожаловать, Владелец! Права выданы.", "success");
  } catch (e) {
    console.warn("setDoc user error:", e.message);
    // всё равно возвращаем локальные данные, чтобы UI заработал
  }

  return userData;
}

function updateUI() {
  const headerActions = document.getElementById("headerActions");
  const userMenu = document.getElementById("userMenu");
  const createTopicBtn = document.getElementById("createTopicBtn");
  const adminLink = document.getElementById("adminLink");
  const profileLink = document.getElementById("profileLink");

  if (!headerActions || !userMenu) return;

  if (currentUser) {
    headerActions.style.display = "none";
    userMenu.style.display = "flex";

    const nick = currentUserData?.nickname || currentUser.displayName || currentUser.email?.split("@")[0] || "User";
    const rankId = currentUserData?.rankId || (currentUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() ? "owner" : "newbie");
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
      if (currentUserData?.photoURL || currentUser.photoURL) {
        avatarEl.innerHTML = `<img src="${currentUserData?.photoURL || currentUser.photoURL}" alt="">`;
      } else {
        avatarEl.textContent = getInitials(nick);
      }
    }

    const perms = rank.permissions || {};
    if (createTopicBtn) createTopicBtn.style.display = perms.canCreateTopic !== false ? "inline-flex" : "none";
    if (adminLink) adminLink.style.display = (perms.isAdmin || perms.isOwner || currentUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) ? "inline-block" : "none";
    if (profileLink) profileLink.style.display = "inline-block";
  } else {
    headerActions.style.display = "flex";
    userMenu.style.display = "none";
    if (createTopicBtn) createTopicBtn.style.display = "none";
    if (adminLink) adminLink.style.display = "none";
    if (profileLink) profileLink.style.display = "none";
  }
}

// Auth state — максимально устойчивый
onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      currentUser = user;
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          currentUserData = snap.data();
          // Auto-promote owner
          if (user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() && currentUserData.rankId !== "owner") {
            try {
              await updateDoc(userRef, { rankId: "owner" });
              currentUserData.rankId = "owner";
            } catch {}
          }
        } else {
          currentUserData = await createUserDocument(user);
        }
      } catch (err) {
        console.warn("User doc error:", err.message);
        // Fallback — хотя бы показать UI
        currentUserData = {
          nickname: user.displayName || user.email?.split("@")[0] || "User",
          rankId: user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() ? "owner" : "newbie",
          email: user.email
        };
      }
    } else {
      currentUser = null;
      currentUserData = null;
    }
  } catch (e) {
    console.error("Auth state error:", e);
  }

  updateUI();
  loadCategories();
  loadRecentTopics();
});

// ========== MODALS ==========
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
    const loginForm = document.getElementById("loginForm");
    const regForm = document.getElementById("registerForm");
    if (loginForm) loginForm.style.display = isLogin ? "block" : "none";
    if (regForm) regForm.style.display = isLogin ? "none" : "block";
  });
});

// Login
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;
  if (!email || !password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authModal?.classList.remove("active");
    toast("Успешный вход!", "success");
  } catch (err) {
    console.error(err);
    let msg = err.message;
    if (err.code === "auth/user-not-found") msg = "Пользователь не найден";
    if (err.code === "auth/wrong-password") msg = "Неверный пароль";
    if (err.code === "auth/invalid-credential") msg = "Неверный email или пароль";
    toast("Ошибка входа: " + msg, "error");
  }
});

// Register
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("regNickname")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim();
  const password = document.getElementById("regPassword")?.value;

  if (!nickname || !email || !password) return;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try { await updateProfile(cred.user, { displayName: nickname }); } catch {}
    await createUserDocument(cred.user, nickname);
    authModal?.classList.remove("active");
    toast("Аккаунт создан!", "success");
  } catch (err) {
    console.error(err);
    let msg = err.message;
    if (err.code === "auth/email-already-in-use") {
      msg = "Этот email уже зарегистрирован. Перейдите на вкладку «Вход»";
    }
    if (err.code === "auth/weak-password") msg = "Пароль слишком слабый (минимум 6 символов)";
    toast("Ошибка регистрации: " + msg, "error");
  }
});

// Google
async function googleAuth() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserDocument(result.user);
    authModal?.classList.remove("active");
    toast("Вход через Google выполнен!", "success");
  } catch (err) {
    console.error(err);
    let msg = err.message;
    if (err.code === "auth/popup-closed-by-user") msg = "Окно входа было закрыто";
    if (err.code === "auth/unauthorized-domain") msg = "Домен не добавлен в Authorized domains Firebase";
    toast("Ошибка Google: " + msg, "error");
  }
}
document.getElementById("googleLoginBtn")?.addEventListener("click", googleAuth);
document.getElementById("googleRegisterBtn")?.addEventListener("click", googleAuth);

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    toast("Вы вышли");
  } catch (e) {
    console.error(e);
  }
});

// ========== FORUM ==========
async function loadCategories() {
  const container = document.getElementById("categoriesList");
  if (!container) return;

  container.innerHTML = `<div class="loading">Загрузка разделов...</div>`;

  try {
    const snap = await getDocs(query(collection(db, "categories"), orderBy("order")));
    
    if (snap.empty) {
      // Попробуем создать дефолтные
      try {
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, "categories", cat.id), cat);
        }
        // Перезагрузим
        const snap2 = await getDocs(query(collection(db, "categories"), orderBy("order")));
        renderCategories(container, snap2);
        return;
      } catch (e) {
        container.innerHTML = `<div class="loading">Разделы пока пустые. Войдите, чтобы создать.</div>`;
        return;
      }
    }

    renderCategories(container, snap);
  } catch (err) {
    console.error("loadCategories:", err);
    container.innerHTML = `
      <div class="loading" style="color:#ef4444;">
        Ошибка загрузки разделов.<br>
        <small style="color:#a0a0b0;">${err.message}</small><br>
        <small>Проверь Rules в Firebase (должно быть if request.auth != null или true)</small>
      </div>`;
  }
}

function renderCategories(container, snap) {
  container.innerHTML = "";
  snap.forEach(docSnap => {
    const cat = docSnap.data();
    const el = document.createElement("div");
    el.className = "category-card";
    el.innerHTML = `
      <div class="category-icon">${cat.icon || "📁"}</div>
      <div class="category-info">
        <div class="category-title">${escapeHtml(cat.title)}</div>
        <div class="category-desc">${escapeHtml(cat.description || "")}</div>
      </div>
      <div class="category-stats">
        <strong>—</strong>
        тем
      </div>
    `;
    container.appendChild(el);
  });
}

async function loadRecentTopics() {
  const container = document.getElementById("topicsList");
  if (!container) return;

  container.innerHTML = `<div class="loading">Загрузка тем...</div>`;

  try {
    const snap = await getDocs(query(collection(db, "topics"), orderBy("createdAt", "desc"), limit(15)));

    if (snap.empty) {
      container.innerHTML = `<div class="loading">Тем пока нет. Войдите и создайте первую!</div>`;
      return;
    }

    container.innerHTML = "";
    snap.forEach(docSnap => {
      const topic = docSnap.data();
      const authorName = topic.authorNickname || "Аноним";
      const el = document.createElement("div");
      el.className = "topic-item";
      el.innerHTML = `
        <div class="topic-avatar">${getInitials(authorName)}</div>
        <div class="topic-body">
          <div class="topic-title">${escapeHtml(topic.title)}</div>
          <div class="topic-meta">
            <span class="author">${escapeHtml(authorName)}</span> · ${formatDate(topic.createdAt)} · ${escapeHtml(topic.categoryTitle || "")}
          </div>
        </div>
        <div class="topic-stats">${topic.repliesCount || 0} отв.</div>
      `;
      el.addEventListener("click", () => openTopic(docSnap.id));
      container.appendChild(el);
    });
  } catch (err) {
    console.error("loadRecentTopics:", err);
    container.innerHTML = `
      <div class="loading" style="color:#ef4444;">
        Ошибка загрузки тем.<br>
        <small style="color:#a0a0b0;">${err.message}</small>
      </div>`;
  }
}

// Create Topic
document.getElementById("createTopicBtn")?.addEventListener("click", async () => {
  if (!currentUser) {
    toast("Сначала войдите", "error");
    return;
  }
  const select = document.getElementById("topicCategory");
  if (!select) return;
  select.innerHTML = "";
  try {
    const snap = await getDocs(query(collection(db, "categories"), orderBy("order")));
    snap.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.data().title;
      select.appendChild(opt);
    });
  } catch {
    DEFAULT_CATEGORIES.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.title;
      select.appendChild(opt);
    });
  }
  topicModal?.classList.add("active");
});

document.getElementById("createTopicForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !currentUserData) {
    toast("Сначала войдите", "error");
    return;
  }

  const categoryId = document.getElementById("topicCategory")?.value;
  const title = document.getElementById("topicTitle")?.value.trim();
  const content = document.getElementById("topicContent")?.value.trim();
  if (!title || !content) return;

  try {
    let catTitle = "";
    try {
      const catDoc = await getDoc(doc(db, "categories", categoryId));
      catTitle = catDoc.exists() ? catDoc.data().title : "";
    } catch {}

    const topicRef = await addDoc(collection(db, "topics"), {
      title,
      content,
      categoryId: categoryId || "general",
      categoryTitle: catTitle,
      authorId: currentUser.uid,
      authorNickname: currentUserData.nickname,
      authorRankId: currentUserData.rankId || "newbie",
      createdAt: serverTimestamp(),
      repliesCount: 0,
      lastReplyAt: serverTimestamp()
    });

    await addDoc(collection(db, "posts"), {
      topicId: topicRef.id,
      content,
      authorId: currentUser.uid,
      authorNickname: currentUserData.nickname,
      authorRankId: currentUserData.rankId || "newbie",
      createdAt: serverTimestamp(),
      isFirst: true
    });

    topicModal?.classList.remove("active");
    document.getElementById("createTopicForm")?.reset();
    toast("Тема создана!", "success");
    loadRecentTopics();
  } catch (err) {
    console.error(err);
    toast("Ошибка создания темы: " + err.message, "error");
  }
});

// Open Topic
async function openTopic(topicId) {
  const contentEl = document.getElementById("topicViewContent");
  if (!contentEl) return;
  contentEl.innerHTML = `<div class="loading">Загрузка...</div>`;
  viewTopicModal?.classList.add("active");

  try {
    const topicSnap = await getDoc(doc(db, "topics", topicId));
    if (!topicSnap.exists()) {
      contentEl.innerHTML = `<div class="loading">Тема не найдена</div>`;
      return;
    }
    const topic = topicSnap.data();

    const postsSnap = await getDocs(query(collection(db, "posts"), where("topicId", "==", topicId), orderBy("createdAt", "asc")));

    let postsHtml = "";
    postsSnap.forEach(p => {
      const post = p.data();
      const rank = ranksCache[post.authorRankId] || { badge: "—", color: "#666" };
      postsHtml += `
        <div class="post">
          <div class="post-author">
            <div class="avatar">${getInitials(post.authorNickname)}</div>
            <div class="name">${escapeHtml(post.authorNickname)}</div>
            <div class="badge" style="background:${rank.color};color:#0a0a0c">${escapeHtml(rank.badge)}</div>
          </div>
          <div class="post-content">
            <div class="text">${escapeHtml(post.content)}</div>
            <div class="post-date">${formatDate(post.createdAt)}</div>
          </div>
        </div>`;
    });

    contentEl.innerHTML = `
      <div class="topic-header">
        <h2>${escapeHtml(topic.title)}</h2>
        <div class="meta">Раздел: ${escapeHtml(topic.categoryTitle || "—")} · Автор: <span style="color:var(--accent)">${escapeHtml(topic.authorNickname)}</span></div>
      </div>
      ${postsHtml}
      ${currentUser ? `
        <div class="reply-form">
          <h3 style="margin-bottom:12px;">Ответить</h3>
          <form id="replyForm">
            <div class="form-group">
              <textarea id="replyContent" rows="4" required placeholder="Ваш ответ..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Отправить</button>
          </form>
        </div>` : `<p style="color:var(--text-muted);margin-top:20px;">Войдите, чтобы ответить</p>`}
    `;

    document.getElementById("replyForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = document.getElementById("replyContent")?.value.trim();
      if (!content || !currentUser) return;

      try {
        await addDoc(collection(db, "posts"), {
          topicId,
          content,
          authorId: currentUser.uid,
          authorNickname: currentUserData.nickname,
          authorRankId: currentUserData.rankId || "newbie",
          createdAt: serverTimestamp(),
          isFirst: false
        });
        await updateDoc(doc(db, "topics", topicId), {
          repliesCount: (topic.repliesCount || 0) + 1,
          lastReplyAt: serverTimestamp()
        });
        toast("Ответ добавлен", "success");
        openTopic(topicId);
        loadRecentTopics();
      } catch (err) {
        toast("Ошибка: " + err.message, "error");
      }
    });
  } catch (err) {
    console.error(err);
    contentEl.innerHTML = `<div class="loading">Ошибка загрузки темы: ${err.message}</div>`;
  }
}

// ========== START ==========
async function init() {
  // Сначала показываем UI
  updateUI();
  
  // Потом пробуем загрузить данные
  await ensureDefaults();
  loadCategories();
  loadRecentTopics();
}

init();

console.log("BLACK SOCIAL loaded");
