import { getFilters } from './api.js';
import { renderCategories } from './categories.js';

let currentFilter = 'Muscles';
let currentPage = 1;
let currentLimit = 12;
let totalPages = 1;

/**
 * Ініціалізація фільтрів
 */
export function initFilters() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  
  if (filterTabs.length === 0) {
    return;
  }
  
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.getAttribute('data-filter');
      setActiveFilter(filter);
    });
  });

  // Завантажуємо початкові категорії
  loadCategories();
}

/**
 * Встановити активний фільтр
 * @param {string} filter
 */
export function setActiveFilter(filter) {
  currentFilter = filter;
  currentPage = 1;

  // Оновлюємо активну вкладку
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    const tabFilter = tab.getAttribute('data-filter');
    tab.classList.remove('active');
    if (tabFilter === filter) {
      tab.classList.add('active');
    }
  });

  // Завантажуємо категорії
  loadCategories();
}

/**
 * Завантажити категорії
 */
async function loadCategories() {
  const categoriesGrid = document.getElementById('categories-grid');
  const categoriesSection = document.getElementById('categories-section');
  const exercisesSection = document.getElementById('exercises-section');
  const pagination = document.getElementById('categories-pagination');

  if (!categoriesGrid || !categoriesSection) return;

  // Показуємо секцію категорій, ховаємо секцію вправ
  categoriesSection.classList.remove('hidden');
  if (exercisesSection) {
    exercisesSection.classList.add('hidden');
  }

  categoriesGrid.innerHTML = '<div class="loading">Завантаження...</div>';

  try {
    const response = await getFilters(currentFilter, currentPage, currentLimit);
    
    totalPages = response.totalPages || 1;
    
    if (!response.results || response.results.length === 0) {
      categoriesGrid.innerHTML = '<div class="empty-message">Категорії не знайдено</div>';
      if (pagination) {
        pagination.innerHTML = '';
      }
      return;
    }

    renderCategories(response.results, currentFilter);
    
    // Відображаємо пагінацію
    renderCategoriesPagination();
  } catch (error) {
    categoriesGrid.innerHTML = '<div class="error-message">Помилка завантаження категорій</div>';
    if (pagination) {
      pagination.innerHTML = '';
    }
  }
}

/**
 * Відобразити пагінацію категорій
 */
function renderCategoriesPagination() {
  const pagination = document.getElementById('categories-pagination');
  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.innerHTML = '';
    return;
  }

  pagination.innerHTML = '';

  // Кнопка "Перша сторінка"
  const firstBtn = createPaginationButton('««', 1, currentPage === 1);
  pagination.appendChild(firstBtn);

  // Кнопка "Попередня сторінка"
  const prevBtn = createPaginationButton('«', currentPage - 1, currentPage === 1);
  pagination.appendChild(prevBtn);

  // Номери сторінок
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPaginationButton(i.toString(), i, i === currentPage);
    pagination.appendChild(pageBtn);
  }

  // Кнопка "Наступна сторінка"
  const nextBtn = createPaginationButton('»', currentPage + 1, currentPage === totalPages);
  pagination.appendChild(nextBtn);

  // Кнопка "Остання сторінка"
  const lastBtn = createPaginationButton('»»', totalPages, currentPage === totalPages);
  pagination.appendChild(lastBtn);
}

/**
 * Створити кнопку пагінації
 * @param {string} text
 * @param {number} page
 * @param {boolean} isActive - чи це активна сторінка
 * @returns {HTMLElement}
 */
function createPaginationButton(text, page, isActive = false) {
  const button = document.createElement('button');
  const isDisabled = isActive || page < 1;
  button.className = `pagination-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
  button.textContent = text;
  button.disabled = isDisabled;
  button.setAttribute('data-page', page.toString());

  if (!isDisabled) {
    button.addEventListener('click', () => {
      currentPage = page;
      loadCategories();
    });
  }

  return button;
}

/**
 * Отримати поточний фільтр
 * @returns {string}
 */
export function getCurrentFilter() {
  return currentFilter;
}
