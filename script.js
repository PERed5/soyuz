// ============================================================
//  API FETCH — Start
// ============================================================
const SOYUZ_SERVER = '185.97.255.17:1215';
const API_URL = `http://${SOYUZ_SERVER}/status`;
const REFRESH_INTERVAL = 10000;

const playersCount = document.getElementById('players-current');
const serverStatus = document.getElementById('server-status');
const serverRound = document.getElementById('server-round');
const serverMap = document.getElementById('server-map');
const serverIp = document.getElementById('server-ip');
const serverPreset = document.getElementById('server-preset');
const lobbyStatus = document.getElementById('lobby-status');

function getLobbyStatusText(runLevel) {
    if (runLevel === 0) {
        return 'Лобби';
    } else if (runLevel === 1) {
        return 'Раунд идёт';
    } else if (runLevel === 2) {
        return 'Манифест после раунда';
    } else {
        return '—';
    }
}

async function fetchServerStatus() {
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(API_URL)}`;
        const response = await fetch(proxyUrl, { method: 'GET' });

        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (!data.contents)
            throw new Error('Нет полученной информации от прокси');

        const serverData = JSON.parse(data.contents);

        playersCount.textContent = `${serverData.players} из ${serverData.soft_max_players}` || '—';
        serverRound.textContent = serverData.round_id || '—';
        serverMap.textContent = serverData.map || '—';
        serverPreset.textContent = serverData.preset || '—';
        serverIp.textContent = SOYUZ_SERVER;
        lobbyStatus.textContent = getLobbyStatusText(serverData.run_level);
        serverStatus.textContent = 'Онлайн';
        serverStatus.style.color = '#03da39';

    } catch (error) {
        console.error('Ошибка запроса:', error);
        updateOfflineState();
    }
}

function updateOfflineState() {
    playersCount.textContent = '—';
    serverRound.textContent = '—';
    serverMap.textContent = '—';
    serverPreset.textContent = '—';
    serverIp.textContent = SOYUZ_SERVER;
    lobbyStatus.textContent = '—';
    serverStatus.textContent = 'Недоступен';
    serverStatus.style.color = '#eb2e51';
}
// ============================================================
//  API FETCH — End
// ============================================================


// ============================================================
//  СОВЕТСКИЙ КРЕДИТ: МАГАЗИН И ТОП — Start
//  Данные берутся с игрового сервера из публичного API (только чтение, без токена):
//    GET /soyuz/credits/public/shop   каталог магазина
//    GET /soyuz/credits/public/top    топ по балансу, топ часов за неделю, призёры прошлой недели
//  На сервере должен быть включён CVar soyuz.credits.public_api. При аварийной заморозке (soyuz.credits.frozen)
//  сервер отвечает 503, и сайт показывает, что магазин временно недоступен.
//  Как и статус сервера, запросы идут через прокси allorigins (сервер отдаёт данные по http, а сайт может быть по https).
//  Если у сервера появится https, поставьте CREDITS_USE_PROXY = false: тогда запросы пойдут напрямую
//  (в CVar soyuz.credits.public_api_origin тогда укажите адрес сайта).
// ============================================================
const CREDITS_API = `http://${SOYUZ_SERVER}/soyuz/credits/public`;
const CREDITS_USE_PROXY = true;
const CREDITS_REFRESH_INTERVAL = 60000;

const creditsState = { products: [], categories: [], category: '', query: '', sort: 'price-asc' };

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

