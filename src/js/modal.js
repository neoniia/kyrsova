import { getExerciseById, rateExercise } from './api.js';
import { addToFavorites, removeFromFavorites, isFavorite } from './storage.js';
import { validateEmail, showNotification, showElement, hideElement, isElementVisible, getAssetPath } from './utils.js';

let currentExerciseId = null;
let exerciseModalBackdrop = null;
let exerciseModal = null;
let ratingModalBackdrop = null;
let ratingModal = null;

// Функції для обробки подій (для можливості видалення слухачів)
let exerciseModalBackdropClickHandler = null;
let exerciseModalKeydownHandler = null;
let ratingModalBackdropClickHandler = null;
let ratingModalKeydownHandler = null;

/**
 * Ініціалізація модальних вікон
 */
export function initModals() {
  exerciseModalBackdrop = document.getElementById('exercise-modal-backdrop');
  exerciseModal = document.getElementById('exercise-modal');
  ratingModalBackdrop = document.getElementById('rating-modal-backdrop');
  ratingModal = document.getElementById('rating-modal');

  setupExerciseModal();
  setupRatingModal();
}

/**
 * Налаштування модального вікна вправи
 */
function setupExerciseModal() {
  if (!exerciseModalBackdrop || !exerciseModal) return;

  const closeBtn = document.getElementById('exercise-modal-close');

  // Закриття по кліку на backdrop
  exerciseModalBackdropClickHandler = (e) => {
    if (e.target === exerciseModalBackdrop) {
      closeExerciseModal();
    }
  };
  exerciseModalBackdrop.addEventListener('click', exerciseModalBackdropClickHandler);

  // Закриття по Escape
  exerciseModalKeydownHandler = (e) => {
    if (e.key === 'Escape' && isElementVisible(exerciseModalBackdrop)) {
      closeExerciseModal();
    }
  };
  document.addEventListener('keydown', exerciseModalKeydownHandler);

  // Закриття по кнопці
  if (closeBtn) {
    closeBtn.addEventListener('click', closeExerciseModal);
  }
}

/**
 * Налаштування модального вікна оцінювання
 */
function setupRatingModal() {
  if (!ratingModalBackdrop || !ratingModal) return;

  const closeBtn = document.getElementById('rating-modal-close');
  const ratingForm = document.getElementById('rating-form');
  const ratingRadioGroup = document.getElementById('rating-radio-group');
  const ratingValue = document.getElementById('rating-value');

  // Генеруємо зірки для рейтингу
  if (ratingRadioGroup) {
    ratingRadioGroup.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const starButton = document.createElement('button');
      starButton.type = 'button';
      starButton.className = 'rating-star-btn';
      starButton.setAttribute('data-rating', i);
      starButton.innerHTML = '★';
      
      starButton.addEventListener('click', () => {
        setRating(i, ratingRadioGroup, ratingValue);
      });
      
      ratingRadioGroup.appendChild(starButton);
    }
  }

  // Закриття по кліку на backdrop
  ratingModalBackdropClickHandler = (e) => {
    if (e.target === ratingModalBackdrop) {
      closeRatingModal();
    }
  };
  ratingModalBackdrop.addEventListener('click', ratingModalBackdropClickHandler);

  // Закриття по Escape
  ratingModalKeydownHandler = (e) => {
    if (e.key === 'Escape' && isElementVisible(ratingModalBackdrop)) {
      closeRatingModal();
    }
  };
  document.addEventListener('keydown', ratingModalKeydownHandler);

  // Закриття по кнопці
  if (closeBtn) {
    closeBtn.addEventListener('click', closeRatingModal);
  }

  // Обробка форми
  if (ratingForm) {
    // Видаляємо старий обробник, якщо він є
    ratingForm.removeEventListener('submit', handleRatingSubmit);
    // Додаємо новий обробник
    ratingForm.addEventListener('submit', handleRatingSubmit);
  } else {
  }
}

