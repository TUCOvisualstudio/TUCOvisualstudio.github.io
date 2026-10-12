const header = document.querySelector('.site-header');
const toggle = document.querySelector('.nav-toggle');

toggle.addEventListener('click', () => {
  header.classList.toggle('open');
});

document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => header.classList.remove('open'));
});

const strip = document.querySelector('.featured-strip');
const leftArrow = document.querySelector('.strip-arrow--left');
const rightArrow = document.querySelector('.strip-arrow--right');

if (strip && leftArrow && rightArrow) {
  const scrollByCard = (direction) => {
    const card = strip.querySelector('.featured-card');
    const gap = 28; // debe coincidir con el gap del CSS (1.75rem)
    const distance = card ? card.getBoundingClientRect().width + gap : 300;
    strip.scrollBy({ left: distance * direction, behavior: 'smooth' });
  };

  leftArrow.addEventListener('click', () => scrollByCard(-1));
  rightArrow.addEventListener('click', () => scrollByCard(1));
}

// Tarjetas de proyectos: se muestran como foto fija y el reel
// se reproduce solo mientras el cursor está encima.
document.querySelectorAll('.featured-video').forEach(video => {
  video.addEventListener('loadedmetadata', () => {
    video.currentTime = 0.15; // evita el primer fotograma (a veces negro)
  });

  const card = video.closest('.featured-card');

  card.addEventListener('mouseenter', () => video.play());
  card.addEventListener('mouseleave', () => {
    video.pause();
    video.currentTime = 0.15;
  });
});

// Reproductor: al hacer click en un proyecto se abre en semi-pantalla
// completa con controles y audio.
const modal = document.getElementById('player-modal');
const playerVideo = modal.querySelector('.player-video');
const playerTitle = modal.querySelector('.player-title');
const cards = Array.from(document.querySelectorAll('.featured-card'));
let currentIndex = -1;
let lastFocused = null;

const loadProject = (index) => {
  currentIndex = (index + cards.length) % cards.length;
  const card = cards[currentIndex];
  const preview = card.querySelector('.featured-video');
  preview.pause();
  playerVideo.src = card.querySelector('source').getAttribute('src');
  playerTitle.textContent = card.querySelector('.featured-name').textContent;
  playerVideo.muted = false;
  playerVideo.play().catch(() => {});
};

const openPlayer = (index) => {
  lastFocused = document.activeElement;
  modal.hidden = false;
  document.body.classList.add('player-open');
  loadProject(index);
  modal.querySelector('.player-close').focus();
};

const closePlayer = () => {
  playerVideo.pause();
  playerVideo.removeAttribute('src');
  playerVideo.load();
  modal.hidden = true;
  document.body.classList.remove('player-open');
  currentIndex = -1;
  if (lastFocused) lastFocused.focus();
};

cards.forEach((card, i) => {
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.addEventListener('click', () => openPlayer(i));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openPlayer(i);
  });
});

modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closePlayer));
modal.querySelector('.player-nav--prev').addEventListener('click', () => loadProject(currentIndex - 1));
modal.querySelector('.player-nav--next').addEventListener('click', () => loadProject(currentIndex + 1));

document.addEventListener('keydown', (e) => {
  if (modal.hidden) return;
  if (e.key === 'Escape') closePlayer();
  else if (e.key === 'ArrowLeft') loadProject(currentIndex - 1);
  else if (e.key === 'ArrowRight') loadProject(currentIndex + 1);
});
