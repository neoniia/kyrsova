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
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      // Замінюємо шляхи на правильні з base path
      html = html.replace(/href="\/([^"]+)"/g, `href="${base}$1"`);
      html = html.replace(/src="\/([^"]+)"/g, `src="${base}$1"`);
      footerContainer.innerHTML = html;
      setupSubscribeForm();
    })
    .catch(error => {
      console.error('Error loading footer:', error);
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
