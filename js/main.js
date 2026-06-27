function copyIP() {
  navigator.clipboard.writeText('play.blackroleplay.net').then(() => {
    const t = document.getElementById('toast-copy');
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2000);
  });
}
// Анимация счётчика онлайна (заглушка — подключи к API сервера)
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('online-count');
  if (el) {
    let n = 0, target = 47;
    const iv = setInterval(() => { n = Math.min(n+3, target); el.textContent = n; if(n>=target) clearInterval(iv); }, 30);
  }
});
