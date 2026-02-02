const STORAGE_KEYS = {
  QUOTE: 'your_energy_quote',
  FAVORITES: 'your_energy_favorites',
};

/**
 * Зберегти цитату в localStorage
 * @param {Object} quoteData - дані цитати
 */
export function saveQuote(quoteData) {
  const data = {
    ...quoteData,
    date: new Date().toDateString(),
  };
  localStorage.setItem(STORAGE_KEYS.QUOTE, JSON.stringify(data));
}

/**
 * Отримати цитату з localStorage
 * @returns {Object|null}
 */
export function getQuote() {
  const data = localStorage.getItem(STORAGE_KEYS.QUOTE);
  if (!data) return null;

  try {
    const quoteData = JSON.parse(data);
    const today = new Date().toDateString();
    
    // Перевіряємо, чи цитата сьогоднішня
    if (quoteData.date === today) {
      return quoteData;
    }
    
    // Якщо цитата застаріла, видаляємо її
    localStorage.removeItem(STORAGE_KEYS.QUOTE);
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Отримати улюблені вправи
 * @returns {Array}
 */
export function getFavorites() {
  const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
  if (!data) return [];
  
  try {
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

/**
 * Додати вправу до улюблених
 * @param {Object} exercise - дані вправи
 */
export function addToFavorites(exercise) {
  const favorites = getFavorites();
  const exists = favorites.some(fav => fav._id === exercise._id);
  
  if (!exists) {
    favorites.push(exercise);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }
}

/**
 * Видалити вправу з улюблених
 * @param {string} exerciseId - ID вправи
 */
export function removeFromFavorites(exerciseId) {
  const favorites = getFavorites();
  const filtered = favorites.filter(fav => fav._id !== exerciseId);
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
}

/**
 * Перевірити, чи вправа в улюблених
 * @param {string} exerciseId - ID вправи
 * @returns {boolean}
 */
export function isFavorite(exerciseId) {
  const favorites = getFavorites();
  return favorites.some(fav => fav._id === exerciseId);
}
