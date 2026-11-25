const site = window.siteData;

const $ = (selector) => document.querySelector(selector);
const categories = site.categories;
let selected = categories[0];
let attachment = null;
let attachmentURL = null;

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }

function renderFilters(active='all') {
  const filters = [{id:'all',category:'Все направления'},...categories];
  $('#filters').innerHTML = filters.map(item => `<button class="filter" type="button" data-filter="${item.id}" aria-pressed="${item.id===active}">${escapeHtml(item.category)}</button>`).join('');
  $('#filters').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { renderFilters(button.dataset.filter); renderCatalog(button.dataset.filter); }));
}

function renderCatalog(active='all') {
  const items = active === 'all' ? categories : categories.filter(item => item.id === active);
  $('#catalog-grid').innerHTML = items.map(item => `<article class="card"><div class="card-visual"><img src="${item.image}" alt="${escapeHtml(item.alt)}"></div><div class="card-body"><p class="card-category">${escapeHtml(item.category)}</p><h3>${escapeHtml(item.title)}</h3><p class="card-description">${escapeHtml(item.description)}</p><button type="button" data-select="${item.id}">Рассчитать похожую отделку</button></div></article>`).join('');
  $('#catalog-grid').querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => choose(button.dataset.select)));
}

function choose(id, scroll=true) {
  selected = categories.find(item => item.id === id) || categories[0];
  $('#selected-image').src = selected.image;
  $('#selected-image').alt = selected.alt;
  $('#selected-title').textContent = selected.title;
  $('#selected-description').textContent = selected.description;
  $('#result').hidden = true;
  if (scroll) {
    $('#request').scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(() => $('#request-form').elements.room.focus({preventScroll:true}), 450);
  }
}

function updateMeasure() {
  const mode = $('#request-form').elements.measureMode.value;
  $('#measure-entry').hidden = mode === 'unknown';
  $('#area-label').hidden = mode !== 'area';
  $('#dimension-inputs').hidden = mode !== 'dimensions';
}

function clearAttachment() {
  if (attachmentURL) URL.revokeObjectURL(attachmentURL);
  attachmentURL = null; attachment = null; $('#file-input').value = ''; $('#file-preview').hidden = true; $('#file-preview').innerHTML = '';
}

$('#file-input').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (attachmentURL) URL.revokeObjectURL(attachmentURL);
  attachmentURL = null; attachment = null; $('#file-preview').hidden = true;
  if (!file) return;
  if (!site.settings.allowedFileTypes.includes(file.type) || file.size > site.settings.fileMaxMb*1024*1024) {
    event.target.value=''; $('#form-error').textContent = 'Выберите JPG, PNG, WEBP или PDF размером до 10 МБ.'; $('#form-error').hidden = false; return;
  }
  attachment = file;
  if (file.type.startsWith('image/')) attachmentURL = URL.createObjectURL(file);
  $('#file-preview').innerHTML = `${attachmentURL ? `<img src="${attachmentURL}" alt="Предпросмотр прикреплённого изображения">` : '<span>PDF</span>'}<span>${escapeHtml(file.name)}</span><button type="button" aria-label="Удалить файл">Удалить</button>`;
  $('#file-preview button').addEventListener('click', clearAttachment);
  $('#file-preview').hidden = false; $('#form-error').hidden = true;
});

$('#request-form').querySelectorAll('[name=measureMode]').forEach(input => input.addEventListener('change', updateMeasure));
$('#change-selection').addEventListener('click', () => $('#catalog').scrollIntoView({behavior:'smooth'}));
$('#fill-example').addEventListener('click', () => {
  const f = $('#request-form').elements;
  f.room.value='Гостиная'; f.surface.value='Стены'; f.measureMode.value='area'; f.area.value='около 18'; f.comment.value=`Понравилось направление «${selected.title}». Хотелось бы обсудить его для стены у дивана.`; f.contactMethod.value='Telegram'; f.contact.value='@primer_klienta';
  updateMeasure(); $('#form-error').hidden=true;
});

$('#request-form').addEventListener('submit', event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  if (!f.room.value || !f.surface.value) {
    $('#form-error').textContent='Выберите тип помещения и поверхность, которую планируете оформить.';
    $('#form-error').hidden=false;
    (!f.room.value ? f.room : f.surface).focus();
    return;
  }
  $('#form-error').hidden=true;
  const mode=f.measureMode.value;
  const measure=mode==='unknown' ? 'Пока не известно' : mode==='area' ? (f.area.value.trim() ? `${f.area.value.trim()} м² (со слов клиента)` : 'Не указана') : ((f.width.value.trim() || f.height.value.trim()) ? `Ширина: ${f.width.value.trim() || 'не указана'} м; высота: ${f.height.value.trim() || 'не указана'} м` : 'Не указаны');
  const row=(label,value)=>`<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`;
  $('#result-content').innerHTML=`<div class="result-sheet"><img src="${selected.image}" alt="${escapeHtml(selected.alt)}"><div class="result-data"><h3>${escapeHtml(selected.title)}</h3><dl>${row('Направление',selected.category)}${row('Тип помещения',f.room.value)}${row('Поверхность',f.surface.value)}${row('Размеры или площадь',measure)}${row('Пожелания',f.comment.value.trim() || 'Не указаны')}${row('Способ связи',f.contactMethod.value)}${row('Контакт',f.contact.value.trim() || 'Не указан')}${row('Материалы',attachment ? attachment.name : 'Не приложены')}</dl>${attachmentURL ? `<div class="result-file"><img src="${attachmentURL}" alt="Прикреплённое изображение помещения"></div>` : ''}<p class="image-note">Оформление показано как визуализация. Данные и файл остаются в этом браузере.</p></div></div>`;
  $('#result').hidden=false;
  $('#result').scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(() => $('#result-title').setAttribute('tabindex','-1'), 0);
  setTimeout(() => $('#result-title').focus({preventScroll:true}), 450);
});

$('#edit-request').addEventListener('click', () => {$('#request').scrollIntoView({behavior:'smooth'});setTimeout(() => $('#request-form').elements.room.focus({preventScroll:true}),450)});
$('#new-request').addEventListener('click', () => {$('#request-form').reset();clearAttachment();updateMeasure();choose(categories[0].id);});
renderFilters(); renderCatalog(); updateMeasure(); choose(categories[0].id, false);