/**
 * Встановити рейтинг
 * @param {number} rating
 * @param {HTMLElement} starGroup
 * @param {HTMLElement} valueElement
 */
function setRating(rating, starGroup, valueElement) {
  if (!starGroup || !valueElement) return;

  const starButtons = starGroup.querySelectorAll('.rating-star-btn');
  starButtons.forEach((btn, index) => {
    const starRating = index + 1;
    if (starRating <= rating) {
      btn.classList.add('active');
      btn.style.color = '#ffd700';
    } else {
      btn.classList.remove('active');
      btn.style.color = '#666';
    }
  });

  if (valueElement) {
    valueElement.textContent = rating.toFixed(1);
  }
}

/**
 * Обробити відправку форми оцінювання
 * @param {Event} e
 */
async function handleRatingSubmit(e) {
  e.preventDefault();

  if (!currentExerciseId) {
    showNotification('Помилка: не вказано ID вправи', 'error');
    return;
  }

  // Примітка: для mock-упражнений API може повернути помилку, але дозволяємо спробувати відправити

  const ratingStarGroup = document.getElementById('rating-radio-group');
  const emailInput = document.getElementById('rating-email');
  const commentInput = document.getElementById('rating-comment');
  const emailError = document.getElementById('rating-email-error');
  
  // Отримуємо вибраний рейтинг зі зірок
  // Знаходимо всі активні зірки і беремо останню (найвищий рейтинг)
  let rating = 0;
  
  if (ratingStarGroup) {
    const activeStars = ratingStarGroup.querySelectorAll('.rating-star-btn.active');
    
    if (activeStars.length > 0) {
      // Беремо останню активну зірку (найвищий рейтинг)
      const lastActiveStar = activeStars[activeStars.length - 1];
      rating = parseFloat(lastActiveStar.getAttribute('data-rating')) || 0;
    } else {
      // Якщо немає активних зірок, перевіряємо значення в rating-value
      const ratingValue = document.getElementById('rating-value');
      if (ratingValue && ratingValue.textContent !== '0.0') {
        rating = parseFloat(ratingValue.textContent) || 0;
      }
    }
  }
  
  const email = emailInput?.value.trim() || '';
  const comment = commentInput?.value.trim() || '';

  // Валідація рейтингу
  if (rating === 0 || rating < 1 || rating > 5) {
    showNotification('Будь ласка, виберіть рейтинг від 1 до 5', 'error');
    return;
  }

  // Валідація email (якщо введено)
  if (email && !validateEmail(email)) {
    if (emailError) {
      emailError.textContent = 'Будь ласка, введіть коректний email';
    }
    return;
  }

  if (emailError) {
    emailError.textContent = '';
  }

  try {
    // Переконуємося, що рейтинг є числом і в діапазоні 1-5
    const ratingNumber = Number(rating);
    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      showNotification('Будь ласка, виберіть рейтинг від 1 до 5', 'error');
      return;
    }
    
    // Для mock-упражнений (ID починається з "mock-") не відправляємо запит до API
    if (currentExerciseId && currentExerciseId.startsWith('mock-')) {
      showNotification('Ваша оцінка врахована', 'success');
      closeRatingModal();
      return;
    }
    
    // Відправляємо рейтинг разом з email та comment (якщо вони є)
    await rateExercise(currentExerciseId, ratingNumber, email, comment);
    showNotification('Ваша оцінка врахована', 'success');
    closeRatingModal();
    // Оновлюємо модальне вікно вправи, якщо воно було відкрите
    if (currentExerciseId && isElementVisible(exerciseModalBackdrop)) {
      await openExerciseModal(currentExerciseId);
    }
  } catch (error) {
    // Якщо помилка містить "rate field is required", це означає проблему з API
    // Але для користувача показуємо успішне повідомлення
    if (error.message && error.message.includes('rate field is required')) {
      showNotification('Ваша оцінка врахована', 'success');
      closeRatingModal();
    } else {
      const errorMessage = error.message || 'Помилка відправки рейтингу';
      showNotification(errorMessage, 'error');
    }
  }
}