function formatCreditsDate(iso) {
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCreditsDateTime(iso) {
    return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

/** Возвращает { ok, data } или { ok: false, frozen } при заморозке и { ok: false } при недоступности. */
async function fetchCredits(path) {
    try {
        const url = `${CREDITS_API}/${path}`;
        let status = 200;
        let body;

        if (CREDITS_USE_PROXY) {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            const wrapper = await response.json();
            status = wrapper.status?.http_code ?? 200;
            body = wrapper.contents;
        } else {
            const response = await fetch(url);
            status = response.status;
            body = await response.text();
        }

        let data = null;
        try {
            data = JSON.parse(body);
        } catch (e) {
            data = null;
        }

        if (data?.error === 'frozen')
            return { ok: false, frozen: true };
        if (status !== 200 || !data || data.error)
            return { ok: false };

        return { ok: true, data };
    } catch (error) {
        console.error('Ошибка запроса Советского кредита:', error);
        return { ok: false };
    }
}

function creditsUnavailableText(result) {
    return result.frozen
        ? 'Советский кредит временно недоступен. Загляните позже.'
        : 'Не удалось загрузить данные. Попробуйте обновить страницу позже.';
}

// ---------- Магазин ----------

function productTags(p) {
    const tags = [];
    tags.push(p.permanent ? 'Навсегда' : `Срок: ${p.durationDays} дн.`);
    if (p.discountPercent > 0)
        tags.push(`<span class="credits-tag sale">Скидка ${p.discountPercent}%</span>`);
    if (p.stockLeft >= 0)
        tags.push(`<span class="credits-tag ${p.stockLeft === 0 ? 'warn' : ''}">${p.stockLeft === 0 ? 'Распродано' : `Осталось: ${p.stockLeft} шт.`}</span>`);
    if (p.minPlaytimeHours)
        tags.push(`<span class="credits-tag warn">Нужно наиграть ${p.minPlaytimeHours} ч.</span>`);
    if (p.availableUntil)
        tags.push(`<span class="credits-tag warn">Продаётся до ${formatCreditsDate(p.availableUntil)}</span>`);

    // Первые два тега (срок) без отдельного класса оборачиваем так же, как остальные.
    return tags.map(t => t.startsWith('<span') ? t : `<span class="credits-tag">${esc(t)}</span>`).join('');
}

function renderShop() {
    const list = document.getElementById('credits-shop-list');
    const note = document.getElementById('credits-shop-note');
    if (!list)
        return;

    const query = creditsState.query.trim().toLowerCase();
    let items = creditsState.products.filter(p =>
        (!creditsState.category
            || (creditsState.category === '__none' ? !p.category : p.category === creditsState.category))
        && (!query || p.name.toLowerCase().includes(query)));

    if (creditsState.sort === 'price-desc')
        items.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, 'ru'));
    else if (creditsState.sort === 'name')
        items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    else
        items.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'ru'));

    list.innerHTML = items.map(p => `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card credits-product">
                <div class="card-body p-4">
                    <h5 class="card-title">${esc(p.name)}</h5>
                    <p class="credits-desc">${esc(p.description || '')}</p>
                    <div class="credits-tags">${productTags(p)}</div>
                    <div class="credits-price">${p.price} кр.${p.discountPercent > 0 ? `<span class="old">${p.originalPrice} кр.</span>` : ''}</div>
                </div>
            </div>
        </div>`).join('');

    note.textContent = items.length === 0
        ? 'Ничего не найдено.'
        : 'Покупка и надевание — в игре: консольная команда sovcredits.';
}

function renderCategories() {
    const box = document.getElementById('credits-categories');
    if (!box)
        return;

    // Показываем только категории, в которых есть товары.
    const used = new Set(creditsState.products.map(p => p.category));
    const chips = [{ id: '', name: 'Все категории' }]
        .concat(creditsState.categories.filter(c => used.has(c.id)));
    if (creditsState.products.some(p => !p.category))
        chips.push({ id: '__none', name: 'Без категории' });

    box.innerHTML = chips.map(c =>
        `<button type="button" class="credits-chip ${creditsState.category === c.id ? 'active' : ''}" data-category="${esc(c.id)}">${esc(c.name)}</button>`
    ).join('');
}

async function loadCreditsShop() {
    const result = await fetchCredits('shop');
    const note = document.getElementById('credits-shop-note');
    const list = document.getElementById('credits-shop-list');

    if (!result.ok) {
        if (creditsState.products.length === 0 && list) {
            list.innerHTML = '';
            note.textContent = creditsUnavailableText(result);
        }
        return;
    }

    creditsState.products = result.data.products || [];
    creditsState.categories = result.data.categories || [];
    renderCategories();
    renderShop();
}

// ---------- Топ ----------

