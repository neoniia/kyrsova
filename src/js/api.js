const API_BASE_URL = 'https://your-energy.b.goit.study/api';

/**
 * Отримати цитату дня
 * @returns {Promise<Object>}
 */
export async function getQuote() {
  try {
    const response = await fetch(`${API_BASE_URL}/quote`);
    if (!response.ok) {
      throw new Error('Failed to fetch quote');
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Отримати фільтри
 * @param {string} filter - Muscles, Body parts, Equipment
 * @param {number} page - номер сторінки
 * @param {number} limit - кількість елементів
 * @returns {Promise<Object>}
 */
export async function getFilters(filter, page = 1, limit = 12) {
  try {
    const params = new URLSearchParams({
      filter,
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await fetch(`${API_BASE_URL}/filters?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch filters');
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Отримати вправи
 * @param {Object} params - параметри пошуку
 * @returns {Promise<Object>}
 */
export async function getExercises(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.bodypart) queryParams.append('bodypart', params.bodypart);
    if (params.muscles) queryParams.append('muscles', params.muscles);
    if (params.equipment) queryParams.append('equipment', params.equipment);
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/exercises?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch exercises');
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Отримати детальну інформацію про вправу
 * @param {string} exerciseId - ID вправи
 * @returns {Promise<Object>}
 */
export async function getExerciseById(exerciseId) {
  // Спочатку перевіряємо, чи це mock-вправа за ID
  if (exerciseId && exerciseId.startsWith('mock-')) {
    // Імпортуємо функцію динамічно, щоб уникнути циклічних залежностей
    const { getMockExerciseById } = await import('./exercises-page.js');
    const mockExercise = getMockExerciseById(exerciseId);
    if (mockExercise) {
      return mockExercise;
    }
    // Якщо mock-вправу не знайдено, викидаємо помилку
    throw new Error('Mock exercise not found');
  }

  // Для реальних вправ спочатку пробуємо знайти в API
  try {
    const response = await fetch(`${API_BASE_URL}/exercises/${exerciseId}`);
    if (!response.ok) {
      // Якщо API не знайшов вправу, пробуємо знайти в mock-даних
      const { getMockExerciseById } = await import('./exercises-page.js');
      const mockExercise = getMockExerciseById(exerciseId);
      if (mockExercise) {
        return mockExercise;
      }
      throw new Error('Failed to fetch exercise');
    }
    const exerciseData = await response.json();
    
    // Перевіряємо, чи є відповідна mock-вправа для додавання muscleImage
    // Шукаємо за назвою або ID
    try {
      const exerciseModule = await import('./exercises-page.js');
      // Спочатку пробуємо знайти за ID
      let mockExercise = exerciseModule.getMockExerciseById(exerciseId);
      
      // Якщо не знайдено за ID, шукаємо за назвою
      if (!mockExercise && exerciseData.name) {
        const allMockExercises = exerciseModule.getAllMockExercises();
        
        // Шукаємо за назвою (порівнюємо в нижньому регістрі)
        const exerciseNameLower = exerciseData.name.toLowerCase();
        mockExercise = allMockExercises.find(ex => 
          ex.name && ex.name.toLowerCase() === exerciseNameLower
        );
      }
      
      // Якщо знайдено mock-вправу, додаємо muscleImage до даних з API
      if (mockExercise && mockExercise.muscleImage) {
        exerciseData.muscleImage = mockExercise.muscleImage;
      } else if (exerciseData.name && exerciseData.target) {
        // Якщо немає muscleImage в mock-даних, намагаємося знайти анатомічне зображення автоматично
        if (exerciseModule.getAnatomicalImageUrl) {
          const anatomicalUrl = exerciseModule.getAnatomicalImageUrl(exerciseData.name, exerciseData.target);
          if (anatomicalUrl) {
            exerciseData.muscleImage = anatomicalUrl;
          }
        }
      }
    } catch (error) {
      // Ignore errors checking mock exercises
    }
    
    return exerciseData;
  } catch (error) {
    // Остання спроба - шукаємо в mock-даних
    try {
      const { getMockExerciseById } = await import('./exercises-page.js');
      const mockExercise = getMockExerciseById(exerciseId);
      if (mockExercise) {
        return mockExercise;
      }
    } catch (mockError) {
      // Ignore mock search errors
    }
    throw error;
  }
}

/**
 * Оцінити вправу
 * @param {string} exerciseId - ID вправи
 * @param {number} rating - рейтинг (1-5)
 * @param {string} email - email (необов'язково)
 * @param {string} comment - коментар (необов'язково)
 * @returns {Promise<Object>}
 */
export async function rateExercise(exerciseId, rating, email = '', comment = '') {
  try {
    // Переконуємося, що рейтинг є числом
    const ratingNumber = Number(rating);
    
    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      throw new Error('Рейтинг повинен бути числом від 1 до 5');
    }
    
    // Формуємо тіло запиту - API очікує тільки поле "rate", не "rating" та не "comment"
    const requestBody = {
      rate: ratingNumber,
    };
    
    // Додаємо email, якщо він є (API може приймати email)
    // Примітка: API не приймає поле "comment", тому не додаємо його
    if (email) {
      requestBody.email = email;
    }
    // Коментар не відправляємо, оскільки API не підтримує це поле
    
    const response = await fetch(`${API_BASE_URL}/exercises/${exerciseId}/rating`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to rate exercise: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Підписатися на розсилку
 * @param {string} email - email для підписки
 * @returns {Promise<Object>}
 */
export async function subscribe(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to subscribe');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
