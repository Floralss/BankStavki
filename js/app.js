// ===========================
// BLACK SOCIAL — Main App
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
  serverTimestamp,
  onSnapshot
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

// Owner email — автоматически получает права владельца
const OWNER_EMAIL = "strepoomich27@gmail.com";

// Default ranks
const DEFAULT_RANKS = [
  {
    id: "newbie",
    name: "Новичок",
    badge: "НОВИЧОК",
    color: "#6b6b7b",
    permissions: {
      canCreateTopic: true,
      canReply: true,
      canModerate: false,
      canManageUsers: false,
      canManageRanks: false,
      isAdmin: false,
      isOwner: false
    }
  },
  {
    id: "member",
    name: "Участник",
    badge: "УЧАСТНИК",
    color: "#3b82f6",
    permissions: {
      canCreateTopic: true,
      canReply: true,
      canModerate: false,
      canManageUsers: false,
      canManageRanks: false,
      isAdmin: false,
      isOwner: false
    }
  },
  {
    id: "leader",
    name: "Лидер",
    badge: "ЛИДЕР",
    color: "#f5c518",
    permissions: {
      canCreateTopic: true,
      canReply: true,
      canModerate: true,
      canManageUsers: false,
      canManageRanks: false,
      isAdmin: false,
      isOwner: false
    }
  },
  {
    id: "admin",
    name: "Администратор",
    badge: "ADMIN",
    color: "#ef4444",
    permissions: {
      canCreateTopic: true,
      canReply: true,
      canModerate: true,
      canManageUsers: true,
      canManageRanks: true,
      isAdmin: true,
      isOwner: false
    }
  },
  {
    id: "owner",
    name: "Владелец",
    badge: "ВЛАДЕЛЕЦ",
    color: "#a855f7",
    permissions: {
      canCreateTopic: true,
      canReply: true,
      canModerate: true,
      canManageUsers: true,
      canManageRanks: true,
      isAdmin: true,
      isOwner: true
    }
  }
];

// Default categories
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
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function getInitials(name) {
  if (!name) return "?";
  return name.substring(0, 2).toUpperCase();
}

// ========== INIT RANKS & CATEGORIES ==========
async function ensureDefaults() {
  // Ranks
  const ranksSnap = await getDocs(collection(db, "ranks"));
  if (ranksSnap.empty) {
    for (const rank of DEFAULT_RANKS) {
      await setDoc(doc(db, "ranks", rank.id), rank);
    }
    console.log("Default ranks created");
  }

  // Categories
  const catSnap = await getDocs(collection(db, "categories"));
  if (catSnap.empty) {
    for (const cat of DEFAULT_CATEGORIES) {
      await setDoc(doc(db, "categories", cat.id), cat);
    }
    console.log("Default categories created");
  }

  // Load ranks into cache
  const allRanks = await getDocs(collection(db, "ranks"));
  allRanks.forEach(d => {
    ranksCache[d.id] = d.data();
  });
}

// ========== AUTH ==========
async function createUserDocument(user, nickname = null) {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    return existing.data();
  }

  const isOwner = user.email === OWNER_EMAIL;
  const rankId = isOwner ? "owner" : "newbie";

  const userData = {
    uid: user.uid,
    email: user.email,
    nickname: nickname || user.displayName || user.email.split("@")[0],
    photoURL: user.photoURL || null,
    rankId: rankId,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    postsCount: 0,
    topicsCount: 0
  };

  await setDoc(userRef, userData);

  // If owner — also ensure rank exists
  if (isOwner) {
    toast("Добро пожаловать, Владелец! Права выданы автоматически.", "success");
  }

  return userData;
}

async function handleAuthSuccess(user, nickname = null) {
  currentUser = user;
  currentUserData = await createUserDocument(user, nickname);
  
  // Update last login
  await updateDoc(doc(db, "users", user.uid), {
    lastLogin: serverTimestamp()
  });

  updateUI();
  loadCategories();
  loadRecentTopics();
  toast(`С возвращением, ${currentUserData.nickname}!`, "success");
}

