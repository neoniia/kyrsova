# Your Energy

Односторінковий застосунок (SPA) для пошуку та управління фітнес-вправами.

## Опис

Your Energy - це веб-застосунок, який дозволяє користувачам:
- Переглядати каталог фітнес-вправ
- Фільтрувати вправи за м'язами, частинами тіла та обладнанням
- Переглядати детальну інформацію про вправи
- Зберігати улюблені вправи
- Оцінювати вправи
- Отримувати цитату дня

## Технології

- Vanilla JavaScript (ES6+)
- Vite (збірка)
- HTML5
- CSS3
- REST API

## Запуск проєкту

### Встановлення залежностей

```bash
npm install
```

### Запуск у режимі розробки

```bash
npm run dev
```

### Збірка для продакшн

```bash
npm run build
```

### Попередній перегляд збірки

```bash
npm run preview
```

## Структура проєкту

```
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   ├── css/
│   │   ├── reset.css
│   │   ├── header.css
│   │   ├── footer.css
│   │   ├── home.css
│   │   ├── modal.css
│   │   ├── favorites.css
│   │   └── main.css
│   ├── js/
│   │   ├── api.js
│   │   ├── storage.js
│   │   ├── utils.js
│   │   ├── header.js
│   │   ├── footer.js
│   │   ├── quote.js
│   │   ├── filters.js
│   │   ├── categories.js
│   │   ├── exercises.js
│   │   ├── search.js
│   │   ├── modal.js
│   │   └── favorites.js
│   ├── partials/
│   │   ├── header.html
│   │   └── footer.html
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── page-2.html
│   └── main.js
├── package.json
├── vite.config.js
├── .gitignore
├── .editorconfig
├── .prettierrc.json
└── README.md
```

## API

Застосунок використовує API: https://your-energy.b.goit.study/api-docs/

## Деплой

Проєкт налаштований для деплою на GitHub Pages через GitHub Actions.

Після публікації проєкту на GitHub, посилання на деплой буде доступне в розділі Settings → Pages репозиторію.

### Налаштування GitHub Pages

1. Перейдіть в Settings вашого репозиторію
2. Виберіть Pages в меню зліва
3. У Source виберіть "GitHub Actions"
4. Після першого деплою посилання буде доступне автоматично
