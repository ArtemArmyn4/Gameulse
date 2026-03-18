// gamePage.js
import { auth } from './firebase.js';
import { addFavorite, removeFavorite } from './api.js';

// Получаем ID игры из URL
const params = new URLSearchParams(window.location.search);
const gameId = params.get("id");

// Глобальный объект games из games.js
const game = games[gameId];

if (!game) {
    document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">Игра не найдена</h1>';
} else {
    // Заголовок
    document.getElementById("gameTitle").innerText = game.title_ru;

    // Трейлер
    const trailerIframe = document.getElementById("gameTrailer");
    if (game.trailer) {
        trailerIframe.src = game.trailer;
    } else {
        trailerIframe.style.display = 'none';
    }

    // Описание
    document.getElementById("gameDescription").innerText = game.desc_ru;

    // Минимальные требования (массив строк)
    const minList = game.min.map(item => `<li>${item}</li>`).join('');
    document.getElementById("minReq").innerHTML = `<ul>${minList}</ul>`;

    // Рекомендуемые требования
    const recList = game.rec.map(item => `<li>${item}</li>`).join('');
    document.getElementById("recReq").innerHTML = `<ul>${recList}</ul>`;

    // Время прохождения
    if (game.playtime_main && game.playtime_completion) {
        const playtimeHtml = `
            <div class="modal-playtime" style="margin-top:15px;">
                <h4 style="color:var(--accent);">⏱️ Время прохождения</h4>
                <p>📖 Основной сюжет: ${game.playtime_main} ч</p>
                <p>🏆 100% прохождение: ${game.playtime_completion} ч</p>
            </div>
        `;
        document.querySelector('.requirements').insertAdjacentHTML('afterend', playtimeHtml);
    }

    // Оценки
    if (game.metacritic || game.steam || game.ign) {
        const ratingsHtml = `
            <div class="modal-ratings" style="margin-top:15px;">
                <h4 style="color:var(--accent);">📊 Оценки</h4>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    ${game.metacritic ? `<div><strong>Metacritic:</strong> ${game.metacritic}</div>` : ''}
                    ${game.steam ? `<div><strong>Steam:</strong> ${game.steam}</div>` : ''}
                    ${game.ign ? `<div><strong>IGN:</strong> ${game.ign}</div>` : ''}
                </div>
            </div>
        `;
        document.querySelector('.requirements').insertAdjacentHTML('afterend', ratingsHtml);
    }

    // Сборка ПК
    if (game.build) {
        const buildHtml = `
            <div class="modal-build" style="margin-top:15px;">
                <h4 style="color:var(--accent);">🧩 Собери идеальный ПК под игру</h4>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div><strong>Процессор:</strong> ${game.build.cpu}</div>
                    <div><strong>Видеокарта:</strong> ${game.build.gpu}</div>
                    <div><strong>Оперативная память:</strong> ${game.build.ram} GB</div>
                </div>
            </div>
        `;
        document.querySelector('.requirements').insertAdjacentHTML('afterend', buildHtml);
    }

    // Гейм-доктор (функцию нужно скопировать или импортировать, но для простоты скопируем)
    function evaluateSystem() {
        const cpu = localStorage.getItem('userCPU') || '';
        const gpu = localStorage.getItem('userGPU') || '';
        const ram = parseInt(localStorage.getItem('userRAM')) || 0;

        let cpuScore = 0;
        if (cpu.includes('i9') || cpu.includes('ryzen 9')) cpuScore = 4;
        else if (cpu.includes('i7') || cpu.includes('ryzen 7')) cpuScore = 3;
        else if (cpu.includes('i5') || cpu.includes('ryzen 5')) cpuScore = 2;
        else if (cpu.includes('i3') || cpu.includes('ryzen 3')) cpuScore = 1;
        else cpuScore = 1;

        let gpuScore = 0;
        if (gpu.includes('rtx 40') || gpu.includes('rx 7000')) gpuScore = 4;
        else if (gpu.includes('rtx 30') || gpu.includes('rx 6000')) gpuScore = 3;
        else if (gpu.includes('rtx 20') || gpu.includes('gtx 16') || gpu.includes('rx 5000')) gpuScore = 2;
        else if (gpu.includes('gtx 10') || gpu.includes('gtx 900') || gpu.includes('rx 400') || gpu.includes('rx 500')) gpuScore = 1;
        else gpuScore = 1;

        let ramScore = 0;
        if (ram >= 32) ramScore = 4;
        else if (ram >= 16) ramScore = 3;
        else if (ram >= 8) ramScore = 2;
        else if (ram >= 4) ramScore = 1;
        else ramScore = 0;

        const totalScore = cpuScore + gpuScore + ramScore;
        return { cpuScore, gpuScore, totalScore };
    }

    function getDoctorVerdict() {
        const { cpuScore, gpuScore, totalScore } = evaluateSystem();
        const required = game.power_rank;
        let verdict = '';

        if (!localStorage.getItem('userCPU') && !localStorage.getItem('userGPU') && !localStorage.getItem('userRAM')) {
            verdict = '⚠️ Заполните данные о своём ПК в настройках, чтобы получить персональный анализ.';
        } else {
            if (totalScore >= required + 3) {
                verdict = '✅ Ваша система значительно мощнее требований. Игра пойдёт на ультра-настройках с высоким FPS.';
            } else if (totalScore >= required) {
                verdict = '👍 Ваша система соответствует рекомендуемым требованиям. Игра будет работать отлично.';
            } else if (totalScore >= required - 2) {
                verdict = '⚠️ Ваша система близка к минимальным требованиям. Возможно, придётся снизить настройки.';
            } else {
                verdict = '❌ Ваша система слабее минимальных требований. Игра может не запуститься или работать с сильными тормозами.';
            }
            if (game.rtx_supported && gpuScore >= 3) {
                verdict += '<br>✨ Ваша видеокарта поддерживает RTX.';
            }
            if (game.cpu_intensive && cpuScore < 2) {
                verdict += '<br>💡 Эта игра требовательна к процессору.';
            }
            if (game.gpu_intensive && gpuScore < 2) {
                verdict += '<br>🎮 Игра очень требовательна к видеокарте.';
            }
        }
        return verdict;
    }

    const doctorHtml = `
        <div class="doctor-block" style="margin-top:20px;">
            <h4 style="color:var(--accent);">🤖 Гейм-Доктор</h4>
            <p>${getDoctorVerdict()}</p>
        </div>
    `;
    document.querySelector('.requirements').insertAdjacentHTML('afterend', doctorHtml);

    // Избранное
    let isFavorite = false;
    const favBtn = document.getElementById('favoriteBtn');

    function updateFavoriteButton() {
        favBtn.textContent = isFavorite ? '❤️ В избранном (убрать)' : '❤️ Добавить в избранное';
    }

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            favBtn.disabled = true;
            favBtn.textContent = 'Войдите, чтобы добавить';
            return;
        }
        import('./firebase.js').then(({ db }) => {
            import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js").then(({ collection, query, where, getDocs }) => {
                const favCol = collection(db, 'favorites');
                const q = query(favCol, where('userId', '==', user.uid), where('gameId', '==', gameId));
                getDocs(q).then(snapshot => {
                    isFavorite = !snapshot.empty;
                    updateFavoriteButton();
                });
            });
        });
        favBtn.disabled = false;
    });

    favBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('Войдите в профиль');
            return;
        }
        if (isFavorite) {
            const success = await removeFavorite(gameId);
            if (success) isFavorite = false;
        } else {
            const success = await addFavorite(gameId);
            if (success) isFavorite = true;
        }
        updateFavoriteButton();
    });
}