import { getExercises, getExerciseById } from './api.js';
import { formatRating } from './utils.js';
import { openExerciseModal } from './modal.js';
import { getStartButtonDescription } from './exercises-page.js';

/**
 * Генерувати зірки для рейтингу
 * @param {number} rating
 * @returns {string}
 */
function generateRatingStars(rating) {
  const numRating = parseFloat(rating) || 0;
  const fullStars = Math.floor(numRating);
  const hasHalfStar = numRating % 1 >= 0.5;
  let stars = '';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += '<span class="star full">★</span>';
    } else if (i === fullStars && hasHalfStar) {
      stars += '<span class="star half">★</span>';
    } else {
      stars += '<span class="star empty">★</span>';
    }
  }

  return stars;
}

let currentExercisesParams = {
  page: 1,
  limit: 10,
};

/**
 * Відобразити вправи
 * @param {Array} exercises
 * @param {number} totalPages
 * @param {number} currentPage
 */
export async function renderExercises(exercises, totalPages = 1, currentPage = 1) {
  const exercisesGrid = document.getElementById('exercises-grid');
  const pagination = document.getElementById('pagination');

  if (!exercisesGrid) return;

  currentExercisesParams.page = currentPage;

  if (!exercises || exercises.length === 0) {
    exercisesGrid.innerHTML = '<div class="empty-message">Вправи не знайдено</div>';
    if (pagination) pagination.innerHTML = '';
    return;
  }

  exercisesGrid.innerHTML = '<div class="loading">Завантаження...</div>';

  // Завантажуємо детальну інформацію для кожної вправи, щоб отримати зображення
  try {
    const exercisesWithDetails = await Promise.all(
      exercises.map(async (exercise) => {
        // Якщо це mock-вправа, використовуємо її як є (не завантажуємо з API)
        if (exercise._id && exercise._id.startsWith('mock-')) {
          return exercise;
        }
        
        try {
          const details = await getExerciseById(exercise._id);
          // Об'єднуємо дані: базові дані + деталі (деталі мають пріоритет)
          return { 
            ...exercise, 
            ...details,
            // Зберігаємо базові дані, якщо деталі не містять їх
            name: details.name || exercise.name,
            description: details.description || exercise.description,
            rating: details.rating || exercise.rating,
            burnedCalories: details.burnedCalories || exercise.burnedCalories,
            bodyPart: details.bodyPart || exercise.bodyPart,
            target: details.target || exercise.target,
            instructions: details.instructions || details.steps || details.instruction || exercise.instructions || exercise.steps || exercise.instruction || [],
            // Зберігаємо URL зображень з оригінальних даних, якщо вони є
            gifURL: details.gifURL || exercise.gifURL || details.gif || exercise.gif,
            imgURL: details.imgURL || exercise.imgURL || details.image || exercise.image,
            imageURL: details.imageURL || exercise.imageURL || details.image || exercise.image,
            image: details.image || exercise.image || details.imgURL || exercise.imgURL || details.imageURL || exercise.imageURL,
            gif: details.gif || exercise.gif || details.gifURL || exercise.gifURL,
          };
        } catch (error) {
          // Якщо не вдалося завантажити деталі, використовуємо базові дані
          return exercise;
        }
      })
    );

    exercisesGrid.innerHTML = '';

    exercisesWithDetails.forEach(exercise => {
      const card = createExerciseCard(exercise);
      exercisesGrid.appendChild(card);
    });
  } catch (error) {
    exercisesGrid.innerHTML = '';
    exercises.forEach(exercise => {
      const card = createExerciseCard(exercise);
      exercisesGrid.appendChild(card);
    });
  }

  // Рендеримо пагінацію
  if (pagination) {
    renderPagination(totalPages, currentPage);
  }
}

/**
 * Створити картку вправи
 * @param {Object} exercise
 * @returns {HTMLElement}
 */
