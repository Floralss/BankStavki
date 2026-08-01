# BLACK SOCIAL v5

## Обязательные правила Firestore (Security → Publish)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /categories/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /topics/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /posts/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /ranks/{doc} { allow read: if true; allow write: if request.auth != null; }
    match /users/{userId} { allow read, write: if request.auth != null; }
  }
}
```

## Authorized domains

Authentication → Settings → Authorized domains → добавь `floralss.github.io`

## Что работает

- Вход / регистрация / Google
- Профиль (кнопка «Профиль»)
- Создание тем со статусом (Открыта / Важно / Закрыта)
- Админ-панель: ранги, разделы, выдача прав, список пользователей
- Владелец: strepoomich27@gmail.com
