# Инструкция по деплою на GitHub Pages

## Вариант 1: Через GitHub Desktop (рекомендуется)

1. **Установите GitHub Desktop** (если еще не установлен):
   - Скачайте с https://desktop.github.com/
   - Установите и войдите в свой аккаунт GitHub

2. **Откройте проект в GitHub Desktop**:
   - File → Add Local Repository
   - Выберите папку проекта: `C:\Users\unria\OneDrive\Desktop\курсач`
   - Нажмите "Add repository"

3. **Подключите к существующему репозиторию** (если нужно):
   - Repository → Repository Settings → Remote
   - Добавьте: `https://github.com/neoniia/kyrsova.git`

4. **Закоммитьте и запушьте изменения**:
   - В GitHub Desktop вы увидите все измененные файлы
   - Напишите commit message: "Setup GitHub Pages deployment"
   - Нажмите "Commit to main"
   - Нажмите "Push origin"

## Вариант 2: Через веб-интерфейс GitHub

1. **Откройте репозиторий**: https://github.com/neoniia/kyrsova

2. **Загрузите файлы через веб-интерфейс**:
   - Нажмите "Add file" → "Upload files"
   - Перетащите все файлы из папки проекта (кроме `node_modules` и `dist`)
   - Напишите commit message: "Setup GitHub Pages deployment"
   - Нажмите "Commit changes"

## Вариант 3: Через Git Bash (если Git установлен)

Откройте Git Bash в папке проекта и выполните:

```bash
git init
git add .
git commit -m "Setup GitHub Pages deployment"
git branch -M main
git remote add origin https://github.com/neoniia/kyrsova.git
git push -u origin main
```

## Настройка GitHub Pages

После загрузки кода на GitHub:

1. **Откройте репозиторий**: https://github.com/neoniia/kyrsova

2. **Перейдите в Settings**:
   - Нажмите на вкладку "Settings" в верхней части репозитория

3. **Настройте Pages**:
   - В левом меню найдите "Pages"
   - В разделе "Source" выберите: **"GitHub Actions"**
   - Сохраните изменения

4. **Проверьте деплой**:
   - Перейдите во вкладку "Actions"
   - Вы увидите workflow "Deploy to GitHub Pages"
   - Дождитесь завершения (обычно 1-2 минуты)
   - Зеленая галочка означает успешный деплой

## Проверка результата

После успешного деплоя сайт будет доступен по адресу:
**https://neoniia.github.io/kyrsova/**

## Автоматический деплой

После настройки, при каждом push в ветку `main` сайт будет автоматически обновляться!

## Ручной запуск деплоя

Если нужно запустить деплой вручную:
1. Перейдите во вкладку "Actions"
2. Выберите workflow "Deploy to GitHub Pages"
3. Нажмите "Run workflow"
4. Выберите ветку `main` и нажмите "Run workflow"
