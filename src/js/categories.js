import { getExercises } from './api.js';
import { renderExercises, updateExercisesParams } from './exercises.js';
import { getCurrentFilter } from './filters.js';

let currentCategory = null;

/**
 * Відобразити категорії
 * @param {Array} categories
 * @param {string} filterType
 */
export function renderCategories(categories, filterType) {
  const categoriesGrid = document.getElementById('categories-grid');
  if (!categoriesGrid) return;

  categoriesGrid.innerHTML = '';

  categories.forEach(category => {
    const card = createCategoryCard(category, filterType);
    categoriesGrid.appendChild(card);
  });
}

/**
 * Створити картку категорії
 * @param {Object} category
 * @param {string} filterType
 * @returns {HTMLElement}
 */
function createCategoryCard(category, filterType) {
  const card = document.createElement('div');
  card.className = 'category-card';
  card.setAttribute('data-category', category.name || category.filter);

  const imageUrl = category.imgURL || category.filter || '';
  let name = category.name || category.filter || 'Категорія';
  
  // Перекладаємо англійські назви категорій на українську
  const nameLower = name.toLowerCase();
  if (nameLower === 'cardiovascular system' || nameLower.includes('cardiovascular')) {
    name = 'Кардіо';
  } else if (nameLower === 'serratus anterior' || nameLower.includes('serratus')) {
    name = 'Серратні';
  } else if (nameLower === 'levator scapulae' || nameLower.includes('levator')) {
    name = 'Леватор';
  } else if (nameLower === 'abdominals' || nameLower === 'abs') {
    name = 'Прес';
  } else if (nameLower === 'quadriceps' || nameLower === 'quads') {
    name = 'Квадри';
  } else if (nameLower === 'adductors') {
    name = 'Аддуктори';
  } else if (nameLower === 'latissimus' || nameLower === 'lats') {
    name = 'Широчі';
  } else if (nameLower === 'trapezius' || nameLower === 'traps') {
    name = 'Трапеції';
  } else if (nameLower === 'calves' || nameLower === 'calf') {
    name = 'Литки';
  } else if (nameLower === 'biceps') {
    name = 'Біцепси';
  } else if (nameLower === 'triceps') {
    name = 'Трицепси';
  } else if (nameLower === 'pectorals' || nameLower === 'chest') {
    name = 'Груди';
  }
  
  // Перекладаємо тип фільтра на українську
  let filter = filterType;
  if (filterType === 'Muscles') {
    filter = 'М\'язи';
  } else if (filterType === 'Body parts') {
    filter = 'Частини тіла';
  } else if (filterType === 'Equipment') {
    filter = 'Обладнання';
  }

  card.innerHTML = `
    <div class="category-image">
      <img src="${imageUrl}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.classList.add('show');" />
      <div class="category-placeholder" style="position:absolute; top:0; left:0; width:100%; height:100%; background:#e0e0e0; display:none; align-items:center; justify-content:center; color:#999;">No image</div>
      <div class="category-overlay"></div>
    </div>
    <div class="category-info">
      <h3 class="category-name">${name}</h3>
    </div>
  `;

  // Обробник кліку - перехід на окрему сторінку
  card.addEventListener('click', () => {
    navigateToExercisesPage(category, filterType);
  });

  return card;
}

/**
 * Перехід на сторінку з вправами категорії
 * @param {Object} category
 * @param {string} filterType
 */
function navigateToExercisesPage(category, filterType) {
  // Правильне поле для filterValue - це name (назва категорії, наприклад "abs", "biceps")
  // category.filter - це тип фільтра ("Muscles", "Body parts", "Equipment"), тому його не використовуємо для filterValue
  // Перевіряємо різні можливі поля з API
  const filterValue = category.name || category.filter || category.muscle || category.bodypart || category.equipment || '';
  const categoryName = category.name || category.filter || 'Вправи';
  
  // Формуємо параметри для URL
  const params = new URLSearchParams();
  params.append('filter', filterType);
  params.append('category', filterValue);
  params.append('name', categoryName);
  
  // Переходимо на сторінку з вправами
  const base = import.meta.env.BASE_URL || '/';
  window.location.href = `${base}page-3.html?${params.toString()}`;
}

/**
 * Завантажити вправи для категорії (для старої логіки, якщо потрібно)
 * @param {Object} category
 * @param {string} filterType
 */
async function loadExercisesForCategory(category, filterType) {
  const categoriesSection = document.getElementById('categories-section');
  const exercisesSection = document.getElementById('exercises-section');
  const exercisesTitle = document.getElementById('exercises-title');

  if (!categoriesSection || !exercisesSection) return;

  // Ховаємо категорії, показуємо вправи
  categoriesSection.classList.add('hidden');
  exercisesSection.classList.remove('hidden');

  // Оновлюємо заголовок
  if (exercisesTitle) {
    exercisesTitle.textContent = category.name || category.filter || 'Вправи';
  }

  // Формуємо параметри запиту
  const params = {
    page: 1,
    limit: 10,
  };

  // Визначаємо значення фільтра з категорії
  const filterValue = category.filter || category.name || '';
  
  if (filterType === 'Muscles' && filterValue) {
    params.muscles = filterValue;
  } else if (filterType === 'Body parts' && filterValue) {
    params.bodypart = filterValue;
  } else if (filterType === 'Equipment' && filterValue) {
    params.equipment = filterValue;
  }

  // Зберігаємо поточну категорію для пошуку
  currentCategory = {
    filterType,
    filterValue,
  };

  // Завантажуємо вправи
  try {
    const response = await getExercises(params);
    await renderExercises(response.results || [], response.totalPages || 1, 1);
    updateExercisesParams(params);
  } catch (error) {
    const exercisesGrid = document.getElementById('exercises-grid');
    if (exercisesGrid) {
      exercisesGrid.innerHTML = '<div class="error-message">Помилка завантаження вправ</div>';
    }
  }
}

/**
 * Отримати поточну категорію
 * @returns {Object|null}
 */
export function getCurrentCategory() {
  return currentCategory;
}
