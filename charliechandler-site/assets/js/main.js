document.getElementById('year').textContent = new Date().getFullYear();

const links = document.querySelectorAll('.nav-links a');
const sections = [...links].map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);

function setActiveLink() {
  const position = window.scrollY + 180;
  let active = sections[0]?.id;
  for (const section of sections) {
    if (section.offsetTop <= position) active = section.id;
  }
  links.forEach(link => {
    const isActive = link.getAttribute('href') === `#${active}`;
    link.style.background = isActive ? 'rgba(110, 231, 249, 0.10)' : '';
    link.style.color = isActive ? 'var(--text)' : '';
  });
}
window.addEventListener('scroll', setActiveLink, { passive: true });
setActiveLink();
