import { getExercises } from './api.js';
import { renderExercises, updateExercisesParams } from './exercises.js';
import { getCurrentFilter } from './filters.js';
import { getCurrentCategory } from './categories.js';
import { searchMockExercises, getAutocompleteSuggestions, loadExercisesForSearch } from './exercises-page.js';

let autocompleteDropdown = null;
let selectedSuggestionIndex = -1;
let suggestionsList = [];

/**
 * Створити випадаючий список автодоповнення
 * @returns {HTMLElement}
 */
function createAutocompleteDropdown() {
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  dropdown.id = 'autocomplete-dropdown';
  dropdown.style.display = 'none';
  return dropdown;
}

/**
 * Показати автодоповнення
 * @param {Array<string>} suggestions
 * @param {HTMLElement} inputElement
 */
function showAutocomplete(suggestions, inputElement) {
  if (!autocompleteDropdown) {
    autocompleteDropdown = createAutocompleteDropdown();
    // Вставляємо в search-section або після форми пошуку
    const searchSection = document.querySelector('.search-section');
    const searchForm = document.getElementById('search-form');
    
    if (searchSection) {
      searchSection.appendChild(autocompleteDropdown);
    } else if (searchForm && searchForm.parentElement) {
      searchForm.parentElement.appendChild(autocompleteDropdown);
    } else {
      document.body.appendChild(autocompleteDropdown);
    }
  }

  if (suggestions.length === 0) {
    autocompleteDropdown.style.display = 'none';
    return;
  }

  suggestionsList = suggestions;
  selectedSuggestionIndex = -1;

  autocompleteDropdown.innerHTML = suggestions
    .map((suggestion, index) => `
      <div class="autocomplete-item" data-index="${index}">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" class="autocomplete-icon">
          <path
            d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4.35-4.35"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>${escapeHtml(suggestion)}</span>
      </div>
    `)
    .join('');

  // Додаємо обробники кліків
  autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      selectSuggestion(suggestions[index], inputElement);
    });
  });

  autocompleteDropdown.style.display = 'block';
  updateDropdownPosition(inputElement);
}

/**
 * Оновити позицію випадаючого списку
 * @param {HTMLElement} inputElement
 */
function updateDropdownPosition(inputElement) {
  if (!autocompleteDropdown || !inputElement) return;

  const rect = inputElement.getBoundingClientRect();
  const searchSection = document.querySelector('.search-section');
  
  // Якщо випадаючий список знаходиться в search-section, використовуємо відносне позиціювання
  if (searchSection && searchSection.contains(autocompleteDropdown)) {
    // Відносне позиціювання до search-section
    const sectionRect = searchSection.getBoundingClientRect();
    const inputRect = inputElement.getBoundingClientRect();
    autocompleteDropdown.style.top = `${inputRect.bottom - sectionRect.top + 4}px`;
    autocompleteDropdown.style.left = `${inputRect.left - sectionRect.left}px`;
    autocompleteDropdown.style.width = `${inputRect.width}px`;
  } else {
    // Абсолютне позиціювання
    autocompleteDropdown.style.top = `${rect.bottom + window.scrollY}px`;
    autocompleteDropdown.style.left = `${rect.left + window.scrollX}px`;
    autocompleteDropdown.style.width = `${rect.width}px`;
  }
}

/**
 * Приховати автодоповнення
 */
function hideAutocomplete() {
  if (autocompleteDropdown) {
    autocompleteDropdown.style.display = 'none';
  }
  selectedSuggestionIndex = -1;
}

/**
 * Вибрати підказку
 * @param {string} suggestion
 * @param {HTMLElement} inputElement
 */
function selectSuggestion(suggestion, inputElement) {
  if (inputElement) {
    inputElement.value = suggestion;
  }
  hideAutocomplete();
  
  // Автоматично виконуємо пошук напрямую
  performSearch(suggestion);
}

/**
 * Виконати пошук
 * @param {string} keyword
 */
async function performSearch(keyword) {
  const exercisesSection = document.getElementById('exercises-section');
  const exercisesTitle = document.getElementById('exercises-title');

  if (!exercisesSection) {
    return;
  }

  // Показуємо секцію вправ
  exercisesSection.classList.remove('hidden');
  
  // Прокручуємо до секції вправ
  exercisesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Оновлюємо заголовок
  if (exercisesTitle) {
    exercisesTitle.textContent = keyword ? `Результати пошуку: ${keyword}` : 'Вправи';
  }

  // Формуємо параметри
  const params = {
    keyword: keyword || undefined,
    page: 1,
    limit: 10,
  };

  // Додаємо фільтр та категорію, якщо вони активні
  const currentCategory = getCurrentCategory();
  if (currentCategory) {
    if (currentCategory.filterType === 'Muscles' && currentCategory.filterValue) {
      params.muscles = currentCategory.filterValue;
    } else if (currentCategory.filterType === 'Body parts' && currentCategory.filterValue) {
      params.bodypart = currentCategory.filterValue;
    } else if (currentCategory.filterType === 'Equipment' && currentCategory.filterValue) {
      params.equipment = currentCategory.filterValue;
    }
  }

  updateExercisesParams(params);

  const exercisesGrid = document.getElementById('exercises-grid');
  if (exercisesGrid) {
    exercisesGrid.innerHTML = '<div class="loading">Завантаження...</div>';
  }

  try {
    const response = await getExercises(params);
    let exercises = response.results || [];
    let totalPages = response.totalPages || 1;
    
    // Якщо API не знайшов результатів, шукаємо в mock-даних
    if (exercises.length === 0 && keyword) {
      const mockResults = searchMockExercises(keyword);
      if (mockResults.length > 0) {
        exercises = mockResults;
        totalPages = 1;
      }
    }
    
    await renderExercises(exercises, totalPages, 1);
  } catch (error) {
    // Якщо API видав помилку, шукаємо в mock-даних
    if (keyword) {
      try {
        const mockResults = searchMockExercises(keyword);
        if (mockResults.length > 0) {
          await renderExercises(mockResults, 1, 1);
          return;
        }
      } catch (mockError) {
        // Ignore mock search errors
      }
    }
    
    if (exercisesGrid) {
      exercisesGrid.innerHTML = '<div class="error-message">Вправи не знайдено</div>';
    }
  }
}

