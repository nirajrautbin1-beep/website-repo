const buttons = document.querySelectorAll('[data-roadmap-bg]');
const storageKey = 'roadmap-background';

function getStoredBg() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function setStoredBg(val) {
  try {
    localStorage.setItem(storageKey, val);
  } catch {
    // Ignore storage restrictions in sandboxed iframes
  }
}

function setRoadmapBackground(name) {
  document.body.dataset.roadmapBg = name;
  setStoredBg(name);
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.roadmapBg === name);
  });
}

buttons.forEach((button) => {
  button.addEventListener('click', () => setRoadmapBackground(button.dataset.roadmapBg));
});

setRoadmapBackground(getStoredBg() || 'matrix');

