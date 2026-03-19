// script.js
import { auth } from './auth.js';
import { loadUserFavorites, addFavorite, removeFavorite } from './api.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentLang = localStorage.getItem('gamepulse_lang') || 'ru';
let currentTheme = localStorage.getItem('gamepulse_theme') || 'dark';
let favorites = [];
let pcFilterActive = false;

let userPC = {
    cpu: localStorage.getItem('userCPU') || '',
    gpu: localStorage.getItem('userGPU') || '',
    ram: parseInt(localStorage.getItem('userRAM')) || 0
};

function saveUserPC() {
    localStorage.setItem('userCPU', userPC.cpu);
    localStorage.setItem('userGPU', userPC.gpu);
    localStorage.setItem('userRAM', userPC.ram);
}

const homeSection = document.getElementById('homeSection');
const gamesSection = document.getElementById('gamesSection');
const favoritesSection = document.getElementById('favoritesSection');
const settingsSection = document.getElementById('settingsSection');
const profileSection = document.getElementById('profileSection');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const suggestionsDiv = document.getElementById('suggestions');

window.showHome = function() {
    homeSection.classList.remove('hidden');
    gamesSection.classList.add('hidden');
    favoritesSection.classList.add('hidden');
    settingsSection.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    updateLanguage();
};

window.showGames = function() {
    homeSection.classList.add('hidden');
    gamesSection.classList.remove('hidden');
    favoritesSection.classList.add('hidden');
    settingsSection.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    renderAllGalleries();
    updateLanguage();
};

window.showFavorites = function() {
    homeSection.classList.add('hidden');
    gamesSection.classList.add('hidden');
    favoritesSection.classList.remove('hidden');
    settingsSection.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    renderFavorites();
    updateLanguage();
};

window.showSettings = function() {
    homeSection.classList.add('hidden');
    gamesSection.classList.add('hidden');
    favoritesSection.classList.add('hidden');
    settingsSection.classList.remove('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    updateLanguage();
    document.getElementById('pcCPU').value = userPC.cpu;
    document.getElementById('pcGPU').value = userPC.gpu;
    document.getElementById('pcRAM').value = userPC.ram;
};

function setTheme(theme) {
    document.body.className = theme;
    localStorage.setItem('gamepulse_theme', theme);
    currentTheme = theme;
    if (window.particleSystem) window.particleSystem.updateColor();
}
window.setTheme = setTheme;
setTheme(currentTheme);

function setLanguage(langCode) {
    currentLang = langCode;
    localStorage.setItem('gamepulse_lang', langCode);
    updateLanguage();
}
window.setLanguage = setLanguage;

function updateLanguage() {
    const l = lang[currentLang];
    for (let key in l) {
        const el = document.getElementById(key);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') {
                el.placeholder = l[key];
            } else {
                el.innerText = l[key];
            }
        }
    }
    document.getElementById('langLabel').innerText = l.langLabel || 'Язык / Language';
}

window.randomGame = function() {
    const gameKeys = Object.keys(games);
    if (gameKeys.length === 0) return;
    const randomKey = gameKeys[Math.floor(Math.random() * gameKeys.length)];
    window.location.href = `game.html?id=${randomKey}`;
};

function renderGallery(containerId, gameIds) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    gameIds.forEach(id => {
        const game = games[id];
        if (!game) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-game', id);
        card.onclick = (e) => {
            if (e.target.classList.contains('favorite-star')) return;
            window.location.href = `game.html?id=${id}`;
        };
        
        const star = document.createElement('div');
        star.className = 'favorite-star' + (favorites.includes(id) ? ' active' : '');
        star.innerHTML = '★';
        star.onclick = (e) => {
            e.stopPropagation();
            toggleFavorite(id, star);
        };
        card.appendChild(star);
        
        if (game.playtime_main && game.playtime_completion) {
            const playtimeDiv = document.createElement('div');
            playtimeDiv.className = 'card-playtime';
            playtimeDiv.innerHTML = `⏱️ ${game.playtime_main} / ${game.playtime_completion} ч`;
            card.appendChild(playtimeDiv);
        }
        
        container.appendChild(card);
    });
}

