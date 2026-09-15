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
