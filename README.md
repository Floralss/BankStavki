# BLACK SOCIAL — Форум в стиле Black

Кастомный форум на Firebase в тёмном стиле (Black), вдохновлённый форумами Rodina RP / Arizona RP / Black Russia.

## Что есть

- **Тёмная тема** (Black) с жёлтыми акцентами как на твоём скриншоте
- **Авторизация**: Email + Пароль **и Google**
- **Права владельца** автоматически выдаются на email: `strepoomich27@gmail.com`
- **Админ-панель**:
  - Создание кастомных рангов/бейджей (как «ЛИДЕР» на скрине)
  - Настройка конкретных прав для каждого ранга
  - Выдача рангов пользователям по email или UID
  - Список всех пользователей
  - Превью профиля в стиле скриншота
- Разделы форума (Новости, RP, Организации и т.д.)
- Создание тем и ответов
- Профили с бейджами

## Как запустить

1. **Firebase Console** (обязательно):
   - Зайди в https://console.firebase.google.com/ → проект `black-social-af844`
   - **Authentication** → Sign-in method:
     - Включи **Email/Password**
     - Включи **Google** (добавь support email)
   - **Firestore Database** → Создай базу (если ещё нет) в режиме **production**
   - **Rules** — поставь временно открытые правила (для теста):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

   Потом сделай более строгие правила.

2. **Запуск локально**:
   - Просто открой `index.html` через любой локальный сервер (Live Server в VS Code, или):

```bash
npx serve .
```

   Или залей всю папку `black-forum` на любой хостинг (Vercel, Netlify, GitHub Pages, свой сервер).

3. **Первый вход**:
   - Зарегистрируйся или войди через Google с почтой `strepoomich27@gmail.com`
   - Тебе автоматически выдастся ранг **ВЛАДЕЛЕЦ**
   - Появится ссылка «Админ-панель»

## Структура

```
black-forum/
├── index.html          — Главная + форум
├── admin.html          — Админ-панель
├── css/style.css       — Стили (Black theme)
├── js/app.js           — Основная логика + Firebase
└── README.md
```

## Коллекции Firestore

- `users` — пользователи (nickname, rankId, email...)
- `ranks` — ранги и права
- `categories` — разделы форума
- `topics` — темы
- `posts` — сообщения

## Важно

- Google Auth нужно включить вручную в Firebase Console.
- Владелец всегда может зайти в админку (проверка по email + rank).
- Бейджи создаются в админке и выглядят как на твоём скриншоте (жёлтый «ЛИДЕР» и т.д.).
- Для продакшена обязательно настрой нормальные Security Rules.

Удачи с проектом! ⬛