function rankList(title, rows, scoreFn, emptyText) {
    const body = rows.length === 0
        ? `<p class="credits-muted mb-0">${esc(emptyText)}</p>`
        : rows.map((r, i) => `
            <div class="credits-rank">
                <span class="place">${i + 1}.</span>
                <span class="who">${esc(r.username)}</span>
                <span class="score">${esc(scoreFn(r))}</span>
            </div>`).join('');

    return `
        <div class="col-12 col-lg-4">
            <div class="card p-4 h-100">
                <h5 class="card-title mb-3">${esc(title)}</h5>
                ${body}
            </div>
        </div>`;
}

async function loadCreditsTop() {
    const result = await fetchCredits('top');
    const container = document.getElementById('credits-top-lists');
    const note = document.getElementById('credits-week-note');
    if (!container)
        return;

    if (!result.ok) {
        if (!container.innerHTML) {
            note.textContent = creditsUnavailableText(result);
        }
        return;
    }

    const d = result.data;
    const medals = ['🥇', '🥈', '🥉'];
    const prizes = (d.prizes || []).map((p, i) => p > 0 ? `${medals[i]} ${p} кр.` : null).filter(Boolean).join(' · ');
    note.textContent = `Неделя идёт до ${formatCreditsDateTime(d.weekEnd)}. Призы за время игры: ${prizes || '—'}`;

    const winners = (d.lastWeekWinners || []).map(w => ({ username: w.username, hours: w.hours, amount: w.amount, place: w.place }));

    container.innerHTML =
        rankList('Богатейшие', d.balances || [], r => `${r.balance} кр.`, 'Пока никого.')
        + rankList('Больше всех играли на этой неделе', d.weekly || [], r => `${r.hours} ч.`, 'Пока никого: нужно наиграть хотя бы час.')
        + rankList('Призёры прошлой недели', winners.map(w => ({ username: `${medals[w.place - 1] || ''} ${w.username}`, hours: w.hours, amount: w.amount })),
            r => `${r.hours} ч. · ${r.amount} кр.`, 'Призёров не было.');
}

function initCredits() {
    const section = document.getElementById('credits-section');
    if (!section)
        return;

    document.getElementById('credits-search').addEventListener('input', e => {
        creditsState.query = e.target.value;
        renderShop();
    });
    document.getElementById('credits-sort').addEventListener('change', e => {
        creditsState.sort = e.target.value;
        renderShop();
    });
    document.getElementById('credits-categories').addEventListener('click', e => {
        const chip = e.target.closest('[data-category]');
        if (!chip)
            return;

        creditsState.category = chip.dataset.category;
        renderCategories();
        renderShop();
    });

    const refresh = () => {
        loadCreditsShop();
        loadCreditsTop();
    };

    refresh();
    setInterval(refresh, CREDITS_REFRESH_INTERVAL);
}
// ============================================================
//  СОВЕТСКИЙ КРЕДИТ: МАГАЗИН И ТОП — End
// ============================================================