window.renderAllGalleries = function() {
    const allSections = {
        popularGallery: ['rdr2', 'cyberpunk', 'daysgone', 'gta5', 'ghost', 'witcher3', 'dyinglight2', 'ark'],
        assassinsGallery: ['ac1', 'ac2', 'acb', 'acr', 'ac3', 'ac4', 'acu', 'acs', 'aco', 'acod', 'acval'],
        farcryGallery: ['fc1', 'fc2', 'fc3', 'fc4', 'fc5', 'fcnd', 'fcprimal', 'fc6'],
        godofwarGallery: ['gow2018', 'gowrag'],
        hitmanGallery: ['hitman2', 'hitman3'],
        battlefieldGallery: ['bf3', 'bf4', 'bf1', 'bfv', 'bf2042', 'bf6'],
        forzaGallery: ['fh3', 'fh4', 'fh5'],
        simulatorsGallery: ['assettocorsa', 'accomp', 'ets2']
    };

    for (let galleryId in allSections) {
        let ids = allSections[galleryId];
        if (pcFilterActive) {
            const { totalScore } = evaluateSystem();
            ids = ids.filter(id => {
                const g = games[id];
                return g && g.power_rank <= totalScore;
            });
        }
        renderGallery(galleryId, ids);
    }

    // Показываем/скрываем секции если все игры отфильтрованы
    if (pcFilterActive) {
        const sectionMap = {
            popularGallery: 'popular', assassinsGallery: 'assassins',
            farcryGallery: 'farcry', godofwarGallery: 'godofwar',
            hitmanGallery: 'hitman', battlefieldGallery: 'battlefield',
            forzaGallery: 'forza', simulatorsGallery: 'simulators'
        };
        for (let galleryId in sectionMap) {
            const section = document.getElementById(sectionMap[galleryId]);
            const gallery = document.getElementById(galleryId);
            if (section) section.style.display = gallery && gallery.children.length > 0 ? '' : 'none';
        }
        // Показываем сообщение если вообще ничего нет
        let total = 0;
        for (let galleryId in allSections) {
            const g = document.getElementById(galleryId);
            if (g) total += g.children.length;
        }
        const noGames = document.getElementById('pcFilterEmpty');
        if (noGames) noGames.style.display = total === 0 ? 'block' : 'none';
    } else {
        // Восстанавливаем все секции
        ['popular','assassins','farcry','godofwar','hitman','battlefield','forza','simulators'].forEach(id => {
            const s = document.getElementById(id);
            if (s) s.style.display = '';
        });
        const noGames = document.getElementById('pcFilterEmpty');
        if (noGames) noGames.style.display = 'none';
    }
};

window.renderFavorites = function() {
    const gallery = document.getElementById('favoritesGallery');
    const empty = document.getElementById('favoritesEmpty');
    if (favorites.length === 0) {
        gallery.innerHTML = '';
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        renderGallery('favoritesGallery', favorites);
    }
};

window.renderProfileFavorites = function() {
    const gallery = document.getElementById('profileFavoritesGallery');
    const empty = document.getElementById('profileFavoritesEmpty');
    if (!gallery) return;
    if (favorites.length === 0) {
        gallery.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
    } else {
        if (empty) empty.classList.add('hidden');
        gallery.innerHTML = '';
        favorites.forEach(id => {
            const game = games[id];
            if (!game) return;
            const card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('data-game', id);
            card.onclick = (e) => {
                if (e.target.classList.contains('favorite-star')) return;
                window.location.href = `game.html?id=${id}`;
            };
            
            const star = document.createElement('div');
            star.className = 'favorite-star active';
            star.innerHTML = '★';
            star.onclick = (e) => {
                e.stopPropagation();
                toggleFavorite(id, star);
            };
            card.appendChild(star);
            
            if (game.playtime_main && game.playtime_completion) {
                const playtimeDiv = document.createElement('div');
                playtimeDiv.className = 'card-playtime';
                playtimeDiv.innerHTML = `⏱️ ${game.playtime_main} / ${game.playtime_completion} ч`;
                card.appendChild(playtimeDiv);
            }
            
            gallery.appendChild(card);
        });
    }
};

