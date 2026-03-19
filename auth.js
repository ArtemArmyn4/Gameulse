
// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBD0utKk5EOIjmtKOiA5Mnp5Ph6pK9vNP8",
    authDomain: "gamepulse-cf06b.firebaseapp.com",
    projectId: "gamepulse-cf06b",
    storageBucket: "gamepulse-cf06b.firebasestorage.app",
    messagingSenderId: "1096859318006",
    appId: "1:1096859318006:web:a0d62bb1a7fe865a37ded7",
    measurementId: "G-8NGJJWPYSG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                console.log(`🖼️ Сжато: ${width}x${height}, размер base64: ${(compressedBase64.length/1024).toFixed(2)} KB`);
                resolve(compressedBase64);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

async function saveUserPhoto(userId, base64) {
    try {
        await setDoc(doc(db, 'users', userId), { photoBase64: base64 }, { merge: true });
        console.log('✅ Фото сохранено');
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения фото:', error);
        return false;
    }
}

async function loadUserPhoto(userId) {
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().photoBase64 || null;
        } else {
            await setDoc(docRef, { photoBase64: null, displayName: null });
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки фото:', error);
        return null;
    }
}

window.saveDisplayName = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert('Сначала войдите');
        return;
    }
    const displayNameInput = document.getElementById('displayNameInput');
    const newName = displayNameInput.value.trim();
    if (!newName) {
        document.getElementById('displayNameStatus').textContent = 'Ник не может быть пустым';
        return;
    }
    try {
        await setDoc(doc(db, 'users', user.uid), { displayName: newName }, { merge: true });
        document.getElementById('displayNameStatus').textContent = 'Ник сохранён!';
        const displayNameSpan = document.getElementById('profileDisplayName');
        if (displayNameSpan) displayNameSpan.textContent = newName;
        setTimeout(() => document.getElementById('displayNameStatus').textContent = '', 2000);
    } catch (error) {
        console.error('❌ Ошибка сохранения ника:', error);
        document.getElementById('displayNameStatus').textContent = 'Ошибка сохранения';
    }
};

async function loadUserDisplayName(userId) {
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().displayName || null;
        } else {
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки ника:', error);
        return null;
    }
}

window.changePassword = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert('Сначала войдите');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const statusEl = document.getElementById('passwordStatus');
    
    if (!currentPassword || !newPassword) {
        statusEl.textContent = 'Заполните оба поля';
        return;
    }
    if (newPassword.length < 6) {
        statusEl.textContent = 'Новый пароль должен быть минимум 6 символов';
        return;
    }
    
    statusEl.textContent = 'Проверка...';
    
    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        statusEl.textContent = 'Смена пароля...';
        await updatePassword(user, newPassword);
        
        statusEl.textContent = 'Пароль успешно изменён!';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        setTimeout(() => statusEl.textContent = '', 3000);
    } catch (error) {
        console.error('❌ Ошибка смены пароля:', error);
        let errorMessage = 'Ошибка';
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage = 'Неверный текущий пароль';
                break;
            case 'auth/weak-password':
                errorMessage = 'Новый пароль слишком слабый';
                break;
            default:
                errorMessage = error.message;
        }
        statusEl.textContent = errorMessage;
    }
};

onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('navLogin');
    const profileBtn = document.getElementById('navProfile');
    const logoutBtn = document.getElementById('navLogout');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        
        const profileSection = document.getElementById('profileSection');
        if (profileSection && !profileSection.classList.contains('hidden')) {
            const [base64, displayName] = await Promise.all([
                loadUserPhoto(user.uid),
                loadUserDisplayName(user.uid)
            ]);
            updateProfilePage(user, base64, displayName);
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (profileBtn) profileBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
});