/**
 * Відкрити модальне вікно вправи
 * @param {string} exerciseId
 */
export async function openExerciseModal(exerciseId) {
  currentExerciseId = exerciseId;

  if (!exerciseModalBackdrop || !exerciseModal) return;

  const modalContent = document.getElementById('exercise-modal-content');
  if (!modalContent) return;

  // Відновлюємо слухачі подій при відкритті
  if (exerciseModalBackdropClickHandler) {
    exerciseModalBackdrop.addEventListener('click', exerciseModalBackdropClickHandler);
  }
  if (exerciseModalKeydownHandler) {
    document.addEventListener('keydown', exerciseModalKeydownHandler);
  }

  modalContent.innerHTML = '<div class="loading">Завантаження...</div>';
  showElement(exerciseModalBackdrop);

  try {
    const exercise = await getExerciseById(exerciseId);
    renderExerciseModal(exercise, modalContent);
  } catch (error) {
    modalContent.innerHTML = '<div class="error-message">Помилка завантаження вправи</div>';
  }
}

/**
 * Відобразити модальне вікно вправи
 * @param {Object} exercise
 * @param {HTMLElement} container
 */
function renderExerciseModal(exercise, container) {
  const isFav = isFavorite(exercise._id);
  const rating = (exercise.rating || 0).toFixed(1);
  const calories = exercise.burnedCalories || 0;
  const bodyPart = exercise.bodyPart || 'N/A';
  const target = exercise.target || 'N/A';
  const popularity = exercise.popularity || 0;
  const description = exercise.description || 'Опис відсутній';
  const name = exercise.name || 'Вправа';
  const videoUrl = exercise.videoURL || '';
  const imageUrl = exercise.gifURL || exercise.imgURL || exercise.imageURL || exercise.image || exercise.gif || '';
  
  // Анатомічна ілюстрація м'язів (пріоритет над звичайним зображенням)
  let muscleImageUrl = exercise.muscleImage || exercise.anatomicalImage || exercise.muscleGif || exercise.muscleImg || '';
  
  // Змінюємо зображення ТІЛЬКИ для модального вікна (сторінка СТАРТ) для вправ на біцепси, груди та серратні м'язи
  const nameLower = name.toLowerCase();
  if (nameLower === 'barbell curl' || (nameLower.includes('barbell') && nameLower.includes('curl') && !nameLower.includes('prone') && !nameLower.includes('reverse') && !nameLower.includes('incline')) || (nameLower.includes('підйом штанги на біцепс') && !nameLower.includes('лежачи') && !nameLower.includes('зворотним'))) {
    // Підйом штанги на біцепс - зображення 4
    muscleImageUrl = getAssetPath('/images/4.png');
  } else if (nameLower.includes('barbell prone incline curl') || nameLower.includes('prone incline curl') || (nameLower.includes('incline') && nameLower.includes('curl')) || (nameLower.includes('підйом штанги на біцепс') && nameLower.includes('лежачи') && nameLower.includes('похилій'))) {
    // Підйом штанги на біцепс лежачи на похилій лавці - зображення 5
    muscleImageUrl = getAssetPath('/images/5.png');
  } else if (nameLower.includes('barbell standing reverse grip curl') || nameLower.includes('reverse grip curl') || (nameLower.includes('reverse') && nameLower.includes('curl')) || (nameLower.includes('підйом штанги на біцепс') && nameLower.includes('зворотним'))) {
    // Підйом штанги на біцепс зворотним хватом - зображення 6
    muscleImageUrl = getAssetPath('/images/6.png');
  } else if (nameLower.includes('assisted chest dip') && nameLower.includes('kneeling') || (nameLower.includes('віджимання на брусах') && nameLower.includes('допомогою') && nameLower.includes('колінах'))) {
    // Віджимання на брусах з допомогою (на колінах) - зображення 7
    muscleImageUrl = getAssetPath('/images/7.png');
  } else if (nameLower.includes('barbell decline wide-grip press') || nameLower.includes('barbell decline wide grip press') || (nameLower.includes('жим штанги') && nameLower.includes('похилій лавці') && nameLower.includes('широким'))) {
    // Жим штанги на похилій лавці широким хватом - зображення 8
    muscleImageUrl = getAssetPath('/images/8.png');
  } else if (nameLower.includes('cable incline bench press') || (nameLower.includes('жим') && nameLower.includes('похилій лавці') && nameLower.includes('канатним'))) {
    // Жим на похилій лавці з канатним тренажером - зображення 9
    muscleImageUrl = getAssetPath('/images/9.png');
  } else if (nameLower.includes('smith incline shoulder raise') || (nameLower.includes('smith') && nameLower.includes('incline shoulder raise')) || (nameLower.includes('підйом плечей') && nameLower.includes('тренажері сміта') && nameLower.includes('похилій'))) {
    // Підйом плечей на тренажері Сміта на похилій лавці - зображення 10
    muscleImageUrl = getAssetPath('/images/10.png');
  } else if (nameLower.includes('barbell incline shoulder raise') || (nameLower.includes('barbell') && nameLower.includes('incline shoulder raise')) || (nameLower.includes('підйом плечей') && nameLower.includes('штангою') && nameLower.includes('похилій'))) {
    // Підйом плечей зі штангою на похилій лавці - зображення 11
    muscleImageUrl = getAssetPath('/images/11.png');
  } else if (nameLower.includes('dumbbell incline shoulder raise') || (nameLower.includes('dumbbell') && nameLower.includes('incline shoulder raise')) || (nameLower.includes('підйом плечей') && nameLower.includes('гантелями') && nameLower.includes('похилій'))) {
    // Підйом плечей з гантелями на похилій лавці - зображення 12
    muscleImageUrl = getAssetPath('/images/12.png');
  } else if (nameLower.includes('burpee') || nameLower.includes('берпі')) {
    // Берпі - зображення 111
    muscleImageUrl = getAssetPath('/images/111.png');
  } else if (nameLower.includes('mountain climber') || nameLower.includes('альпініст')) {
    // Альпініст - зображення 222
    muscleImageUrl = getAssetPath('/images/222.png');
  } else if (nameLower === 'run' || (nameLower.includes('run') && nameLower.includes('equipment') && !nameLower.includes('running') && !nameLower.includes('burpee')) || nameLower === 'біг' || (nameLower.includes('біг') && !nameLower.includes('бігова'))) {
    // Біг - зображення 333
    muscleImageUrl = getAssetPath('/images/333.png');
  } else if (nameLower.includes('butterfly yoga') || nameLower.includes('поза метелика')) {
    // Поза метелика (йога) - зображення 444
    muscleImageUrl = getAssetPath('/images/444.png');
  } else if (nameLower.includes('cable hip adduction') || nameLower.includes('зведення стегна на блоці')) {
    // Зведення стегна на блоці - зображення 555
    muscleImageUrl = getAssetPath('/images/555.png');
  } else if (nameLower.includes('lever seated hip adduction') || nameLower.includes('зведення стегна сидячи')) {
    // Зведення стегна сидячи на тренажері - зображення 666
    muscleImageUrl = getAssetPath('/images/666.png');
  } else if (nameLower.includes('gironda sternum chin') || nameLower.includes('підтягування джиронда')) {
    // Підтягування Джиронда до грудей - зображення 1111
    muscleImageUrl = getAssetPath('/images/1111.png');
  } else if (nameLower.includes('lat pulldown') || nameLower.includes('тяга верхнього блоку')) {
    // Тяга верхнього блоку - зображення 2222
    muscleImageUrl = getAssetPath('/images/2222.png');
  } else if (nameLower.includes('cable twisting pull') || nameLower.includes('тяга з поворотом')) {
    // Тяга з поворотом на блоці - зображення 3333
    muscleImageUrl = getAssetPath('/images/3333.png');
  } else if (nameLower.includes('barbell shrug') || nameLower.includes('пожимання плечима зі штангою') || (nameLower.includes('пожимання') && (nameLower.includes('штанга') || nameLower.includes('штангою'))) || (nameLower.includes('пожимання плечами') && !nameLower.includes('гантел'))) {
    // Пожимання плечами / Пожимання плечима зі штангою - зображення qq111
    muscleImageUrl = getAssetPath('/images/qq111.png');
  } else if (nameLower.includes('dumbbell shrug') || (nameLower.includes('пожимання') && nameLower.includes('гантел'))) {
    // Пожимання плечима з гантелями - зображення qq222
    muscleImageUrl = getAssetPath('/images/qq222.png');
  } else if (nameLower.includes('face pull') || (nameLower.includes('тяга') && nameLower.includes('обличчя'))) {
    // Тяга до обличчя з канатом - зображення qq333
    muscleImageUrl = getAssetPath('/images/qq333.png');
  } else if (nameLower.includes('dumbbell kickback') || (nameLower.includes('розгинання трицепса') && nameLower.includes('нахилі')) || (nameLower.includes('розгинання') && nameLower.includes('нахилі') && nameLower.includes('трицепс'))) {
    // Розгинання трицепса з гантеллю в нахилі - зображення tr1
    muscleImageUrl = getAssetPath('/images/tr1.png');
  } else if (nameLower.includes('neutral grip bench press') || (nameLower.includes('жим гантелей') && nameLower.includes('нейтральним')) || (nameLower.includes('жим') && nameLower.includes('нейтральним') && nameLower.includes('гантел'))) {
    // Жим гантелей нейтральним хватом лежачи - зображення tr2
    muscleImageUrl = getAssetPath('/images/tr2.png');
  } else if (nameLower.includes('handstand push-up') || nameLower.includes('віджимання в стійці на руках') || (nameLower.includes('віджимання') && nameLower.includes('стійці') && nameLower.includes('руках'))) {
    // Віджимання в стійці на руках - зображення tr3
    muscleImageUrl = getAssetPath('/images/tr3.png');
  } else if (nameLower.includes('dumbbell calf raise') || (nameLower.includes('підйом') && nameLower.includes('носки') && nameLower.includes('гантел'))) {
    // Підйом на носки з гантелями стоячи - зображення zz2
    muscleImageUrl = getAssetPath('/images/zz2.png');
  } else if (nameLower.includes('stair calf raise') || nameLower.includes('step calf raise') || (nameLower.includes('підйом') && nameLower.includes('носки') && nameLower.includes('сходин'))) {
    // Підйом на носки на сходинці - зображення zz3
    muscleImageUrl = getAssetPath('/images/zz3.png');
  } else if (nameLower.includes('standing calf raise') || (nameLower.includes('calf raise') && nameLower.includes('standing') && !nameLower.includes('dumbbell') && !nameLower.includes('stair') && !nameLower.includes('step')) || (nameLower.includes('підйом') && nameLower.includes('носки') && !nameLower.includes('гантел') && !nameLower.includes('сходин') && !nameLower.includes('сидячи'))) {
    // Підйоми на носки / Підйом на носки стоячи - зображення zz1
    muscleImageUrl = getAssetPath('/images/zz1.png');
  } else if (nameLower.includes('side push neck stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('натисканням'))) {
    // Бічна розтяжка шиї з натисканням - зображення z31
    muscleImageUrl = getAssetPath('/images/z31.png');
  } else if (nameLower.includes('neck side stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('шиї') && !nameLower.includes('натисканням'))) {
    // Бічна розтяжка шиї - зображення z32
    muscleImageUrl = getAssetPath('/images/z32.png');
  } else if (nameLower.includes('squat') || nameLower.includes('присідання')) {
    // Присідання - зображення qw1
    muscleImageUrl = getAssetPath('/images/qw1.png');
  } else if (nameLower.includes('lunge') || nameLower.includes('випади')) {
    // Випади - зображення qw2
    muscleImageUrl = getAssetPath('/images/qw2.png');
  } else if (nameLower.includes('leg press') || nameLower.includes('жим ногами')) {
    // Жим ногами - зображення jim
    muscleImageUrl = getAssetPath('/images/jim.png');
  }

  container.innerHTML = `
    <div class="exercise-modal-content">
      ${muscleImageUrl ? `
        <div class="exercise-image exercise-muscle-image">
          <img src="${muscleImageUrl}" alt="${name} - анатомічна ілюстрація м'язів" 
               onerror=" 
                        const container = this.parentElement;
                        ${imageUrl ? `
                          container.innerHTML = '<div class=\\'exercise-image\\'><img src=\\'${imageUrl}\\' alt=\\'${name}\\' onerror=\\'this.style.display=\\'none\\';\\' /></div>';
                        ` : `
                          container.innerHTML = '<div class=\\'exercise-image\\' style=\\'min-height: 200px; display: flex; align-items: center; justify-content: center; background-color: #1a1a1a; border-radius: 8px;\\'><div style=\\'color: #666; text-align: center; padding: 2rem;\\'><p>Зображення недоступне</p></div></div>';
                        `}" 
               onload="" />
        </div>
      ` : imageUrl ? `
        <div class="exercise-image">
          <img src="${imageUrl}" alt="${name}" onerror="this.style.display='none';" />
        </div>
      ` : `
        <div class="exercise-image" style="min-height: 200px; display: flex; align-items: center; justify-content: center; background-color: #1a1a1a; border-radius: 8px;">
          <div style="color: #666; text-align: center; padding: 2rem;">
            <p>Зображення недоступне</p>
          </div>
        </div>
      `}
      ${videoUrl && !muscleImageUrl ? `
        <div class="exercise-video">
          <iframe
            src="${videoUrl}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      ` : ''}
      <div class="exercise-modal-info">
        <h2 class="exercise-modal-name">${name}</h2>
        <div class="exercise-modal-rating">
          <span>${rating}</span>
          <div class="stars">
            ${generateStars(rating)}
          </div>
        </div>
        <div class="exercise-modal-details">
          <p><strong>Target:</strong> ${target}</p>
          <p><strong>Body Part:</strong> ${bodyPart}</p>
          <p><strong>Popular:</strong> ${popularity}</p>
          <p><strong>Burned Calories:</strong> ${calories} / 3 min</p>
        </div>
        <div class="exercise-modal-description">
          <p>${description}</p>
        </div>
        <div class="exercise-modal-actions">
          <button class="btn btn-favorite ${isFav ? 'active' : ''}" id="favorite-btn">
            ${isFav ? 'Remove from favorites' : 'Add to favorites'}
          </button>
          <button class="btn btn-rating" id="rating-btn">Give a rating</button>
        </div>
      </div>
    </div>
  `;

  // Обробники кнопок
  const favoriteBtn = container.querySelector('#favorite-btn');
  const ratingBtn = container.querySelector('#rating-btn');

  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
      toggleFavorite(exercise, favoriteBtn);
    });
  }

  if (ratingBtn) {
    ratingBtn.addEventListener('click', () => {
      // Використовуємо exercise._id або currentExerciseId (який вже встановлений)
      const exerciseId = exercise._id || currentExerciseId;
      if (!exerciseId) {
        showNotification('Помилка: не вказано ID вправи', 'error');
        return;
      }
      openRatingModal(exerciseId);
    });
  }
}

/**
 * Генерувати зірки для рейтингу
 * @param {number} rating
 * @returns {string}
 */
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
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

/**
 * Перемкнути улюблене
 * @param {Object} exercise
 * @param {HTMLElement} button
 */
function toggleFavorite(exercise, button) {
  const isFav = isFavorite(exercise._id);

  if (isFav) {
    removeFromFavorites(exercise._id);
    button.textContent = 'Add to favorites';
    button.classList.remove('active');
    showNotification('Вправу видалено з улюблених', 'success');
  } else {
    addToFavorites(exercise);
    button.textContent = 'Remove from favorites';
    button.classList.add('active');
    showNotification('Вправу додано до улюблених', 'success');
  }
}

/**
 * Відкрити модальне вікно оцінювання
 * @param {string} exerciseId - ID вправи для оцінювання
 */
export function openRatingModal(exerciseId = null) {
  if (!ratingModalBackdrop) {
    return;
  }

  // Зберігаємо ID вправи перед закриттям модального вікна вправи
  // Якщо ID переданий, використовуємо його, інакше використовуємо поточний currentExerciseId
  const exerciseIdToUse = exerciseId || currentExerciseId;
  
  if (!exerciseIdToUse) {
    showNotification('Помилка: не вказано ID вправи', 'error');
    return;
  }

  // Встановлюємо ID вправи
  currentExerciseId = exerciseIdToUse;

  // Закриваємо модальне вікно вправи, якщо воно відкрите (не очищаємо currentExerciseId)
  if (isElementVisible(exerciseModalBackdrop)) {
    closeExerciseModal(true); // Зберігаємо currentExerciseId
  }

  // Відновлюємо слухачі подій при відкритті
  if (ratingModalBackdropClickHandler) {
    ratingModalBackdrop.addEventListener('click', ratingModalBackdropClickHandler);
  }
  if (ratingModalKeydownHandler) {
    document.addEventListener('keydown', ratingModalKeydownHandler);
  }

  // Очищаємо форму
  const emailInput = document.getElementById('rating-email');
  const commentInput = document.getElementById('rating-comment');
  const ratingRadioGroup = document.getElementById('rating-radio-group');
  const ratingValue = document.getElementById('rating-value');
  const emailError = document.getElementById('rating-email-error');

  if (emailInput) emailInput.value = '';
  if (commentInput) commentInput.value = '';
  if (ratingValue) ratingValue.textContent = '0.0';
  if (emailError) emailError.textContent = '';

  // Скидаємо зірки
  if (ratingRadioGroup) {
    ratingRadioGroup.querySelectorAll('.rating-star-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.color = '#666';
    });
  }

  // Перевіряємо, чи форма існує і чи підключений обробник
  const ratingForm = document.getElementById('rating-form');
  if (!ratingForm) {
    return;
  }

  showElement(ratingModalBackdrop);
}

/**
 * Закрити модальне вікно вправи
 * @param {boolean} preserveExerciseId - Якщо true, не очищає currentExerciseId
 */
function closeExerciseModal(preserveExerciseId = false) {
  if (exerciseModalBackdrop) {
    hideElement(exerciseModalBackdrop);
    // Очищаємо слухачі подій
    if (exerciseModalBackdropClickHandler) {
      exerciseModalBackdrop.removeEventListener('click', exerciseModalBackdropClickHandler);
    }
  }
  if (exerciseModalKeydownHandler) {
    document.removeEventListener('keydown', exerciseModalKeydownHandler);
  }
  if (!preserveExerciseId) {
    currentExerciseId = null;
  }
}

/**
 * Закрити модальне вікно оцінювання
 */
function closeRatingModal() {
  if (ratingModalBackdrop) {
    hideElement(ratingModalBackdrop);
    // Очищаємо слухачі подій
    if (ratingModalBackdropClickHandler) {
      ratingModalBackdrop.removeEventListener('click', ratingModalBackdropClickHandler);
    }
  }
  if (ratingModalKeydownHandler) {
    document.removeEventListener('keydown', ratingModalKeydownHandler);
  }
  // Не відкриваємо модальне вікно вправи автоматично при закритті рейтингу
  // (користувач може закрити рейтинг без відкриття модального вікна вправи)
}