window.toggleFavorite = async function(gameId, starElement) {
    const user = auth.currentUser;
    if (!user) {
        alert('Чтобы добавить в избранное, войдите в профиль');
        return;
    }
    
    const index = favorites.indexOf(gameId);
    const wasActive = index !== -1;
    
    if (wasActive) {
        starElement.classList.remove('active');
        favorites.splice(index, 1);
    } else {
        starElement.classList.add('active');
        favorites.push(gameId);
    }
    
    if (!gamesSection.classList.contains('hidden')) renderAllGalleries();
    if (!favoritesSection.classList.contains('hidden')) renderFavorites();
    if (!profileSection.classList.contains('hidden')) renderProfileFavorites();
    
    const favCountEl = document.getElementById('profileFavoritesCount');
    if (favCountEl) favCountEl.textContent = favorites.length;
    
    try {
        if (wasActive) {
            await removeFavorite(gameId);
        } else {
            await addFavorite(gameId);
        }
    } catch (error) {
        console.error('Ошибка при обновлении избранного в Firestore:', error);
        if (wasActive) {
            favorites.push(gameId);
            starElement.classList.add('active');
        } else {
            const idx = favorites.indexOf(gameId);
            if (idx !== -1) favorites.splice(idx, 1);
            starElement.classList.remove('active');
        }
        if (!gamesSection.classList.contains('hidden')) renderAllGalleries();
        if (!favoritesSection.classList.contains('hidden')) renderFavorites();
        if (!profileSection.classList.contains('hidden')) renderProfileFavorites();
        if (favCountEl) favCountEl.textContent = favorites.length;
        alert('Ошибка соединения, попробуйте снова');
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        favorites = await loadUserFavorites();
    } else {
        favorites = [];
    }
    renderAllGalleries();
    renderFavorites();
    renderProfileFavorites();
    const favCountEl = document.getElementById('profileFavoritesCount');
    if (favCountEl) favCountEl.textContent = favorites.length;
});

// Функция оценки системы (без изменений)
function evaluateSystem() {
    const cpu = userPC.cpu.toLowerCase();
    const gpu = userPC.gpu.toLowerCase();
    const ram = userPC.ram;

    let cpuScore = 0;
    if (cpu.includes('i9') || cpu.includes('ryzen 9') || cpu.includes('9950x') || cpu.includes('7950x') || cpu.includes('13900k') || cpu.includes('14900k') || cpu.includes('ultra 9')) {
        cpuScore = 4;
    } else if (cpu.includes('i7') || cpu.includes('ryzen 7') || cpu.includes('9700x') || cpu.includes('7700x') || cpu.includes('13700k') || cpu.includes('14700k') || cpu.includes('7800x3d') || cpu.includes('9800x3d') || cpu.includes('ultra 7')) {
        cpuScore = 3;
    } else if (cpu.includes('i5') || cpu.includes('ryzen 5') || cpu.includes('9600x') || cpu.includes('7600x') || cpu.includes('13600k') || cpu.includes('14600k') || cpu.includes('ultra 5')) {
        cpuScore = 2;
    } else if (cpu.includes('i3') || cpu.includes('ryzen 3')) {
        cpuScore = 1;
    } else {
        cpuScore = 1;
    }

    let gpuScore = 0;
    if (gpu.includes('rtx 50') || gpu.includes('rtx50') || gpu.includes('rx 9000') || gpu.includes('rx9000')) {
        gpuScore = 4;
    } else if (gpu.includes('rtx 40') || gpu.includes('rtx40') || gpu.includes('rx 7000') || gpu.includes('rx7000')) {
        gpuScore = 4;
    } else if (gpu.includes('rtx 30') || gpu.includes('rtx30') || gpu.includes('rx 6000') || gpu.includes('rx6000')) {
        gpuScore = 3;
    } else if (gpu.includes('rtx 20') || gpu.includes('rtx20') || gpu.includes('gtx 16') || gpu.includes('gtx16') || gpu.includes('rx 5000') || gpu.includes('rx5000')) {
        gpuScore = 2;
    } else if (gpu.includes('gtx 10') || gpu.includes('gtx10') || gpu.includes('gtx 900') || gpu.includes('gtx900') || gpu.includes('rx 400') || gpu.includes('rx400') || gpu.includes('rx 500') || gpu.includes('rx500')) {
        gpuScore = 1;
    } else {
        gpuScore = 1;
    }

    let ramScore = 0;
    if (ram >= 32) ramScore = 4;
    else if (ram >= 16) ramScore = 3;
    else if (ram >= 8) ramScore = 2;
    else if (ram >= 4) ramScore = 1;
    else ramScore = 0;

    const totalScore = cpuScore + gpuScore + ramScore;
    return { cpuScore, gpuScore, ramScore, totalScore };
}

