# BLACK SOCIAL — Форум (исправленная версия)

## Что исправлено

- Теперь разделы и темы загружаются даже без входа
- Более устойчивая обработка ошибок
- Если не получается записать пользователя в базу — UI всё равно обновляется
- Понятные сообщения об ошибках

## Обязательные правила Firestore

Зайди в **Firestore → Security** и поставь **именно эти** правила:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Разделы, темы, посты и ранги — читать могут все
    match /categories/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /topics/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /posts/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /ranks/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Пользователи — читать и писать только авторизованные
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```

Нажми **Publish**.

## Также обязательно

1. **Authentication** → Sign-in method:
   - Включи Email/Password
   - Включи Google

2. **Authentication** → Settings → Authorized domains:
   - Добавь `floralss.github.io` (если сайт на GitHub Pages)
   - `localhost` уже должен быть

## Как обновить файлы на GitHub Pages

Просто замени файлы в репозитории на новые из этого архива (особенно `js/app.js`).

После замены сделай hard refresh страницы: **Ctrl + F5**.
