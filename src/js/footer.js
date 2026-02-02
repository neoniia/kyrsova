import { subscribe } from './api.js';
import { validateEmail, showNotification } from './utils.js';

/**
 * Ініціалізація Footer компонента
 */
export function initFooter() {
  const footerContainer = document.getElementById('footer-container');
  if (!footerContainer) return;

  // Завантажуємо footer з partials
  const base = import.meta.env.BASE_URL || '/';
  fetch(`${base}partials/footer.html`)
    .then(response => response.text())
    .then(html => {
      footerContainer.innerHTML = html;
      setupSubscribeForm();
    })
    .catch(error => {
    });
}

/**
 * Налаштування форми підписки
 */
function setupSubscribeForm() {
  const form = document.getElementById('footer-subscribe-form');
  const emailInput = document.getElementById('footer-subscribe-email');
  const messageDiv = document.getElementById('subscribe-message');

  if (!form || !emailInput) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const messageEl = messageDiv;

    // Валідація
    if (!validateEmail(email)) {
      showNotification('Будь ласка, введіть коректний email', 'error');
      return;
    }

    // Очищаємо попереднє повідомлення
    if (messageEl) {
      messageEl.textContent = '';
      messageEl.className = 'subscribe-message';
    }

    try {
      await subscribe(email);
      showNotification('Успішно підписано на розсилку!', 'success');
      form.reset();
    } catch (error) {
      showNotification(error.message || 'Помилка підписки. Спробуйте ще раз.', 'error');
    }
  });
}
