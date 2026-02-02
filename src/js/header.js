/**
 * Ініціалізація Header компонента
 */
export function initHeader() {
  const headerContainer = document.getElementById('header-container');
  if (!headerContainer) return;

  // Завантажуємо header з partials
  fetch('./partials/header.html')
    .then(response => response.text())
    .then(html => {
      headerContainer.innerHTML = html;
      setupBurgerMenu();
      setupNavigation();
    })
    .catch(error => {
    });
}

/**
 * Налаштування бургер-меню
 */
function setupBurgerMenu() {
  const burgerMenu = document.getElementById('burger-menu');
  const headerNav = document.getElementById('header-nav');
  
  if (!burgerMenu || !headerNav) return;

  burgerMenu.addEventListener('click', () => {
    const isExpanded = burgerMenu.getAttribute('aria-expanded') === 'true';
    burgerMenu.setAttribute('aria-expanded', !isExpanded);
    headerNav.classList.toggle('active');
    burgerMenu.classList.toggle('active');
  });

  // Закриваємо меню при кліку на посилання
  const navLinks = headerNav.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      headerNav.classList.remove('active');
      burgerMenu.classList.remove('active');
      burgerMenu.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Налаштування навігації
 */
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const currentPath = window.location.pathname;

  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (currentPath === linkPath || (currentPath === '/' && linkPath === '/')) {
      link.classList.add('active');
    }
  });
}