/**
 * Екранувати HTML
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Ініціалізація пошуку
 */
export function initSearch() {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  if (!searchForm || !searchInput) {
    return;
  }

  // Загружаем упражнения из body parts и equipment для поиска
  loadExercisesForSearch().catch(() => {
    // Ignore errors loading exercises for search
  });
  
  // Используем Object.defineProperty для отслеживания изменений значения
  let currentValue = searchInput.value || '';
  let debounceTimerForInterval = null;
  
  // Переопределяем свойство value для отслеживания изменений
  const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') || 
                          Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'value');
  
  if (valueDescriptor && valueDescriptor.set) {
    const originalSet = valueDescriptor.set;
    Object.defineProperty(searchInput, 'value', {
      set: function(val) {
        originalSet.call(this, val);
        if (val !== currentValue) {
          currentValue = val;
          handleValueChange(val);
        }
      },
      get: function() {
        return valueDescriptor.get ? valueDescriptor.get.call(this) : currentValue;
      }
    });
  }
  
  // Также используем setInterval как резервный способ
  const checkValue = () => {
    const newValue = searchInput.value || '';
    if (newValue !== currentValue) {
      currentValue = newValue;
      handleValueChange(newValue);
    }
  };
  
  function handleValueChange(value) {
    const query = String(value || '').trim();
    
    // Очищаем предыдущий таймер
    if (debounceTimerForInterval) {
      clearTimeout(debounceTimerForInterval);
    }
    
    // Если поле пустое, скрываем автодополнение
    if (query.length === 0) {
      hideAutocomplete();
      return;
    }
    
    // Для первой буквы показываем результаты сразу, для других - с задержкой
    const delay = query.length === 1 ? 50 : 200;
    
    debounceTimerForInterval = setTimeout(() => {
      try {
        const suggestions = getAutocompleteSuggestions(query, 10);
        if (suggestions.length > 0) {
          showAutocomplete(suggestions, searchInput);
        } else {
          hideAutocomplete();
        }
      } catch (error) {
        hideAutocomplete();
      }
    }, delay);
  }
  
  // Проверяем значение каждые 50мс для более быстрой реакции
  setInterval(checkValue, 50);
  
  // Также добавляем обработчики событий как резерв
  searchInput.addEventListener('input', (e) => {
    handleValueChange(e.target.value);
  });
  
  searchInput.addEventListener('keyup', (e) => {
    handleValueChange(e.target.value);
  });
  
  // Останавливаем проверку при размонтировании (если нужно)
  // Но для простоты оставим работать
  
  // Автодополнение работает через setInterval (см. код выше)
  

  // Обробка навігації клавіатурою
  searchInput.addEventListener('keydown', (e) => {
    if (!autocompleteDropdown || autocompleteDropdown.style.display === 'none') {
      return;
    }

    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, items.length - 1);
        updateSelectedItem(items);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        updateSelectedItem(items);
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0 && suggestionsList[selectedSuggestionIndex]) {
          e.preventDefault();
          selectSuggestion(suggestionsList[selectedSuggestionIndex], searchInput);
        }
        break;
      case 'Escape':
        hideAutocomplete();
        searchInput.blur();
        break;
    }
  });

  // Приховуємо автодоповнення при кліку поза ним
  document.addEventListener('click', (e) => {
    if (
      autocompleteDropdown &&
      !autocompleteDropdown.contains(e.target) &&
      e.target !== searchInput
    ) {
      hideAutocomplete();
    }
  });

  // Оновлюємо позицію при прокрутці
  window.addEventListener('scroll', () => {
    if (autocompleteDropdown && autocompleteDropdown.style.display !== 'none') {
      updateDropdownPosition(searchInput);
    }
  });

  // Оновлюємо позицію при зміні розміру вікна
  window.addEventListener('resize', () => {
    if (autocompleteDropdown && autocompleteDropdown.style.display !== 'none') {
      updateDropdownPosition(searchInput);
    }
  });

  /**
   * Оновити виділений елемент
   * @param {NodeList} items
   */
  function updateSelectedItem(items) {
    items.forEach((item, index) => {
      if (index === selectedSuggestionIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Приховуємо автодоповнення при відправці форми
    hideAutocomplete();

    const keyword = searchInput.value.trim();
    
    // Використовуємо загальну функцію пошуку
    await performSearch(keyword);
  });
}