function createExerciseCard(exercise) {
  const card = document.createElement('div');
  card.className = 'exercise-card';

  const rating = formatRating(exercise.rating || 0);
  const calories = exercise.burnedCalories || 0;
  const bodyPart = exercise.bodyPart || 'N/A';
  const target = exercise.target || 'N/A';
  const name = exercise.name || 'Вправа';
  let description = exercise.description || '';
  // Перевіряємо всі можливі поля для зображення
  const imageUrl = exercise.gifURL || exercise.imgURL || exercise.imageURL || exercise.image || exercise.gif || exercise.thumbnail || '';


  // Отримуємо інструкції з різних можливих полів API
  const instructions = exercise.instructions || exercise.steps || exercise.instruction || [];

  // Показуємо повний опис (не обрізаємо для сторінки категорії)
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
    <div class="exercise-header">
      <span class="exercise-badge">WORKOUT</span>
      <span class="exercise-rating">
        ${rating}
        <div class="rating-stars-inline">
          ${generateRatingStars(parseFloat(rating))}
        </div>
      </span>
      <button class="exercise-start-btn" data-exercise-id="${exercise._id}">
        ${getStartButtonDescription(exercise.target || '')} →
      </button>
    </div>
    <div class="exercise-content">
      ${imageUrl ? `
        <div class="exercise-card-image">
          <img src="${imageUrl}" alt="${name}" loading="lazy" />
        </div>
      ` : `
        <div class="exercise-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      `}
      <h3 class="exercise-name">${name}</h3>
      ${fullDescription ? `
        <div class="exercise-description">
          <p>${fullDescription}</p>
        </div>
      ` : ''}
      ${stepsHTML}
      <div class="exercise-details">
        <p>Burned calories: <span>${calories}</span> / 3 min</p>
        <p>Body part: <span>${bodyPart}</span></p>
        <p>Target: <span>${target}</span></p>
      </div>
    </div>
  `;

  // Обробник завантаження зображення
  if (imageUrl) {
    const img = card.querySelector('.exercise-card-image img');
    const icon = card.querySelector('.exercise-icon');
    if (img) {
      img.addEventListener('load', function() {
        if (this.complete && this.naturalWidth > 0) {
          this.style.display = 'block';
        }
      });
      
      img.addEventListener('error', function() {
        this.style.display = 'none';
        if (icon) {
          icon.style.display = 'flex';
        }
        // Створюємо іконку, якщо її немає
        if (!icon && this.parentElement) {
          const iconDiv = document.createElement('div');
          iconDiv.className = 'exercise-icon';
          iconDiv.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `;
          this.parentElement.parentElement.insertBefore(iconDiv, this.parentElement);
          this.parentElement.style.display = 'none';
        }
      });
    }
  }

  // Обробник кліку на кнопку Start
  const startBtn = card.querySelector('.exercise-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      openExerciseModal(exercise._id);
    });
  }

  return card;
}

/**
 * Відобразити пагінацію
 * @param {number} totalPages
 * @param {number} currentPage
 */
function renderPagination(totalPages, currentPage) {
  const pagination = document.getElementById('pagination');
  if (!pagination || totalPages <= 1) {
    if (pagination) pagination.innerHTML = '';
    return;
  }

  pagination.innerHTML = '';

  // Кнопка "Перша сторінка"
  const firstBtn = createPaginationButton('««', 1, false);
  if (currentPage === 1) {
    firstBtn.classList.add('disabled');
    firstBtn.disabled = true;
  }
  pagination.appendChild(firstBtn);

  // Кнопка "Попередня сторінка"
  const prevBtn = createPaginationButton('«', currentPage - 1, false);
  if (currentPage === 1) {
    prevBtn.classList.add('disabled');
    prevBtn.disabled = true;
  }
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
  const nextBtn = createPaginationButton('»', currentPage + 1, false);
  if (currentPage === totalPages) {
    nextBtn.classList.add('disabled');
    nextBtn.disabled = true;
  }
  pagination.appendChild(nextBtn);

  // Кнопка "Остання сторінка"
  const lastBtn = createPaginationButton('»»', totalPages, false);
  if (currentPage === totalPages) {
    lastBtn.classList.add('disabled');
    lastBtn.disabled = true;
  }
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
      loadExercisesPage(page);
    });
  }

  return button;
}

/**
 * Завантажити сторінку вправ
 * @param {number} page
 */
async function loadExercisesPage(page) {
  const exercisesGrid = document.getElementById('exercises-grid');
  if (exercisesGrid) {
    exercisesGrid.innerHTML = '<div class="loading">Завантаження...</div>';
  }

  try {
    const params = {
      ...currentExercisesParams,
      page,
    };

    const response = await getExercises(params);
    await renderExercises(response.results || [], response.totalPages || 1, page);
  } catch (error) {
    if (exercisesGrid) {
      exercisesGrid.innerHTML = '<div class="error-message">Помилка завантаження вправ</div>';
    }
  }
}

/**
 * Оновити параметри пошуку вправ
 * @param {Object} params
 */
export function updateExercisesParams(params) {
  currentExercisesParams = { ...currentExercisesParams, ...params };
}