function updateUI() {
  const headerActions = document.getElementById("headerActions");
  const userMenu = document.getElementById("userMenu");
  const createTopicBtn = document.getElementById("createTopicBtn");
  const adminLink = document.getElementById("adminLink");
  const profileLink = document.getElementById("profileLink");

  if (currentUser && currentUserData) {
    headerActions.style.display = "none";
    userMenu.style.display = "flex";

    const rank = ranksCache[currentUserData.rankId] || DEFAULT_RANKS[0];
    
    document.getElementById("userName").textContent = currentUserData.nickname;
    document.getElementById("userBadge").textContent = rank.badge;
    document.getElementById("userBadge").style.background = rank.color + "33";
    document.getElementById("userBadge").style.color = rank.color;

    const avatarEl = document.getElementById("userAvatar");
    if (currentUserData.photoURL) {
      avatarEl.innerHTML = `<img src="${currentUserData.photoURL}" alt="">`;
    } else {
      avatarEl.textContent = getInitials(currentUserData.nickname);
    }

    // Permissions
    const perms = rank.permissions || {};
    createTopicBtn.style.display = perms.canCreateTopic ? "inline-flex" : "none";
    
    if (perms.isAdmin || perms.isOwner) {
      adminLink.style.display = "inline-block";
    } else {
      adminLink.style.display = "none";
    }

    profileLink.style.display = "inline-block";
  } else {
    headerActions.style.display = "flex";
    userMenu.style.display = "none";
    createTopicBtn.style.display = "none";
    adminLink.style.display = "none";
    profileLink.style.display = "none";
  }
}

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      currentUserData = snap.data();
      // Auto-promote owner
      if (user.email === OWNER_EMAIL && currentUserData.rankId !== "owner") {
        await updateDoc(userRef, { rankId: "owner" });
        currentUserData.rankId = "owner";
      }
    } else {
      currentUserData = await createUserDocument(user);
    }
  } else {
    currentUser = null;
    currentUserData = null;
  }
  updateUI();
  loadCategories();
  loadRecentTopics();
});

// ========== MODAL HANDLERS ==========
const authModal = document.getElementById("authModal");
const topicModal = document.getElementById("topicModal");
const viewTopicModal = document.getElementById("viewTopicModal");

document.getElementById("loginBtn")?.addEventListener("click", () => {
  authModal.classList.add("active");
  document.querySelector('[data-tab="login"]').click();
});
document.getElementById("registerBtn")?.addEventListener("click", () => {
  authModal.classList.add("active");
  document.querySelector('[data-tab="register"]').click();
});
document.getElementById("closeModal")?.addEventListener("click", () => {
  authModal.classList.remove("active");
});
document.getElementById("closeTopicModal")?.addEventListener("click", () => {
  topicModal.classList.remove("active");
});
document.getElementById("closeViewTopic")?.addEventListener("click", () => {
  viewTopicModal.classList.remove("active");
});

// Tabs
document.querySelectorAll(".auth-tabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tabs .tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const isLogin = tab.dataset.tab === "login";
    document.getElementById("loginForm").style.display = isLogin ? "block" : "none";
    document.getElementById("registerForm").style.display = isLogin ? "none" : "block";
  });
});

// Login
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    authModal.classList.remove("active");
    await handleAuthSuccess(cred.user);
  } catch (err) {
    toast("Ошибка входа: " + err.message, "error");
  }
});

// Register
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("regNickname").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nickname });
    authModal.classList.remove("active");
    await handleAuthSuccess(cred.user, nickname);
  } catch (err) {
    toast("Ошибка регистрации: " + err.message, "error");
  }
});

// Google Auth
async function googleAuth() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    authModal.classList.remove("active");
    await handleAuthSuccess(result.user);
  } catch (err) {
    toast("Ошибка Google: " + err.message, "error");
  }
}
document.getElementById("googleLoginBtn")?.addEventListener("click", googleAuth);
document.getElementById("googleRegisterBtn")?.addEventListener("click", googleAuth);

