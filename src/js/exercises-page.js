import { getExercises, getExerciseById, getFilters } from './api.js';
import { openExerciseModal, openRatingModal } from './modal.js';
import { formatRating, showNotification } from './utils.js';
import { getMuscleGroupDescription } from './muscle-groups.js';
import { isFavorite, addToFavorites, removeFromFavorites } from './storage.js';

/**
 * Генерувати зірки для рейтингу (копія з modal.js для використання в картках)
 * @param {number} rating
 * @returns {string}
 */
function generateStarsForCard(rating) {
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

/**
 * Ініціалізація сторінки з вправами
 */
export function initExercisesPage() {
  // Отримуємо параметри з URL
  const urlParams = new URLSearchParams(window.location.search);
  const filterType = urlParams.get('filter');
  const filterValue = urlParams.get('category');
  const categoryName = urlParams.get('name') || 'Вправи';


  // Оновлюємо заголовок та опис
  const categoryTitle = document.getElementById('category-title');
  const categoryDescription = document.getElementById('category-description');
  
  if (categoryTitle) {
    // Отримуємо опис групи м'язів
    const muscleInfo = getMuscleGroupDescription(categoryName);
    categoryTitle.textContent = muscleInfo.name;
    
    if (categoryDescription) {
      categoryDescription.textContent = muscleInfo.description;
    }
  }

  // Налаштування кнопки "Назад"
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = './index.html';
    });
  }

  // Ініціалізація вкладок груп м'язів
  initMuscleTabs(filterType, filterValue, categoryName);

  // Завантажуємо вправи
  if (filterType && filterValue) {
    loadExercises(filterType, filterValue);
  } else {
    const exercisesGrid = document.getElementById('exercises-grid');
    if (exercisesGrid) {
      exercisesGrid.innerHTML = '<div class="error-message">Помилка: не вказано категорію</div>';
    }
  }
}

/**
 * Ініціалізація вкладок груп м'язів
 * @param {string} filterType
 * @param {string} filterValue
 * @param {string} categoryName
 */
