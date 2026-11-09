export {};
type Style = 'developer' | 'paper';
type Mode = 'light' | 'dark' | 'system';
type Preference = { version: 1; style: Style; mode: Mode };
const key = 'vtroiswhite:appearance:v1';
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');
const uiStatus = document.querySelector<HTMLElement>('[data-ui-status]');
const note = document.querySelector<HTMLElement>('[data-preference-note]');
const appearance = document.querySelector<HTMLDetailsElement>('[data-appearance]');
let preference: Preference = {
  version: 1,
  style: root.dataset.style === 'paper' ? 'paper' : 'developer',
  mode: root.dataset.mode === 'light' || root.dataset.mode === 'dark' ? root.dataset.mode : 'system',
};

function announce(message: string) { if (uiStatus) uiStatus.textContent = message; }
function parsePreference(raw: string | null): Preference | undefined {
  if (!raw) return;
  try {
    const value = JSON.parse(raw);
    if (value?.version === 1 && ['developer', 'paper'].includes(value.style) && ['light', 'dark', 'system'].includes(value.mode)) return value;
  } catch { /* An invalid appearance record must not prevent reading the blog. */ }
}

function applyPreference() {
  root.dataset.style = preference.style;
  root.dataset.mode = preference.mode;
  root.dataset.theme = preference.mode === 'system' ? (media.matches ? 'dark' : 'light') : preference.mode;
  document.querySelectorAll<HTMLButtonElement>('[data-style-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.styleChoice === preference.style)));
  document.querySelectorAll<HTMLButtonElement>('[data-mode-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.modeChoice === preference.mode)));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
}

function savePreference() {
  try {
    localStorage.setItem(key, JSON.stringify(preference));
    if (note) note.textContent = '为这个浏览器记住你的选择。';
  } catch {
    if (note) note.textContent = '浏览器未允许保存，当前选择仅本次生效。';
  }
}

function changePreference(change: Partial<Pick<Preference, 'style' | 'mode'>>) {
  const top = (document.querySelector('.site-header')?.getBoundingClientRect().height ?? 88) + 20;
  // Keep the same visible paragraph in place even when heading fonts reflow.
  const anchor = Array.from(document.querySelectorAll<HTMLElement>('.prose > *')).find(element => {
    const rect = element.getBoundingClientRect();
    return rect.bottom > top && rect.top < window.innerHeight;
  });
  const previousTop = anchor?.getBoundingClientRect().top;
  preference = { ...preference, ...change };
  applyPreference();
  if (anchor && previousTop !== undefined) {
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollBy(0, anchor.getBoundingClientRect().top - previousTop);
    // Apply a final correction after style/layout work has settled.
    requestAnimationFrame(() => {
      window.scrollBy(0, anchor.getBoundingClientRect().top - previousTop);
      root.style.scrollBehavior = previousBehavior;
    });
  }
  savePreference();
  announce(`已切换为${preference.style === 'paper' ? '纸感随笔' : '开发者手记'}，${{ light: '浅色', dark: '深色', system: '跟随系统' }[preference.mode]}模式。`);
}

applyPreference();
document.querySelectorAll<HTMLButtonElement>('[data-style-choice]').forEach(button => button.addEventListener('click', () => changePreference({ style: button.dataset.styleChoice as Style })));
document.querySelectorAll<HTMLButtonElement>('[data-mode-choice]').forEach(button => button.addEventListener('click', () => changePreference({ mode: button.dataset.modeChoice as Mode })));
media.addEventListener('change', () => { if (preference.mode === 'system') applyPreference(); });
window.addEventListener('storage', event => {
  if (event.key === key) {
    preference = parsePreference(event.newValue) ?? { version: 1, style: 'developer', mode: 'system' };
    applyPreference();
  }
});
document.addEventListener('pointerdown', event => {
  if (event.target instanceof Node && appearance?.open && !appearance.contains(event.target)) appearance.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && appearance?.open) {
    appearance.open = false;
    appearance.querySelector('summary')?.focus();
  }
});

document.querySelectorAll<HTMLPreElement>('.prose pre').forEach((pre, index) => {
  const code = pre.querySelector('code');
  if (!code) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block';
  const toolbar = document.createElement('div');
  toolbar.className = 'code-toolbar';
  const language = document.createElement('span');
  language.textContent = pre.dataset.language || code.className.match(/language-([\w-]+)/)?.[1] || 'CODE';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-code';
  button.textContent = '复制';
  button.setAttribute('aria-label', `复制第 ${index + 1} 段代码`);
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      button.textContent = '已复制';
      announce('代码已复制。');
    } catch {
      button.textContent = '请手动复制';
      announce('浏览器未允许访问剪贴板，请选择代码后手动复制。');
    }
    window.setTimeout(() => { button.textContent = '复制'; }, 2200);
  });
  toolbar.append(language, button);
  pre.before(wrapper);
  wrapper.append(toolbar, pre);
  pre.tabIndex = 0;
  pre.setAttribute('aria-label', `代码块 ${index + 1}，可横向滚动`);
});
document.querySelectorAll<HTMLTableElement>('.prose table').forEach((table, index) => {
  table.tabIndex = 0;
  table.setAttribute('aria-label', `表格 ${index + 1}，可横向滚动`);
});

const article = document.querySelector<HTMLElement>('[data-article]');
const progress = document.querySelector<HTMLElement>('[data-reading-progress]');
const percent = document.querySelector<HTMLElement>('[data-reading-percent]');
const headings = Array.from(document.querySelectorAll<HTMLElement>('.prose h2, .prose h3'));
const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
if (article) {
  let scheduled = false;
  const updateReading = () => {
    scheduled = false;
    const offset = (document.querySelector('.site-header')?.getBoundingClientRect().height ?? 88) + 24;
    const rect = article.getBoundingClientRect();
    const value = Math.max(0, Math.min(1, (offset - rect.top) / Math.max(1, rect.height - window.innerHeight + offset)));
    if (progress) progress.style.transform = `scaleX(${value})`;
    if (percent) percent.textContent = String(Math.round(value * 100));
    let current = headings[0]?.id;
    for (const heading of headings) { if (heading.getBoundingClientRect().top <= offset + 5) current = heading.id; else break; }
    for (const link of tocLinks) {
      if (decodeURIComponent(link.hash.slice(1)) === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  const scheduleReading = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateReading); } };
  window.addEventListener('scroll', scheduleReading, { passive: true });
  window.addEventListener('resize', scheduleReading, { passive: true });
  new ResizeObserver(scheduleReading).observe(article);
  updateReading();
}
document.querySelectorAll<HTMLAnchorElement>('.mobile-toc a').forEach(link => link.addEventListener('click', () => {
  // Close first, then resolve the hash against the final layout.
  const toc = link.closest('details');
  if (toc) toc.open = false;
}));
