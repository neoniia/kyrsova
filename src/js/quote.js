import { getQuote as fetchQuote } from './api.js';
import { saveQuote, getQuote as getStoredQuote } from './storage.js';

/**
 * Завантажити та відобразити цитату дня
 * @param {string} quoteTextId - ID елемента для тексту цитати
 * @param {string} quoteAuthorId - ID елемента для автора
 */
export async function loadQuote(quoteTextId = 'quote-text', quoteAuthorId = 'quote-author') {
  const quoteTextEl = document.getElementById(quoteTextId);
  const quoteAuthorEl = document.getElementById(quoteAuthorId);

  if (!quoteTextEl || !quoteAuthorEl) return;

  // Перевіряємо localStorage
  const storedQuote = getStoredQuote();
  
  if (storedQuote) {
    // Використовуємо збережену цитату
    quoteTextEl.textContent = storedQuote.quote || 'Завантаження...';
    quoteAuthorEl.textContent = storedQuote.author || '';
    return;
  }

  // Завантажуємо нову цитату
  try {
    const quoteData = await fetchQuote();
    quoteTextEl.textContent = quoteData.quote || 'Немає цитати';
    quoteAuthorEl.textContent = quoteData.author || '';
    
    // Зберігаємо в localStorage
    saveQuote(quoteData);
  } catch (error) {
    quoteTextEl.textContent = 'Не вдалося завантажити цитату';
    quoteAuthorEl.textContent = '';
  }
}