function updateProfilePage(user, base64 = null, displayName = null) {
    if (!user) return;
    const profileEmail = document.getElementById('profileEmail');
    const profileSince = document.getElementById('profileSince');
    const profilePhoto = document.getElementById('profilePhoto');
    const displayNameSpan = document.getElementById('profileDisplayName');
    const displayNameInput = document.getElementById('displayNameInput');
    
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileSince) {
        const creationTime = user.metadata.creationTime;
        profileSince.textContent = new Date(creationTime).toLocaleDateString('ru-RU');
    }
    if (displayNameSpan) {
        displayNameSpan.textContent = displayName || 'Не задан';
    }
    if (displayNameInput) {
        displayNameInput.value = displayName || '';
    }
    const placeholder = document.getElementById('profileAvatarPlaceholder');
    if (profilePhoto) {
        if (base64) {
            profilePhoto.src = base64;
            profilePhoto.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            profilePhoto.onclick = () => {
                const fullsize = document.getElementById('fullsizePhoto');
                if (fullsize) fullsize.src = base64;
                const modal = document.getElementById('photoModal');
                if (modal) modal.style.display = 'flex';
            };
        } else {
            profilePhoto.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
            profilePhoto.onclick = null;
        }
    }
}

window.uploadProfilePhoto = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert('Сначала войдите');
        return;
    }
    
    const fileInput = document.getElementById('photoUpload');
    const file = fileInput.files[0];
    if (!file) {
        alert('Выберите файл');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 10 МБ');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('Можно загружать только изображения');
        return;
    }
    
    const statusEl = document.getElementById('uploadStatus');
    statusEl.textContent = 'Обработка...';
    
    try {
        const compressedBase64 = await compressImage(file, 800, 0.8);
        statusEl.textContent = 'Сохранение...';
        const success = await saveUserPhoto(user.uid, compressedBase64);
        
        if (success) {
            statusEl.textContent = 'Фото обновлено!';
            const displayName = await loadUserDisplayName(user.uid);
            updateProfilePage(user, compressedBase64, displayName);
        } else {
            statusEl.textContent = 'Ошибка при сохранении';
        }
        fileInput.value = '';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
    } catch (error) {
        console.error('❌ Ошибка:', error);
        statusEl.textContent = 'Ошибка';
    }
};

window.showLoginModal = function() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('authMessage').textContent = '';
};

window.closeAuthModal = function() {
    document.getElementById('authModal').style.display = 'none';
};

window.registerWithEmail = async function() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        messageEl.textContent = 'Заполни email и пароль';
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), { email: email, photoBase64: null, displayName: null });
        messageEl.textContent = 'Регистрация успешна!';
        setTimeout(() => closeAuthModal(), 1000);
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        let errorMessage = 'Ошибка при регистрации';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Этот email уже зарегистрирован';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Некорректный email';
                break;
            case 'auth/weak-password':
                errorMessage = 'Пароль слишком слабый (минимум 6 символов)';
                break;
            default:
                errorMessage = error.message;
        }
        messageEl.textContent = errorMessage;
    }
};

window.loginWithEmail = async function() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const messageEl = document.getElementById('authMessage');
    
    if (!email || !password) {
        messageEl.textContent = 'Заполни email и пароль';
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        messageEl.textContent = 'Вход выполнен!';
        setTimeout(() => closeAuthModal(), 1000);
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        let errorMessage = 'Ошибка при входе';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Пользователь с таким email не найден';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Неверный пароль';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Некорректный email';
                break;
            default:
                errorMessage = error.message;
        }
        messageEl.textContent = errorMessage;
    }
};

window.logout = async function() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
    }
};

window.showProfile = async function() {
    document.getElementById('homeSection').classList.add('hidden');
    document.getElementById('gamesSection').classList.add('hidden');
    document.getElementById('favoritesSection').classList.add('hidden');
    document.getElementById('settingsSection').classList.add('hidden');
    const profileSection = document.getElementById('profileSection');
    profileSection.classList.remove('hidden');
    const user = auth.currentUser;
    if (user) {
        const [base64, displayName] = await Promise.all([
            loadUserPhoto(user.uid),
            loadUserDisplayName(user.uid)
        ]);
        updateProfilePage(user, base64, displayName);
        if (window.loadUserFavorites) window.loadUserFavorites();
    }
};