// Гейм-доктор (без изменений)
function getDoctorVerdict(gameId) {
    const game = games[gameId];
    if (!game) return '';

    const { cpuScore, gpuScore, totalScore } = evaluateSystem();

    let verdictLines = [];

    if (!userPC.cpu && !userPC.gpu && !userPC.ram) {
        verdictLines.push(currentLang === 'ru' 
            ? '⚠️ Заполните данные о своём ПК в настройках, чтобы получить персональный анализ.' 
            : '⚠️ Fill in your PC data in settings to get a personal analysis.');
    } else {
        const required = game.power_rank;

        if (totalScore >= required + 3) {
            verdictLines.push(currentLang === 'ru' 
                ? '✅ Ваша система значительно мощнее требований. Игра пойдёт на ультра-настройках с высоким FPS.' 
                : '✅ Your system is significantly more powerful than required. The game will run on ultra settings with high FPS.');
        } else if (totalScore >= required) {
            verdictLines.push(currentLang === 'ru' 
                ? '👍 Ваша система соответствует рекомендуемым требованиям. Игра будет работать отлично.' 
                : '👍 Your system meets the recommended requirements. The game will run great.');
        } else if (totalScore >= required - 2) {
            verdictLines.push(currentLang === 'ru' 
                ? '⚠️ Ваша система близка к минимальным требованиям. Возможно, придётся снизить настройки.' 
                : '⚠️ Your system is close to the minimum requirements. You may need to lower settings.');
        } else {
            verdictLines.push(currentLang === 'ru' 
                ? '❌ Ваша система слабее минимальных требований. Игра может не запуститься или работать с сильными тормозами.' 
                : '❌ Your system is below the minimum requirements. The game may not run or will run with severe slowdowns.');
        }

        if (game.rtx_supported && userPC.gpu.toLowerCase().includes('rtx')) {
            verdictLines.push(currentLang === 'ru'
                ? '✨ Ваша видеокарта поддерживает трассировку лучей – вы сможете включить RTX.'
                : '✨ Your graphics card supports ray tracing – you can enable RTX.');
        } else if (game.rtx_supported && !userPC.gpu.toLowerCase().includes('rtx') && (userPC.gpu.toLowerCase().includes('gtx') || userPC.gpu.toLowerCase().includes('radeon'))) {
            verdictLines.push(currentLang === 'ru'
                ? '⚠️ Для трассировки лучей в этой игре нужна RTX-видеокарта. У вас карта без RTX, поэтому RTX будет недоступна.'
                : '⚠️ Ray tracing in this game requires an RTX graphics card. Yours does not support RTX.');
        }

        if (game.cpu_intensive && cpuScore < 2) {
            verdictLines.push(currentLang === 'ru'
                ? '💡 Эта игра требовательна к процессору. Возможно, будут просадки FPS в сложных сценах.'
                : '💡 This game is CPU intensive. You may experience FPS drops in complex scenes.');
        }

        if (game.gpu_intensive && gpuScore < 2) {
            verdictLines.push(currentLang === 'ru'
                ? '🎮 Игра очень требовательна к видеокарте. Рекомендуется снизить настройки графики.'
                : '🎮 The game is GPU intensive. Lowering graphics settings is recommended.');
        }

        if (game.doctor_advice_ru && currentLang === 'ru') {
            verdictLines.push('💡 ' + game.doctor_advice_ru);
        } else if (game.doctor_advice_en) {
            verdictLines.push('💡 ' + game.doctor_advice_en);
        }
    }

    return verdictLines.join('<br><br>');
}

