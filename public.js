async function loadSiteData() {
  try {
    const response = await fetch('/api/site', { cache: 'no-store' });
    if (response.ok) return response.json();
  } catch (error) {
    console.warn('API content unavailable, using static fallback:', error.message);
  }

  const response = await fetch('/data/site.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load site data');
  return response.json();
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element && text) element.textContent = text;
}

function setContactLink(selector, prefix, value, isEmail = false) {
  const element = document.querySelector(selector);
  if (!element) return;
  if (!value) {
    element.textContent = `${prefix}: Not provided`;
    return;
  }
  element.innerHTML = '';
  element.textContent = `${prefix}: `;
  const link = document.createElement('a');
  link.className = 'contact-link';
  if (isEmail) {
    link.href = `mailto:${value}`;
    link.textContent = value;
  } else {
    const fullUrl = value.startsWith('http') ? value : `https://${value}`;
    link.href = fullUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = value.replace(/^https?:\/\//, '');
  }
  element.appendChild(link);
}

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'card';

  if (item.tag) {
    const tag = document.createElement('span');
    tag.className = 'project-tag';
    tag.textContent = item.tag;
    article.appendChild(tag);
  }

  const title = document.createElement('h3');
  title.textContent = item.title || 'Untitled';

  const description = document.createElement('p');
  description.textContent = item.description || '';

  article.append(title, description);

  if (item.link) {
    const link = document.createElement('a');
    link.className = 'card-external-link';
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Learn more →';
    article.appendChild(link);
  }

  return article;
}

function createTimelineItem(item) {
  const div = document.createElement('div');
  div.className = 'item';

  if (item.tag) {
    const tag = document.createElement('span');
    tag.className = 'project-tag';
    tag.textContent = item.tag;
    div.appendChild(tag);
  }

  const title = document.createElement('h3');
  title.textContent = item.title || 'Untitled';

  const description = document.createElement('p');
  description.textContent = item.description || '';

  div.append(title, description);

  if (item.link) {
    const link = document.createElement('a');
    link.className = 'timeline-link';
    link.href = item.link;
    if (item.link.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noreferrer';
    }
    link.textContent = 'Explore Project →';
    div.appendChild(link);
  }

  return div;
}

function createProjectBox(item) {
  const article = document.createElement('article');
  article.className = 'project-box';

  const tag = document.createElement('span');
  tag.className = 'project-tag';
  tag.textContent = item.tag || 'Project';

  const title = document.createElement('h3');
  title.textContent = item.title || 'Untitled Project';

  const description = document.createElement('p');
  description.textContent = item.description || '';

  article.append(tag, title, description);

  if (item.link) {
    const link = document.createElement('a');
    link.className = 'btn secondary project-link';
    link.href = item.link;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Open Project / Code';
    article.appendChild(link);
  }

  return article;
}

function createToolBox(item) {
  const article = document.createElement('article');
  article.className = 'project-box tool-card';

  if (item.photoUrl) {
    const image = document.createElement('img');
    image.className = 'tool-image';
    image.src = item.photoUrl;
    image.alt = `${item.title || 'Security Tool'} screenshot - Niraj Raut Bin`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.onerror = () => {
      image.style.display = 'none';
    };
    article.appendChild(image);
  }

  const tag = document.createElement('span');
  tag.className = 'project-tag';
  tag.textContent = item.tag || 'Tool';

  const title = document.createElement('h3');
  title.textContent = item.title || 'Untitled Tool';

  const description = document.createElement('p');
  description.textContent = item.description || '';

  article.append(tag, title, description);

  if (item.zipUrl) {
    const link = document.createElement('a');
    link.className = 'btn primary tool-download';
    link.href = item.zipUrl;
    link.setAttribute('download', `${(item.title || 'tool').toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`);
    link.textContent = 'Download Tool ZIP';
    article.appendChild(link);
  }

  return article;
}

function renderList(selector, items) {
  const list = document.querySelector(selector);
  if (!list || !Array.isArray(items)) return;
  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function renderHome(data) {
  setText('[data-name]', data.name);
  setText('[data-hero-eyebrow]', data.hero?.eyebrow);
  setText('[data-hero-subtitle]', data.hero?.subtitle);
  setText('[data-terminal-whoami]', data.terminal?.whoami);
  setText('[data-terminal-focus]', data.terminal?.focus);
  setText('[data-terminal-status]', data.terminal?.status);
  setContactLink('[data-contact-email]', 'Email', data.contact?.email, true);
  setContactLink('[data-contact-github]', 'GitHub', data.contact?.github, false);
  setContactLink('[data-contact-linkedin]', 'LinkedIn', data.contact?.linkedin, false);
  setText('[data-footer]', `© 2026 ${data.name} — Built for ethical hacking portfolio.`);

  const skills = document.querySelector('[data-skills]');
  if (skills && Array.isArray(data.skills)) {
    skills.innerHTML = '';
    data.skills.forEach((item) => skills.appendChild(createCard(item)));
  }

  const homeProjects = document.querySelector('[data-home-projects]');
  if (homeProjects && Array.isArray(data.homeProjects)) {
    homeProjects.innerHTML = '';
    data.homeProjects.forEach((item) => homeProjects.appendChild(createTimelineItem(item)));
  }

  renderList('[data-certifications]', data.certifications);
  renderList('[data-experience]', data.experience);
}

function renderProjectsPage(data) {
  setText('[data-name]', data.name);
  setText('[data-project-page-subtitle]', `Yo page ma ${data.name} le upload gareko hacking, cyber security, CTF, web security, ra lab projects haru list huncha.`);
  setText('[data-footer]', `© 2026 ${data.name} — Project portfolio.`);

  const projectGrid = document.querySelector('[data-project-grid]');
  if (projectGrid && Array.isArray(data.projects)) {
    projectGrid.innerHTML = '';

    if (data.projects.length === 0) {
      const empty = document.createElement('article');
      empty.className = 'project-box empty-project';
      empty.innerHTML = '<span class="project-tag">Empty</span><h3>No projects uploaded yet</h3><p>Admin panel bata project add गरेपछि yaha dekhincha.</p>';
      projectGrid.appendChild(empty);
      return;
    }

    data.projects.forEach((item) => projectGrid.appendChild(createProjectBox(item)));
  }
}

function renderToolsPage(data) {
  setText('[data-name]', data.name);
  setText('[data-tools-page-subtitle]', `${data.name} ko custom tools, scripts, photos, ra ZIP downloads yaha rakheko xa.`);
  setText('[data-footer]', `© 2026 ${data.name} — My tools portfolio.`);

  const toolsGrid = document.querySelector('[data-tools-grid]');
  if (toolsGrid && Array.isArray(data.tools)) {
    toolsGrid.innerHTML = '';

    if (data.tools.length === 0) {
      const empty = document.createElement('article');
      empty.className = 'project-box empty-project';
      empty.innerHTML = '<span class="project-tag">Empty</span><h3>No tools uploaded yet</h3><p>Admin panel bata photo ra ZIP upload गरेपछि yaha dekhincha.</p>';
      toolsGrid.appendChild(empty);
      return;
    }

    data.tools.forEach((item) => toolsGrid.appendChild(createToolBox(item)));
  }
}

loadSiteData()
  .then((data) => {
    renderHome(data);
    renderProjectsPage(data);
    renderToolsPage(data);
  })
  .catch((error) => {
    console.warn('Public content fallback used:', error.message);
  });