// Logout
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  toast("Вы вышли из аккаунта");
  updateUI();
});

// ========== FORUM ==========
async function loadCategories() {
  const container = document.getElementById("categoriesList");
  if (!container) return;

  try {
    const snap = await getDocs(query(collection(db, "categories"), orderBy("order")));
    if (snap.empty) {
      container.innerHTML = `<div class="loading">Разделы пока не созданы</div>`;
      return;
    }

    container.innerHTML = "";
    snap.forEach(docSnap => {
      const cat = docSnap.data();
      const el = document.createElement("div");
      el.className = "category-card";
      el.innerHTML = `
        <div class="category-icon">${cat.icon || "📁"}</div>
        <div class="category-info">
          <div class="category-title">${cat.title}</div>
          <div class="category-desc">${cat.description || ""}</div>
        </div>
        <div class="category-stats">
          <strong>—</strong>
          тем
        </div>
      `;
      el.addEventListener("click", () => filterTopicsByCategory(docSnap.id));
      container.appendChild(el);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="loading">Ошибка загрузки разделов</div>`;
  }
}

async function loadRecentTopics() {
  const container = document.getElementById("topicsList");
  if (!container) return;

  try {
    const snap = await getDocs(
      query(collection(db, "topics"), orderBy("createdAt", "desc"), limit(15))
    );

    if (snap.empty) {
      container.innerHTML = `<div class="loading">Тем пока нет. Создайте первую!</div>`;
      return;
    }

    container.innerHTML = "";
    for (const docSnap of snap.docs) {
      const topic = docSnap.data();
      const authorName = topic.authorNickname || "Аноним";
      const el = document.createElement("div");
      el.className = "topic-item";
      el.innerHTML = `
        <div class="topic-avatar">${getInitials(authorName)}</div>
        <div class="topic-body">
          <div class="topic-title">${topic.title}</div>
          <div class="topic-meta">
            <span class="author">${authorName}</span> · ${formatDate(topic.createdAt)} · ${topic.categoryTitle || ""}
          </div>
        </div>
        <div class="topic-stats">
          ${topic.repliesCount || 0} отв.
        </div>
      `;
      el.addEventListener("click", () => openTopic(docSnap.id));
      container.appendChild(el);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="loading">Ошибка загрузки тем</div>`;
  }
}

function filterTopicsByCategory(catId) {
  // Simple filter — reload with where
  // For MVP we just show all, can enhance later
  toast("Фильтр по разделу (в разработке)", "info");
}

// Create Topic
document.getElementById("createTopicBtn")?.addEventListener("click", async () => {
  if (!currentUser) {
    toast("Сначала войдите", "error");
    return;
  }
  // Fill categories select
  const select = document.getElementById("topicCategory");
  select.innerHTML = "";
  const snap = await getDocs(query(collection(db, "categories"), orderBy("order")));
  snap.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.data().title;
    select.appendChild(opt);
  });
  topicModal.classList.add("active");
});

document.getElementById("createTopicForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !currentUserData) return;

  const categoryId = document.getElementById("topicCategory").value;
  const title = document.getElementById("topicTitle").value.trim();
  const content = document.getElementById("topicContent").value.trim();

  try {
    const catDoc = await getDoc(doc(db, "categories", categoryId));
    const catTitle = catDoc.exists() ? catDoc.data().title : "";

    const topicRef = await addDoc(collection(db, "topics"), {
      title,
      content,
      categoryId,
      categoryTitle: catTitle,
      authorId: currentUser.uid,
      authorNickname: currentUserData.nickname,
      authorRankId: currentUserData.rankId,
      createdAt: serverTimestamp(),
      repliesCount: 0,
      lastReplyAt: serverTimestamp()
    });

    // First post is the topic itself
    await addDoc(collection(db, "posts"), {
      topicId: topicRef.id,
      content,
      authorId: currentUser.uid,
      authorNickname: currentUserData.nickname,
      authorRankId: currentUserData.rankId,
      createdAt: serverTimestamp(),
      isFirst: true
    });

    // Update user stats
    await updateDoc(doc(db, "users", currentUser.uid), {
      topicsCount: (currentUserData.topicsCount || 0) + 1,
      postsCount: (currentUserData.postsCount || 0) + 1
    });

    topicModal.classList.remove("active");
    document.getElementById("createTopicForm").reset();
    toast("Тема создана!", "success");
    loadRecentTopics();
  } catch (err) {
    toast("Ошибка: " + err.message, "error");
  }
});

