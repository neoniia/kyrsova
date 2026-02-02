/**
 * Валідація email
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  const pattern = /^\w+(\.\w+)?@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
  return pattern.test(email);
}

/**
 * Форматування рейтингу
 * @param {number} rating
 * @returns {string}
 */
export function formatRating(rating) {
  return rating ? rating.toFixed(1) : '0.0';
}

/**
 * Показати повідомлення
 * @param {string} message
 * @param {string} type - 'success' | 'error'
 */
export function showNotification(message, type = 'success') {
  // Створюємо елемент повідомлення
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Додаємо стилі
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '16px 24px',
    backgroundColor: type === 'success' ? '#4caf50' : '#f44336',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: '10000',
    animation: 'slideIn 0.3s ease-out',
  });

  document.body.appendChild(notification);

  // Видаляємо через 3 секунди
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

/**
 * Перевірка, чи елемент видимий
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export function isElementVisible(element) {
  return element && !element.classList.contains('hidden');
}

/**
 * Показати елемент
 * @param {HTMLElement} element
 */
export function showElement(element) {
  if (element) {
    element.classList.remove('hidden');
  }
}

/**
 * Приховати елемент
 * @param {HTMLElement} element
 */
export function hideElement(element) {
  if (element) {
    element.classList.add('hidden');
  }
}

/**
 * Отримати правильний шлях до ресурсу з урахуванням base path
 * @param {string} path - шлях до ресурсу (наприклад, '/images/photo.jpg')
 * @returns {string} - правильний шлях з урахуванням base
 */
export function getAssetPath(path) {
  // Використовуємо base URL з Vite або відносний шлях
  const base = import.meta.env.BASE_URL || '/';
  // Якщо шлях починається з /, додаємо base
  if (path.startsWith('/')) {
    return base + path.slice(1);
  }
  return path;
}