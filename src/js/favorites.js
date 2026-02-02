import { getFavorites, removeFromFavorites } from './storage.js';
import { openExerciseModal } from './modal.js';
import { showNotification } from './utils.js';
import { formatRating } from './utils.js';

/**
 * Ініціалізація сторінки Favorites
 */
export function initFavorites() {
  renderFavorites();
}

/**
 * Відобразити улюблені вправи
 */
export function renderFavorites() {
  const favoritesGrid = document.getElementById('favorites-grid');
  const favoritesEmpty = document.getElementById('favorites-empty');

  if (!favoritesGrid) return;

  const favorites = getFavorites();

  if (favorites.length === 0) {
    if (favoritesGrid) favoritesGrid.innerHTML = '';
    if (favoritesEmpty) {
      favoritesEmpty.classList.remove('hidden');
    }
    return;
  }

  if (favoritesEmpty) {
    favoritesEmpty.classList.add('hidden');
  }

  favoritesGrid.innerHTML = '';

  favorites.forEach(exercise => {
    const card = createFavoriteCard(exercise);
    favoritesGrid.appendChild(card);
  });
}

/**
 * Створити картку улюбленої вправи
 * @param {Object} exercise
 * @returns {HTMLElement}
 */
function createFavoriteCard(exercise) {
  const card = document.createElement('div');
  card.className = 'favorite-card';

  const rating = formatRating(exercise.rating || 0);
  const calories = exercise.burnedCalories || 0;
  const bodyPart = exercise.bodyPart || 'N/A';
  const target = exercise.target || 'N/A';
  const name = exercise.name || 'Вправа';
  let description = exercise.description || '';
  
  // Отримуємо інструкції з різних можливих полів API
  const instructions = exercise.instructions || exercise.steps || exercise.instruction || [];

  // Показуємо повний опис
  const fullDescription = description;
  
  // Формуємо список кроків виконання
  let stepsHTML = '';
  if (instructions) {
    // Перевіряємо, чи це масив або рядок
    let stepsArray = [];
    if (Array.isArray(instructions)) {
      stepsArray = instructions.filter(step => step && (typeof step === 'string' ? step.trim().length > 0 : true));
    } else if (typeof instructions === 'string') {
      // Якщо це рядок, розділяємо по переносу рядка, крапці з пробілом або номеру
      stepsArray = instructions
        .split(/\n+|\.\s+|(?=\d+\.)/)
        .map(step => step.trim())
        .filter(step => step.length > 0 && !step.match(/^\d+\.?$/));
    }
    
    if (stepsArray.length > 0) {
      stepsHTML = `
        <div class="exercise-steps">
          <h4>Кроки виконання:</h4>
          <ol class="steps-list">
            ${stepsArray.map((step, index) => `<li>${typeof step === 'string' ? step : JSON.stringify(step)}</li>`).join('')}
          </ol>
        </div>
      `;
    }
  }

  card.innerHTML = `
    <div class="favorite-header">
      <span class="favorite-badge">WORKOUT</span>
      <span class="favorite-rating">
        ${rating}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 0L10.163 5.528L16 6.112L12 10.056L12.944 16L8 13.056L3.056 16L4 10.056L0 6.112L5.837 5.528L8 0Z"
            fill="#FFD700"
          />
        </svg>
      </span>
      <button class="favorite-delete-btn" data-exercise-id="${exercise._id}" aria-label="Видалити з улюблених">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 3L17 17M3 17L17 3"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
    <div class="favorite-content">
      <div class="favorite-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            stroke="currentColor"
            stroke-width="2"
            fill="none"
          />
        </svg>
      </div>
      <h3 class="favorite-name">${name}</h3>
      ${fullDescription ? `
        <div class="exercise-description">
          <p>${fullDescription}</p>
        </div>
      ` : ''}
      ${stepsHTML}
      <div class="favorite-details">
        <p>Burned calories: <span>${calories}</span> / 3 min</p>
        <p>Body part: <span>${bodyPart}</span></p>
        <p>Target: <span>${target}</span></p>
      </div>
      <button class="favorite-start-btn" data-exercise-id="${exercise._id}">
        Start →
      </button>
    </div>
  `;

  // Обробник кліку на кнопку Start
  const startBtn = card.querySelector('.favorite-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      openExerciseModal(exercise._id);
    });
  }

  // Обробник кліку на кнопку видалення
  const deleteBtn = card.querySelector('.favorite-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      removeFromFavorites(exercise._id);
      showNotification('Вправу видалено з улюблених', 'success');
      renderFavorites(); // Оновлюємо список
    });
  }

  return card;
}
