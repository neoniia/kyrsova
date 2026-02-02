import { initHeader } from './js/header.js';
import { initFooter } from './js/footer.js';
import { loadQuote } from './js/quote.js';
import { initFilters } from './js/filters.js';
import { initSearch } from './js/search.js';
import { initModals } from './js/modal.js';
import { initFavorites, renderFavorites } from './js/favorites.js';
import { initExercisesPage } from './js/exercises-page.js';

// Визначаємо поточну сторінку
const currentPath = window.location.pathname;
const isFavoritesPage = currentPath.includes('page-2.html') || currentPath.includes('favorites');
const isExercisesPage = currentPath.includes('page-3.html') || currentPath.includes('exercises');

/**
 * Ініціалізація застосунку
 */
function initApp() {
  // Ініціалізуємо Header та Footer на всіх сторінках
  initHeader();
  initFooter();

  // Ініціалізуємо модальні вікна
  initModals();

  if (isFavoritesPage) {
    // Сторінка Favorites
    initFavoritesPage();
  } else if (isExercisesPage) {
    // Сторінка з вправами категорії
    initExercisesPage();
  } else {
    // Головна сторінка
    initHomePage();
  }
}

/**
 * Ініціалізація головної сторінки
 */
function initHomePage() {
  // Завантажуємо цитату дня
  loadQuote();

  // Ініціалізуємо фільтри
  initFilters();

  // Ініціалізуємо пошук
  initSearch();
}

/**
 * Ініціалізація сторінки Favorites
 */
function initFavoritesPage() {
  // Завантажуємо цитату дня
  loadQuote('quote-text-favorites', 'quote-author-favorites');

  // Ініціалізуємо список улюблених
  initFavorites();

  // Слухаємо зміни в localStorage для оновлення списку
  window.addEventListener('storage', () => {
    renderFavorites();
  });

  // Також оновлюємо при зміні через наш код (якщо відкрито в одній вкладці)
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(...args) {
    originalSetItem.apply(this, args);
    if (args[0] === 'your_energy_favorites') {
      renderFavorites();
    }
  };
}

// Запускаємо застосунок після завантаження DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