// Open Topic
async function openTopic(topicId) {
  const contentEl = document.getElementById("topicViewContent");
  contentEl.innerHTML = `<div class="loading">Загрузка...</div>`;
  viewTopicModal.classList.add("active");

  try {
    const topicSnap = await getDoc(doc(db, "topics", topicId));
    if (!topicSnap.exists()) {
      contentEl.innerHTML = `<div class="loading">Тема не найдена</div>`;
      return;
    }
    const topic = topicSnap.data();

    // Load posts
    const postsSnap = await getDocs(
      query(collection(db, "posts"), where("topicId", "==", topicId), orderBy("createdAt", "asc"))
    );

    let postsHtml = "";
    postsSnap.forEach(p => {
      const post = p.data();
      const rank = ranksCache[post.authorRankId] || { badge: "—", color: "#666" };
      postsHtml += `
        <div class="post">
          <div class="post-author">
            <div class="avatar">${getInitials(post.authorNickname)}</div>
            <div class="name">${post.authorNickname}</div>
            <div class="badge" style="background:${rank.color};color:#0a0a0c">${rank.badge}</div>
          </div>
          <div class="post-content">
            <div class="text">${escapeHtml(post.content)}</div>
            <div class="post-date">${formatDate(post.createdAt)}</div>
          </div>
        </div>
      `;
    });

    contentEl.innerHTML = `
      <div class="topic-header">
        <h2>${escapeHtml(topic.title)}</h2>
        <div class="meta">Раздел: ${topic.categoryTitle || "—"} · Автор: <span style="color:var(--accent)">${topic.authorNickname}</span></div>
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
        </div>
      ` : `<p style="color:var(--text-muted);margin-top:20px;">Войдите, чтобы ответить</p>`}
    `;

    // Reply handler
    document.getElementById("replyForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const content = document.getElementById("replyContent").value.trim();
      if (!content) return;

      try {
        await addDoc(collection(db, "posts"), {
          topicId,
          content,
          authorId: currentUser.uid,
          authorNickname: currentUserData.nickname,
          authorRankId: currentUserData.rankId,
          createdAt: serverTimestamp(),
          isFirst: false
        });

        await updateDoc(doc(db, "topics", topicId), {
          repliesCount: (topic.repliesCount || 0) + 1,
          lastReplyAt: serverTimestamp()
        });

        await updateDoc(doc(db, "users", currentUser.uid), {
          postsCount: (currentUserData.postsCount || 0) + 1
        });

        toast("Ответ добавлен", "success");
        openTopic(topicId); // reload
        loadRecentTopics();
      } catch (err) {
        toast("Ошибка: " + err.message, "error");
      }
    });

  } catch (err) {
    console.error(err);
    contentEl.innerHTML = `<div class="loading">Ошибка загрузки темы</div>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ========== INIT ==========
async function init() {
  try {
    await ensureDefaults();
  } catch (err) {
    console.error("Init error:", err);
    // Still try to load UI
  }
  loadCategories();
  loadRecentTopics();
}

init();

// Expose for admin page
window.blackSocial = {
  auth, db, currentUser, currentUserData, ranksCache, OWNER_EMAIL, toast, formatDate, getInitials
};