function initMuscleTabs(filterType, filterValue, categoryName) {
  const muscleTabsContainer = document.querySelector('.muscle-tabs-container');
  const muscleTabs = document.querySelectorAll('.muscle-tab');
  
  if (!muscleTabsContainer || !muscleTabs || muscleTabs.length === 0) {
    return;
  }
  
  // Показуємо вкладки тільки для фільтра "Muscles"
  if (filterType !== 'Muscles') {
      muscleTabsContainer.style.display = 'none';
    return;
  }
  
  // Завжди показуємо вкладки для фільтра "Muscles"
    muscleTabsContainer.style.display = 'block';
  muscleTabsContainer.style.visibility = 'visible';
  
  // Встановлюємо активну вкладку на основі поточної категорії
  if (filterValue) {
    const currentMuscle = filterValue.toLowerCase();
    muscleTabs.forEach(tab => {
      const tabMuscle = tab.getAttribute('data-muscle').toLowerCase();
      if (currentMuscle === tabMuscle || currentMuscle.includes(tabMuscle) || tabMuscle.includes(currentMuscle)) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  // Додаємо обробники подій для вкладок
  // Отримуємо актуальні вкладки після можливих змін
  const currentTabs = document.querySelectorAll('.muscle-tab');
  currentTabs.forEach(tab => {
    // Видаляємо старі обробники подій через клонування
    const newTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(newTab, tab);
    
    // Додаємо новий обробник
    newTab.addEventListener('click', () => {
      const muscle = newTab.getAttribute('data-muscle');
      const muscleInfo = getMuscleGroupDescription(muscle);
      
      // Оновлюємо активну вкладку
      const allTabs = document.querySelectorAll('.muscle-tab');
      allTabs.forEach(t => t.classList.remove('active'));
      newTab.classList.add('active');
      
      // Оновлюємо заголовок та опис
      const categoryTitle = document.getElementById('category-title');
      const categoryDescription = document.getElementById('category-description');
      
      if (categoryTitle) {
        categoryTitle.textContent = muscleInfo.name;
      }
      
      if (categoryDescription) {
        categoryDescription.textContent = muscleInfo.description;
      }
      
      // Оновлюємо URL без перезавантаження сторінки
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('filter', 'Muscles');
      urlParams.set('category', muscle);
      urlParams.set('name', muscle);
      urlParams.set('page', '1');
      window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
      
      // Завантажуємо вправи для вибраної групи м'язів
      loadExercises('Muscles', muscle);
    });
  });
}

/**
 * Завантажити вправи для категорії
 * @param {string} filterType
 * @param {string} filterValue
 * @param {string} keyword - ключове слово для пошуку
 */
async function loadExercises(filterType, filterValue, keyword = null) {
  const exercisesGrid = document.getElementById('exercises-grid');
  const pagination = document.getElementById('pagination');

  if (exercisesGrid) {
    exercisesGrid.innerHTML = '<div class="loading">Завантаження...</div>';
  }

  // Формуємо параметри запиту
  const currentPage = getCurrentPage();
  const params = {
    page: currentPage,
    limit: 3, // 3 вправи на категорію, як просив босс
  };

  // Додаємо параметр пошуку за ключовим словом (пріоритет над фільтрами)
  if (keyword && keyword.trim()) {
    params.keyword = keyword.trim();
  }

  // Додаємо фільтр залежно від типу (тільки якщо немає пошуку)
  if (!params.keyword) {
    if (filterType === 'Muscles' && filterValue) {
      // Для "abs" спробуємо обидва варіанти: "abs" та "abdominals"
      const filterLower = filterValue.toLowerCase();
      if (filterLower === 'abs') {
        // Спочатку пробуємо "abs", якщо не спрацює - "abdominals"
        params.muscles = 'abs';
      } else {
        params.muscles = filterLower;
      }
    } else if (filterType === 'Body parts' && filterValue) {
      params.bodypart = filterValue.toLowerCase();
    } else if (filterType === 'Equipment' && filterValue) {
      params.equipment = filterValue.toLowerCase();
    }
  }


  try {
    let exercises = [];
    let totalPages = 1;

    const filterValueLower = filterValue ? filterValue.toLowerCase() : '';
    
    // Якщо є keyword, завжди використовуємо API для пошуку
    if (params.keyword) {
      try {
        const response = await getExercises(params);
        exercises = response.results || [];
        totalPages = response.totalPages || 1;
        
        // Якщо API не знайшов результатів, шукаємо в mock-даних
        if (exercises.length === 0) {
          const mockResults = searchMockExercises(params.keyword);
          if (mockResults.length > 0) {
            exercises = mockResults;
            totalPages = 1;
          }
        }
        
        // Для результатів пошуку завжди завантажуємо деталі
        if (exercises.length > 0) {
          exercises = await Promise.all(
            exercises.map(async (exercise) => {
              try {
                // Якщо це mock-вправа, використовуємо її як є
                if (exercise._id && exercise._id.startsWith('mock-')) {
                  return exercise;
                }
                
                const details = await getExerciseById(exercise._id);
                return { 
                  ...exercise, 
                  ...details,
                  name: details.name || exercise.name,
                  description: details.description || exercise.description,
                  instructions: details.instructions || details.steps || details.instruction || exercise.instructions || exercise.steps || exercise.instruction || [],
                  rating: details.rating || exercise.rating,
                  burnedCalories: details.burnedCalories || exercise.burnedCalories,
                  bodyPart: details.bodyPart || exercise.bodyPart,
                  target: details.target || exercise.target,
                  gifURL: details.gifURL || exercise.gifURL || details.gif || exercise.gif,
                  imgURL: details.imgURL || exercise.imgURL || details.image || exercise.image,
                  imageURL: details.imageURL || exercise.imageURL || details.image || exercise.image,
                  image: details.image || exercise.image || details.imgURL || exercise.imgURL || details.imageURL || exercise.imageURL,
                  gif: details.gif || exercise.gif || details.gifURL || exercise.gifURL,
                  muscleImage: details.muscleImage || exercise.muscleImage || details.anatomicalImage || exercise.anatomicalImage || details.muscleGif || exercise.muscleGif || details.muscleImg || exercise.muscleImg || '',
                };
              } catch (error) {
                return exercise;
              }
            })
          );
        }
      } catch (apiError) {
        // Якщо API видав помилку, шукаємо в mock-даних
        const mockResults = searchMockExercises(params.keyword);
        if (mockResults.length > 0) {
          exercises = mockResults;
          totalPages = 1;
        } else {
          if (exercisesGrid) {
            exercisesGrid.innerHTML = '<div class="error-message">Вправи не знайдено</div>';
          }
          if (pagination) {
            pagination.innerHTML = '';
          }
          return;
        }
      }
    } else {
      // Для квадріцепсів завжди використовуємо mock-дані (перевіряємо першим, щоб уникнути виклику API)
      const isQuads = filterValueLower === 'quads' || filterValueLower.includes('quads') || filterValueLower.includes('quadriceps') || filterValueLower.includes('квадр');
      if (isQuads) {
        exercises = getMockExercisesByMuscle(filterValue);
        totalPages = 1;
      } else {
        // Список категорій, для яких є mock-дані
        const mockCategories = [
        'abs', 'abdominals',
        'biceps', 'pectorals', 'serratus anterior', 'cardiovascular system',
        'adductors', 'lats', 'traps', 'triceps', 'calves',
        'levator scapulae', 'quads'
      ];
      
      const hasMockData = mockCategories.some(cat => 
        filterValueLower === cat || filterValueLower.includes(cat)
      );


      // Для приводячих м'язів, широчайших м'язів, трапецій та литок завжди використовуємо mock-дані
      const isAdductors = filterValueLower === 'adductors' || filterValueLower.includes('adductors') || filterValueLower.includes('аддуктор');
      const isLats = filterValueLower === 'lats' || filterValueLower.includes('lats') || filterValueLower.includes('latissimus') || filterValueLower.includes('широчі');
      const isTraps = filterValueLower === 'traps' || filterValueLower.includes('traps') || filterValueLower.includes('trapezius') || filterValueLower.includes('трапеці');
      const isCalves = filterValueLower === 'calves' || filterValueLower.includes('calves') || filterValueLower.includes('calf') || filterValueLower.includes('литк');
      
      // Для категорій з mock-даними спочатку пробуємо API, але якщо немає результатів - використовуємо mock
      if (hasMockData) {
        // Для приводячих м'язів, широчайших м'язів, трапецій, литок та квадріцепсів завжди використовуємо mock-дані
        if (isAdductors) {
          exercises = getMockExercisesByMuscle(filterValue);
          totalPages = 1;
        } else if (isLats) {
          exercises = getMockExercisesByMuscle(filterValue);
          totalPages = 1;
        } else if (isTraps) {
          exercises = getMockExercisesByMuscle(filterValue);
          totalPages = 1;
        } else if (isCalves) {
          exercises = getMockExercisesByMuscle(filterValue);
          totalPages = 1;
        } else {
          // Для інших категорій спочатку пробуємо API
          try {
            const response = await getExercises(params);
            exercises = response.results || [];
            totalPages = response.totalPages || 1;
            
            // Якщо для "abs" API не повернув результатів, спробуємо "abdominals"
            if (exercises.length === 0 && filterValueLower === 'abs') {
              const paramsAbdominals = { ...params, muscles: 'abdominals' };
              try {
                const responseAbdominals = await getExercises(paramsAbdominals);
                exercises = responseAbdominals.results || [];
                totalPages = responseAbdominals.totalPages || 1;
              } catch (err) {
              }
            }
          } catch (apiError) {
          }
          
          // Якщо API не повернув результатів, використовуємо mock-дані
          if (exercises.length === 0) {
            exercises = getMockExercisesByMuscle(filterValue);
            totalPages = 1;
          }
        }
      } else {
        // Для інших категорій використовуємо API
        const response = await getExercises(params);
        exercises = response.results || [];
        totalPages = response.totalPages || 1;
      }
      }
    }

    if (exercises.length === 0) {
      if (exercisesGrid) {
        exercisesGrid.innerHTML = '<div class="empty-message">Вправи не знайдено</div>';
      }
      if (pagination) {
        pagination.innerHTML = '';
      }
      return;
    }

    // Завантажуємо детальну інформацію для всіх вправ, щоб отримати зображення
    let exercisesWithDetails = exercises;
    
    // Для результатів пошуку деталі вже завантажені вище
    // Для інших категорій завантажуємо деталі, щоб отримати зображення
    // Якщо API повернув вправи, завантажуємо деталі для них
    if (!params.keyword && exercises.length > 0 && exercises[0]._id && !exercises[0]._id.startsWith('mock-')) {
      // Це вправи з API - завантажуємо деталі
      exercisesWithDetails = await Promise.all(
        exercises.map(async (exercise) => {
          try {
            const details = await getExerciseById(exercise._id);
            // Об'єднуємо дані: базові дані + деталі (деталі мають пріоритет)
            return { 
              ...exercise, 
              ...details,
              // Зберігаємо базові дані, якщо деталі не містять їх
              name: details.name || exercise.name,
              description: details.description || exercise.description,
              instructions: details.instructions || details.steps || details.instruction || exercise.instructions || exercise.steps || exercise.instruction || [],
              rating: details.rating || exercise.rating,
              burnedCalories: details.burnedCalories || exercise.burnedCalories,
              bodyPart: details.bodyPart || exercise.bodyPart,
              target: details.target || exercise.target,
              // Зберігаємо URL зображень з оригінальних даних, якщо вони є
              gifURL: details.gifURL || exercise.gifURL || details.gif || exercise.gif,
              imgURL: details.imgURL || exercise.imgURL || details.image || exercise.image,
              imageURL: details.imageURL || exercise.imageURL || details.image || exercise.image,
              image: details.image || exercise.image || details.imgURL || exercise.imgURL || details.imageURL || exercise.imageURL,
              gif: details.gif || exercise.gif || details.gifURL || exercise.gifURL,
              // Зберігаємо анатомічні ілюстрації м'язів
              muscleImage: details.muscleImage || exercise.muscleImage || details.anatomicalImage || exercise.anatomicalImage || details.muscleGif || exercise.muscleGif || details.muscleImg || exercise.muscleImg || '',
            };
          } catch (error) {
            // Якщо не вдалося завантажити деталі, використовуємо базові дані
            return exercise;
          }
        })
      );
    } else if (exercises.length > 0 && exercises[0]._id && exercises[0]._id.startsWith('mock-')) {
      // Це mock-дані - використовуємо їх як є
      exercisesWithDetails = exercises;
    }

    // Відображаємо вправи
    // Якщо використовується пошук (keyword), використовуємо звичайні картки, а не mock-стиль
    const isSearch = params.keyword && params.keyword.trim();
    const currentPage = getCurrentPage();
    renderExercisesForPage(exercisesWithDetails, totalPages, currentPage, filterType, filterValue, isSearch);

    // Налаштовуємо пагінацію (показуємо, якщо є більше однієї сторінки)
    setupPagination(totalPages, currentPage, filterType, filterValue);
  } catch (error) {
    if (exercisesGrid) {
      exercisesGrid.innerHTML = '<div class="error-message">Помилка завантаження вправ</div>';
    }
  }
}

/**
 * Відобразити вправи на сторінці
 * @param {Array} exercises
 * @param {number} totalPages
 * @param {number} currentPage
 * @param {string} filterType
 * @param {string} filterValue
 * @param {boolean} isSearch - чи це результат пошуку
 */
function renderExercisesForPage(exercises, totalPages, currentPage, filterType, filterValue, isSearch = false) {
  const exercisesGrid = document.getElementById('exercises-grid');
  if (!exercisesGrid) return;

  exercisesGrid.innerHTML = '';

  // Для результатів пошуку завжди використовуємо звичайні картки
  // Для категорій з mock-даними використовуємо стиль модального вікна
  const mockCategories = [
    'abs', 'abdominals', 'biceps', 'pectorals', 'serratus anterior',
    'cardiovascular system', 'adductors', 'lats', 'traps', 'triceps',
    'calves', 'levator scapulae', 'quads'
  ];
  
  const filterValueLower = filterValue ? filterValue.toLowerCase() : '';
  const hasMockData = !isSearch && mockCategories.some(cat => 
    filterValueLower === cat || filterValueLower.includes(cat)
  );
  
  exercises.forEach(exercise => {
    const card = hasMockData ? createModalStyleCard(exercise) : createExerciseCard(exercise);
    exercisesGrid.appendChild(card);
  });
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
  let imageUrl = exercise.gifURL || exercise.imgURL || exercise.imageURL || exercise.image || exercise.gif || '';
  
  // Перевіряємо назву вправи для правильних зображень трицепсів та литок
  const nameLower = name.toLowerCase();
  if (nameLower.includes('dumbbell kickback') || (nameLower.includes('розгинання') && nameLower.includes('нахилі'))) {
    imageUrl = '/images/ss1.jpg';
  } else if (nameLower.includes('neutral grip bench press') || (nameLower.includes('жим') && nameLower.includes('нейтральним'))) {
    imageUrl = '/images/ss2.png';
  } else if (nameLower.includes('handstand push-up') || nameLower.includes('віджимання в стійці')) {
    imageUrl = '/images/ss3.jpg';
  } else if (nameLower.includes('dumbbell calf raise') || (nameLower.includes('підйом') && nameLower.includes('гантел') && nameLower.includes('стоячи'))) {
    imageUrl = '/images/gg2.jpg';
  } else if (nameLower.includes('stair calf raise') || nameLower.includes('step calf raise') || (nameLower.includes('підйом') && nameLower.includes('сходин'))) {
    imageUrl = '/images/gg3.jpg';
  } else if (nameLower.includes('standing calf raise') || (nameLower.includes('calf raise') && nameLower.includes('standing')) || (nameLower.includes('підйом') && nameLower.includes('носки') && !nameLower.includes('гантел') && !nameLower.includes('сходин'))) {
    imageUrl = '/images/gg1.jpg';
  } else if (nameLower.includes('side push neck stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('натисканням'))) {
    imageUrl = '/images/qw1.jpeg';
  } else if (nameLower.includes('neck side stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('шиї') && !nameLower.includes('натисканням'))) {
    imageUrl = '/images/qw2.jpg';
  }
  
  // Отримуємо інструкції з різних можливих полів API
  const instructions = exercise.instructions || exercise.steps || exercise.instruction || [];

  // Якщо опис містить загальне описування м'язів (не конкретної вправи), замінюємо на опис вправи
  if (description && (
      description.includes('Located on the inner thighs') ||
      description.includes('bring your legs towards the midline') ||
      description.includes('Adductor exercises include seated or standing') ||
      description.includes('Located on the back of the upper arm') ||
      description.includes('elbow extension') ||
      description.includes('Tricep pushdowns, overhead extensions') ||
      description.includes('Located at the back and side of the neck') ||
      description.includes('elevates the scapula') ||
      description.includes('shrugs and some rowing movements')
    )) {
    // nameLower вже визначено вище
    // Вправи на приводячі м'язи
    if (nameLower.includes('butterfly yoga') || nameLower.includes('поза метелика')) {
      description = 'Поза метелика - це статична йога-поза, яка працює через пасивне розтягування приводячих м\'язів внутрішньої частини стегон. Унікальність цієї вправи полягає в тому, що вона поєднує глибоке розтягування з технікою правильного дихання, що дозволяє м\'язам розслабитися та ефективно розтягнутися. На відміну від силових вправ, поза метелика працює через статичне утримання позиції, що покращує гнучкість тазобедреного суглоба, зменшує напругу в паху та покращує мобільність нижніх кінцівок. Ця вправа ідеально підходить для розминки перед тренуванням або заспокоєння після інтенсивних навантажень.';
    } else if (nameLower.includes('cable hip adduction') || nameLower.includes('зведення стегна на блоці')) {
      description = 'Зведення стегна на блоці - це стояча вправа, яка дозволяє працювати над приводячими м\'язами по одній нозі за раз, що забезпечує симетричний розвиток та виявлення дисбалансів між лівою та правою ногою. Унікальність цієї вправи полягає в тому, що виконання у стоячій позиції активізує стабілізатори кору та покращує баланс, одночасно зміцнюючи внутрішні м\'язи стегон. Блочний тренажер забезпечує постійне навантаження протягом всього руху, що робить вправу більш ефективною порівняно з вільними вагами. Ця вправа особливо корисна для спортсменів, які потребують функціональної сили та стабільності, а також для корекції м\'язового дисбалансу.';
    } else if (nameLower.includes('lever seated hip adduction') || nameLower.includes('зведення стегна сидячи')) {
      description = 'Зведення стегна сидячи на тренажері - це класична вправа на спеціалізованому тренажері для приводячих м\'язів, яка дозволяє працювати над обома ногами одночасно з максимальною ізоляцією цільових м\'язів. Унікальність цієї вправи полягає в тому, що сидяча позиція повністю усуває навантаження на стабілізатори та кор, дозволяючи зосередитися виключно на зміцненні приводячих м\'язів внутрішньої частини стегон. Тренажер забезпечує безпечну та контрольовану амплітуду руху, що робить вправу ідеальною для початківців та для відновлення після травм. Регулярне виконання цієї вправи зміцнює внутрішні м\'язи стегон, покращує симетричну силу обох ніг та допомагає запобігти травмам, пов\'язаним зі слабкістю аддукторів.';
    }
    // Вправи на трицепси
    else if (nameLower.includes('dumbbell kickback') || (nameLower.includes('розгинання') && nameLower.includes('нахилі'))) {
      description = 'Розгинання трицепса з гантеллю в нахилі - це ізольована вправа, яка дозволяє максимально сконцентруватися на роботі задньої частини плеча. Унікальність цієї вправи полягає в тому, що положення в нахилі з опорою на лавку забезпечує повну ізоляцію трицепса та усуває можливість читерства іншими м\'язами. Вправа особливо ефективна для розвитку латеральної та медіальної голівок трицепса, покращуючи рельєф та визначеність задньої частини плеча. Правильна техніка з фіксованим положенням плеча та повним розгинанням руки забезпечує максимальне навантаження на трицепси.';
    } else if (nameLower.includes('neutral grip bench press') || (nameLower.includes('жим') && nameLower.includes('нейтральним'))) {
      description = 'Жим гантелей нейтральним хватом лежачи - це базова силова вправа для масового набору трицепсів, яка виконується на горизонтальній лавці з використанням додаткового навантаження. Ключова особливість цієї вправи - нейтральний хват гантелей (долоні звернені одна до одної), який створює унікальний кут навантаження та дозволяє працювати з більшими вагами, ніж при класичному жимі. Це робить вправу ідеальною для прогресивного навантаження та збільшення м\'язової маси. Лежаче положення забезпечує стабільність та безпеку, дозволяючи зосередитися виключно на силі та техніці виконання. Вправа комплексно розвиває всі три голівки трицепса, передні дельти та верхню частину грудей, роблячи її однією з найефективніших для будівництва об\'єму та сили верхньої частини тіла.';
    } else if (nameLower.includes('handstand push-up') || nameLower.includes('віджимання в стійці')) {
      description = 'Віджимання в стійці на руках - це елітна гімнастична вправа, яка поєднує силову витривалість трицепсів з екстремальними вимогами до балансу та пропріоцепції. На відміну від класичних вправ з відягощенням, ця вправа виконується у вертикальному положенні з повною вагою тіла, що створює унікальне навантаження через гравітаційний вектор. Вертикальна позиція активізує не тільки трицепси та передні дельти, але й вимагає інтенсивної роботи м\'язів кора для підтримки стабільності. Ця вправа розвиває не лише м\'язову силу, але й нейром\'язову координацію, просторову орієнтацію та функціональну мобільність. Вона є випробуванням для найбільш підготовлених атлетів та демонструє високий рівень фізичної майстерності, роблячи її однією з найпрестижніших вправ у калістеніці та гімнастиці.';
    } else if (description.includes('Located on the back of the upper arm') || description.includes('elbow extension') || description.includes('Tricep pushdowns, overhead extensions')) {
      // Загальний опис для вправ на трицепси, який підходить до всіх трьох вправ
      description = 'Трицепси - це м\'язи задньої частини плеча, які відповідають за розгинання руки в лікті та складають більшу частину об\'єму плеча. Ефективні вправи на трицепси включають ізольовані рухи для максимальної концентрації на цільових м\'язах, комплексні жимові рухи для розвитку сили та обсягу, а також функціональні вправи з власною вагою для покращення координації та балансу. Правильна техніка виконання забезпечує максимальне навантаження на всі три голівки трицепса та сприяє розвитку сили, витривалості та рельєфу задньої частини плеча.';
    }
    // Вправи на леватор лопатки
    else if (nameLower.includes('side push neck stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('натисканням'))) {
      description = 'Бічна розтяжка шиї з натисканням - це унікальна вправа для розтягування м\'язя, що піднімає лопатку (леватор лопатки), яка поєднує пасивне розтягування з активним натисканням рукою для глибшого ефекту. Унікальність цієї вправи полягає в тому, що додатковий тиск рукою дозволяє досягти більш глибокого розтягування м\'язів задньої та бічної частини шиї, що особливо ефективно для зняття напруження та покращення мобільності. На відміну від звичайної бічної розтяжки, активне натискання створює більш інтенсивне розтягування, що допомагає швидше зменшити біль та дискомфорт у верхній частині спини та шиї. Ця вправа ідеально підходить для людей з хронічним напруженням у шиї та плечах, а також для відновлення після інтенсивних тренувань.';
    } else if (nameLower.includes('neck side stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('шиї') && !nameLower.includes('натисканням'))) {
      description = 'Бічна розтяжка шиї - це класична вправа для розтягування м\'язя, що піднімає лопатку (леватор лопатки), яка виконується через плавний нахил голови вбік. Унікальність цієї вправи полягає в тому, що вона працює через пасивне розтягування м\'язів задньої та бічної частини шиї, що дозволяє м\'язам природно розслабитися та розтягнутися без додаткового тиску. На відміну від більш інтенсивних варіантів розтяжки, ця вправа забезпечує м\'яке та контрольоване розтягування, що робить її ідеальною для початківців та для щоденного використання. Регулярне виконання цієї вправи покращує гнучкість шиї, зменшує напруження в верхній частині спини та плечах, а також допомагає підтримувати правильну поставу та запобігає виникненню болю.';
    }
  }

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
          ${generateRatingStars(rating)}
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

  // Обробник завантаження зображення для картки
  if (imageUrl) {
    const img = card.querySelector('.exercise-card-image img');
    const icon = card.querySelector('.exercise-icon');
    if (img) {
      img.addEventListener('load', function() {
        if (this.complete && this.naturalWidth > 0) {
          this.style.display = 'block';
          if (icon) icon.style.display = 'none';
        }
      });
      
      img.addEventListener('error', function() {
        this.style.display = 'none';
        if (icon) icon.style.display = 'flex';
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
 * Налаштувати пагінацію
 * @param {number} totalPages
 * @param {number} currentPage
 * @param {string} filterType
 * @param {string} filterValue
 */
function setupPagination(totalPages, currentPage, filterType, filterValue) {
  const pagination = document.getElementById('pagination');
  if (!pagination || totalPages <= 1) {
    if (pagination) {
      pagination.innerHTML = '';
      pagination.style.display = 'none';
    }
    return;
  }

  pagination.style.display = 'flex';
  pagination.innerHTML = '';

  // Кнопка "Перша сторінка"
  const firstBtn = createPaginationButton('««', 1, false, filterType, filterValue);
  if (currentPage === 1) {
    firstBtn.classList.add('disabled');
    firstBtn.disabled = true;
  }
  pagination.appendChild(firstBtn);

  // Кнопка "Попередня сторінка"
  const prevBtn = createPaginationButton('«', currentPage - 1, false, filterType, filterValue);
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
    const pageBtn = createPaginationButton(i.toString(), i, i === currentPage, filterType, filterValue);
    pagination.appendChild(pageBtn);
  }

  // Кнопка "Наступна сторінка"
  const nextBtn = createPaginationButton('»', currentPage + 1, false, filterType, filterValue);
  if (currentPage === totalPages) {
    nextBtn.classList.add('disabled');
    nextBtn.disabled = true;
  }
  pagination.appendChild(nextBtn);

  // Кнопка "Остання сторінка"
  const lastBtn = createPaginationButton('»»', totalPages, false, filterType, filterValue);
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
 * @param {boolean} disabled
 * @param {string} filterType
 * @param {string} filterValue
 * @returns {HTMLElement}
 */
function createPaginationButton(text, page, isActive, filterType, filterValue) {
  const button = document.createElement('button');
  const isDisabled = isActive || page < 1;
  button.className = `pagination-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
  button.textContent = text;
  button.disabled = isDisabled;
  button.setAttribute('data-page', page.toString());

  if (!isDisabled) {
    button.addEventListener('click', () => {
      loadExercisesPage(page, filterType, filterValue);
    });
  }

  return button;
}

/**
 * Завантажити сторінку вправ
 * @param {number} page
 * @param {string} filterType
 * @param {string} filterValue
 */
async function loadExercisesPage(page, filterType, filterValue) {
  const exercisesGrid = document.getElementById('exercises-grid');
  if (exercisesGrid) {
    exercisesGrid.innerHTML = '<div class="loading">Завантаження...</div>';
  }

  // Оновлюємо URL без перезавантаження сторінки
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set('page', page.toString());
  window.history.pushState({}, '', `./page-3.html?${urlParams.toString()}`);

  const params = {
    page,
    limit: 3,
  };

  if (filterType === 'Muscles' && filterValue) {
    // Для "abs" API може очікувати "abdominals"
    const muscleValue = filterValue.toLowerCase() === 'abs' ? 'abdominals' : filterValue.toLowerCase();
    params.muscles = muscleValue;
  } else if (filterType === 'Body parts' && filterValue) {
    params.bodypart = filterValue.toLowerCase();
  } else if (filterType === 'Equipment' && filterValue) {
    params.equipment = filterValue.toLowerCase();
  }

  try {
    const response = await getExercises(params);
    const exercises = response.results || [];
    const totalPages = response.totalPages || 1;
    
    // Завантажуємо детальну інформацію для кожної вправи
    const exercisesWithDetails = await Promise.all(
      exercises.map(async (exercise) => {
        try {
          const details = await getExerciseById(exercise._id);
          return { 
            ...exercise, 
            ...details,
            name: details.name || exercise.name,
            description: details.description || exercise.description,
            rating: details.rating || exercise.rating,
            burnedCalories: details.burnedCalories || exercise.burnedCalories,
            bodyPart: details.bodyPart || exercise.bodyPart,
            target: details.target || exercise.target,
          };
        } catch (error) {
          return exercise;
        }
      })
    );
    
    renderExercisesForPage(exercisesWithDetails, totalPages, page, filterType, filterValue);
    
    // Налаштовуємо пагінацію
    setupPagination(totalPages, page, filterType, filterValue);
  } catch (error) {
    if (exercisesGrid) {
      exercisesGrid.innerHTML = '<div class="error-message">Помилка завантаження вправ</div>';
    }
  }
}

/**
 * Отримати поточну сторінку з URL
 * @returns {number}
 */
function getCurrentPage() {
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('page') || '1', 10);
}

/**
 * Знайти mock-вправу за ID
 * @param {string} exerciseId
 * @returns {Object|null}
 */
/**
 * Отримати всі mock-вправи
 * @returns {Array}
 */
export function getAllMockExercises() {
  return [
    ...getMockAbsExercises(),
    ...getMockBicepsExercises(),
    ...getMockPectoralsExercises(),
    ...getMockSerratusExercises(),
    ...getMockCardioExercises(),
    ...getMockAdductorsExercises(),
    ...getMockLatsExercises(),
    ...getMockTrapsExercises(),
    ...getMockTricepsExercises(),
    ...getMockCalvesExercises(),
    ...getMockLevatorExercises(),
    ...getMockQuadsExercises(),
  ];
}

// Кеш для упражнений из body parts и equipment
let cachedBodyPartsExercises = [];
let cachedEquipmentExercises = [];
let exercisesCacheLoaded = false;
let exercisesCacheLoading = false;

/**
 * Загрузить упражнения из body parts и equipment для поиска
 */
export async function loadExercisesForSearch() {
  if (exercisesCacheLoaded || exercisesCacheLoading) {
    return;
  }

  exercisesCacheLoading = true;

  try {
    // Загружаем упражнения из body parts
    try {
      const bodyPartsResponse = await getFilters('Body parts', 1, 100);
      if (bodyPartsResponse && bodyPartsResponse.results) {
        const bodyPartsCategories = bodyPartsResponse.results;
        const bodyPartsPromises = bodyPartsCategories.map(async (category) => {
          try {
            const exercisesResponse = await getExercises({
              bodypart: category.name || category.filter,
              page: 1,
              limit: 20, // Загружаем по 20 упражнений из каждой категории
            });
            return exercisesResponse.results || [];
          } catch (error) {
            return [];
          }
        });

        const bodyPartsResults = await Promise.all(bodyPartsPromises);
        cachedBodyPartsExercises = bodyPartsResults.flat();
      }
    } catch (error) {
    }

    // Загружаем упражнения из equipment
    try {
      const equipmentResponse = await getFilters('Equipment', 1, 100);
      if (equipmentResponse && equipmentResponse.results) {
        const equipmentCategories = equipmentResponse.results;
        const equipmentPromises = equipmentCategories.map(async (category) => {
          try {
            const exercisesResponse = await getExercises({
              equipment: category.name || category.filter,
              page: 1,
              limit: 20, // Загружаем по 20 упражнений из каждой категории
            });
            return exercisesResponse.results || [];
          } catch (error) {
            return [];
          }
        });

        const equipmentResults = await Promise.all(equipmentPromises);
        cachedEquipmentExercises = equipmentResults.flat();
      }
    } catch (error) {
    }

    exercisesCacheLoaded = true;
  } catch (error) {
  } finally {
    exercisesCacheLoading = false;
  }
}

/**
 * Получить все упражнения для поиска (mock + body parts + equipment)
 * @returns {Array}
 */
function getAllExercisesForSearch() {
  const mockExercises = getAllMockExercises();
  const allExercises = [
    ...mockExercises,
    ...cachedBodyPartsExercises,
    ...cachedEquipmentExercises,
  ];
  
  // Удаляем дубликаты по ID или названию
  const uniqueExercises = [];
  const seenIds = new Set();
  const seenNames = new Set();

  for (const exercise of allExercises) {
    const id = exercise._id || '';
    const name = (exercise.name || '').toLowerCase();

    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      uniqueExercises.push(exercise);
    } else if (name && !seenNames.has(name)) {
      seenNames.add(name);
      uniqueExercises.push(exercise);
    }
  }

  return uniqueExercises;
}

/**
 * Пошук вправ у mock-даних за ключовим словом
 * @param {string} keyword - ключове слово для пошуку
 * @returns {Array}
 */
export function searchMockExercises(keyword) {
  if (!keyword || !keyword.trim()) {
    return [];
  }

  const searchTerm = keyword.toLowerCase().trim();
  // Используем все упражнения: mock + body parts + equipment
  const allMockExercises = getAllExercisesForSearch();

  // Мапінг українських назв до англійських для пошуку
  const nameMapping = {
    '3/4 підйому тулуба': ['3/4 sit-up', '3/4 sit up'],
    'підйому тулуба': ['sit-up', 'sit up'],
    'бічний нахил 45°': ['45° side bend', '45 side bend', 'side bend'],
    'бічний нахил 45': ['45° side bend', '45 side bend', 'side bend'],
    'бічний нахил': ['side bend'],
    'велосипед': ['air bike', 'bicycle', 'bicycle crunches'],
    'скручування': ['crunches', 'crunch'],
    'підйоми ніг': ['leg raises', 'leg raise'],
    'планка': ['plank'],
  };

  // Мапінг категорій м'язів
  const categoryMapping = {
    'прес': ['abs', 'abdominal', 'прес'],
    'біцепси': ['biceps', 'біцепси'],
    'груди': ['pectorals', 'chest', 'груди'],
    'серратні': ['serratus anterior', 'serratus', 'серратні'],
    'кардіо': ['cardiovascular system', 'cardio', 'кардіо'],
    'аддуктори': ['adductors', 'аддуктори'],
    'широчі': ['lats', 'latissimus', 'широчі'],
    'трапеції': ['traps', 'trapezius', 'трапеції'],
    'трицепси': ['triceps', 'трицепси'],
    'литки': ['calves', 'calf', 'литки'],
    'леватор': ['levator scapulae', 'levator', 'леватор'],
    'квадри': ['quads', 'quadriceps', 'квадри'],
  };

  // Розбиваємо запит на окремі частини (якщо є двокрапка або коми)
  let searchParts = [searchTerm];
  
  // Якщо є двокрапка, розділяємо на категорію та вправи
  if (searchTerm.includes(':')) {
    const parts = searchTerm.split(':');
    searchParts = [parts[0].trim(), ...parts.slice(1).join(':').split(',').map(p => p.trim())];
  } else if (searchTerm.includes(',')) {
    // Якщо є коми, розділяємо на окремі вправи
    searchParts = searchTerm.split(',').map(p => p.trim());
  }

  // Створюємо список синонімів для пошуку
  const searchTerms = [];
  
  // Обробляємо кожну частину запиту
  for (const part of searchParts) {
    if (!part) continue;
    
    const partLower = part.toLowerCase().trim();
    searchTerms.push(partLower);
    
    // Перевіряємо, чи це категорія м'язів
    for (const [ukrCategory, engCategories] of Object.entries(categoryMapping)) {
      if (partLower.includes(ukrCategory) || ukrCategory.includes(partLower)) {
        searchTerms.push(...engCategories.map(c => c.toLowerCase()));
      }
      for (const engCategory of engCategories) {
        if (partLower.includes(engCategory.toLowerCase()) || engCategory.toLowerCase().includes(partLower)) {
          searchTerms.push(ukrCategory.toLowerCase());
        }
      }
    }
    
    // Перевіряємо мапінг назв вправ
    for (const [ukrName, engNames] of Object.entries(nameMapping)) {
      if (partLower.includes(ukrName.toLowerCase()) || ukrName.toLowerCase().includes(partLower)) {
        searchTerms.push(...engNames.map(n => n.toLowerCase()));
      }
      // Також перевіряємо зворотний напрямок
      for (const engName of engNames) {
        if (partLower.includes(engName.toLowerCase()) || engName.toLowerCase().includes(partLower)) {
          searchTerms.push(ukrName.toLowerCase());
        }
      }
    }
  }

  // Видаляємо дублікати
  const uniqueSearchTerms = [...new Set(searchTerms)];

  // Шукаємо за назвою вправи
  const results = allMockExercises.filter(exercise => {
    const name = (exercise.name || '').toLowerCase();
    const description = (exercise.description || '').toLowerCase();
    const target = (exercise.target || '').toLowerCase();
    const bodyPart = (exercise.bodyPart || '').toLowerCase();
    
    // Перевіряємо всі варіанти пошукових термінів
    const matchesSearchTerm = uniqueSearchTerms.some(term => 
      name.includes(term) || 
      description.includes(term) ||
      target.includes(term) ||
      bodyPart.includes(term)
    );

    // Також перевіряємо переклад назви
    const translatedName = translateExerciseName(exercise.name || '');
    const translatedNameLower = translatedName.toLowerCase();
    const matchesTranslatedName = uniqueSearchTerms.some(term => 
      translatedNameLower.includes(term)
    );

    return matchesSearchTerm || matchesTranslatedName;
  });

  // Видаляємо дублікати результатів
  const uniqueResults = [];
  const seenIds = new Set();
  for (const exercise of results) {
    if (!seenIds.has(exercise._id)) {
      seenIds.add(exercise._id);
      uniqueResults.push(exercise);
    }
  }

  return uniqueResults;
}

/**
 * Отримати автодоповнення для пошуку вправ
 * @param {string} query - пошуковий запит
 * @param {number} limit - максимальна кількість результатів
 * @returns {Array<string>} - масив назв вправ
 */
export function getAutocompleteSuggestions(query, limit = 10) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const originalQuery = query.trim();
  const searchTerm = originalQuery.toLowerCase().trim();
  
  // Используем все упражнения: mock + body parts + equipment
  const allExercises = getAllExercisesForSearch();
  
  const suggestions = new Set();

  // Функція для перевірки, чи починається рядок або слово з пошукового терміну
  function matchesSearchTerm(text, term) {
    if (!text || !term) return false;
    const textLower = text.toLowerCase();
    const termLower = term.toLowerCase();
    
    // Перевіряємо початок рядка
    if (textLower.startsWith(termLower)) {
      return true;
    }
    // Перевіряємо початок кожного слова
    const words = textLower.split(/\s+/);
    return words.some(word => word.startsWith(termLower));
  }
  
  // Функція для перевірки, чи містить рядок пошуковий термін
  function containsSearchTerm(text, term) {
    if (!text || !term) return false;
    return text.toLowerCase().includes(term.toLowerCase());
  }

  // Розбиваємо запит на окремі частини (якщо є коми)
  let searchParts = [searchTerm];
  if (searchTerm.includes(',')) {
    searchParts = searchTerm.split(',').map(p => p.trim()).filter(p => p.length > 0);
  }

  // Проходимо по всіх вправах
  let checkedCount = 0;
  for (const exercise of allExercises) {
    checkedCount++;
    const name = exercise.name || '';
    
    // Перевіряємо кожну частину запиту
    for (const part of searchParts) {
      if (!part || part.length === 0) continue;
      
      // Перевіряємо англійську назву
      if (matchesSearchTerm(name, part) || containsSearchTerm(name, part)) {
        const translatedName = translateExerciseName(name);
        suggestions.add(translatedName);
      }
      
      // Перевіряємо переклад назви
      try {
        const translatedName = translateExerciseName(name);
        if (translatedName !== name) {
          if (matchesSearchTerm(translatedName, part) || containsSearchTerm(translatedName, part)) {
            suggestions.add(translatedName);
          }
        }
      } catch (error) {
      }
      
      // Також перевіряємо target (категорію м'язів)
      const target = exercise.target || '';
      if (target.length > 0 && (matchesSearchTerm(target, part) || containsSearchTerm(target, part))) {
        suggestions.add(target);
      }
      
      // Перевіряємо bodyPart (частину тіла)
      const bodyPart = exercise.bodyPart || '';
      if (bodyPart.length > 0 && (matchesSearchTerm(bodyPart, part) || containsSearchTerm(bodyPart, part))) {
        suggestions.add(bodyPart);
      }
      
      // Перевіряємо equipment (обладнання)
      const equipment = exercise.equipment || '';
      if (equipment.length > 0 && (matchesSearchTerm(equipment, part) || containsSearchTerm(equipment, part))) {
        suggestions.add(equipment);
      }
    }
  }
  

  // Сортуємо результати: спочатку ті, що починаються з пошукового терміну
  const sortedSuggestions = Array.from(suggestions).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // Перевіряємо кожну частину запиту
    let aStartsWith = false;
    let bStartsWith = false;
    
    for (const part of searchParts) {
      if (aLower.startsWith(part.toLowerCase())) {
        aStartsWith = true;
      }
      if (bLower.startsWith(part.toLowerCase())) {
        bStartsWith = true;
      }
    }
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // Якщо обидва починаються або не починаються, сортуємо за алфавітом
    return aLower.localeCompare(bLower, 'uk');
  });


  // Обмежуємо кількість результатів
  return sortedSuggestions.slice(0, limit);
}

export function getMockExerciseById(exerciseId) {
  if (!exerciseId) {
    return null;
  }

  // Отримуємо всі mock-вправи з різних категорій
  const allMockExercises = getAllMockExercises();

  // Спочатку шукаємо за точним збігом ID
  let found = allMockExercises.find(exercise => exercise._id === exerciseId);
  if (found) {
    return found;
  }

  // Якщо не знайдено і ID починається з "mock-", повертаємо null
  if (exerciseId.startsWith('mock-')) {
    return null;
  }

  // Якщо ID не починається з "mock-", але це може бути вправа з API, яка має відповідну mock-вправу
  // Шукаємо за частиною ID (наприклад, якщо ID з API містить частину mock ID)
  found = allMockExercises.find(exercise => {
    const mockId = exercise._id.replace('mock-', '');
    return exerciseId.includes(mockId) || mockId.includes(exerciseId);
  });
  
  return found || null;
}

/**
 * Отримати mock-дані для вправ за групою м'язів
 * @param {string} muscleGroup
 * @returns {Array}
 */
function getMockExercisesByMuscle(muscleGroup) {
  try {
    const muscleLower = muscleGroup ? muscleGroup.toLowerCase() : '';
    
    // Перевіряємо різні варіанти назв
    if (muscleLower === 'abs' || muscleLower === 'abdominals' || muscleLower.includes('abs')) {
      return getMockAbsExercises();
    } else if (muscleLower === 'biceps' || muscleLower.includes('biceps')) {
      return getMockBicepsExercises();
    } else if (muscleLower === 'pectorals' || muscleLower.includes('pectorals') || muscleLower.includes('chest')) {
      return getMockPectoralsExercises();
    } else if (muscleLower.includes('serratus') || muscleLower.includes('anterior')) {
      return getMockSerratusExercises();
    } else if (muscleLower.includes('cardiovascular') || muscleLower.includes('cardio')) {
      return getMockCardioExercises();
    } else if (muscleLower === 'adductors' || muscleLower.includes('adductors') || muscleLower.includes('аддуктор')) {
      const result = getMockAdductorsExercises();
      return result;
    } else if (muscleLower === 'lats' || muscleLower.includes('lats') || muscleLower.includes('latissimus') || muscleLower.includes('широчі')) {
      const result = getMockLatsExercises();
      return result;
    } else if (muscleLower === 'traps' || muscleLower.includes('traps') || muscleLower.includes('trapezius') || muscleLower.includes('трапеці')) {
      const result = getMockTrapsExercises();
      return result;
    } else if (muscleLower === 'triceps' || muscleLower.includes('triceps')) {
      return getMockTricepsExercises();
    } else if (muscleLower === 'calves' || muscleLower.includes('calves') || muscleLower.includes('calf') || muscleLower.includes('литк')) {
      const result = getMockCalvesExercises();
      return result;
    } else if (muscleLower.includes('levator') || muscleLower.includes('scapulae') || muscleLower.includes('леватор')) {
      return getMockLevatorExercises();
    } else if (muscleLower === 'quads' || muscleLower.includes('quads') || muscleLower.includes('quadriceps') || muscleLower.includes('квадр')) {
      const result = getMockQuadsExercises();
      return result;
    }
    
    // За замовчуванням повертаємо порожній масив
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Mock-дані для вправ на прес
 * @returns {Array}
 */
function getMockAbsExercises() {
  return [
    {
      _id: 'mock-3-4-sit-up',
      name: '3/4 sit-up',
      rating: 3.7,
      burnedCalories: 220,
      target: 'прес',
      bodyPart: 'талія',
      equipment: 'власна вага',
      popularity: 31319,
      description: '3/4 підйом тулуба - це ефективна вправа для преса, яка націлена на верхню частину прямого м\'яза живота. Піднімаючи тулуб на три чверті шляху вгору, ви створюєте більший діапазон руху, ніж у традиційних скручувань, що допомагає зміцнити верхній прес та покращити стабільність кору. Ця вправа особливо корисна для розвитку визначеності преса та підвищення загальної сили кору.',
      instructions: [
        'Ляжте на спину зі зігнутими колінами та стопами на підлозі.',
        'Покладіть руки за голову або на груди.',
        'Напружте кор та підніміть верхню частину тулуба приблизно на три чверті шляху вгору.',
        'Затримайтеся на мить у верхній точці, потім повільно опустіть назад.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/z1.jpg',
      imgURL: '/images/z1.jpg',
      imageURL: '/images/z1.jpg',
      image: '/images/z1.jpg',
      gif: '/images/z1.jpg',
      // Анатомічна ілюстрація з 3D моделлю, що показує підсвічені м'язи преса
      muscleImage: '/images/1.png',
    },
    {
      _id: 'mock-45-side-bend',
      name: '45° side bend',
      rating: 3.9,
      burnedCalories: 323,
      target: 'прес',
      bodyPart: 'талія',
      equipment: 'власна вага',
      popularity: 15225,
      description: 'Бічний нахил під кутом 45° - це цільова вправа для косих м\'язів живота та бічних м\'язів кору. Нахиляючись вбік під кутом 45 градусів, ви ефективно залучаєте зовнішні та внутрішні косі м\'язи, які важливі для обертальних рухів та бічної стабільності. Ця вправа допомагає покращити визначеність талії, підвищує силу в бічних напрямках та підтримує кращу поставу завдяки зміцненню бічних м\'язів кору.',
      instructions: [
        'Встаньте прямо, ноги на ширині плечей.',
        'Покладіть одну руку за голову, а іншу на стегно.',
        'Нахиліться вбік під кутом 45 градусів, напружуючи косі м\'язи живота.',
        'Поверніться у початкове положення та повторіть з іншого боку.',
        'Продовжуйте чергувати сторони бажану кількість разів.'
      ],
      gifURL: '/images/z2.jpg',
      imgURL: '/images/z2.jpg',
      imageURL: '/images/z2.jpg',
      image: '/images/z2.jpg',
      gif: '/images/z2.jpg',
      // Анатомічна ілюстрація з 3D моделлю, що показує підсвічені косі м'язи живота
      muscleImage: '/images/2.png',
    },
    {
      _id: 'mock-air-bike',
      name: 'air bike',
      rating: 4.3,
      burnedCalories: 312,
      target: 'прес',
      bodyPart: 'талія',
      equipment: 'власна вага',
      popularity: 22002,
      description: 'Велосипед (bicycle crunches) - це динамічна вправа для кору, яка одночасно націлена на прямий м\'яз живота та косі м\'язи через рух педалювання. Чергуючи дотики протилежного ліктя до коліна, ви залучаєте як верхній, так і нижній прес, одночасно працюючи над косими м\'язами. Ця вправа покращує координацію кору, підвищує витривалість преса та забезпечує комплексне тренування для всієї абдомінальної області.',
      instructions: [
        'Ляжте на спину з руками за головою.',
        'Підніміть плечі від підлоги та підтягніть коліна до грудей.',
        'Чергуйте: правий лікоть до лівого коліна, потім лівий лікоть до правого коліна.',
        'Продовжуйте рух педалювання, напружуючи кор протягом всього руху.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/z3.jpg',
      imgURL: '/images/z3.jpg',
      imageURL: '/images/z3.jpg',
      image: '/images/z3.jpg',
      gif: '/images/z3.jpg',
      // Анатомічна ілюстрація з 3D моделлю, що показує підсвічені м'язи преса та косі м'язи
      muscleImage: '/images/3.png',
    },
  ];
}

/**
 * Mock-дані для вправ на біцепси
 * @returns {Array}
 */
function getMockBicepsExercises() {
  return [
    {
      _id: 'mock-barbell-curl',
      name: 'barbell curl',
      rating: 4.6,
      burnedCalories: 50,
      target: 'біцепси',
      bodyPart: 'руки',
      equipment: 'штанга',
      popularity: 6234,
      description: 'Підйом штанги на біцепс - це базова вправа для розвитку м\'язів передньої частини плеча. Вона ефективно навантажує біцепси та передпліч\'я, сприяючи збільшенню сили та обсягу м\'язів. Правильна техніка виконання забезпечує максимальну ефективність та запобігає травмам.',
      instructions: [
        'Встаньте прямо, тримаючи штангу в опущених руках.',
        'Повільно піднімайте штангу до плечей, скорочуючи біцепси.',
        'Затримайтеся на мить у верхній точці.',
        'Повільно опустіть штангу до початкового положення.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/b2.jpg',
      imgURL: '/images/b2.jpg',
      imageURL: '/images/b2.jpg',
      image: '/images/b2.jpg',
      gif: '/images/b2.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-biceps-curl',
      name: 'Підйом гантелей на біцепс',
      rating: 4.5,
      burnedCalories: 45,
      target: 'біцепси',
      bodyPart: 'руки',
      equipment: 'гантелі',
      popularity: 5234,
      description: 'Підйом гантелей на біцепс - це базова вправа для розвитку м\'язів передньої частини плеча. Вона ефективно навантажує біцепси та передпліч\'я, сприяючи збільшенню сили та обсягу м\'язів. Правильна техніка виконання забезпечує максимальну ефективність та запобігає травмам.',
      instructions: [
        'Встаньте прямо, тримаючи гантелі в опущених руках.',
        'Повільно піднімайте гантелі до плечей, скорочуючи біцепси.',
        'Затримайтеся на мить у верхній точці.',
        'Повільно опустіть гантелі до початкового положення.',
        'Повторіть бажану кількість разів.'
      ],
      // Реальна фотографія людини, що виконує підйом гантелей на біцепс
      gifURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-hammer-curl',
      name: 'Молоткові підйоми',
      rating: 4.3,
      burnedCalories: 40,
      target: 'біцепси',
      bodyPart: 'руки',
      equipment: 'гантелі',
      popularity: 4123,
      description: 'Молоткові підйоми - це унікальна вправа, яка одночасно розвиває біцепси та передпліч\'я завдяки нейтральному хвату. Вона особливо ефективна для розвитку брахіорадіального м\'яза та покращення загальної сили верхніх кінцівок. Ця вправа відрізняється від класичних підйомів тим, що долоні звернені одна до одної.',
      instructions: [
        'Тримайте гантелі нейтральним хватом (долоні звернені одна до одної).',
        'Піднімайте гантелі до плечей, зберігаючи нейтральний хват.',
        'Затримайтеся на мить у верхній точці.',
        'Повільно опустіть гантелі.',
        'Повторіть бажану кількість разів.'
      ],
      // Реальна фотографія людини, що виконує молоткові підйоми
      gifURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-concentration-curl',
      name: 'Концентровані підйоми',
      rating: 4.6,
      burnedCalories: 35,
      target: 'біцепси',
      bodyPart: 'руки',
      equipment: 'гантелі',
      popularity: 3456,
      description: 'Концентровані підйоми - це ізольована вправа, яка дозволяє максимально сконцентруватися на роботі біцепса. Виконуючись сидячи з опорою на стегно, вправа усуває допоміжні м\'язи та забезпечує чітку ізоляцію біцепса. Це ідеальна вправа для доопрацювання форми та піку біцепса.',
      instructions: [
        'Сядьте на лавку, розставивши ноги.',
        'Покладіть руку з гантеллю на внутрішню частину стегна.',
        'Піднімайте гантель до плеча, скорочуючи біцепс.',
        'Затримайтеся на мить у верхній точці.',
        'Повільно опустіть гантель і повторіть.'
      ],
      // Реальна фотографія людини, що виконує концентровані підйоми
      gifURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на груди
 * @returns {Array}
 */
function getMockPectoralsExercises() {
  return [
    {
      _id: 'mock-assisted-chest-dip',
      name: 'assisted chest dip (kneeling)',
      rating: 4.5,
      burnedCalories: 45,
      target: 'груди',
      bodyPart: 'груди',
      equipment: 'власна вага',
      popularity: 6234,
      description: 'Віджимання на брусах з допомогою колін - це ідеальна вправа для початківців та тих, хто хоче покращити техніку віджимань на брусах. Виконання на колінах значно зменшує навантаження, дозволяючи зосередитися на правильній формі та контролі руху. Ця вправа ефективно розвиває нижню частину грудей, передні дельти та трицепси, готуючи м\'язи до більш складних варіантів віджимань.',
      instructions: [
        'Встаньте на коліна перед брусами або стільцем.',
        'Візьміться за бруси широким хватом.',
        'Опускайте тіло вниз, згинаючи лікті.',
        'Відтискайтеся вгору до початкового положення.',
        'Тримайте спину прямою та контролюйте рух.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/p1.jpg',
      imgURL: '/images/p1.jpg',
      imageURL: '/images/p1.jpg',
      image: '/images/p1.jpg',
      gif: '/images/p1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-barbell-decline-wide-grip',
      name: 'barbell decline wide-grip press',
      rating: 4.7,
      burnedCalories: 65,
      target: 'груди',
      bodyPart: 'груди',
      equipment: 'штанга',
      popularity: 7234,
      description: 'Жим штанги на похилій лавці з широким хватом - це потужна вправа для розвитку нижньої частини великого грудного м\'яза. Похиле положення голови вниз створює унікальний кут навантаження, який важко досягти іншими вправами. Широкий хват максимально розтягує м\'язи грудей та забезпечує більший діапазон руху, що сприяє швидшому росту м\'язової маси та сили.',
      instructions: [
        'Встановіть лавку під нахилом вниз.',
        'Ляжте на лавку, тримаючи штангу широким хватом.',
        'Опускайте штангу до нижньої частини грудей.',
        'Відтискайте штангу вгору до повного випрямлення рук.',
        'Тримайте контроль над рухом на всій амплітуді.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/p2.jpg',
      imgURL: '/images/p2.jpg',
      imageURL: '/images/p2.jpg',
      image: '/images/p2.jpg',
      gif: '/images/p2.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-cable-incline-bench-press',
      name: 'cable incline bench press',
      rating: 4.6,
      burnedCalories: 55,
      target: 'груди',
      bodyPart: 'груди',
      equipment: 'канатний тренажер',
      popularity: 6123,
      description: 'Жим на похилій лавці з канатним тренажером - це високоефективна вправа для розвитку верхньої частини грудей та передніх дельт. На відміну від вільної ваги, канати забезпечують постійне напруження м\'язів протягом всього руху, що робить вправу більш інтенсивною та ефективною. Похиле положення лавки дозволяє зосередити навантаження саме на верхній частині грудей, створюючи чіткий рельєф та об\'єм м\'язів.',
      instructions: [
        'Встановіть лавку під нахилом вгору перед канатним тренажером.',
        'Візьміть рукоятки канатів у руки.',
        'Ляжте на лавку, тримаючи рукоятки на рівні грудей.',
        'Відтискайте рукоятки вперед та вгору до повного випрямлення рук.',
        'Повільно повертайте рукоятки назад до початкового положення.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/p3.jpg',
      imgURL: '/images/p3.jpg',
      imageURL: '/images/p3.jpg',
      image: '/images/p3.jpg',
      gif: '/images/p3.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на серратні м\'язи
 * @returns {Array}
 */
function getMockSerratusExercises() {
  return [
    {
      _id: 'mock-serratus-pushup',
      name: 'Віджимання з протрузією',
      rating: 4.3,
      burnedCalories: 45,
      target: 'серратні м\'язи',
      bodyPart: 'груди',
      equipment: 'власна вага',
      popularity: 3124,
      description: 'Віджимання з протрузією лопаток - це ефективна вправа для розвитку серратних м\'язів. Під час виконання вправи ви активно залучаєте передні зубчасті м\'язи, які відповідають за протрузію (висування) лопаток вперед та їх стабілізацію. Ця вправа покращує мобільність плечового поясу та допомагає запобігти проблемам з поставою.',
      instructions: [
        'Прийміть положення віджимань.',
        'Відтискайтеся вгору, максимально витягуючи лопатки.',
        'Затримайтеся на мить у верхній точці.',
        'Повільно опускайтеся вниз.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-scapular-wall-slide',
      name: 'Ковзання лопаток по стіні',
      rating: 4.2,
      burnedCalories: 30,
      target: 'серратні м\'язи',
      bodyPart: 'спина',
      equipment: 'власна вага',
      popularity: 2345,
      description: 'Ковзання лопаток по стіні - це вправа для покращення мобільності та контролю лопаток. Вона активно залучає серратні м\'язи, які відповідають за правильне позиціювання лопаток під час рухів рук. Регулярне виконання цієї вправи допомагає зміцнити серратні м\'язи та покращити стабілізацію плечового поясу.',
      instructions: [
        'Притисніться спиною до стіни.',
        'Підніміть руки вгору, тримаючи їх притиснутими до стіни.',
        'Ковзайте руками вгору та вниз по стіні.',
        'Тримайте контакт зі стіною на всій амплітуді.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-dumbbell-pullover',
      name: 'Пуловер з гантеллю',
      rating: 4.5,
      burnedCalories: 40,
      target: 'серратні м\'язи',
      bodyPart: 'груди',
      equipment: 'гантелі',
      popularity: 3456,
      description: 'Пуловер з гантеллю - це комплексна вправа, яка ефективно розвиває серратні м\'язи, грудні м\'язи та м\'язи передньої частини плеча. Під час виконання пуловера серратні м\'язи активно працюють для стабілізації лопаток та забезпечення правильного руху. Ця вправа також покращує гнучкість грудного відділу хребта.',
      instructions: [
        'Ляжте на лавку, тримаючи гантель над грудьми.',
        'Опускайте гантель за голову, злегка згинаючи лікті.',
        'Повертайте гантель назад над грудьми.',
        'Тримайте контроль над рухом.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для кардіо вправ
 * @returns {Array}
 */
function getMockCardioExercises() {
  return [
    {
      _id: 'mock-jumping-jacks',
      name: 'Стрибки з розведенням рук',
      rating: 4.6,
      burnedCalories: 80,
      target: 'серцево-судинна система',
      bodyPart: 'все тіло',
      equipment: 'власна вага',
      popularity: 6234,
      description: 'Стрибки з розведенням рук - це класична кардіо-вправа, яка ефективно підвищує пульс та покращує витривалість. Вправа залучає всі основні групи м\'язів, особливо ноги, плечі та кор, що робить її ідеальною для розминки та спалювання калорій. Регулярне виконання покращує координацію, гнучкість та загальну фізичну форму.',
      instructions: [
        'Встаньте прямо, ноги разом, руки опущені.',
        'Стрибніть, розводячи ноги на ширину плечей та піднімаючи руки вгору.',
        'Стрибніть назад, повертаючись у початкове положення.',
        'Продовжуйте в швидкому темпі.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-burpees',
      name: 'Берпі',
      rating: 4.8,
      burnedCalories: 100,
      target: 'серцево-судинна система',
      bodyPart: 'все тіло',
      equipment: 'власна вага',
      popularity: 7234,
      description: 'Берпі - це одна з найбільш інтенсивних кардіо-вправ, яка поєднує присідання, віджимання та стрибки. Вправа залучає практично всі м\'язи тіла та значно підвищує витривалість, силу та координацію. Берпі ефективно спалюють калорії, покращують роботу серцево-судинної системи та розвивають функціональну силу. Правильна техніка виконання забезпечує максимальну ефективність та запобігає травмам.',
      instructions: [
        'Встаньте прямо, ноги на ширині плечей.',
        'Присідайте, ставлячи руки на підлогу.',
        'Відстрибніть ногами назад у положення планки.',
        'Відтисніться один раз.',
        'Відстрибніть ногами назад до присідання та вистрибніть вгору.'
      ],
      gifURL: '/images/be1.jpg',
      imgURL: '/images/be1.jpg',
      imageURL: '/images/be1.jpg',
      image: '/images/be1.jpg',
      gif: '/images/be1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-mountain-climbers',
      name: 'Альпініст',
      rating: 4.7,
      burnedCalories: 75,
      target: 'серцево-судинна система',
      bodyPart: 'все тіло',
      equipment: 'власна вага',
      popularity: 5123,
      description: 'Альпініст - це динамічна кардіо-вправа, яка поєднує підвищення пульсу з зміцненням кору. Швидкі рухи ногами активно залучають м\'язи живота, ніг та плечового поясу. Вправа покращує витривалість, координацію та силу кору, роблячи її ідеальною для інтервальних тренувань та спалювання калорій. Правильна техніка з триманням прямого корпусу забезпечує максимальну ефективність.',
      instructions: [
        'Прийміть положення планки з прямими руками.',
        'Почергово підтягуйте коліна до грудей.',
        'Рухайтеся в швидкому темпі.',
        'Тримайте тіло прямою лінією.',
        'Продовжуйте бажану кількість часу.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на приводячі м\'язи
 * @returns {Array}
 */
function getMockAdductorsExercises() {
  return [
    {
      _id: 'mock-butterfly-yoga',
      name: 'Поза метелика (йога)',
      rating: 4.4,
      burnedCalories: 35,
      target: 'приводячі м\'язи',
      bodyPart: 'стегна',
      equipment: 'власна вага',
      popularity: 4123,
      description: 'Поза метелика - це статична йога-поза, яка працює через пасивне розтягування приводячих м\'язів внутрішньої частини стегон. Унікальність цієї вправи полягає в тому, що вона поєднує глибоке розтягування з технікою правильного дихання, що дозволяє м\'язам розслабитися та ефективно розтягнутися. На відміну від силових вправ, поза метелика працює через статичне утримання позиції, що покращує гнучкість тазобедреного суглоба, зменшує напругу в паху та покращує мобільність нижніх кінцівок. Ця вправа ідеально підходить для розминки перед тренуванням або заспокоєння після інтенсивних навантажень.',
      instructions: [
        'Сядьте на підлогу з випрямленою спиною.',
        'Зігніть коліна та з\'єднайте стопи підлогами один до одного.',
        'Тримайте стопи близько до тазу, коліна розведені вбік.',
        'Повільно нахиляйтеся вперед, тримаючи спину прямою.',
        'Затримайтеся в позиції на 30-60 секунд, дихаючи глибоко.',
        'Поверніться у початкове положення та повторіть.'
      ],
      gifURL: '/images/qq1.jpg',
      imgURL: '/images/qq1.jpg',
      imageURL: '/images/qq1.jpg',
      image: '/images/qq1.jpg',
      gif: '/images/qq1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-cable-hip-adduction',
      name: 'Зведення стегна на блоці',
      rating: 4.6,
      burnedCalories: 50,
      target: 'приводячі м\'язи',
      bodyPart: 'стегна',
      equipment: 'блочний тренажер',
      popularity: 4234,
      description: 'Зведення стегна на блоці - це стояча вправа, яка дозволяє працювати над приводячими м\'язами по одній нозі за раз, що забезпечує симетричний розвиток та виявлення дисбалансів між лівою та правою ногою. Унікальність цієї вправи полягає в тому, що виконання у стоячій позиції активізує стабілізатори кору та покращує баланс, одночасно зміцнюючи внутрішні м\'язи стегон. Блочний тренажер забезпечує постійне навантаження протягом всього руху, що робить вправу більш ефективною порівняно з вільними вагами. Ця вправа особливо корисна для спортсменів, які потребують функціональної сили та стабільності, а також для корекції м\'язового дисбалансу.',
      instructions: [
        'Прикріпіть манжету до щиколотки та під\'єднайте до нижнього блоку.',
        'Встаньте бічом до тренажера, тримаючись за опору для рівноваги.',
        'Підніміть ногу з манжетою від підлоги.',
        'Повільно зводьте ногу до середньої лінії тіла, напружуючи внутрішні м\'язи стегна.',
        'Затримайтеся на мить у верхній точці.',
        'Повільно поверніть ногу у початкове положення.',
        'Повторіть бажану кількість разів на кожну ногу.'
      ],
      gifURL: '/images/qq2.jpg',
      imgURL: '/images/qq2.jpg',
      imageURL: '/images/qq2.jpg',
      image: '/images/qq2.jpg',
      gif: '/images/qq2.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-lever-seated-hip-adduction',
      name: 'Зведення стегна сидячи на тренажері',
      rating: 4.7,
      burnedCalories: 45,
      target: 'приводячі м\'язи',
      bodyPart: 'стегна',
      equipment: 'тренажер',
      popularity: 3456,
      description: 'Зведення стегна сидячи на тренажері - це класична вправа на спеціалізованому тренажері для приводячих м\'язів, яка дозволяє працювати над обома ногами одночасно з максимальною ізоляцією цільових м\'язів. Унікальність цієї вправи полягає в тому, що сидяча позиція повністю усуває навантаження на стабілізатори та кор, дозволяючи зосередитися виключно на зміцненні приводячих м\'язів внутрішньої частини стегон. Тренажер забезпечує безпечну та контрольовану амплітуду руху, що робить вправу ідеальною для початківців та для відновлення після травм. Регулярне виконання цієї вправи зміцнює внутрішні м\'язи стегон, покращує симетричну силу обох ніг та допомагає запобігти травмам, пов\'язаним зі слабкістю аддукторів.',
      instructions: [
        'Сядьте на тренажер для зведення стегна, спину притисніть до спинки.',
        'Розмістіть ноги на підставках тренажера, коліна зігнуті під кутом 90 градусів.',
        'Встановіть відповідне навантаження на тренажері.',
        'Повільно зводьте ноги разом, напружуючи внутрішні м\'язи стегон.',
        'Затримайтеся на мить у верхній точці, коли ноги зведені.',
        'Повільно поверніть ноги у початкове положення, контролюючи рух.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/qq3.jpg',
      imgURL: '/images/qq3.jpg',
      imageURL: '/images/qq3.jpg',
      image: '/images/qq3.jpg',
      gif: '/images/qq3.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на широчайші м\'язи
 * @returns {Array}
 */
function getMockLatsExercises() {
  return [
    {
      _id: 'mock-gironda-sternum-chin',
      name: 'Підтягування Джиронда до грудей',
      rating: 4.8,
      burnedCalories: 65,
      target: 'широчайші м\'язи',
      bodyPart: 'спина',
      equipment: 'турнік',
      popularity: 7234,
      description: 'Підтягування Джиронда до грудей - це унікальна вправа, названа на честь легендарного тренера Вінса Джиронди, яка відрізняється від класичних підтягувань тим, що ви підтягуєтеся до грудей, а не до підборіддя. Ця техніка створює більший діапазон руху та максимально розтягує широчайші м\'язи спини, що забезпечує кращий розвиток ширини та товщини латів. Вправа також активно залучає ромбоподібні м\'язи, задні дельти та біцепси, роблячи її однією з найефективніших для розвитку верхньої частини спини.',
      instructions: [
        'Повисніть на турніку з широким хватом, трохи ширше за ширину плечей.',
        'Відхиліть тіло назад під кутом приблизно 30-45 градусів.',
        'Підтягуйтеся вгору, намагаючись доторкнутися грудьми до перекладини.',
        'У верхній точці максимально зведіть лопатки та затримайтеся на мить.',
        'Повільно опускайтеся вниз до повного розтягування рук.',
        'Тримайте контроль над рухом протягом всього виконання.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/ww1.jpg',
      imgURL: '/images/ww1.jpg',
      imageURL: '/images/ww1.jpg',
      image: '/images/ww1.jpg',
      gif: '/images/ww1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-cable-pulldown-pro-lat',
      name: 'Тяга верхнього блоку з профі-латовою рукояткою',
      rating: 4.7,
      burnedCalories: 55,
      target: 'широчайші м\'язи',
      bodyPart: 'спина',
      equipment: 'блочний тренажер',
      popularity: 6123,
      description: 'Тяга верхнього блоку з профі-латовою рукояткою - це вдосконалена версія класичної тяги верхнього блоку, яка використовує спеціальну рукоятку з вигнутими ручками для оптимального розвитку широчайших м\'язів спини. Профі-латова рукоятка дозволяє виконувати рух під природнішим кутом, що забезпечує краще розтягування та скорочення латів. Ця вправа ефективно залучає верхню та середню частину широчайших м\'язів, ромбоподібні м\'язи та задні дельти, сприяючи розвитку ширини та рельєфу спини.',
      instructions: [
        'Встановіть профі-латову рукоятку на верхньому блоці.',
        'Сядьте на тренажер, зафіксувавши ноги під валиками.',
        'Візьміть рукоятку широким хватом, долоні спрямовані вперед.',
        'Трохи відхиліть корпус назад, тримаючи спину прямою.',
        'Тягніть рукоятку до верхньої частини грудей, зводячи лопатки.',
        'У нижній точці максимально стисніть лопатки разом.',
        'Повільно повертайте рукоятку вгору до повного розтягування.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/ww2.jpg',
      imgURL: '/images/ww2.jpg',
      imageURL: '/images/ww2.jpg',
      image: '/images/ww2.jpg',
      gif: '/images/ww2.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-cable-twisting-pull',
      name: 'Тяга з поворотом на блоці',
      rating: 4.6,
      burnedCalories: 60,
      target: 'широчайші м\'язи',
      bodyPart: 'спина',
      equipment: 'блочний тренажер',
      popularity: 5234,
      description: 'Тяга з поворотом на блоці - це унікальна вправа, яка поєднує класичну тягу верхнього блоку з ротаційним рухом, що забезпечує комплексний розвиток широчайших м\'язів спини та покращує мобільність плечового поясу. Поворотний рух активізує додаткові м\'язи-стабілізатори та покращує координацію, роблячи вправу більш функціональною. Ця вправа особливо ефективна для розвитку середньої та нижньої частини широчайших м\'язів, а також для покращення симетрії та балансу м\'язів між лівою та правою стороною спини.',
      instructions: [
        'Встановіть рукоятку на верхньому блоці.',
        'Сядьте на тренажер, зафіксувавши ноги під валиками.',
        'Візьміть рукоятку обома руками, тримаючи спину прямою.',
        'Тягніть рукоятку вниз, одночасно повертаючи корпус в один бік.',
        'У нижній точці максимально зведіть лопатку біля сторони повороту.',
        'Повільно повертайте рукоятку вгору, повертаючи корпус у початкове положення.',
        'Повторіть рух з поворотом у протилежний бік.',
        'Продовжуйте чергувати сторони або виконуйте всі повторення на одну сторону, потім на іншу.'
      ],
      gifURL: '/images/ww3.jpg',
      imgURL: '/images/ww3.jpg',
      imageURL: '/images/ww3.jpg',
      image: '/images/ww3.jpg',
      gif: '/images/ww3.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на трапеції
 * @returns {Array}
 */
function getMockTrapsExercises() {
  return [
    {
      _id: 'mock-barbell-shrugs',
      name: 'Пожимання плечима зі штангою',
      rating: 4.5,
      burnedCalories: 40,
      target: 'трапеції',
      bodyPart: 'плечі',
      equipment: 'штанга',
      popularity: 5123,
      description: 'Пожимання плечами зі штангою - це класична ізольована вправа для розвитку верхньої частини трапецієподібних м\'язів. Унікальність цієї вправи полягає в тому, що використання штанги дозволяє використовувати значне навантаження, що забезпечує інтенсивний розвиток верхніх трапецій. Вправа ефективно зміцнює м\'язи верхньої частини спини та шиї, покращує поставу та стабілізацію плечового поясу. Правильна техніка з повним підняттям та опусканням плечей без обертання забезпечує максимальне навантаження саме на трапеції, мінімізуючи залучення інших м\'язів.',
      instructions: [
        'Встаньте прямо, ноги на ширині плечей, тримаючи штангу перед собою прямим хватом.',
        'Тримайте руки випрямленими, не згинаючи їх у ліктях.',
        'Піднімайте плечі строго вгору, намагаючись дістатися ними до вух.',
        'Затримайтеся на 1-2 секунди у верхній точці, максимально стискаючи трапеції.',
        'Повільно та контрольовано опускайте плечі вниз до повного розтягування.',
        'Тримайте спину прямою протягом всього виконання.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/ee1.jpg',
      imgURL: '/images/ee1.jpg',
      imageURL: '/images/ee1.jpg',
      image: '/images/ee1.jpg',
      gif: '/images/ee1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-dumbbell-shrugs',
      name: 'Пожимання плечима з гантелями',
      rating: 4.6,
      burnedCalories: 38,
      target: 'трапеції',
      bodyPart: 'плечі',
      equipment: 'гантелі',
      popularity: 4834,
      description: 'Пожимання плечами з гантелями - це варіація класичної вправи для трапецій, яка має переваги перед штангой завдяки більшій свободі руху та можливості незалежної роботи кожної руки. Унікальність цієї вправи полягає в тому, що гантелі дозволяють виконувати рух під природнішим кутом, що забезпечує краще розтягування та скорочення трапецій. Ця вправа особливо ефективна для виявлення та виправлення м\'язового дисбалансу між лівою та правою стороною, а також для покращення координації та контролю руху.',
      instructions: [
        'Встаньте прямо, тримаючи гантелі по боках тіла, долоні спрямовані до тіла.',
        'Тримайте руки випрямленими, не згинаючи їх у ліктях.',
        'Піднімайте плечі строго вгору, одночасно обидві сторони або почергово.',
        'У верхній точці максимально стисніть трапеції та затримайтеся на 1-2 секунди.',
        'Повільно опускайте плечі вниз до повного розтягування.',
        'Тримайте спину прямою та уникайте обертань плечей.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/ee2.jpg',
      imgURL: '/images/ee2.jpg',
      imageURL: '/images/ee2.jpg',
      image: '/images/ee2.jpg',
      gif: '/images/ee2.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-face-pull',
      name: 'Тяга до обличчя з канатом',
      rating: 4.7,
      burnedCalories: 42,
      target: 'трапеції',
      bodyPart: 'плечі',
      equipment: 'канатний тренажер',
      popularity: 4456,
      description: 'Тяга до обличчя з канатом - це комплексна вправа, яка ефективно розвиває середню та нижню частину трапецій, задні дельти та ромбоподібні м\'язи. Унікальність цієї вправи полягає в тому, що вона поєднує горизонтальну тягу з ротаційним рухом, що забезпечує комплексний розвиток задньої частини плечового поясу. Канатний тренажер забезпечує постійне навантаження протягом всього руху, що робить вправу більш ефективною порівняно з вільними вагами. Ця вправа особливо корисна для покращення постави, зменшення напруги в передній частині плечей та запобігання травмам плечового суглоба.',
      instructions: [
        'Встановіть канатний тренажер на рівні голови або трохи вище.',
        'Встаньте на відстані 1-2 кроків від тренажера, тримаючи канат обома руками.',
        'Трохи відхиліть корпус назад для стабільності.',
        'Тягніть канат до обличчя, розводячи руки в сторони та розділяючи канат.',
        'У кінцевій позиції канат має бути на рівні вух, лікті високо підняті.',
        'Максимально зведіть лопатки разом та затримайтеся на 1-2 секунди.',
        'Повільно повертайте канат у початкове положення, контролюючи рух.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/ee3.jpg',
      imgURL: '/images/ee3.jpg',
      imageURL: '/images/ee3.jpg',
      image: '/images/ee3.jpg',
      gif: '/images/ee3.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на трицепси
 * @returns {Array}
 */
function getMockTricepsExercises() {
  return [
    {
      _id: 'mock-dumbbell-kickback',
      name: 'Розгинання трицепса з гантеллю в нахилі',
      rating: 4.5,
      burnedCalories: 35,
      target: 'трицепси',
      bodyPart: 'руки',
      equipment: 'гантелі',
      popularity: 4834,
      description: 'Розгинання трицепса з гантеллю в нахилі - це ізольована вправа, яка дозволяє максимально сконцентруватися на роботі задньої частини плеча. Унікальність цієї вправи полягає в тому, що положення в нахилі з опорою на лавку забезпечує повну ізоляцію трицепса та усуває можливість читерства іншими м\'язами. Вправа особливо ефективна для розвитку латеральної та медіальної голівок трицепса, покращуючи рельєф та визначеність задньої частини плеча. Правильна техніка з фіксованим положенням плеча та повним розгинанням руки забезпечує максимальне навантаження на трицепси.',
      instructions: [
        'Встаньте біля лавки, нахилившись вперед та поставивши одну ногу на лавку для опори.',
        'Візьміть гантель в одну руку, тримаючи її зігнутою в лікті під кутом 90 градусів.',
        'Тримайте плече паралельно підлозі, притиснувши його до тіла.',
        'Розгинайте руку в лікті, відводячи гантель назад до повного розгинання.',
        'У верхній точці максимально стисніть трицепс та затримайтеся на 1-2 секунди.',
        'Повільно повертайте гантель у початкове положення, контролюючи рух.',
        'Повторіть бажану кількість разів на одну руку, потім на іншу.'
      ],
      gifURL: '/images/ss1.jpg',
      imgURL: '/images/ss1.jpg',
      imageURL: '/images/ss1.jpg',
      image: '/images/ss1.jpg',
      gif: '/images/ss1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-dumbbell-neutral-grip-bench-press',
      name: 'Жим гантелей нейтральним хватом лежачи',
      rating: 4.7,
      burnedCalories: 55,
      target: 'трицепси',
      bodyPart: 'руки',
      equipment: 'гантелі',
      popularity: 5123,
      description: 'Жим гантелей нейтральним хватом лежачи - це потужна комплексна вправа для розвитку трицепсів, яка поєднує переваги вільного руху гантелей з нейтральним хватом. Унікальність цієї вправи полягає в тому, що нейтральний хват (долоні звернені одна до одної) змінює акцент навантаження та забезпечує більш природний рух для плечового суглоба, зменшуючи ризик травм. Вправа ефективно розвиває всі три голівки трицепса, а також передні дельти та м\'язи грудей. Нейтральний хват дозволяє використовувати більше ваги порівняно з класичним жимом, що робить вправу особливо ефективною для збільшення сили та обсягу трицепсів.',
      instructions: [
        'Ляжте на лавку, тримаючи гантелі нейтральним хватом (долоні звернені одна до одної).',
        'Підніміть гантелі над грудьми, тримаючи руки випрямленими.',
        'Повільно опускайте гантелі до рівня грудей, згинаючи лікті.',
        'Тримайте лікті близько до тіла, не розводячи їх в сторони.',
        'Відтискайте гантелі вгору до повного розгинання рук.',
        'У верхній точці максимально стисніть трицепси та затримайтеся на мить.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/ss2.png',
      imgURL: '/images/ss2.png',
      imageURL: '/images/ss2.png',
      image: '/images/ss2.png',
      gif: '/images/ss2.png',
      muscleImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-handstand-pushup',
      name: 'Віджимання в стійці на руках',
      rating: 4.8,
      burnedCalories: 60,
      target: 'трицепси',
      bodyPart: 'руки',
      equipment: 'власна вага',
      popularity: 3456,
      description: 'Віджимання в стійці на руках - це одна з найскладніших та найефективніших вправ для розвитку трицепсів, яка вимагає значної сили, балансу та координації. Унікальність цієї вправи полягає в тому, що виконання у вертикальному положенні з повною вагою тіла створює екстремальне навантаження на трицепси, передні дельти та м\'язи кора. Вправа не тільки розвиває силу та витривалість трицепсів, але й покращує баланс, координацію та функціональну силу всього тіла. Ця вправа особливо корисна для спортсменів та людей, які прагнуть досягти максимального рівня фізичної підготовки.',
      instructions: [
        'Прийміть стійку на руках біля стіни для підтримки.',
        'Тримайте руки на ширині плечей, пальці спрямовані вперед.',
        'Повільно згинайте лікті, опускаючи голову до підлоги.',
        'Тримайте тіло прямою лінією, не прогинаючись у спині.',
        'Відтискайтеся вгору до повного розгинання рук.',
        'Тримайте контроль над рухом та балансом.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/ss3.jpg',
      imgURL: '/images/ss3.jpg',
      imageURL: '/images/ss3.jpg',
      image: '/images/ss3.jpg',
      gif: '/images/ss3.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на литки
 * @returns {Array}
 */
function getMockCalvesExercises() {
  return [
    {
      _id: 'mock-calf-raise',
      name: 'Підйоми на носки',
      rating: 4.5,
      burnedCalories: 30,
      target: 'литки',
      bodyPart: 'ноги',
      equipment: 'власна вага',
      popularity: 4123,
      description: 'Підйоми на носки стоячи - це базова вправа для розвитку м\'язів литок. Виконання стоячи забезпечує повний діапазон руху та максимальне розтягнення м\'язів, що робить вправу особливо ефективною для збільшення сили та обсягу литок. Вправа покращує стабілізацію стопи та важлива для бігу та стрибків.',
      instructions: [
        'Встаньте прямо, ноги на ширині плечей.',
        'Піднімайтеся на носки, максимально витягуючи литки.',
        'Затримайтеся на мить у верхній точці.',
        'Опускайтеся вниз до початкового положення.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/gg1.jpg',
      imgURL: '/images/gg1.jpg',
      imageURL: '/images/gg1.jpg',
      image: '/images/gg1.jpg',
      gif: '/images/gg1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-dumbbell-calf-raise',
      name: 'Підйом на носки з гантелями стоячи',
      rating: 4.7,
      burnedCalories: 45,
      target: 'литки',
      bodyPart: 'ноги',
      equipment: 'гантелі',
      popularity: 5234,
      description: 'Підйом на носки з гантелями стоячи - це потужна вправа для розвитку м\'язів литок з додатковим навантаженням. Використання гантелей дозволяє прогресивно збільшувати вагу та інтенсивність тренування, що робить вправу особливо ефективною для збільшення сили та обсягу литок. Унікальність цієї вправи полягає в тому, що додаткове навантаження створює більший стрес для м\'язів, сприяючи їх швидшому росту. Вправа також покращує стабілізацію та баланс, оскільки виконується з вагою в руках. Ця вправа ідеально підходить для тих, хто хоче значно збільшити силу та об\'єм литок за короткий термін.',
      instructions: [
        'Встаньте прямо, тримаючи гантелі в обох руках по боках.',
        'Ноги на ширині плечей, стопи повністю на підлозі.',
        'Піднімайтеся на носки, максимально витягуючи литки вгору.',
        'Затримайтеся на 1-2 секунди у верхній точці, відчуваючи напруження.',
        'Повільно опускайтеся вниз до повного розтягнення литок.',
        'Тримайте спину прямою та контролюйте рух протягом всього виконання.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/gg2.jpg',
      imgURL: '/images/gg2.jpg',
      imageURL: '/images/gg2.jpg',
      image: '/images/gg2.jpg',
      gif: '/images/gg2.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-stair-calf-raise',
      name: 'Підйом на носки на сходинці',
      rating: 4.8,
      burnedCalories: 40,
      target: 'литки',
      bodyPart: 'ноги',
      equipment: 'власна вага',
      popularity: 4567,
      description: 'Підйом на носки на сходинці - це вдосконалена версія класичної вправи для литок, яка забезпечує більший діапазон руху та глибше розтягнення м\'язів. Унікальність цієї вправи полягає в тому, що виконання на сходинці дозволяє п\'яті опускатися нижче рівня носків, що створює максимальне розтягнення литок у нижній точці руху. Це збільшує амплітуду руху та ефективність вправи, сприяючи кращому розвитку як гастронеміуса, так і камбаловидного м\'яза. Вправа особливо корисна для покращення гнучкості литок, збільшення сили та визначеності м\'язів. Вона також покращує баланс та пропріоцепцію, оскільки виконується на обмеженій поверхні.',
      instructions: [
        'Встаньте на сходинку або платформу, щоб п\'яті були в повітрі.',
        'Тримайтеся за поручні або стіну для балансу.',
        'Опускайте п\'яті вниз, максимально розтягуючи литки.',
        'Піднімайтеся на носки, витягуючи литки вгору до повного скорочення.',
        'Затримайтеся на мить у верхній точці.',
        'Повільно опускайтеся вниз до максимального розтягнення.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/gg3.jpg',
      imgURL: '/images/gg3.jpg',
      imageURL: '/images/gg3.jpg',
      image: '/images/gg3.jpg',
      gif: '/images/gg3.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на підйом лопатки
 * @returns {Array}
 */
function getMockLevatorExercises() {
  return [
    {
      _id: 'mock-neck-stretch',
      name: 'Розтяжка шиї',
      rating: 4.3,
      burnedCalories: 20,
      target: 'підйом лопатки',
      bodyPart: 'шия',
      equipment: 'власна вага',
      popularity: 3124,
      description: 'Розтяжка шиї - це вправа для розвитку м\'язя, що піднімає лопатку (леватор лопатки) та розслаблення м\'язів шиї. Правильна розтяжка допомагає зменшити напруження в шиї та плечах, покращити мобільність та запобігти болю. Регулярне виконання цієї вправи покращує стабілізацію плечового поясу та допомагає підтримувати правильну поставу.',
      instructions: [
        'Сядьте або встаньте прямо.',
        'Наклоніть голову вбік, намагаючись дістатися вухом до плеча.',
        'Затримайтеся на 20-30 секунд.',
        'Поверніть голову в початкове положення.',
        'Повторіть на іншу сторону.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-shoulder-roll',
      name: 'Обертання плечима',
      rating: 4.2,
      burnedCalories: 15,
      target: 'підйом лопатки',
      bodyPart: 'плечі',
      equipment: 'власна вага',
      popularity: 2345,
      description: 'Вправа для розслаблення м\'язів плечей та підйому лопатки.',
      instructions: [
        'Встаньте прямо, руки опущені.',
        'Повільно обертайте плечі назад круговими рухами.',
        'Виконайте 10-15 обертів.',
        'Повторіть обертання вперед.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-chin-tuck',
      name: 'Підтягування підборіддя',
      rating: 4.4,
      burnedCalories: 18,
      target: 'підйом лопатки',
      bodyPart: 'шия',
      equipment: 'власна вага',
      popularity: 3456,
      description: 'Вправа для зміцнення глибоких м\'язів шиї та покращення постави.',
      instructions: [
        'Встаньте або сядьте прямо.',
        'Підтягніть підборіддя до шиї, не нахиляючи голову вперед.',
        'Затримайтеся на 5-10 секунд.',
        'Поверніть голову в початкове положення.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imgURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      imageURL: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      gif: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      muscleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Mock-дані для вправ на квадрицепси
 * @returns {Array}
 */
function getMockQuadsExercises() {
  return [
    {
      _id: 'mock-squats',
      name: 'Присідання',
      rating: 4.8,
      burnedCalories: 70,
      target: 'квадрицепси',
      bodyPart: 'стегна',
      equipment: 'власна вага',
      popularity: 9234,
      description: 'Присідання - це базова вправа для розвитку квадріцепсів, сідничних м\'язів та загальної сили ніг. Вправа залучає практично всі м\'язи нижніх кінцівок та кору, роблячи її однією з найефективніших для загального розвитку тіла. Правильна техніка виконання з триманням спини прямою та колінами над стопами забезпечує безпеку та максимальну ефективність.',
      instructions: [
        'Встаньте прямо, ноги на ширині плечей.',
        'Присідайте, опускаючи таз вниз, як ніби сідаєте на стілець.',
        'Тримайте коліна над стопами, не виводячи їх вперед.',
        'Відтискайтеся назад до початкового положення.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/qqq1.jpg',
      imgURL: '/images/qqq1.jpg',
      imageURL: '/images/qqq1.jpg',
      image: '/images/qqq1.jpg',
      gif: '/images/qqq1.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-lunges',
      name: 'Випади',
      rating: 4.7,
      burnedCalories: 65,
      target: 'квадрицепси',
      bodyPart: 'стегна',
      equipment: 'власна вага',
      popularity: 7234,
      description: 'Випади - це функціональна вправа для розвитку квадріцепсів, сідничних м\'язів та покращення балансу. Вправа залучає кожну ногу окремо, що допомагає виправити м\'язовий дисбаланс та покращити координацію. Правильна техніка з контролем руху та триманням корпусу прямою забезпечує максимальну ефективність та безпеку.',
      instructions: [
        'Встаньте прямо, ноги на ширині плечей.',
        'Зробіть крок вперед однією ногою, присідаючи на ній.',
        'Відштовхніться назад до початкового положення.',
        'Повторіть на іншу ногу.',
        'Продовжуйте почергово.'
      ],
      gifURL: '/images/qqq2.webp',
      imgURL: '/images/qqq2.webp',
      imageURL: '/images/qqq2.webp',
      image: '/images/qqq2.webp',
      gif: '/images/qqq2.webp',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      _id: 'mock-leg-press',
      name: 'Жим ногами',
      rating: 4.6,
      burnedCalories: 75,
      target: 'квадрицепси',
      bodyPart: 'стегна',
      equipment: 'тренажер',
      popularity: 6123,
      description: 'Жим ногами - це вправа для розвитку квадріцепсів та сідничних м\'язів з використанням тренажера. Вправа дозволяє використовувати великі ваги без навантаження на спину, що робить її безпечною альтернативою присіданням. Правильна техніка з повним розгинанням та згинанням ніг забезпечує максимальне навантаження на передню частину стегна та сідниці.',
      instructions: [
        'Сядьте на тренажер, поставивши ноги на платформу.',
        'Опускайте платформу, згинаючи коліна.',
        'Відтискайте платформу вгору до повного розгинання ніг.',
        'Тримайте контроль над рухом.',
        'Повторіть бажану кількість разів.'
      ],
      gifURL: '/images/qqq3.jpg',
      imgURL: '/images/qqq3.jpg',
      imageURL: '/images/qqq3.jpg',
      image: '/images/qqq3.jpg',
      gif: '/images/qqq3.jpg',
      muscleImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];
}

/**
 * Створити SVG-зображення для вправи
 * @param {string} exerciseName
 * @returns {string}
 */
function createExerciseSVG(exerciseName) {
  // Прості SVG-іконки для різних вправ
  let svgPath = '';
  const nameLower = exerciseName.toLowerCase();
  
  if (nameLower.includes('crunches') || nameLower.includes('скручування')) {
    // Іконка для скручувань - фігура людини, що робить скручування
    svgPath = `
      <!-- Голова -->
      <circle cx="12" cy="6" r="2.5" fill="#4caf50" opacity="0.8"/>
      <!-- Торс -->
      <rect x="10" y="8.5" width="4" height="5" rx="1" fill="#4caf50" opacity="0.8"/>
      <!-- Ноги -->
      <rect x="9" y="13.5" width="2.5" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <rect x="12.5" y="13.5" width="2.5" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <!-- Руки за головою -->
      <path d="M 7 7 Q 9 9 10 8.5" stroke="#4caf50" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 17 7 Q 15 9 14 8.5" stroke="#4caf50" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Підлога -->
      <line x1="4" y1="18" x2="20" y2="18" stroke="#666" stroke-width="1"/>
    `;
  } else if (nameLower.includes('leg') || nameLower.includes('ніг')) {
    // Іконка для підйомів ніг - ноги підняті вгору
    svgPath = `
      <!-- Голова -->
      <circle cx="12" cy="5" r="2" fill="#4caf50" opacity="0.8"/>
      <!-- Торс -->
      <rect x="10.5" y="7" width="3" height="6" rx="1" fill="#4caf50" opacity="0.8"/>
      <!-- Ноги підняті вгору -->
      <rect x="10" y="7" width="2.5" height="8" rx="1" fill="#4caf50" opacity="0.8" transform="rotate(-45 11.25 11)"/>
      <rect x="11.5" y="7" width="2.5" height="8" rx="1" fill="#4caf50" opacity="0.8" transform="rotate(45 12.75 11)"/>
      <!-- Руки -->
      <rect x="8" y="8" width="2" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <rect x="14" y="8" width="2" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <!-- Підлога -->
      <line x1="4" y1="18" x2="20" y2="18" stroke="#666" stroke-width="1"/>
    `;
  } else if (nameLower.includes('plank') || nameLower.includes('планка')) {
    // Іконка для планки - горизонтальна позиція
    svgPath = `
      <!-- Голова -->
      <circle cx="12" cy="8" r="1.5" fill="#4caf50" opacity="0.8"/>
      <!-- Торс (горизонтально) -->
      <rect x="6" y="9.5" width="12" height="2.5" rx="1" fill="#4caf50" opacity="0.8"/>
      <!-- Руки (передпліччя) -->
      <rect x="4" y="9.5" width="3" height="2.5" rx="1" fill="#4caf50" opacity="0.8"/>
      <rect x="17" y="9.5" width="3" height="2.5" rx="1" fill="#4caf50" opacity="0.8"/>
      <!-- Ноги -->
      <rect x="6" y="12" width="2.5" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <rect x="15.5" y="12" width="2.5" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <!-- Підлога -->
      <line x1="2" y1="17" x2="22" y2="17" stroke="#666" stroke-width="1"/>
    `;
  } else {
    // Загальна іконка - фігура людини
    svgPath = `
      <circle cx="12" cy="6" r="2" fill="#4caf50" opacity="0.8"/>
      <rect x="10.5" y="8" width="3" height="5" rx="1" fill="#4caf50" opacity="0.8"/>
      <rect x="9" y="13" width="2.5" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <rect x="12.5" y="13" width="2.5" height="4" rx="1" fill="#4caf50" opacity="0.8"/>
      <line x1="8" y1="9" x2="10" y2="10" stroke="#4caf50" stroke-width="2" stroke-linecap="round"/>
      <line x1="16" y1="9" x2="14" y2="10" stroke="#4caf50" stroke-width="2" stroke-linecap="round"/>
      <line x1="4" y1="18" x2="20" y2="18" stroke="#666" stroke-width="1"/>
    `;
  }
  
  return `
    <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="background: transparent; display: block;">
      ${svgPath}
    </svg>
  `;
}

/**
 * Перекласти назву вправи на українську
 * @param {string} name
 * @returns {string}
 */
export function translateExerciseName(name) {
  if (!name) return 'Вправа';
  
  const nameLower = name.toLowerCase();
  
  // Переклади для вправ на біцепси
  if (nameLower === 'barbell curl' || nameLower.includes('barbell curl')) {
    return 'Підйом штанги на біцепс';
  } else if (nameLower.includes('barbell prone incline curl') || nameLower.includes('prone incline curl')) {
    return 'Підйом штанги на біцепс лежачи на похилій лавці';
  } else if (nameLower.includes('barbell standing reverse grip curl') || nameLower.includes('reverse grip curl')) {
    return 'Підйом штанги на біцепс зворотним хватом';
  } else if (nameLower.includes('hammer curl')) {
    return 'Молоткові підйоми';
  } else if (nameLower.includes('concentration curl')) {
    return 'Концентровані підйоми';
  } else if (nameLower.includes('dumbbell curl')) {
    return 'Підйом гантелей на біцепс';
  }
  
  // Переклади для вправ на груди
  if (nameLower.includes('assisted chest dip') && nameLower.includes('kneeling')) {
    return 'Віджимання на брусах з допомогою (на колінах)';
  } else if (nameLower.includes('barbell decline wide-grip press') || nameLower.includes('barbell decline wide grip press')) {
    return 'Жим штанги на похилій лавці широким хватом';
  } else if (nameLower.includes('cable incline bench press')) {
    return 'Жим на похилій лавці з канатним тренажером';
  }
  
  // Переклади для вправ на серратні м'язи
  if (nameLower.includes('smith incline shoulder raise')) {
    return 'Підйом плечей на тренажері Сміта на похилій лавці';
  } else if (nameLower.includes('barbell incline shoulder raise')) {
    return 'Підйом плечей зі штангою на похилій лавці';
  } else if (nameLower.includes('dumbbell incline shoulder raise')) {
    return 'Підйом плечей з гантелями на похилій лавці';
  } else if (nameLower.includes('incline shoulder raise')) {
    return 'Підйом плечей на похилій лавці';
  } else if (nameLower.includes('shoulder raise') && nameLower.includes('serratus')) {
    return 'Підйом плечей для серратних м\'язів';
  }
  
  // Переклади для кардіо вправ
  if (nameLower.includes('jumping jacks') || nameLower.includes('стрибки з розведенням')) {
    return 'Стрибки з розведенням рук';
  } else if (nameLower.includes('burpee') || nameLower.includes('берпі')) {
    return 'Берпі';
  } else if (nameLower.includes('mountain climber') || nameLower.includes('альпініст')) {
    return 'Альпініст';
  } else if (nameLower.includes('jump rope') || nameLower.includes('скакалка')) {
    return 'Стрибки на скакалці';
  } else if (nameLower === 'run' || (nameLower.includes('run') && nameLower.includes('equipment'))) {
    return 'Біг';
  } else if (nameLower.includes('running') || nameLower.includes('біг')) {
    return 'Біг';
  } else if (nameLower.includes('cycling') || nameLower.includes('велосипед')) {
    return 'Велосипед';
  } else if (nameLower.includes('jumping') || nameLower.includes('стрибки')) {
    return 'Стрибки';
  }
  
  // Переклади для вправ на приводячі м'язи (аддуктори)
  if (nameLower.includes('butterfly yoga') || nameLower.includes('поза метелика')) {
    return 'Поза метелика (йога)';
  } else if (nameLower.includes('cable hip adduction') || nameLower.includes('зведення стегна на блоці')) {
    return 'Зведення стегна на блоці';
  } else if (nameLower.includes('lever seated hip adduction') || nameLower.includes('зведення стегна сидячи')) {
    return 'Зведення стегна сидячи на тренажері';
  } else if (nameLower.includes('side lunge') || nameLower.includes('бічні випади')) {
    return 'Бічні випади';
  } else if (nameLower.includes('adductor') || nameLower.includes('аддуктор')) {
    return 'Вправа для приводячих м\'язів';
  }
  
  // Переклади для вправ на широчайші м'язи (лати)
  if (nameLower.includes('gironda sternum chin') || nameLower.includes('підтягування джиронда')) {
    return 'Підтягування Джиронда до грудей';
  } else if (nameLower.includes('cable pulldown') && (nameLower.includes('pro lat') || nameLower.includes('профі-лат'))) {
    return 'Тяга верхнього блоку з профі-латовою рукояткою';
  } else if (nameLower.includes('cable twisting pull') || nameLower.includes('тяга з поворотом')) {
    return 'Тяга з поворотом на блоці';
  } else if (nameLower.includes('lat pulldown') || nameLower.includes('тяга верхнього блоку')) {
    return 'Тяга верхнього блоку';
  } else if (nameLower.includes('pull-up') || nameLower.includes('підтягування')) {
    return 'Підтягування';
  } else if (nameLower.includes('bent-over row') || nameLower.includes('тяга в нахилі')) {
    return 'Тяга штанги в нахилі';
  }
  
  // Переклади для вправ на трапеції
  if (nameLower.includes('barbell shrug') || (nameLower.includes('пожимання') && nameLower.includes('штанга'))) {
    return 'Пожимання плечима зі штангою';
  } else if (nameLower.includes('dumbbell shrug') || (nameLower.includes('пожимання') && nameLower.includes('гантел'))) {
    return 'Пожимання плечима з гантелями';
  } else if (nameLower.includes('face pull') || (nameLower.includes('тяга') && nameLower.includes('обличчя'))) {
    return 'Тяга до обличчя з канатом';
  } else if (nameLower.includes('shrug') || nameLower.includes('пожимання')) {
    return 'Пожимання плечами';
  } else if (nameLower.includes('trap') || nameLower.includes('трапеці')) {
    return 'Вправа для трапецій';
  }
  
  // Переклади для вправ на трицепси
  if (nameLower.includes('dumbbell kickback') || (nameLower.includes('розгинання') && nameLower.includes('нахилі'))) {
    return 'Розгинання трицепса з гантеллю в нахилі';
  } else if (nameLower.includes('neutral grip bench press') || (nameLower.includes('жим') && nameLower.includes('нейтральним'))) {
    return 'Жим гантелей нейтральним хватом лежачи';
  } else if (nameLower.includes('handstand push-up') || nameLower.includes('віджимання в стійці')) {
    return 'Віджимання в стійці на руках';
  } else if (nameLower.includes('tricep dip') || nameLower.includes('віджимання на трицепси')) {
    return 'Віджимання на трицепси';
  } else if (nameLower.includes('tricep extension') || nameLower.includes('розгинання на трицепси')) {
    return 'Розгинання на трицепси';
  } else if (nameLower.includes('close-grip bench press') || nameLower.includes('жим вузьким хватом')) {
    return 'Жим штанги вузьким хватом';
  }
  
  // Переклади для вправ на литки
  if (nameLower.includes('calf raise') || nameLower.includes('підйом на носки')) {
    if (nameLower.includes('гантел') || nameLower.includes('dumbbell')) {
      return 'Підйом на носки з гантелями стоячи';
    } else if (nameLower.includes('сходин') || nameLower.includes('stair') || nameLower.includes('step')) {
      return 'Підйом на носки на сходинці';
    } else if (nameLower.includes('стоячи') || nameLower.includes('standing')) {
      return 'Підйом на носки стоячи';
    } else if (nameLower.includes('сидячи') || nameLower.includes('seated')) {
      return 'Підйом на носки сидячи';
    }
    return 'Підйом на носки';
  } else if (nameLower.includes('standing calf raise')) {
    return 'Підйом на носки стоячи';
  } else if (nameLower.includes('seated calf raise')) {
    return 'Підйом на носки сидячи';
  } else if (nameLower.includes('dumbbell calf raise') || (nameLower.includes('підйом') && nameLower.includes('гантел'))) {
    return 'Підйом на носки з гантелями стоячи';
  } else if (nameLower.includes('stair calf raise') || (nameLower.includes('підйом') && nameLower.includes('сходин'))) {
    return 'Підйом на носки на сходинці';
  }
  
  // Переклади для вправ на квадріцепси
  if (nameLower.includes('squat') || nameLower.includes('присідання')) {
    return 'Присідання';
  } else if (nameLower.includes('leg press')) {
    return 'Жим ногами';
  } else if (nameLower.includes('leg extension')) {
    return 'Розгинання ніг';
  } else if (nameLower.includes('lunge') || nameLower.includes('випади')) {
    return 'Випади';
  }
  
  // Переклади для вправ на леватор лопатки
  if (nameLower.includes('side push neck stretch') || (nameLower.includes('side') && nameLower.includes('push') && nameLower.includes('neck') && nameLower.includes('stretch'))) {
    return 'Бічна розтяжка шиї з натисканням';
  } else if (nameLower.includes('neck side stretch') || (nameLower.includes('neck') && nameLower.includes('side') && nameLower.includes('stretch'))) {
    return 'Бічна розтяжка шиї';
  } else if (nameLower.includes('levator') || nameLower.includes('леватор')) {
    return 'Вправа для м\'язя, що піднімає лопатку';
  }
  
  // Переклади для вправ на прес
  if (nameLower.includes('3/4 sit-up') || nameLower.includes('3/4 sit up')) {
    return '3/4 підйому тулуба';
  } else if (nameLower.includes('45° side bend') || nameLower.includes('45 side bend') || (nameLower.includes('side') && nameLower.includes('bend') && nameLower.includes('45'))) {
    return 'Бічний нахил 45°';
  } else if (nameLower === 'air bike' || (nameLower.includes('air') && nameLower.includes('bike'))) {
    return 'Велосипед';
  } else if (nameLower.includes('crunches') || nameLower.includes('скручування')) {
    return 'Скручування';
  } else if (nameLower.includes('leg raises') || nameLower.includes('підйоми ніг')) {
    return 'Підйоми ніг';
  } else if (nameLower.includes('plank') || nameLower.includes('планка')) {
    return 'Планка';
  }
  
  // Якщо назва вже українською або не знайдено перекладу, повертаємо оригінал
  return name;
}

/**
 * Перекласти цільову групу м'язів на українську
 * @param {string} target
 * @returns {string}
 */
function translateTarget(target) {
  if (!target || target === 'N/A') return 'N/A';
  
  const targetLower = target.toLowerCase();
  
  const translations = {
    'cardiovascular system': 'серцево-судинна система',
    'cardiovascular': 'серцево-судинна система',
    'cardio': 'серцево-судинна система',
    'biceps': 'біцепси',
    'pectorals': 'грудні м\'язи',
    'chest': 'груди',
    'triceps': 'трицепси',
    'lats': 'широчайші м\'язи',
    'latissimus': 'широчайші м\'язи',
    'traps': 'трапеції',
    'trapezius': 'трапеції',
    'calves': 'литки',
    'quads': 'квадріцепси',
    'quadriceps': 'квадріцепси',
    'adductors': 'приводячі м\'язи',
    'serratus anterior': 'серратні м\'язи',
    'serratus': 'серратні м\'язи',
    'levator scapulae': 'м\'яз, що піднімає лопатку',
    'levator': 'м\'яз, що піднімає лопатку',
    'abs': 'прес',
    'abdominals': 'прес',
    'shoulders': 'плечі',
    'back': 'спина',
    'legs': 'ноги',
    'arms': 'руки',
  };
  
  if (translations[targetLower]) {
    return translations[targetLower];
  }
  
  for (const [key, value] of Object.entries(translations)) {
    if (targetLower.includes(key)) {
      return value;
    }
  }
  
  return target;
}

/**
 * Перекласти частину тіла на українську
 * @param {string} bodyPart
 * @returns {string}
 */
function translateBodyPart(bodyPart) {
  if (!bodyPart || bodyPart === 'N/A') return 'N/A';
  
  const bodyPartLower = bodyPart.toLowerCase();
  
  const translations = {
    'cardio': 'кардіо',
    'cardiovascular': 'кардіо',
    'chest': 'груди',
    'upper arms': 'верхні частини рук',
    'lower arms': 'передпліччя',
    'shoulders': 'плечі',
    'back': 'спина',
    'legs': 'ноги',
    'thighs': 'стегна',
    'calves': 'литки',
    'waist': 'талія',
    'all': 'все тіло',
    'full body': 'все тіло',
    'neck': 'шия',
  };
  
  if (translations[bodyPartLower]) {
    return translations[bodyPartLower];
  }
  
  for (const [key, value] of Object.entries(translations)) {
    if (bodyPartLower.includes(key)) {
      return value;
    }
  }
  
  return bodyPart;
}

/**
 * Отримати URL анатомічного зображення для вправи
 * @param {string} exerciseName - назва вправи
 * @param {string} target - цільова група м'язів
 * @returns {string} URL анатомічного зображення або порожній рядок
 * 
 * Примітка: Для відображення 3D анатомічних ілюстрацій з підсвіченими м'язами
 * потрібно додати файли в папку /images/ з назвами:
 * - z1-anatomical.jpg (для 3/4 sit-up)
 * - z2-anatomical.jpg (для 45° side bend)
 * - z3-anatomical.jpg (для air bike)
 * 
 * Або встановити правильні URL на 3D анатомічні ілюстрації в mock-даних.
 */
export function getAnatomicalImageUrl(exerciseName, target) {
  if (!exerciseName) return '';
  
  const nameLower = exerciseName.toLowerCase();
  
  // Мапінг вправ на локальні анатомічні зображення
  // Використовуємо локальні файли, якщо вони є (додаються вручну)
  const localAnatomicalImageMap = {
    '3/4 sit-up': '/images/z1-anatomical.jpg',
    '3/4 підйому тулуба': '/images/z1-anatomical.jpg',
    '45° side bend': '/images/z2-anatomical.jpg',
    'бічний нахил 45°': '/images/z2-anatomical.jpg',
    '45 side bend': '/images/z2-anatomical.jpg',
    'air bike': '/images/z3-anatomical.jpg',
    'велосипед': '/images/z3-anatomical.jpg',
  };
  
  // Перевіряємо точну назву вправи для локальних файлів
  if (localAnatomicalImageMap[exerciseName]) {
    return localAnatomicalImageMap[exerciseName];
  }
  
  // Перевіряємо часткові збіги для локальних файлів
  for (const [key, url] of Object.entries(localAnatomicalImageMap)) {
    if (nameLower.includes(key.toLowerCase())) {
      return url;
    }
  }
  
  // Не використовуємо автоматичні URL з інтернету, оскільки вони показують
  // просто фотографії людей, а не 3D анатомічні ілюстрації з підсвіченими м'язами
  // Для таких ілюстрацій потрібно додати файли вручну або використати спеціалізовані сервіси
  return '';
}

/**
 * Отримати опис для кнопки "Старт" в залежності від групи м'язів
 * @param {string} target - цільова група м'язів
 * @returns {string} Опис для кнопки на українській мові
 */
export function getStartButtonDescription(target) {
  if (!target || target === 'N/A') {
    return 'Старт';
  }
  
  const targetLower = target.toLowerCase();
  
  // Опису для різних груп м'язів
  const descriptions = {
    // Прес
    'прес': 'Почни тренувати прес',
    'abs': 'Почни тренувати прес',
    'abdominal': 'Почни тренувати прес',
    'core': 'Почни тренувати кор',
    'талія': 'Почни тренувати талію',
    
    // Біцепси
    'біцепс': 'Почни тренувати біцепси',
    'biceps': 'Почни тренувати біцепси',
    'bicep': 'Почни тренувати біцепси',
    
    // Трицепси
    'трицепс': 'Почни тренувати трицепси',
    'triceps': 'Почни тренувати трицепси',
    'tricep': 'Почни тренувати трицепси',
    
    // Груди
    'груди': 'Почни тренувати груди',
    'pectorals': 'Почни тренувати груди',
    'chest': 'Почни тренувати груди',
    
    // Спина
    'спина': 'Почни тренувати спину',
    'back': 'Почни тренувати спину',
    'lats': 'Почни тренувати широчі',
    'широчі': 'Почни тренувати широчі',
    'latissimus': 'Почни тренувати широчі',
    'traps': 'Почни тренувати трапеції',
    'трапеції': 'Почни тренувати трапеції',
    'trapezius': 'Почни тренувати трапеції',
    
    // Плечі
    'плечі': 'Почни тренувати плечі',
    'shoulders': 'Почни тренувати плечі',
    'shoulder': 'Почни тренувати плечі',
    'дельти': 'Почни тренувати дельти',
    'deltoids': 'Почни тренувати дельти',
    
    // Ноги
    'ноги': 'Почни тренувати ноги',
    'legs': 'Почни тренувати ноги',
    'quads': 'Почни тренувати квадрицепси',
    'квадрицепси': 'Почни тренувати квадрицепси',
    'quadriceps': 'Почни тренувати квадрицепси',
    'литки': 'Почни тренувати литки',
    'calves': 'Почни тренувати литки',
    'calf': 'Почни тренувати литки',
    'стегна': 'Почни тренувати стегна',
    'thighs': 'Почни тренувати стегна',
    'аддуктори': 'Почни тренувати аддуктори',
    'adductors': 'Почни тренувати аддуктори',
    
    // Шия
    'шия': 'Почни тренувати шию',
    'neck': 'Почни тренувати шию',
    'леватор': 'Почни тренувати леватор лопатки',
    'levator': 'Почни тренувати леватор лопатки',
    'scapulae': 'Почни тренувати леватор лопатки',
    
    // Кардіо
    'кардіо': 'Почни кардіо тренування',
    'cardio': 'Почни кардіо тренування',
    'серцево-судинна': 'Почни кардіо тренування',
    'cardiovascular': 'Почни кардіо тренування',
    
    // Серратні м'язи
    'серратні': 'Почни тренувати серратні м\'язи',
    'serratus': 'Почни тренувати серратні м\'язи',
  };
  
  // Перевіряємо точний збіг
  if (descriptions[targetLower]) {
    return descriptions[targetLower];
  }
  
  // Перевіряємо часткові збіги
  for (const [key, value] of Object.entries(descriptions)) {
    if (targetLower.includes(key)) {
      return value;
    }
  }
  
  // Загальний опис, якщо не знайдено конкретного
  return `Почни тренувати ${target}`;
}

/**
 * Перекласти назву обладнання на українську
 * @param {string} equipment
 * @returns {string}
 */
function translateEquipment(equipment) {
  if (!equipment || equipment === 'N/A') return 'N/A';
  
  const equipmentLower = equipment.toLowerCase();
  
  // Переклади обладнання
  const translations = {
    'run': 'бігова доріжка',
    'running': 'бігова доріжка',
    'treadmill': 'бігова доріжка',
    'barbell': 'штанга',
    'dumbbell': 'гантелі',
    'dumbbells': 'гантелі',
    'body weight': 'власна вага',
    'bodyweight': 'власна вага',
    'cable': 'канатний тренажер',
    'cable machine': 'канатний тренажер',
    'machine': 'тренажер',
    'smith machine': 'тренажер Сміта',
    'pull-up bar': 'турнік',
    'pullup bar': 'турнік',
    'dip bar': 'бруси',
    'dip bars': 'бруси',
    'kettlebell': 'гіря',
    'kettlebells': 'гірі',
    'resistance band': 'резинова стрічка',
    'resistance bands': 'резинові стрічки',
    'medicine ball': 'медичний м\'яч',
    'yoga mat': 'килимок для йоги',
    'foam roller': 'пінопроливний ролик',
    'none': 'власна вага',
    'other': 'інше',
  };
  
  // Перевіряємо точний збіг
  if (translations[equipmentLower]) {
    return translations[equipmentLower];
  }
  
  // Перевіряємо частковий збіг
  for (const [key, value] of Object.entries(translations)) {
    if (equipmentLower.includes(key)) {
      return value;
    }
  }
  
  // Якщо назва вже українською або не знайдено перекладу, повертаємо оригінал
  return equipment;
}

/**
 * Створити картку вправи в стилі модального вікна (для сторінки abs)
 * @param {Object} exercise
 * @returns {HTMLElement}
 */
function createModalStyleCard(exercise) {
  const card = document.createElement('div');
  card.className = 'exercise-modal-style-card';
  
  const isFav = isFavorite(exercise._id);
  const rating = (exercise.rating || 0).toFixed(1);
  const calories = exercise.burnedCalories || 0;
  const target = translateTarget(exercise.target || 'N/A');
  const bodyPart = translateBodyPart(exercise.bodyPart || 'N/A');
  const equipment = translateEquipment(exercise.equipment || 'N/A');
  const popularity = exercise.popularity || 0;
  // Використовуємо опис з вправи, якщо він є, інакше - за замовчуванням
  let description = exercise.description || 'Опис відсутній';
  
  // Визначаємо назву вправи для перевірок
  const originalName = exercise.name || 'Вправа';
  const nameLower = originalName.toLowerCase();
  
  // Перевіряємо, чи це унікальний опис для вправ на прес (не замінюємо їх, якщо опис вже правильний)
  const isAbsExerciseWithUniqueDescription = 
    (nameLower.includes('3/4 sit-up') || nameLower.includes('3/4 sit up') || nameLower.includes('3/4 підйому тулуба')) ||
    (nameLower.includes('45° side bend') || nameLower.includes('45 side bend') || nameLower.includes('бічний нахил 45')) ||
    (nameLower === 'air bike' || (nameLower.includes('air') && nameLower.includes('bike')) || nameLower.includes('велосипед'));
  
  // Перевіряємо, чи опис містить загальний текст про м'язи преса
  const hasGenericAbsDescription = description.includes('This refers to your core muscles') || 
                                   description.includes('rectus abdominis, obliques, and transverse abdominis') ||
                                   description.includes('essential for maintaining posture, stability');
  
  // Якщо опис містить загальне описування м\'язів (не конкретної вправи), замінюємо на опис вправи
  // Навіть для унікальних вправ на прес, якщо опис загальний - замінюємо
  if ((!isAbsExerciseWithUniqueDescription || hasGenericAbsDescription) && (!description || description === 'Опис відсутній' || 
      description.includes('Located on the front part') || 
      description.includes('elbow flexion') || 
      description.includes('supination') ||
      description.includes('large chest muscles') ||
      description.includes('shoulder adduction') ||
      description.includes('horizontal adduction') ||
      description.includes('Bench press, push-ups') ||
      description.includes('Located on the side of the chest') ||
      description.includes('scapular movement and stability') ||
      description.includes('push-ups plus and scapular wall slides') ||
      description.includes('While not a muscle') ||
      description.includes('this system is essential for endurance training') ||
      description.includes('Aerobic exercises like running, cycling, and swimming') ||
      description.includes('Located on the inner thighs') ||
      description.includes('bring your legs towards the midline') ||
      description.includes('Adductor exercises include seated or standing') ||
      description.includes('Located on the back of the upper arm') ||
      description.includes('elbow extension') ||
      description.includes('Tricep pushdowns, overhead extensions') ||
      description.includes('Located at the back and side of the neck') ||
      description.includes('elevates the scapula') ||
      description.includes('shrugs and some rowing movements') ||
      description.includes('This refers to your core muscles') ||
      description.length < 50)) {
    // Генеруємо опис на основі назви вправи
    // originalName та nameLower вже визначені вище
    
    // Вправи на біцепси
    if (nameLower === 'barbell curl' || nameLower.includes('barbell curl')) {
      description = 'Підйом штанги на біцепс - це базова вправа для розвитку м\'язів передньої частини плеча. Вона ефективно навантажує біцепси та передпліч\'я, сприяючи збільшенню сили та обсягу м\'язів. Правильна техніка виконання забезпечує максимальну ефективність та запобігає травмам.';
    } else if (nameLower.includes('barbell prone incline curl') || nameLower.includes('prone incline curl')) {
      description = 'Підйом штанги на біцепс лежачи на похилій лавці - це вправа, яка дозволяє більше розтягнути біцепси та забезпечити більший діапазон руху. Похиле положення тіла зменшує допоміжну роботу інших м\'язів, що робить вправу більш ізольованою та ефективною для цільових м\'язів.';
    } else if (nameLower.includes('barbell standing reverse grip curl') || nameLower.includes('reverse grip curl')) {
      description = 'Підйом штанги на біцепс зворотним хватом - це унікальна вправа, яка націлена на передпліч\'я та зовнішню частину біцепсів. Зворотний хват змінює акцент навантаження, що робить вправу особливо корисною для розвитку сили хвата та загальної м\'язової маси верхніх кінцівок.';
    } else if (nameLower.includes('curl') || nameLower.includes('підйом')) {
      description = 'Ця вправа ефективно розвиває м\'язи передньої частини плеча, зокрема біцепси та передпліч\'я. Правильна техніка виконання забезпечує максимальне навантаження на цільові м\'язи та сприяє їх росту та зміцненню.';
    } else if (nameLower.includes('hammer') || nameLower.includes('молот')) {
      description = 'Молоткові підйоми - це унікальна вправа, яка одночасно розвиває біцепси та передпліч\'я завдяки нейтральному хвату. Вона особливо ефективна для розвитку брахіорадіального м\'яза та покращення загальної сили верхніх кінцівок.';
    } else if (nameLower.includes('concentration') || nameLower.includes('концентр')) {
      description = 'Концентровані підйоми - це ізольована вправа, яка дозволяє максимально сконцентруватися на роботі біцепса. Виконуючись сидячи з опорою на стегно, вправа усуває допоміжні м\'язи та забезпечує чітку ізоляцію біцепса.';
    // Вправи на трицепси (перевіряємо ПЕРЕД загальними умовами для грудей)
    } else if (nameLower.includes('dumbbell kickback') || (nameLower.includes('розгинання') && nameLower.includes('нахилі'))) {
      description = 'Розгинання трицепса з гантеллю в нахилі - це ізольована вправа, яка дозволяє максимально сконцентруватися на роботі задньої частини плеча. Унікальність цієї вправи полягає в тому, що положення в нахилі з опорою на лавку забезпечує повну ізоляцію трицепса та усуває можливість читерства іншими м\'язами. Вправа особливо ефективна для розвитку латеральної та медіальної голівок трицепса, покращуючи рельєф та визначеність задньої частини плеча. Правильна техніка з фіксованим положенням плеча та повним розгинанням руки забезпечує максимальне навантаження на трицепси.';
    } else if (nameLower.includes('neutral grip bench press') || (nameLower.includes('жим') && nameLower.includes('нейтральним'))) {
      description = 'Жим гантелей нейтральним хватом лежачи - це базова силова вправа для масового набору трицепсів, яка виконується на горизонтальній лавці з використанням додаткового навантаження. Ключова особливість цієї вправи - нейтральний хват гантелей (долоні звернені одна до одної), який створює унікальний кут навантаження та дозволяє працювати з більшими вагами, ніж при класичному жимі. Це робить вправу ідеальною для прогресивного навантаження та збільшення м\'язової маси. Лежаче положення забезпечує стабільність та безпеку, дозволяючи зосередитися виключно на силі та техніці виконання. Вправа комплексно розвиває всі три голівки трицепса, передні дельти та верхню частину грудей, роблячи її однією з найефективніших для будівництва об\'єму та сили верхньої частини тіла.';
    } else if (nameLower.includes('handstand push-up') || nameLower.includes('віджимання в стійці')) {
      description = 'Віджимання в стійці на руках - це елітна гімнастична вправа, яка поєднує силову витривалість трицепсів з екстремальними вимогами до балансу та пропріоцепції. На відміну від класичних вправ з відягощенням, ця вправа виконується у вертикальному положенні з повною вагою тіла, що створює унікальне навантаження через гравітаційний вектор. Вертикальна позиція активізує не тільки трицепси та передні дельти, але й вимагає інтенсивної роботи м\'язів кора для підтримки стабільності. Ця вправа розвиває не лише м\'язову силу, але й нейром\'язову координацію, просторову орієнтацію та функціональну мобільність. Вона є випробуванням для найбільш підготовлених атлетів та демонструє високий рівень фізичної майстерності, роблячи її однією з найпрестижніших вправ у калістеніці та гімнастиці.';
    } else if (nameLower.includes('tricep dip') || nameLower.includes('віджимання на трицепси')) {
      description = 'Віджимання на трицепси - це ефективна вправа для розвитку задньої частини плеча. Вправа активно залучає трицепси, передні дельти та м\'язи грудей. Виконання на брусах або лавці забезпечує великий діапазон руху та максимальне навантаження на трицепси, що сприяє збільшенню їх сили та обсягу.';
    } else if (nameLower.includes('tricep extension') || nameLower.includes('розгинання на трицепси')) {
      description = 'Розгинання на трицепси - це ізольована вправа, яка дозволяє максимально сконцентруватися на роботі трицепсів. Вправа ефективно розвиває задню частину плеча, покращуючи силу та рельєф м\'язів. Правильна техніка з повним розгинанням та згинанням рук забезпечує максимальне навантаження на трицепси.';
    } else if (nameLower.includes('close-grip bench press') || nameLower.includes('жим вузьким хватом')) {
      description = 'Жим штанги вузьким хватом - це комплексна вправа для розвитку трицепсів з можливістю використання великих ваг. Вузький хват зміщує акцент навантаження з грудей на трицепси, роблячи вправу особливо ефективною для збільшення сили та обсягу задньої частини плеча. Вправа також залучає передні дельти та м\'язи грудей.';
    } else if (nameLower.includes('tricep') || nameLower.includes('трицепс')) {
      description = 'Трицепси - це м\'язи задньої частини плеча, які відповідають за розгинання руки в лікті та складають більшу частину об\'єму плеча. Ефективні вправи на трицепси включають ізольовані рухи для максимальної концентрації на цільових м\'язах, комплексні жимові рухи для розвитку сили та обсягу, а також функціональні вправи з власною вагою для покращення координації та балансу. Правильна техніка виконання забезпечує максимальне навантаження на всі три голівки трицепса та сприяє розвитку сили, витривалості та рельєфу задньої частини плеча.';
    // Вправи на леватор лопатки
    } else if (nameLower.includes('side push neck stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('натисканням'))) {
      description = 'Бічна розтяжка шиї з натисканням - це унікальна вправа для розтягування м\'язя, що піднімає лопатку (леватор лопатки), яка поєднує пасивне розтягування з активним натисканням рукою для глибшого ефекту. Унікальність цієї вправи полягає в тому, що додатковий тиск рукою дозволяє досягти більш глибокого розтягування м\'язів задньої та бічної частини шиї, що особливо ефективно для зняття напруження та покращення мобільності. На відміну від звичайної бічної розтяжки, активне натискання створює більш інтенсивне розтягування, що допомагає швидше зменшити біль та дискомфорт у верхній частині спини та шиї. Ця вправа ідеально підходить для людей з хронічним напруженням у шиї та плечах, а також для відновлення після інтенсивних тренувань.';
    } else if (nameLower.includes('neck side stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('шиї') && !nameLower.includes('натисканням'))) {
      description = 'Бічна розтяжка шиї - це класична вправа для розтягування м\'язя, що піднімає лопатку (леватор лопатки), яка виконується через плавний нахил голови вбік. Унікальність цієї вправи полягає в тому, що вона працює через пасивне розтягування м\'язів задньої та бічної частини шиї, що дозволяє м\'язам природно розслабитися та розтягнутися без додаткового тиску. На відміну від більш інтенсивних варіантів розтяжки, ця вправа забезпечує м\'яке та контрольоване розтягування, що робить її ідеальною для початківців та для щоденного використання. Регулярне виконання цієї вправи покращує гнучкість шиї, зменшує напруження в верхній частині спини та плечах, а також допомагає підтримувати правильну поставу та запобігає виникненню болю.';
    // Вправи на груди
    } else if (nameLower.includes('assisted chest dip') && nameLower.includes('kneeling')) {
      description = 'Віджимання на брусах з допомогою колін - це ідеальна вправа для початківців та тих, хто хоче покращити техніку віджимань на брусах. Виконання на колінах значно зменшує навантаження, дозволяючи зосередитися на правильній формі та контролі руху. Ця вправа ефективно розвиває нижню частину грудей, передні дельти та трицепси, готуючи м\'язи до більш складних варіантів віджимань.';
    } else if (nameLower.includes('barbell decline wide-grip press') || nameLower.includes('barbell decline wide grip press')) {
      description = 'Жим штанги на похилій лавці з широким хватом - це потужна вправа для розвитку нижньої частини великого грудного м\'яза. Похиле положення голови вниз створює унікальний кут навантаження, який важко досягти іншими вправами. Широкий хват максимально розтягує м\'язи грудей та забезпечує більший діапазон руху, що сприяє швидшому росту м\'язової маси та сили.';
    } else if (nameLower.includes('cable incline bench press')) {
      description = 'Жим на похилій лавці з канатним тренажером - це високоефективна вправа для розвитку верхньої частини грудей та передніх дельт. На відміну від вільної ваги, канати забезпечують постійне напруження м\'язів протягом всього руху, що робить вправу більш інтенсивною та ефективною. Похиле положення лавки дозволяє зосередити навантаження саме на верхній частині грудей, створюючи чіткий рельєф та об\'єм м\'язів.';
    } else if (nameLower.includes('chest') || nameLower.includes('груди') || nameLower.includes('pectoral') || nameLower.includes('bench') || nameLower.includes('press') || nameLower.includes('push-up') || nameLower.includes('dip')) {
      description = 'Ефективна вправа для розвитку м\'язів грудей. Грудні м\'язи відповідають за зведення рук та рухи вперед, що робить їх важливими для загальної сили верхньої частини тіла. Правильна техніка виконання забезпечує максимальне навантаження на цільові м\'язи та сприяє їх росту.';
    // Вправи на серратні м'язи
    } else if (nameLower.includes('smith incline shoulder raise') || nameLower.includes('smith') && nameLower.includes('incline shoulder raise')) {
      description = 'Підйом плечей на тренажері Сміта на похилій лавці - це вправа, яка використовує гідність тренажера Сміта для безпечного та контрольованого розвитку серратних м\'язів. Фіксована траєкторія руху дозволяє зосередитися на правильній техніці та максимально залучити передні зубчасті м\'язи. Похиле положення лавки створює оптимальний кут для протрузії лопаток та ефективної роботи серратних м\'язів, що покращує стабілізацію плечового поясу та мобільність лопаток.';
    } else if (nameLower.includes('barbell incline shoulder raise') || (nameLower.includes('barbell') && nameLower.includes('incline shoulder raise'))) {
      description = 'Підйом плечей зі штангою на похилій лавці - це потужна вправа для розвитку серратних м\'язів з використанням вільної ваги. Штанга дозволяє використовувати більше навантаження, що робить вправу особливо ефективною для збільшення сили та обсягу серратних м\'язів. Похиле положення тіла забезпечує правильний кут для максимальної активації передніх зубчастих м\'язів, які відповідають за протрузію лопаток та стабілізацію плечового поясу. Ця вправа також покращує координацію та контроль рухів.';
    } else if (nameLower.includes('dumbbell incline shoulder raise') || (nameLower.includes('dumbbell') && nameLower.includes('incline shoulder raise'))) {
      description = 'Підйом плечей з гантелями на похилій лавці - це вправа, яка забезпечує більшу свободу руху та незалежну роботу кожної руки. Гантелі дозволяють виконувати більш природний рух, що максимально залучає серратні м\'язи та покращує баланс між лівою та правою стороною тіла. Похиле положення лавки створює ідеальний кут для протрузії лопаток та ефективної роботи передніх зубчастих м\'язів. Ця вправа особливо корисна для виправлення м\'язового дисбалансу та покращення функціональної мобільності плечового поясу.';
    } else if (nameLower.includes('incline shoulder raise') || nameLower.includes('shoulder raise')) {
      description = 'Підйом плечей на похилій лавці - це ефективна вправа для розвитку серратних м\'язів, які розташовані на бічних сторонах грудної клітки. Ця вправа активно залучає передні зубчасті м\'язи, відповідальні за протрузію лопаток та стабілізацію плечового поясу. Правильна техніка виконання забезпечує максимальне навантаження на серратні м\'язи та покращує мобільність плечового суглоба.';
    } else if (nameLower.includes('serratus') || nameLower.includes('серрат')) {
      description = 'Ефективна вправа для розвитку серратних м\'язів, які відповідають за рух лопаток та стабілізацію плечового поясу. Серратні м\'язи важливі для правильного функціонування плечового суглоба та покращення постави.';
    // Кардіо вправи
    } else if (nameLower.includes('jumping jacks') || nameLower.includes('стрибки з розведенням')) {
      description = 'Стрибки з розведенням рук - це класична кардіо-вправа, яка ефективно підвищує пульс та покращує витривалість. Вправа залучає всі основні групи м\'язів, особливо ноги, плечі та кор, що робить її ідеальною для розминки та спалювання калорій. Регулярне виконання покращує координацію, гнучкість та загальну фізичну форму.';
    } else if (nameLower.includes('burpee') || nameLower.includes('берпі')) {
      description = 'Берпі - це одна з найбільш інтенсивних кардіо-вправ, яка поєднує присідання, віджимання та стрибки. Вправа залучає практично всі м\'язи тіла та значно підвищує витривалість, силу та координацію. Берпі ефективно спалюють калорії, покращують роботу серцево-судинної системи та розвивають функціональну силу.';
    } else if (nameLower.includes('mountain climber') || nameLower.includes('альпініст')) {
      description = 'Альпініст - це динамічна кардіо-вправа, яка поєднує підвищення пульсу з зміцненням кору. Швидкі рухи ногами активно залучають м\'язи живота, ніг та плечового поясу. Вправа покращує витривалість, координацію та силу кору, роблячи її ідеальною для інтервальних тренувань та спалювання калорій.';
    } else if (nameLower.includes('jump rope') || nameLower.includes('скакалка')) {
      description = 'Стрибки на скакалці - це високоефективна кардіо-вправа, яка покращує витривалість, координацію та спритність. Вправа активно залучає м\'язи ніг, особливо литки та стегна, а також покращує роботу серцево-судинної системи. Регулярні стрибки на скакалці розвивають швидкість, баланс та загальну фізичну форму.';
    } else if (nameLower === 'run' || (nameLower.includes('run') && nameLower.includes('equipment'))) {
      description = 'Біг - це одна з найефективніших кардіо-вправ для покращення роботи серцево-судинної системи та збільшення витривалості. Регулярний біг покращує здоров\'я серця та легень, зміцнює м\'язи ніг та кора, а також ефективно спалює калорії. Біг може виконуватися на біговій доріжці або на відкритому повітрі, що робить його доступним для всіх рівнів підготовки.';
    } else if (nameLower.includes('cardio') || nameLower.includes('кардіо') || nameLower.includes('cardiovascular')) {
      description = 'Ефективна кардіо-вправа для покращення роботи серцево-судинної системи, збільшення витривалості та спалювання калорій. Регулярні кардіо тренування покращують здоров\'я серця, легень та загальний рівень енергії.';
    // Вправи на приводячі м'язи (аддуктори)
    } else if (nameLower.includes('butterfly yoga') || nameLower.includes('поза метелика')) {
      description = 'Поза метелика - це статична йога-поза, яка працює через пасивне розтягування приводячих м\'язів внутрішньої частини стегон. Унікальність цієї вправи полягає в тому, що вона поєднує глибоке розтягування з технікою правильного дихання, що дозволяє м\'язам розслабитися та ефективно розтягнутися. На відміну від силових вправ, поза метелика працює через статичне утримання позиції, що покращує гнучкість тазобедреного суглоба, зменшує напругу в паху та покращує мобільність нижніх кінцівок. Ця вправа ідеально підходить для розминки перед тренуванням або заспокоєння після інтенсивних навантажень.';
    } else if (nameLower.includes('cable hip adduction') || nameLower.includes('зведення стегна на блоці')) {
      description = 'Зведення стегна на блоці - це стояча вправа, яка дозволяє працювати над приводячими м\'язами по одній нозі за раз, що забезпечує симетричний розвиток та виявлення дисбалансів між лівою та правою ногою. Унікальність цієї вправи полягає в тому, що виконання у стоячій позиції активізує стабілізатори кору та покращує баланс, одночасно зміцнюючи внутрішні м\'язи стегон. Блочний тренажер забезпечує постійне навантаження протягом всього руху, що робить вправу більш ефективною порівняно з вільними вагами. Ця вправа особливо корисна для спортсменів, які потребують функціональної сили та стабільності, а також для корекції м\'язового дисбалансу.';
    } else if (nameLower.includes('lever seated hip adduction') || nameLower.includes('зведення стегна сидячи')) {
      description = 'Зведення стегна сидячи на тренажері - це класична вправа на спеціалізованому тренажері для приводячих м\'язів, яка дозволяє працювати над обома ногами одночасно з максимальною ізоляцією цільових м\'язів. Унікальність цієї вправи полягає в тому, що сидяча позиція повністю усуває навантаження на стабілізатори та кор, дозволяючи зосередитися виключно на зміцненні приводячих м\'язів внутрішньої частини стегон. Тренажер забезпечує безпечну та контрольовану амплітуду руху, що робить вправу ідеальною для початківців та для відновлення після травм. Регулярне виконання цієї вправи зміцнює внутрішні м\'язи стегон, покращує симетричну силу обох ніг та допомагає запобігти травмам, пов\'язаним зі слабкістю аддукторів.';
    } else if (nameLower.includes('side lunge') || nameLower.includes('бічні випади')) {
      description = 'Бічні випади - це ефективна вправа для розвитку внутрішніх м\'язів стегон (аддукторів) та покращення гнучкості тазобедреного суглоба. Вправа також залучає квадріцепси, сідничні м\'язи та покращує баланс. Правильна техніка виконання забезпечує максимальне розтягнення та зміцнення приводячих м\'язів, що важливо для стабілізації тазобедреного суглоба та запобігання травм.';
    } else if (nameLower.includes('adductor') || nameLower.includes('аддуктор')) {
      description = 'Вправа для розвитку приводячих м\'язів стегна (аддукторів), які відповідають за зведення ніг та стабілізацію тазобедреного суглоба. Зміцнені аддуктори покращують баланс, стабільність та функціональність нижніх кінцівок.';
    // Вправи на широчайші м'язи (лати)
    } else if (nameLower.includes('gironda sternum chin') || nameLower.includes('підтягування джиронда')) {
      description = 'Підтягування Джиронда до грудей - це унікальна вправа, названа на честь легендарного тренера Вінса Джиронди, яка відрізняється від класичних підтягувань тим, що ви підтягуєтеся до грудей, а не до підборіддя. Ця техніка створює більший діапазон руху та максимально розтягує широчайші м\'язи спини, що забезпечує кращий розвиток ширини та товщини латів. Вправа також активно залучає ромбоподібні м\'язи, задні дельти та біцепси, роблячи її однією з найефективніших для розвитку верхньої частини спини.';
    } else if (nameLower.includes('cable pulldown') && (nameLower.includes('pro lat') || nameLower.includes('профі-лат'))) {
      description = 'Тяга верхнього блоку з профі-латовою рукояткою - це вдосконалена версія класичної тяги верхнього блоку, яка використовує спеціальну рукоятку з вигнутими ручками для оптимального розвитку широчайших м\'язів спини. Профі-латова рукоятка дозволяє виконувати рух під природнішим кутом, що забезпечує краще розтягування та скорочення латів. Ця вправа ефективно залучає верхню та середню частину широчайших м\'язів, ромбоподібні м\'язи та задні дельти, сприяючи розвитку ширини та рельєфу спини.';
    } else if (nameLower.includes('cable twisting pull') || nameLower.includes('тяга з поворотом')) {
      description = 'Тяга з поворотом на блоці - це унікальна вправа, яка поєднує класичну тягу верхнього блоку з ротаційним рухом, що забезпечує комплексний розвиток широчайших м\'язів спини та покращує мобільність плечового поясу. Поворотний рух активізує додаткові м\'язи-стабілізатори та покращує координацію, роблячи вправу більш функціональною. Ця вправа особливо ефективна для розвитку середньої та нижньої частини широчайших м\'язів, а також для покращення симетрії та балансу м\'язів між лівою та правою стороною спини.';
    } else if (nameLower.includes('lat pulldown') || nameLower.includes('тяга верхнього блоку')) {
      description = 'Тяга верхнього блоку - це базова вправа для розвитку широчайших м\'язів спини (латів). Вправа ефективно залучає верхню частину спини, задні дельти та біцепси. Правильна техніка виконання з широким хватом забезпечує максимальне навантаження на лати та покращує ширину спини.';
    } else if (nameLower.includes('pull-up') || nameLower.includes('підтягування')) {
      description = 'Підтягування - це одна з найефективніших вправ для розвитку широчайших м\'язів спини та загальної сили верхньої частини тіла. Вправа залучає лати, ромбоподібні м\'язи, задні дельти та біцепси. Регулярне виконання підтягувань розвиває силу, витривалість та покращує поставу.';
    } else if (nameLower.includes('bent-over row') || nameLower.includes('тяга в нахилі')) {
      description = 'Тяга штанги в нахилі - це потужна вправа для розвитку всієї спини, особливо середньої та нижньої частини широчайших м\'язів. Вправа також залучає ромбоподібні м\'язи, задні дельти та біцепси. Правильна техніка з нахиленим корпусом забезпечує максимальне навантаження на м\'язи спини та покращує товщину та рельєф м\'язів.';
    } else if (nameLower.includes('lat') || nameLower.includes('широчі') || nameLower.includes('lats')) {
      description = 'Ефективна вправа для розвитку широчайших м\'язів спини (латів), які відповідають за тягучі рухи та стабілізацію плечового поясу. Зміцнені лати покращують поставу та силу верхньої частини тіла.';
    // Вправи на трапеції
    } else if (nameLower.includes('barbell shrug') || (nameLower.includes('пожимання') && nameLower.includes('штанга'))) {
      description = 'Пожимання плечами зі штангою - це класична ізольована вправа для розвитку верхньої частини трапецієподібних м\'язів. Унікальність цієї вправи полягає в тому, що використання штанги дозволяє використовувати значне навантаження, що забезпечує інтенсивний розвиток верхніх трапецій. Вправа ефективно зміцнює м\'язи верхньої частини спини та шиї, покращує поставу та стабілізацію плечового поясу. Правильна техніка з повним підняттям та опусканням плечей без обертання забезпечує максимальне навантаження саме на трапеції, мінімізуючи залучення інших м\'язів.';
    } else if (nameLower.includes('dumbbell shrug') || (nameLower.includes('пожимання') && nameLower.includes('гантел'))) {
      description = 'Пожимання плечами з гантелями - це варіація класичної вправи для трапецій, яка має переваги перед штангой завдяки більшій свободі руху та можливості незалежної роботи кожної руки. Унікальність цієї вправи полягає в тому, що гантелі дозволяють виконувати рух під природнішим кутом, що забезпечує краще розтягування та скорочення трапецій. Ця вправа особливо ефективна для виявлення та виправлення м\'язового дисбалансу між лівою та правою стороною, а також для покращення координації та контролю руху.';
    } else if (nameLower.includes('face pull') || (nameLower.includes('тяга') && nameLower.includes('обличчя'))) {
      description = 'Тяга до обличчя з канатом - це комплексна вправа, яка ефективно розвиває середню та нижню частину трапецій, задні дельти та ромбоподібні м\'язи. Унікальність цієї вправи полягає в тому, що вона поєднує горизонтальну тягу з ротаційним рухом, що забезпечує комплексний розвиток задньої частини плечового поясу. Канатний тренажер забезпечує постійне навантаження протягом всього руху, що робить вправу більш ефективною порівняно з вільними вагами. Ця вправа особливо корисна для покращення постави, зменшення напруги в передній частині плечей та запобігання травмам плечового суглоба.';
    } else if (nameLower.includes('shrug') || nameLower.includes('пожимання')) {
      description = 'Пожимання плечами - це ізольована вправа для розвитку верхньої частини трапецієподібних м\'язів. Вправа ефективно зміцнює м\'язи верхньої частини спини та шиї, що покращує поставу та стабілізацію плечового поясу. Правильна техніка з повним підняттям та опусканням плечей забезпечує максимальне навантаження на трапеції.';
    } else if (nameLower.includes('trap') || nameLower.includes('трапеці')) {
      description = 'Ефективна вправа для розвитку трапецієподібних м\'язів, які відповідають за підняття та обертання лопаток, а також за нахил голови. Зміцнені трапеції покращують поставу та стабілізацію верхньої частини спини.';
    // Вправи на литки
    } else if (nameLower.includes('dumbbell calf raise') || (nameLower.includes('підйом') && nameLower.includes('гантел') && nameLower.includes('стоячи'))) {
      description = 'Підйом на носки з гантелями стоячи - це потужна вправа для розвитку м\'язів литок з додатковим навантаженням. Використання гантелей дозволяє прогресивно збільшувати вагу та інтенсивність тренування, що робить вправу особливо ефективною для збільшення сили та обсягу литок. Унікальність цієї вправи полягає в тому, що додаткове навантаження створює більший стрес для м\'язів, сприяючи їх швидшому росту. Вправа також покращує стабілізацію та баланс, оскільки виконується з вагою в руках. Ця вправа ідеально підходить для тих, хто хоче значно збільшити силу та об\'єм литок за короткий термін.';
    } else if (nameLower.includes('stair calf raise') || nameLower.includes('step calf raise') || (nameLower.includes('підйом') && nameLower.includes('сходин'))) {
      description = 'Підйом на носки на сходинці - це вдосконалена версія класичної вправи для литок, яка забезпечує більший діапазон руху та глибше розтягнення м\'язів. Унікальність цієї вправи полягає в тому, що виконання на сходинці дозволяє п\'яті опускатися нижче рівня носків, що створює максимальне розтягнення литок у нижній точці руху. Це збільшує амплітуду руху та ефективність вправи, сприяючи кращому розвитку як гастронеміуса, так і камбаловидного м\'яза. Вправа особливо корисна для покращення гнучкості литок, збільшення сили та визначеності м\'язів. Вона також покращує баланс та пропріоцепцію, оскільки виконується на обмеженій поверхні.';
    } else if (nameLower.includes('standing calf raise') || (nameLower.includes('calf raise') && nameLower.includes('standing'))) {
      description = 'Підйом на носки стоячи - це базова вправа для розвитку м\'язів литок. Виконання стоячи забезпечує повний діапазон руху та максимальне розтягнення м\'язів, що робить вправу особливо ефективною для збільшення сили та обсягу литок. Вправа покращує стабілізацію стопи та важлива для бігу та стрибків.';
    } else if (nameLower.includes('seated calf raise') || (nameLower.includes('calf raise') && nameLower.includes('seated'))) {
      description = 'Підйом на носки сидячи - це вправа, яка дозволяє більше ізолювати м\'язи литок завдяки згинанню колін. Сидяче положення усуває допоміжну роботу інших м\'язів ніг, що робить вправу ідеальною для цільового розвитку литок. Вправа особливо ефективна для розвитку нижньої частини м\'язів литок.';
    } else if (nameLower.includes('calf raise') || nameLower.includes('підйом на носки')) {
      description = 'Підйом на носки - це ефективна вправа для розвитку м\'язів литок, які відповідають за підйом на носки та стабілізацію стопи під час ходьби та бігу. Зміцнені литки покращують продуктивність у стрибках, бігу та загальну стабільність нижніх кінцівок.';
    } else if (nameLower.includes('calf') || nameLower.includes('литки')) {
      description = 'Ефективна вправа для розвитку м\'язів литок, які відповідають за підйом на носки та стабілізацію стопи. Зміцнені литки покращують продуктивність у стрибках та бігу.';
    // Вправи на квадріцепси
    } else if (nameLower.includes('squat') || nameLower.includes('присідання')) {
      description = 'Присідання - це базова вправа для розвитку квадріцепсів, сідничних м\'язів та загальної сили ніг. Вправа залучає практично всі м\'язи нижніх кінцівок та кору, роблячи її однією з найефективніших для загального розвитку тіла. Правильна техніка виконання забезпечує безпеку та максимальну ефективність.';
    } else if (nameLower.includes('leg press')) {
      description = 'Жим ногами - це вправа для розвитку квадріцепсів та сідничних м\'язів з використанням тренажера. Вправа дозволяє використовувати великі ваги без навантаження на спину, що робить її безпечною альтернативою присіданням. Правильна техніка забезпечує максимальне навантаження на передню частину стегна та сідниці.';
    } else if (nameLower.includes('leg extension')) {
      description = 'Розгинання ніг - це ізольована вправа для розвитку квадріцепсів. Вправа дозволяє максимально сконцентруватися на передній частині стегна, усуваючи допоміжну роботу інших м\'язів. Правильна техніка з повним розгинанням та згинанням ніг забезпечує максимальне навантаження на квадріцепси та покращує їх рельєф.';
    } else if (nameLower.includes('lunge') || nameLower.includes('випади')) {
      description = 'Випади - це функціональна вправа для розвитку квадріцепсів, сідничних м\'язів та покращення балансу. Вправа залучає кожну ногу окремо, що допомагає виправити м\'язовий дисбаланс та покращити координацію. Правильна техніка з контролем руху забезпечує максимальну ефективність та безпеку.';
    } else if (nameLower.includes('quad') || nameLower.includes('квадріцепс')) {
      description = 'Ефективна вправа для розвитку квадріцепсів - найбільших м\'язів ніг, які відповідають за розгинання коліна та стабілізацію колінного суглоба. Зміцнені квадріцепси покращують продуктивність у стрибках, бігу та загальну силу ніг.';
    // Вправи на леватор лопатки
    } else if (nameLower.includes('levator') || nameLower.includes('леватор')) {
      description = 'Вправа для розвитку м\'язя, що піднімає лопатку (леватор лопатки) - м\'яза верхньої частини спини, який відповідає за підняття лопатки та нахил голови вбік. Зміцнення цього м\'яза покращує стабілізацію плечового поясу та допомагає запобігти болю в шиї та плечах.';
    // Вправи на прес
    } else if (nameLower.includes('3/4 sit-up') || nameLower.includes('3/4 sit up') || nameLower.includes('3/4 підйому тулуба')) {
      description = '3/4 підйом тулуба - це ефективна вправа для преса, яка націлена на верхню частину прямого м\'яза живота. Піднімаючи тулуб на три чверті шляху вгору, ви створюєте більший діапазон руху, ніж у традиційних скручувань, що допомагає зміцнити верхній прес та покращити стабільність кору. Ця вправа особливо корисна для розвитку визначеності преса та підвищення загальної сили кору.';
    } else if (nameLower.includes('45° side bend') || nameLower.includes('45 side bend') || (nameLower.includes('side') && nameLower.includes('bend') && nameLower.includes('45')) || nameLower.includes('бічний нахил 45')) {
      description = 'Бічний нахил під кутом 45° - це цільова вправа для косих м\'язів живота та бічних м\'язів кору. Нахиляючись вбік під кутом 45 градусів, ви ефективно залучаєте зовнішні та внутрішні косі м\'язи, які важливі для обертальних рухів та бічної стабільності. Ця вправа допомагає покращити визначеність талії, підвищує силу в бічних напрямках та підтримує кращу поставу завдяки зміцненню бічних м\'язів кору.';
    } else if (nameLower === 'air bike' || (nameLower.includes('air') && nameLower.includes('bike')) || nameLower.includes('велосипед')) {
      description = 'Велосипед (bicycle crunches) - це динамічна вправа для кору, яка одночасно націлена на прямий м\'яз живота та косі м\'язи через рух педалювання. Чергуючи дотики протилежного ліктя до коліна, ви залучаєте як верхній, так і нижній прес, одночасно працюючи над косими м\'язами. Ця вправа покращує координацію кору, підвищує витривалість преса та забезпечує комплексне тренування для всієї абдомінальної області.';
    } else if (nameLower.includes('crunch') || nameLower.includes('скручування')) {
      description = 'Скручування - це класична вправа для преса, яка націлена на верхню частину прямого м\'яза живота. Виконуючись лежачи на спині з підняттям плечей від підлоги, вправа ефективно зміцнює верхній прес та покращує визначеність м\'язів живота. Правильна техніка з контролованим рухом забезпечує максимальне навантаження на цільові м\'язи та сприяє розвитку сили кору.';
    } else if (nameLower.includes('leg raise') || nameLower.includes('підйом ніг')) {
      description = 'Підйом ніг - це ефективна вправа для нижньої частини преса та гнучкості тазобедреного суглоба. Виконуючись лежачи з підняттям ніг вгору, вправа активно залучає нижній прес, косі м\'язи та м\'язи-стабілізатори кору. Ця вправа особливо корисна для розвитку нижньої частини прямого м\'яза живота та покращення контролю над кором.';
    } else if (nameLower.includes('plank') || nameLower.includes('планка')) {
      description = 'Планка - це статична вправа для кору, яка розвиває силу та витривалість усіх м\'язів живота, спини та стабілізаторів. Утримуючи тіло в прямій лінії на передпліч\'ях та носках, ви створюєте інтенсивне навантаження на весь кор, що покращує стабільність, поставу та загальну силу. Планка є однією з найефективніших вправ для розвитку функціональної сили кору.';
    } else if (nameLower.includes('russian twist') || nameLower.includes('російські скручування')) {
      description = 'Російські скручування - це динамічна вправа для косих м\'язів живота та обертальної сили кору. Виконуючись сидячи з обертанням тулуба з боку в бік, вправа ефективно залучає зовнішні та внутрішні косі м\'язи, що важливо для спортивних рухів та щоденних активностей. Ця вправа покращує обертальну силу, стабільність кору та визначеність талії.';
    } else if (nameLower.includes('mountain climber') || nameLower.includes('альпініст')) {
      description = 'Альпініст - це динамічна кардіо-вправа для кору, яка поєднує підвищення пульсу з зміцненням м\'язів живота. Швидкі рухи ногами активно залучають верхній прес, косі м\'язи та м\'язи-стабілізатори кору. Вправа покращує витривалість, координацію та силу кору, роблячи її ідеальною для інтервальних тренувань та спалювання калорій.';
    } else if (nameLower.includes('abdominal') || nameLower.includes('прес') || nameLower.includes('abs') || nameLower.includes('core')) {
      description = 'Ефективна вправа для розвитку м\'язів преса (кору), які включають прямий м\'яз живота, косі м\'язи та поперечний м\'яз живота. Ці м\'язи важливі для підтримки правильної постави, стабільності та генерації сили в багатьох рухах. Регулярні тренування преса допомагають зміцнити кор, покращити баланс та зменшити ризик травм спини.';
    } else {
      description = 'Ефективна вправа для розвитку м\'язів преса. Правильна техніка виконання забезпечує максимальну ефективність та запобігає травмам.';
    }
  }
  // Перекладаємо назву вправи на українську
  const name = translateExerciseName(originalName);
  
  // Для вправ з API використовуємо зображення з API, для mock - з mock-даних
  let imageUrl = exercise.gifURL || exercise.imgURL || exercise.imageURL || exercise.image || exercise.gif || '';
  
  // Для mock-упражнений завжди використовуємо зображення з mock-даних без перевірок
  const isMockExercise = exercise._id && exercise._id.startsWith('mock-');
  
  // Отримуємо анатомічне зображення для вправи (якщо воно не встановлено в mock-даних)
  let muscleImageUrl = exercise.muscleImage || exercise.anatomicalImage || exercise.muscleGif || exercise.muscleImg || '';
  
  // Для mock-упражнений зберігаємо оригінальне анатомічне зображення з mock-даних
  if (!isMockExercise) {
    // Якщо анатомічне зображення не встановлено, намагаємося знайти його на основі назви вправи
    if (!muscleImageUrl) {
      muscleImageUrl = getAnatomicalImageUrl(name, exercise.target || '');
    }
  }
  
  // Зберігаємо анатомічне зображення в об'єкті вправи для використання в модальному вікні
  if (muscleImageUrl) {
    exercise.muscleImage = muscleImageUrl;
  }
  
  // Визначаємо правильне зображення на основі назви вправи
  // nameLower вже визначено вище
  
  // Перевіряємо, чи зображення з API коректне (тільки для не-mock упражнений)
  const hasValidImage = !isMockExercise && imageUrl && 
    !imageUrl.includes('placeholder') && 
    !imageUrl.includes('crunches') && 
    !imageUrl.includes('crunch') &&
    !imageUrl.includes('abdominal') &&
    !imageUrl.includes('abs') &&
    !imageUrl.includes('plank') &&
    !imageUrl.includes('yoga') &&
    !imageUrl.includes('sit-up');
  
  // Завжди замінюємо зображення на правильні для вправ на прес на основі назви вправи
  // Використовуємо локальні зображення z1, z2, z3
  if (nameLower.includes('3/4 sit-up') || nameLower.includes('3/4 sit up') || nameLower.includes('3/4 підйому тулуба')) {
    // 3/4 підйому тулуба - використовуємо зображення z1
    imageUrl = '/images/z1.jpg';
    // Для mock-упражнений зберігаємо оригінальне анатомічне зображення
    if (!isMockExercise && !muscleImageUrl) {
      muscleImageUrl = getAnatomicalImageUrl(name, exercise.target || '');
    }
  } else if (nameLower.includes('45° side bend') || nameLower.includes('45 side bend') || (nameLower.includes('side') && nameLower.includes('bend') && nameLower.includes('45')) || nameLower.includes('бічний нахил 45')) {
    // Бічний нахил 45° - використовуємо зображення z2
    imageUrl = '/images/z2.jpg';
    // Для mock-упражнений зберігаємо оригінальне анатомічне зображення
    if (!isMockExercise && !muscleImageUrl) {
      muscleImageUrl = getAnatomicalImageUrl(name, exercise.target || '');
    }
  } else if (nameLower === 'air bike' || (nameLower.includes('air') && nameLower.includes('bike')) || nameLower.includes('велосипед')) {
    // Велосипед - використовуємо зображення z3
    imageUrl = '/images/z3.jpg';
    // Для mock-упражнений зберігаємо оригінальне анатомічне зображення
    if (!isMockExercise && !muscleImageUrl) {
      muscleImageUrl = getAnatomicalImageUrl(name, exercise.target || '');
    }
  // Завжди замінюємо зображення на правильні для біцепсів на основі назви вправи
  } else if (nameLower === 'barbell curl' || (nameLower.includes('barbell') && nameLower.includes('curl') && !nameLower.includes('prone') && !nameLower.includes('reverse') && !nameLower.includes('incline'))) {
    // Підйом штанги на біцепс стоячи - спочатку намагаємося використати локальне зображення
    // Якщо файл не знайдено, браузер автоматично переключиться на fallback URL через обробник помилок
    imageUrl = '/src/images/barbell-curl.jpg'; // Додайте файл з цією назвою в папку src/images/
  } else if (nameLower.includes('barbell prone incline curl') || nameLower.includes('prone incline curl') || (nameLower.includes('incline') && nameLower.includes('curl'))) {
    // Підйом штанги на біцепс лежачи на похилій лавці - використовуємо локальне зображення b2
    imageUrl = '/images/b2.jpg'; // Оскільки root в vite.config.js встановлено на './src', використовуємо /images/
  } else if (nameLower.includes('barbell standing reverse grip curl') || nameLower.includes('reverse grip curl') || (nameLower.includes('reverse') && nameLower.includes('curl'))) {
    // Підйом штанги на біцепс зворотним хватом - використовуємо локальне зображення b3
    imageUrl = '/images/b3.jpg'; // Оскільки root в vite.config.js встановлено на './src', використовуємо /images/
  // Вправи на трицепси
  } else if (nameLower.includes('dumbbell kickback') || (nameLower.includes('розгинання') && nameLower.includes('нахилі'))) {
    // Розгинання трицепса з гантеллю в нахилі - використовуємо локальне зображення ss1
    imageUrl = '/images/ss1.jpg';
  } else if (nameLower.includes('neutral grip bench press') || (nameLower.includes('жим') && nameLower.includes('нейтральним'))) {
    // Жим гантелей нейтральним хватом лежачи - використовуємо локальне зображення ss2
    imageUrl = '/images/ss2.png';
  } else if (nameLower.includes('handstand push-up') || nameLower.includes('віджимання в стійці')) {
    // Віджимання в стійці на руках - використовуємо локальне зображення ss3
    imageUrl = '/images/ss3.jpg';
  // Вправи на литки
  } else if (nameLower.includes('dumbbell calf raise') || (nameLower.includes('підйом') && nameLower.includes('гантел') && nameLower.includes('стоячи'))) {
    // Підйом на носки з гантелями стоячи - використовуємо локальне зображення gg2
    imageUrl = '/images/gg2.jpg';
  } else if (nameLower.includes('stair calf raise') || nameLower.includes('step calf raise') || (nameLower.includes('підйом') && nameLower.includes('сходин'))) {
    // Підйом на носки на сходинці - використовуємо локальне зображення gg3
    imageUrl = '/images/gg3.jpg';
  } else if (nameLower.includes('standing calf raise') || (nameLower.includes('calf raise') && nameLower.includes('standing')) || (nameLower.includes('підйом') && nameLower.includes('носки') && !nameLower.includes('гантел') && !nameLower.includes('сходин'))) {
    // Підйом на носки стоячи - використовуємо локальне зображення gg1
    imageUrl = '/images/gg1.jpg';
  // Вправи на леватор лопатки
  } else if (nameLower.includes('side push neck stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('натисканням'))) {
    // Бічна розтяжка шиї з натисканням - використовуємо локальне зображення qw1
    imageUrl = '/images/qw1.jpeg';
  } else if (nameLower.includes('neck side stretch') || (nameLower.includes('бічна') && nameLower.includes('розтяжка') && nameLower.includes('шиї') && !nameLower.includes('натисканням'))) {
    // Бічна розтяжка шиї - використовуємо локальне зображення qw2
    imageUrl = '/images/qw2.jpg';
  // Вправи на груди
  } else if (nameLower.includes('assisted chest dip') && nameLower.includes('kneeling')) {
    // Віджимання на брусах з допомогою (на колінах) - використовуємо локальне зображення p1
    imageUrl = '/images/p1.jpg';
  } else if (nameLower.includes('barbell decline wide-grip press') || nameLower.includes('barbell decline wide grip press')) {
    // Жим штанги на похилій лавці широким хватом - використовуємо локальне зображення p2
    imageUrl = '/images/p2.jpg';
  } else if (nameLower.includes('cable incline bench press')) {
    // Жим на похилій лавці з канатним тренажером - використовуємо локальне зображення p3
    imageUrl = '/images/p3.jpg';
  // Вправи на серратні м'язи
  } else if (nameLower.includes('smith incline shoulder raise') || (nameLower.includes('smith') && nameLower.includes('incline shoulder raise'))) {
    // Підйом плечей на тренажері Сміта на похилій лавці - використовуємо локальне зображення pp1
    imageUrl = '/images/pp1.jpg';
  } else if (nameLower.includes('barbell incline shoulder raise') || (nameLower.includes('barbell') && nameLower.includes('incline shoulder raise'))) {
    // Підйом плечей зі штангою на похилій лавці - використовуємо локальне зображення pp2
    imageUrl = '/images/pp2.jpg';
  } else if (nameLower.includes('dumbbell incline shoulder raise') || (nameLower.includes('dumbbell') && nameLower.includes('incline shoulder raise'))) {
    // Підйом плечей з гантелями на похилій лавці - використовуємо локальне зображення pp3
    imageUrl = '/images/pp3.jpg';
  // Кардіо вправи
  } else if (name === 'Біг' || nameLower.includes('біг') || nameLower === 'run' || nameLower.includes('run (equipment)') || (nameLower.includes('run') && nameLower.includes('equipment') && !nameLower.includes('running') && !nameLower.includes('burpee'))) {
    // Біг - використовуємо локальне зображення be3
    imageUrl = '/images/be3.webp';
  } else if (nameLower.includes('burpee') || nameLower.includes('берпі')) {
    // Берпі - використовуємо локальне зображення be1
    imageUrl = '/images/be1.jpg';
  } else if (nameLower.includes('mountain climber') || nameLower.includes('альпініст')) {
    // Альпініст - використовуємо локальне зображення be2
    imageUrl = '/images/be2.jpg';
  } else if (nameLower.includes('jumping jacks') || nameLower.includes('стрибки з розведенням')) {
    // Стрибки з розведенням рук - використовуємо локальне зображення (залишаємо з API або fallback)
    // imageUrl залишається з API
    } else if (nameLower.includes('curl') && nameLower.includes('barbell')) {
      // Загальний підйом штанги на біцепс
      imageUrl = 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
    } else if (nameLower.includes('hammer') || nameLower.includes('молот')) {
      imageUrl = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
    } else if (nameLower.includes('concentration') || nameLower.includes('концентр')) {
      imageUrl = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
    }
  
  // Отримуємо інструкції з різних можливих полів API
  const instructions = exercise.instructions || exercise.steps || exercise.instruction || [];
  
  // Формуємо список кроків виконання
  let stepsHTML = '';
  if (instructions && instructions.length > 0) {
    let stepsArray = [];
    if (Array.isArray(instructions)) {
      stepsArray = instructions.filter(step => step && (typeof step === 'string' ? step.trim().length > 0 : true));
    } else if (typeof instructions === 'string') {
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
  
  // Логуємо для відлагодження
  
  // Створюємо SVG-заглушку
  const exerciseSVG = createExerciseSVG(name);
  
  card.innerHTML = `
    <div class="exercise-card-content">
      <div class="exercise-image-wrapper">
        <div class="exercise-image" style="position: relative; width: 100%; min-height: 160px; background: transparent; border-radius: 6px 0 0 6px; overflow: hidden; box-sizing: border-box;">
          <div class="exercise-image-placeholder" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; z-index: 1;">
            ${exerciseSVG}
            <span style="font-size: 0.8rem; text-align: center; padding: 0.4rem 0.8rem; color: #4caf50; font-weight: 600; margin-top: 0.4rem;">${name}</span>
          </div>
          ${imageUrl ? `
            <img src="${imageUrl}" alt="${name}" loading="lazy" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2; opacity: 1; transition: opacity 0.3s;" onload="this.style.opacity='1'; this.parentElement.querySelector('.exercise-image-placeholder').style.display='none';" onerror="this.style.opacity='0'; this.parentElement.querySelector('.exercise-image-placeholder').style.display='flex';" />
          ` : ''}
        </div>
        <div class="exercise-start-container">
          <button class="btn btn-start" data-exercise-id="${exercise._id}">Старт</button>
        </div>
      </div>
      <div class="exercise-info">
        <div class="exercise-info-header">
          <h2 class="exercise-name">${name}</h2>
          <div class="exercise-rating">
            <span>${rating}</span>
            <div class="stars">
              ${generateRatingStars(parseFloat(rating))}
            </div>
          </div>
        </div>
        <div class="exercise-details">
          <p><strong>Мета:</strong> ${target}</p>
          <p><strong>Частина тіла:</strong> ${bodyPart}</p>
          <p><strong>Обладнання:</strong> ${equipment}</p>
          <p><strong>Популярність: калорії:</strong> Спалені ${popularity} ${calories} / 3 хв</p>
        </div>
        <div class="exercise-description">
          <p>${description}</p>
        </div>
        <div class="exercise-actions">
          <button class="btn btn-favorite ${isFav ? 'active' : ''}" data-exercise-id="${exercise._id}">
            ${isFav ? 'Видалити з улюблених' : 'Додати до улюблених'}
          </button>
          <button class="btn btn-rating" data-exercise-id="${exercise._id}">Оцінити</button>
        </div>
      </div>
    </div>
  `;
  
  // Обробник завантаження зображення
  if (imageUrl) {
    const img = card.querySelector('.exercise-image img');
    const placeholder = card.querySelector('.exercise-image-placeholder');
    if (img && placeholder) {
      
      // Для mock-упражнений з Unsplash URL відразу показуємо зображення
      const isUnsplashUrl = imageUrl.includes('unsplash.com') || imageUrl.includes('images.unsplash.com');
      
      // Спочатку перевіряємо, чи зображення вже завантажене
      if (img.complete && img.naturalWidth > 0) {
        img.style.opacity = '1';
        placeholder.style.display = 'none';
      } else if (isUnsplashUrl) {
        // Для Unsplash URL відразу показуємо зображення (вони завантажуються швидко)
        img.style.opacity = '1';
        placeholder.style.display = 'none';
      } else {
        // Встановлюємо обробник успішного завантаження
        img.addEventListener('load', function() {
          if (this.complete && this.naturalWidth > 0) {
            this.style.opacity = '1';
            if (placeholder) placeholder.style.display = 'none';
          }
        });
        
        // Встановлюємо обробник помилки
        let errorHandled = false;
        img.addEventListener('error', function() {
          if (this.complete && this.naturalWidth === 0) {
            
            // Якщо це локальне зображення і воно не знайдено, переключаємося на fallback URL з Unsplash
            if (!errorHandled && imageUrl && (imageUrl.startsWith('/src/images/') || imageUrl.startsWith('./src/images/') || imageUrl.startsWith('/images/'))) {
              const fallbackUrls = {
                '/src/images/barbell-curl.jpg': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/b2.jpg': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/src/images/b2.jpg': 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/b3.jpg': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/src/images/b3.jpg': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/p1.jpg': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/p2.jpg': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/p3.jpg': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/qq1.jpg': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/qq2.jpg': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
                '/images/qq3.jpg': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
              };
              
              const fallbackUrl = fallbackUrls[imageUrl];
              if (fallbackUrl) {
                errorHandled = true;
                this.src = fallbackUrl;
                return;
              }
            }
            
            // Якщо зображення не завантажилося, показуємо placeholder
            this.style.opacity = '0';
            if (placeholder) placeholder.style.display = 'flex';
          }
        });
        
        // Перевіряємо стан зображення через невеликий проміжок
        setTimeout(() => {
          if (img && img.complete && img.naturalWidth > 0) {
            img.style.opacity = '1';
            if (placeholder) placeholder.style.display = 'none';
          } else if (img && img.complete) {
            img.style.opacity = '0';
            if (placeholder) placeholder.style.display = 'flex';
          } else {
          }
        }, 3000);
      }
    } else {
    }
  } else {
  }
  
  // Обробники кнопок
  const startBtn = card.querySelector('.btn-start');
  const favoriteBtn = card.querySelector('.btn-favorite');
  const ratingBtn = card.querySelector('.btn-rating');
  
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      openExerciseModal(exercise._id);
    });
  }
  
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
      const isFav = isFavorite(exercise._id);
      if (isFav) {
        removeFromFavorites(exercise._id);
        favoriteBtn.textContent = 'Додати до улюблених';
        favoriteBtn.classList.remove('active');
        showNotification('Вправу видалено з улюблених', 'success');
      } else {
        addToFavorites(exercise);
        favoriteBtn.textContent = 'Видалити з улюблених';
        favoriteBtn.classList.add('active');
        showNotification('Вправу додано до улюблених', 'success');
      }
    });
  }
  
  if (ratingBtn) {
    ratingBtn.addEventListener('click', () => {
      openRatingModal(exercise._id);
    });
  }
  
  return card;
}
