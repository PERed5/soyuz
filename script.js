// API FETCH-Start
const SERVER_IP = '185.97.255.17:1215';
const API_URL = `http://${SERVER_IP}/status`;
const REFRESH_INTERVAL = 5000;

const playersCount = document.getElementById('players-current');
const serverStatus = document.getElementById('server-status');
const serverRound = document.getElementById('server-round');
const serverMap = document.getElementById('server-map');
const serverIp = document.getElementById('server-ip');
const serverPreset = document.getElementById('server-preset');

async function fetchServerStatus() {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(API_URL)}`;
    const response = await fetch(proxyUrl, {
      method: 'GET'
    });

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
    serverIp.textContent = SERVER_IP;
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
  serverIp.textContent = SERVER_IP;
  serverStatus.textContent = 'Недоступен';
  serverStatus.style.color = '#eb2e51';
}
// API FETCH-End

// FOOTER-Start
async function updateFooter() {
    const footer = document.querySelector('footer.footer');

    const files = [];

    files.push({ type: 'HTML', url: window.location.href });

    document.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
        files.push({ type: 'CSS', url: link.href });
    });

    document.querySelectorAll('script[src]').forEach(script => {
        files.push({ type: 'JS', url: script.src });
    });

    const results = {};

    for (const file of files) {
        try {
            const response = await fetch(file.url, { method: 'HEAD' });
            const lastModified = response.headers.get('Last-Modified');

            if (lastModified) {
                const date = new Date(lastModified);
                const formatted = date.toLocaleDateString('ru-RU');
                results[file.type] = formatted;
            } else {
                results[file.type] = 'н/д';
            }
        } catch (err) {
            results[file.type] = 'ошибка';
        }
    }

    const htmlDate = results.HTML || 'н/д';
    const cssDate = results.CSS || 'н/д';
    const jsDate = results.JS || 'н/д';

    footer.textContent = `HTML: ${htmlDate} | CSS: ${cssDate} | JS: ${jsDate} © botcott`
}
// FOOTER-End

document.addEventListener('DOMContentLoaded', () => {
    AOS.init({
        duration: 1000,
        once: true
    });

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

    fetchServerStatus();
    updateFooter();
    setInterval(fetchServerStatus, REFRESH_INTERVAL);
});