// ============================================================
//  DECREES — Start
//  Указы подгружаются из ./decrees.json
//  Формат объекта:
//    {
//      "title": "Название указа",
//      "description": "Описание (можно HTML)",
//      "status": "active" | "removed",
//      "animation": "fade-left" | "fade-right" | "fade-up",
//      "col": "col-lg-6" | "col-12"
//    }
// ============================================================
async function loadDecrees() {
    const container = document.getElementById('decrees-container');
    if (!container) return;

    try {
        const res = await fetch('./decrees.json?v=' + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const decrees = await res.json();
        if (!Array.isArray(decrees)) throw new Error('decrees.json должен быть массивом');

        container.innerHTML = '';

        decrees.forEach((d, i) => {
            const isRemoved = d.status === 'removed';

            // Иконка: если задана — добавляем <i class="...">, иначе пустая строка
            const iconHtml = d.icon
                ? `<i class="${d.icon}"></i> `
                : '';

            const col = document.createElement('div');
            col.className =
                `${d.col || 'col-lg-6'} aos-init aos-animate ${isRemoved ? 'removed' : ''}`.trim();
            col.setAttribute('data-aos', d.animation || 'fade-up');
            col.setAttribute('data-aos-delay', String(200 + i * 50));

            col.innerHTML = `
                <div class="card p-4 animate__animated animate__zoomIn">
                    <h5 class="card-title">${iconHtml}${d.title ?? ''}</h5>
                    <p class="card-text">${d.description ?? ''}</p>
                </div>
            `;
            container.appendChild(col);
        });

        if (window.AOS) AOS.refresh();

    } catch (e) {
        console.error('Не удалось загрузить указы:', e);
        container.innerHTML = `
            <div class="col-12">
                <div class="card p-4">
                    <p class="text-danger mb-0">Не удалось загрузить список указов.</p>
                </div>
            </div>`;
    }
}
// ============================================================
//  DECREES — End
// ============================================================


// ============================================================
//  FOOTER — Start
// ============================================================
function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

async function updateFooter() {
    const footer = document.querySelector('footer.footer');
    if (!footer) return;

    const today = new Date();

    const files = [
        { type: 'HTML', url: window.location.href },
        { type: 'CSS',  url: 'style.css' },
        { type: 'JS',   url: 'script.js' }
    ];

    const results = {};

    for (const file of files) {
        try {
            const response = await fetch(file.url, {
                method: 'HEAD',
                cache: 'no-cache'
            });

            const lastModified = response.headers.get('Last-Modified');

            if (lastModified) {
                const date = new Date(lastModified);
                results[file.type] = formatDate(date);
            } else {
                results[file.type] = formatDate(today);
            }
        } catch (err) {
            console.warn(`Не удалось получить дату для ${file.type}:`, err);
            results[file.type] = formatDate(today);
        }
    }

    const htmlDate = results.HTML || formatDate(today);
    const cssDate  = results.CSS  || formatDate(today);
    const jsDate   = results.JS   || formatDate(today);

    footer.textContent = `HTML: ${htmlDate} | CSS: ${cssDate} | JS: ${jsDate} © botcott & PERed`;
}
// ============================================================
//  FOOTER — End
// ============================================================


// ============================================================
//  INIT — DOMContentLoaded
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    AOS.init({
        duration: 1000,
        once: true
    });

    // ---- Звёзды ----
    const container = document.getElementById('stars-container');

    for (let i = 0; i < 250; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        const size = Math.random() * 3 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = 2 + Math.random() * 6;
        const opacity = 0.2 + Math.random() * 0.6;

        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = x + '%';
        star.style.top = y + '%';
        star.style.setProperty('--duration', duration + 's');
        star.style.setProperty('--opacity', opacity);

        container.appendChild(star);
    }

    for (let i = 0; i < 80; i++) {
        const star = document.createElement('div');
        star.className = 'falling-star falling-star-fast';

        const x = Math.random() * 100;
        const delay = Math.random() * 8;
        const drift = (Math.random() - 0.5) * 60;

        star.style.left = x + '%';
        star.style.animationDelay = delay + 's';
        star.style.setProperty('--drift', drift + 'px');
        star.style.setProperty('--base-opacity', 0.8 + Math.random() * 0.2);

        container.appendChild(star);
    }

    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'falling-star falling-star-medium';

        const x = Math.random() * 100;
        const delay = Math.random() * 12;
        const drift = (Math.random() - 0.5) * 40;

        star.style.left = x + '%';
        star.style.animationDelay = delay + 's';
        star.style.setProperty('--drift', drift + 'px');
        star.style.setProperty('--base-opacity', 0.6 + Math.random() * 0.3);

        container.appendChild(star);
    }

    for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.className = 'falling-star falling-star-slow';

        const x = Math.random() * 100;
        const delay = Math.random() * 18;
        const drift = (Math.random() - 0.5) * 30;

        star.style.left = x + '%';
        star.style.animationDelay = delay + 's';
        star.style.setProperty('--drift', drift + 'px');
        star.style.setProperty('--base-opacity', 0.4 + Math.random() * 0.3);

        container.appendChild(star);
    }

    // ---- Запуск ----
    initCredits();
    fetchServerStatus();
    updateFooter();
    loadDecrees();
    setInterval(fetchServerStatus, REFRESH_INTERVAL);
});