// Поиск (без изменений)
function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    for (let id in games) {
        const title = games[id][`title_${currentLang}`].toLowerCase();
        if (title.includes(query)) {
            showGames();
            setTimeout(() => {
                const card = document.querySelector(`.card[data-game="${id}"]`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.borderColor = 'var(--accent)';
                    setTimeout(() => card.style.borderColor = '', 2000);
                }
            }, 300);
            break;
        }
    }
    suggestionsDiv.style.display = 'none';
}

searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length < 1) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    const matches = [];
    for (let id in games) {
        const title = games[id][`title_${currentLang}`].toLowerCase();
        if (title.includes(query)) {
            matches.push({ id, title: games[id][`title_${currentLang}`] });
        }
        if (matches.length >= 10) break;
    }

    if (matches.length > 0) {
        suggestionsDiv.innerHTML = matches.map((m, index) => 
            `<div class="suggestions-item" data-id="${m.id}" data-index="${index}">${m.title}</div>`
        ).join('');
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.style.display = 'none';
    }
});

suggestionsDiv.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestions-item');
    if (item) {
        const gameId = item.dataset.id;
        showGames();
        setTimeout(() => {
            const card = document.querySelector(`.card[data-game="${gameId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.borderColor = 'var(--accent)';
                setTimeout(() => card.style.borderColor = '', 2000);
            }
        }, 300);
        suggestionsDiv.style.display = 'none';
        searchInput.value = '';
    }
});

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.style.display = 'none';
    }
});

window.scrollToSection = function(sectionId) {
    showGames();
    setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    }, 300);
};

// Анимации
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// Частицы
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];
const PARTICLE_COUNT = 100;
let mouseX = null, mouseY = null;

function initParticles() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + 1,
        });
    }
}

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

function getAccentColor() {
    const style = getComputedStyle(document.body);
    return style.getPropertyValue('--accent').trim() || '#ff7a18';
}

function updateParticles() {
    for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouseX !== null && mouseY !== null) {
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                const force = (100 - dist) / 1000;
                p.vx += dx * force;
                p.vy += dy * force;
            }
        }

        const maxSpeed = 1.5;
        let sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > maxSpeed) {
            p.vx = (p.vx / sp) * maxSpeed;
            p.vy = (p.vy / sp) * maxSpeed;
        }
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, width, height);
    const accentColor = getAccentColor();
    let r, g, b;
    if (accentColor.startsWith('#')) {
        const hex = accentColor.slice(1);
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        r = 255; g = 122; b = 24;
    }

    for (let p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
        ctx.fill();
    }
}

function animate() {
    updateParticles();
    drawParticles();
    requestAnimationFrame(animate);
}

function initCanvas() {
    resizeCanvas();
    particles = [];
    initParticles();
    animate();
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
document.addEventListener('mouseleave', () => {
    mouseX = null;
    mouseY = null;
});

initCanvas();

window.particleSystem = {
    updateColor: function() {}
};

// Блок "Мой ПК"
const pcCPU = document.getElementById('pcCPU');
const pcGPU = document.getElementById('pcGPU');
const pcRAM = document.getElementById('pcRAM');
const savePcBtn = document.getElementById('savePcBtn');
const scanBtn = document.getElementById('scanScreenshotBtn');
const screenshotInput = document.getElementById('screenshotInput');
const scanStatus = document.getElementById('scanStatus');

pcCPU.value = userPC.cpu;
pcGPU.value = userPC.gpu;
pcRAM.value = userPC.ram;

savePcBtn.addEventListener('click', () => {
    userPC.cpu = pcCPU.value;
    userPC.gpu = pcGPU.value;
    userPC.ram = parseInt(pcRAM.value) || 0;
    saveUserPC();
    alert(currentLang === 'ru' ? 'Данные сохранены!' : 'Data saved!');
});

scanBtn.addEventListener('click', () => screenshotInput.click());

screenshotInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    scanStatus.innerText = currentLang === 'ru' ? '⏳ Распознавание...' : '⏳ Recognition...';
    const reader = new FileReader();
    reader.onload = () => {
        Tesseract.recognize(reader.result, 'rus+eng', { logger: m => console.log(m) })
            .then(({ data: { text } }) => {
                scanStatus.innerText = currentLang === 'ru' ? '✅ Распознано! Заполняем поля...' : '✅ Recognized! Filling fields...';
                const lines = text.split('\n');
                let cpuFound = '', gpuFound = '', ramFound = '';
                for (let line of lines) {
                    line = line.toLowerCase();
                    if (line.includes('processor') || line.includes('процессор')) {
                        cpuFound = line.replace(/processor|процессор|:/gi, '').trim();
                    }
                    if (line.includes('nvidia') || line.includes('amd') || line.includes('radeon') || line.includes('geforce') || line.includes('rtx') || line.includes('gtx')) {
                        gpuFound = line.trim();
                    }
                    if (line.includes('ram') || line.includes('озу') || line.includes('память')) {
                        const match = line.match(/(\d+)\s*gb/i);
                        if (match) ramFound = match[1];
                    }
                }
                if (cpuFound) pcCPU.value = cpuFound;
                if (gpuFound) pcGPU.value = gpuFound;
                if (ramFound) pcRAM.value = ramFound;
                setTimeout(() => { scanStatus.innerText = ''; }, 3000);
            });
    };
    reader.readAsDataURL(file);
});

window.togglePCFilter = function() {
    // Читаем свежие данные из localStorage на случай если только что сохранили
    userPC.cpu = localStorage.getItem('userCPU') || '';
    userPC.gpu = localStorage.getItem('userGPU') || '';
    userPC.ram = parseInt(localStorage.getItem('userRAM')) || 0;

    if (!userPC.cpu && !userPC.gpu && !userPC.ram) {
        alert(currentLang === 'ru'
            ? '⚠️ Сначала заполните данные о своём ПК в Настройках!'
            : '⚠️ Please fill in your PC specs in Settings first!');
        return;
    }
    pcFilterActive = !pcFilterActive;
    const btn = document.getElementById('pcFilterBtn');
    if (btn) {
        btn.textContent = pcFilterActive
            ? (currentLang === 'ru' ? '🔥 Фильтр ВКЛ' : '🔥 Filter ON')
            : (currentLang === 'ru' ? '🔥 Фильтр по ПК' : '🔥 PC Filter');
        btn.style.background = pcFilterActive ? 'var(--accent)' : '';
        btn.style.color = pcFilterActive ? '#000' : '';
    }
    showGames();
};

showHome();
renderAllGalleries();
updateLanguage();// Обработка якоря для открытия раздела игр
if (window.location.hash === '#gamesSection') {
    showGames();
}