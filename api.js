// api.js
import { auth } from './auth.js';
import { getFirestore, collection, addDoc, deleteDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

// Загрузить избранное текущего пользователя
export async function loadUserFavorites() {
    const user = auth.currentUser;
    if (!user) return [];
    
    try {
        const favCol = collection(db, 'favorites');
        const q = query(favCol, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const favorites = [];
        snapshot.forEach(doc => {
            favorites.push(doc.data().gameId);
        });
        
        window.favorites = favorites;
        
        const favCountEl = document.getElementById('profileFavoritesCount');
        if (favCountEl) favCountEl.textContent = favorites.length;
        
        // Обновляем все галереи
        if (window.renderAllGalleries) window.renderAllGalleries();
        if (window.renderFavorites) window.renderFavorites();
        // ВАЖНО: обновляем галерею в профиле
        if (window.renderProfileFavorites) window.renderProfileFavorites();
        
        return favorites;
    } catch (error) {
        console.error('Ошибка загрузки избранного:', error);
        return [];
    }
}

// Добавить игру в избранное
export async function addFavorite(gameId) {
    const user = auth.currentUser;
    if (!user) {
        alert('Чтобы добавить в избранное, нужно войти');
        return false;
    }
    
    try {
        await addDoc(collection(db, 'favorites'), {
            userId: user.uid,
            gameId: gameId
        });
        await loadUserFavorites();
        return true;
    } catch (error) {
        console.error('Ошибка добавления:', error);
        return false;
    }
}

// Удалить игру из избранного
export async function removeFavorite(gameId) {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const favCol = collection(db, 'favorites');
        const q = query(favCol, where('userId', '==', user.uid), where('gameId', '==', gameId));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
        await loadUserFavorites();
        return true;
    } catch (error) {
        console.error('Ошибка удаления:', error);
        return false;
    }
}