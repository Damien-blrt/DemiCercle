// =============================================================================
// app.js — Logique principale du Jeu du Demi-Cercle (Version Déduction)
// Architecture: État global + Firebase sync + Interactions SVG
// =============================================================================

// ─── État global ───
const state = {
    roomCode: null,
    playerRole: null,   // "playerA" ou "playerB"
    playerName: null,
    currentScreen: 'screen-home',
    selectedValue: null, // Valeur sélectionnée sur le demi-cercle (0-100)
    selectedTheme: null, // Thème sélectionné {left, right, category}
    selectedCategory: 'Toutes',
    listeners: [],       // Firebase listeners à nettoyer
};

// ─── Constantes SVG du demi-cercle ───
const ARC = {
    centerX: 200,
    centerY: 200,
    radius: 160,
};

// ─── Initialisation ───
document.addEventListener('DOMContentLoaded', () => {
    tryRestoreSession();
    initCategoryFilters();
    setupInputListeners();
});

// =============================================================================
// GESTION DES ÉCRANS
// =============================================================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        screen.style.animation = 'none';
        screen.offsetHeight;
        screen.style.animation = '';
        state.currentScreen = screenId;
    }
}

function showCreateScreen() { showScreen('screen-create'); }
function showJoinScreen() { showScreen('screen-join'); }

// =============================================================================
// GESTION DES SALLES
// =============================================================================

async function createRoom() {
    const name = document.getElementById('create-name').value.trim();
    if (!name) {
        showToast('Entre ton pseudo !', 'warning');
        return;
    }

    const btn = document.getElementById('btn-create-room');
    btn.disabled = true;
    btn.textContent = 'Création...';

    try {
        let roomCode;
        let exists = true;
        while (exists) {
            roomCode = generateRoomCode();
            const snap = await getRoomRef(roomCode).once('value');
            exists = snap.exists();
        }

        const roomData = {
            status: 'waiting',
            players: {
                playerA: {
                    name: name,
                    score: 0,
                    connected: true,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                }
            },
            currentRound: 1,
            totalRounds: 10,
            respondent: 'playerA',
            guesser: 'playerB',
            theme: null,
            targetValue: null,
            hintWord: null,
            guessValue: null,
            history: [],
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        await getRoomRef(roomCode).set(roomData);

        state.roomCode = roomCode;
        state.playerRole = 'playerA';
        state.playerName = name;
        saveSession();

        setupPresence(roomCode, 'playerA');

        document.getElementById('waiting-room-code').textContent = roomCode;
        document.getElementById('waiting-player-a').textContent = name;
        showScreen('screen-waiting');

        listenToRoom(roomCode);

        showToast('Salle créée !', 'success');
    } catch (error) {
        console.error('Erreur création salle:', error);
        showToast('Erreur de connexion à Firebase. Vérifiez votre configuration.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Créer la salle';
}

async function joinRoom() {
    const name = document.getElementById('join-name').value.trim();
    const code = document.getElementById('join-code').value.trim().toUpperCase();

    if (!name) {
        showToast('Entre ton pseudo !', 'warning');
        return;
    }
    if (code.length !== 6) {
        showToast('Le code doit faire 6 caractères', 'warning');
        return;
    }

    const btn = document.getElementById('btn-join-room');
    btn.disabled = true;
    btn.textContent = 'Connexion...';

    try {
        const snap = await getRoomRef(code).once('value');
        if (!snap.exists()) {
            showToast('Salle introuvable !', 'error');
            btn.disabled = false;
            btn.textContent = 'Rejoindre';
            return;
        }

        const room = snap.val();
        if (room.players?.playerB) {
            showToast('La salle est déjà pleine !', 'error');
            btn.disabled = false;
            btn.textContent = 'Rejoindre';
            return;
        }

        await getPlayerRef(code, 'playerB').set({
            name: name,
            score: 0,
            connected: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });

        state.roomCode = code;
        state.playerRole = 'playerB';
        state.playerName = name;
        saveSession();

        setupPresence(code, 'playerB');

        document.getElementById('waiting-room-code').textContent = code;
        document.getElementById('waiting-player-a').textContent = room.players.playerA.name;
        document.getElementById('waiting-player-b').textContent = name;
        document.getElementById('waiting-player-b-status').innerHTML = '<span class="dot online"></span>Connecté';
        showScreen('screen-waiting');

        listenToRoom(code);

        showToast(`Tu as rejoint la salle de ${room.players.playerA.name} !`, 'success');
    } catch (error) {
        console.error('Erreur rejoindre salle:', error);
        showToast('Erreur de connexion', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Rejoindre';
}

async function leaveRoom() {
    if (!state.roomCode) return;
    try {
        if (state.playerRole === 'playerA') {
            await getRoomRef(state.roomCode).remove();
        } else {
            await getPlayerRef(state.roomCode, 'playerB').remove();
            await getRoomRef(state.roomCode).update({ status: 'waiting' });
        }
    } catch (e) {
        console.error('Erreur quitter salle:', e);
    }
    cleanupListeners();
    clearSession();
    showScreen('screen-home');
    showToast('Vous avez quitté la salle', 'info');
}

// =============================================================================
// FIREBASE LISTENERS
// =============================================================================

function listenToRoom(roomCode) {
    cleanupListeners();
    const roomRef = getRoomRef(roomCode);
    const mainListener = roomRef.on('value', (snap) => {
        if (!snap.exists()) {
            showToast('La salle a été fermée', 'warning');
            cleanupListeners();
            clearSession();
            showScreen('screen-home');
            return;
        }
        handleRoomUpdate(snap.val());
    });
    state.listeners.push({ ref: roomRef, event: 'value', callback: mainListener });
}

function handleRoomUpdate(room) {
    const isPlayerA = state.playerRole === 'playerA';
    const isRespondent = room.respondent === state.playerRole;

    if (room.players?.playerA) {
        document.getElementById('waiting-player-a').textContent = room.players.playerA.name;
    }

    if (room.players?.playerB) {
        document.getElementById('waiting-player-b').textContent = room.players.playerB.name;
        document.getElementById('waiting-player-b-status').innerHTML = 
            room.players.playerB.connected 
                ? '<span class="dot online"></span>Connecté'
                : '<span class="dot offline"></span>Déconnecté';

        if (isPlayerA && room.status === 'waiting') {
            document.getElementById('waiting-anim').classList.add('hidden');
            document.getElementById('btn-start-game').classList.remove('hidden');
        }
    }

    updateAllScoreHeaders(room);

    // Fonction d'aide pour mettre à jour l'affichage des pôles
    const updateThemePoles = (prefix) => {
        if (room.theme) {
            document.getElementById(`${prefix}-theme-left`).textContent = room.theme.left;
            document.getElementById(`${prefix}-theme-right`).textContent = room.theme.right;
            document.getElementById(`${prefix}-theme-cat`).textContent = room.theme.category;
        }
    };

    switch (room.status) {
        case 'waiting':
            if (!['screen-waiting', 'screen-home', 'screen-create', 'screen-join'].includes(state.currentScreen)) {
                showScreen('screen-waiting');
            }
            break;

        case 'choosing_theme':
            if (isRespondent) {
                if (state.currentScreen !== 'screen-theme') {
                    state.selectedTheme = null;
                    renderThemeList();
                    showScreen('screen-theme');
                }
            } else {
                if (state.currentScreen !== 'screen-theme-wait') {
                    showScreen('screen-theme-wait');
                }
            }
            break;

        case 'placing':
            if (isRespondent) {
                if (state.currentScreen !== 'screen-place') {
                    updateThemePoles('place');
                    document.getElementById('place-hint-input').value = '';
                    document.getElementById('btn-confirm-place').disabled = true;
                    
                    // Afficher la target value sur le SVG
                    updateMarker('place', room.targetValue);
                    updateValueDisplay('place', room.targetValue);
                    
                    showScreen('screen-place');
                }
            } else {
                if (state.currentScreen !== 'screen-wait-other') {
                    updateThemePoles('wo');
                    document.getElementById('wo-waiting-text').textContent = 'Le Répondant réfléchit...';
                    document.getElementById('wo-waiting-subtext').textContent = "Il doit trouver un indice pour te faire deviner la cible secrète.";
                    showScreen('screen-wait-other');
                }
            }
            break;

        case 'guessing':
            if (!isRespondent) {
                if (state.currentScreen !== 'screen-guess') {
                    updateThemePoles('guess');
                    document.getElementById('guess-hint-word').textContent = room.hintWord;
                    
                    state.selectedValue = null;
                    resetMarker('guess');
                    showScreen('screen-guess');
                    setupSemicircleInteraction('guess'); // Interaction activée pour le Devin
                }
            } else {
                if (state.currentScreen !== 'screen-wait-other') {
                    updateThemePoles('wo');
                    document.getElementById('wo-waiting-text').textContent = 'Le Devin réfléchit...';
                    document.getElementById('wo-waiting-subtext').textContent = "Il essaie de placer son curseur grâce à ton indice !";
                    showScreen('screen-wait-other');
                }
            }
            break;

        case 'reveal':
            showRevealScreen(room);
            break;

        case 'finished':
            showFinalScores(room);
            break;
    }
}

// =============================================================================
// SCORES HEADERS
// =============================================================================

function updateAllScoreHeaders(room) {
    const nameA = room.players?.playerA?.name || 'Joueur A';
    const nameB = room.players?.playerB?.name || 'Joueur B';
    const scoreA = room.players?.playerA?.score || 0;
    const scoreB = room.players?.playerB?.score || 0;
    const roundText = `${room.currentRound || 1}/${room.totalRounds || 10}`;

    const prefixes = ['theme', 'tw', 'place', 'guess', 'wo', 'reveal'];

    prefixes.forEach(prefix => {
        const nameAEl = document.getElementById(`${prefix}-name-a`);
        const nameBEl = document.getElementById(`${prefix}-name-b`);
        const scoreAEl = document.getElementById(`${prefix}-score-a`);
        const scoreBEl = document.getElementById(`${prefix}-score-b`);
        const roundEl = document.getElementById(`${prefix}-round`);

        if (nameAEl) nameAEl.textContent = nameA;
        if (nameBEl) nameBEl.textContent = nameB;
        if (scoreAEl) scoreAEl.textContent = scoreA;
        if (scoreBEl) scoreBEl.textContent = scoreB;
        if (roundEl) roundEl.textContent = roundText;
    });
}

// =============================================================================
// SÉLECTION DE THÈME
// =============================================================================

function initCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    container.innerHTML = CATEGORIES.map(cat => 
        `<button class="category-chip${cat === 'Toutes' ? ' active' : ''}" 
                 onclick="filterCategory('${cat}')">${cat}</button>`
    ).join('');
}

function filterCategory(category) {
    state.selectedCategory = category;
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === category);
    });
    renderThemeList();
}

function renderThemeList() {
    const container = document.getElementById('theme-list');
    const themes = getThemesByCategory(state.selectedCategory);

    container.innerHTML = themes.map((theme, i) =>
        `<div class="theme-option" data-index="${i}" onclick="selectThemeOption(this, ${JSON.stringify(theme).replace(/"/g, '&quot;')})">
            <div class="theme-option-left">${theme.left}</div>
            <div class="theme-option-sep">↔</div>
            <div class="theme-option-right">${theme.right}</div>
        </div>`
    ).join('');
}

function selectThemeOption(el, theme) {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedTheme = theme;
    document.getElementById('custom-theme-left').value = '';
    document.getElementById('custom-theme-right').value = '';
    document.getElementById('btn-confirm-theme').disabled = false;
}

function selectRandomThemeUI() {
    const theme = getRandomTheme(state.selectedCategory);
    state.selectedTheme = theme;

    document.querySelectorAll('.theme-option').forEach(o => {
        const leftEl = o.querySelector('.theme-option-left');
        o.classList.toggle('selected', leftEl && leftEl.textContent.trim() === theme.left);
    });

    document.getElementById('custom-theme-left').value = '';
    document.getElementById('custom-theme-right').value = '';
    document.getElementById('btn-confirm-theme').disabled = false;
    showToast(`Thème: ${theme.left} ↔ ${theme.right}`, 'info');
}

async function confirmTheme() {
    const leftText = document.getElementById('custom-theme-left').value.trim();
    const rightText = document.getElementById('custom-theme-right').value.trim();
    
    if (leftText || rightText) {
        if (!leftText || !rightText) {
            showToast('Remplis les deux pôles pour un thème personnalisé !', 'warning');
            return;
        }
        state.selectedTheme = { left: leftText, right: rightText, category: 'Personnalisé' };
    }

    if (!state.selectedTheme) {
        showToast('Choisis ou écris un thème !', 'warning');
        return;
    }

    try {
        // Générer la valeur cible secrète entre 0 et 100
        const randomTarget = Math.floor(Math.random() * 101);

        await getRoomRef(state.roomCode).update({
            theme: state.selectedTheme,
            targetValue: randomTarget,
            hintWord: null,
            guessValue: null,
            status: 'placing',
        });
    } catch (error) {
        console.error('Erreur confirmation thème:', error);
        showToast('Erreur de synchronisation', 'error');
    }
}

// =============================================================================
// DEMI-CERCLE INTERACTIF
// =============================================================================

function setupSemicircleInteraction(mode) {
    const svg = document.getElementById(`${mode}-svg`);
    if (!svg) return;

    svg.classList.add('interactive');

    const newSvg = svg.cloneNode(true);
    svg.parentNode.replaceChild(newSvg, svg);

    const handleInteraction = (event) => {
        event.preventDefault();
        const value = getValueFromEvent(newSvg, event);
        if (value !== null) {
            state.selectedValue = value;
            updateMarker(mode, value);
            updateValueDisplay(mode, value);

            const btnId = mode === 'place' ? 'btn-confirm-place' : 'btn-confirm-guess';
            const btn = document.getElementById(btnId);
            if (btn) btn.disabled = false;
        }
    };

    newSvg.addEventListener('click', handleInteraction);
    newSvg.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) handleInteraction(e);
    });
    newSvg.addEventListener('touchstart', handleInteraction, { passive: false });
    newSvg.addEventListener('touchmove', handleInteraction, { passive: false });
}

function getValueFromEvent(svg, event) {
    const rect = svg.getBoundingClientRect();
    const svgWidth = 400;
    const svgHeight = 230;

    let clientX, clientY;
    if (event.touches) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * svgWidth;
    const y = ((clientY - rect.top) / rect.height) * svgHeight;

    const dx = x - ARC.centerX;
    const dy = ARC.centerY - y; 

    let angle = Math.atan2(dy, dx);

    if (angle < 0) return null; 
    if (angle > Math.PI) angle = Math.PI;

    const value = Math.round(((Math.PI - angle) / Math.PI) * 100);
    return Math.max(0, Math.min(100, value));
}

function getPositionOnArc(value) {
    const angleRad = Math.PI - (value / 100) * Math.PI;
    return {
        x: ARC.centerX + ARC.radius * Math.cos(angleRad),
        y: ARC.centerY - ARC.radius * Math.sin(angleRad)
    };
}

function updateMarker(mode, value) {
    const marker = document.getElementById(`${mode}-marker`);
    if (!marker) return;

    const pos = getPositionOnArc(value);
    marker.style.display = 'block';

    const dot = marker.querySelector('.marker-dot');
    dot.setAttribute('cx', pos.x);
    dot.setAttribute('cy', pos.y);

    const line = marker.querySelector('.marker-line');
    line.setAttribute('x1', ARC.centerX);
    line.setAttribute('y1', ARC.centerY);
    line.setAttribute('x2', pos.x);
    line.setAttribute('y2', pos.y);

    const label = marker.querySelector('text');
    label.setAttribute('x', pos.x);
    label.setAttribute('y', pos.y);
    label.textContent = value;
}

function resetMarker(mode) {
    const marker = document.getElementById(`${mode}-marker`);
    if (marker) marker.style.display = 'none';
    document.getElementById(`${mode}-value`).textContent = '—';
}

function updateValueDisplay(mode, value) {
    const el = document.getElementById(`${mode}-value`);
    if(el) el.textContent = value;
}

// =============================================================================
// CONFIRMATION DES ACTIONS
// =============================================================================

async function confirmPlacement() {
    const hintInput = document.getElementById('place-hint-input').value.trim();
    
    // Validation: 1 à 4 mots
    if (!hintInput) {
        showToast('Entre un indice !', 'warning');
        return;
    }
    const wordsCount = hintInput.split(/\s+/).length;
    if (wordsCount > 4) {
        showToast('Ton indice doit comporter 4 mots maximum !', 'error');
        return;
    }

    const btn = document.getElementById('btn-confirm-place');
    btn.disabled = true;
    btn.textContent = '✅ Indice envoyé !';

    try {
        await getRoomRef(state.roomCode).update({
            hintWord: hintInput,
            status: 'guessing'
        });
    } catch (error) {
        console.error('Erreur indice:', error);
        showToast('Erreur de synchronisation', 'error');
        btn.disabled = false;
        btn.textContent = '✅ Envoyer l\'indice';
    }
}

async function confirmGuess() {
    if (state.selectedValue === null) return;

    const btn = document.getElementById('btn-confirm-guess');
    btn.disabled = true;
    btn.textContent = '🎯 Devinette envoyée !';

    try {
        const snap = await getRoomRef(state.roomCode).once('value');
        const room = snap.val();

        const targetPos = room.targetValue;
        const guesserPos = state.selectedValue;
        const distance = Math.abs(targetPos - guesserPos);
        const points = calculatePoints(distance);

        const guesserRole = room.guesser;
        const currentScore = room.players[guesserRole]?.score || 0;
        const newScore = currentScore + points;

        const historyEntry = {
            round: room.currentRound,
            theme: room.theme ? `${room.theme.left} ↔ ${room.theme.right}` : 'Thème inconnu',
            hint: room.hintWord,
            respondent: room.respondent,
            targetPos: targetPos,
            guesserPos: guesserPos,
            distance: distance,
            points: points
        };

        const history = room.history || [];
        history.push(historyEntry);

        const updates = {
            guessValue: guesserPos,
            status: 'reveal',
            history: history,
        };
        updates[`players/${guesserRole}/score`] = newScore;

        await getRoomRef(state.roomCode).update(updates);
    } catch (error) {
        console.error('Erreur devinette:', error);
        showToast('Erreur de synchronisation', 'error');
        btn.disabled = false;
        btn.textContent = '🎯 Valider ma devinette';
    }
}

function calculatePoints(distance) {
    if (distance <= 5) return 100;
    if (distance <= 10) return 75;
    if (distance <= 20) return 50;
    if (distance <= 30) return 25;
    return 0;
}

function getScoreClass(points) {
    if (points === 100) return 'perfect';
    if (points === 75) return 'great';
    if (points === 50) return 'good';
    if (points === 25) return 'ok';
    return 'miss';
}

// =============================================================================
// ÉCRAN RÉVÉLATION
// =============================================================================

function showRevealScreen(room) {
    if (state.currentScreen === 'screen-reveal') return;

    showScreen('screen-reveal');

    const targetPos = room.targetValue;
    const guessPos = room.guessValue;
    const distance = Math.abs(targetPos - guessPos);
    const points = calculatePoints(distance);

    if (room.theme) {
        document.getElementById('reveal-theme-left').textContent = room.theme.left;
        document.getElementById('reveal-theme-right').textContent = room.theme.right;
        document.getElementById('reveal-theme-cat').textContent = room.theme.category;
    }
    document.getElementById('reveal-hint-word').textContent = room.hintWord || '---';

    const markerTarget = document.getElementById('reveal-marker-resp');
    const markerGuess = document.getElementById('reveal-marker-guess');
    const connectLine = document.getElementById('reveal-connect-line');

    markerTarget.style.display = 'none';
    markerGuess.style.display = 'none';
    connectLine.style.display = 'none';

    setTimeout(() => {
        const posResp = getPositionOnArc(targetPos);
        markerTarget.style.display = 'block';
        markerTarget.querySelector('.marker-dot').setAttribute('cx', posResp.x);
        markerTarget.querySelector('.marker-dot').setAttribute('cy', posResp.y);
        markerTarget.querySelector('.marker-line').setAttribute('x1', ARC.centerX);
        markerTarget.querySelector('.marker-line').setAttribute('y1', ARC.centerY);
        markerTarget.querySelector('.marker-line').setAttribute('x2', posResp.x);
        markerTarget.querySelector('.marker-line').setAttribute('y2', posResp.y);
        document.getElementById('reveal-resp-label').textContent = targetPos;
        document.getElementById('reveal-resp-label').setAttribute('x', posResp.x);
        document.getElementById('reveal-resp-label').setAttribute('y', posResp.y);

        markerTarget.classList.remove('marker-reveal');
        void markerTarget.offsetHeight;
        markerTarget.classList.add('marker-reveal');
    }, 300);

    setTimeout(() => {
        const posGuess = getPositionOnArc(guessPos);
        markerGuess.style.display = 'block';
        markerGuess.querySelector('.marker-dot').setAttribute('cx', posGuess.x);
        markerGuess.querySelector('.marker-dot').setAttribute('cy', posGuess.y);
        markerGuess.querySelector('.marker-line').setAttribute('x1', ARC.centerX);
        markerGuess.querySelector('.marker-line').setAttribute('y1', ARC.centerY);
        markerGuess.querySelector('.marker-line').setAttribute('x2', posGuess.x);
        markerGuess.querySelector('.marker-line').setAttribute('y2', posGuess.y);
        document.getElementById('reveal-guess-label').textContent = guessPos;
        document.getElementById('reveal-guess-label').setAttribute('x', posGuess.x);
        document.getElementById('reveal-guess-label').setAttribute('y', posGuess.y);

        markerGuess.classList.remove('marker-reveal', 'delay');
        void markerGuess.offsetHeight;
        markerGuess.classList.add('marker-reveal', 'delay');
    }, 800);

    setTimeout(() => {
        const posResp = getPositionOnArc(targetPos);
        const posGuess = getPositionOnArc(guessPos);
        connectLine.setAttribute('x1', posResp.x);
        connectLine.setAttribute('y1', posResp.y);
        connectLine.setAttribute('x2', posGuess.x);
        connectLine.setAttribute('y2', posGuess.y);
        connectLine.style.display = 'block';

        connectLine.classList.remove('connecting-line');
        void connectLine.offsetHeight;
        connectLine.classList.add('connecting-line');
    }, 1200);

    setTimeout(() => {
        document.getElementById('reveal-resp-value').textContent = targetPos;
        document.getElementById('reveal-guess-value').textContent = guessPos;
        document.getElementById('reveal-distance').textContent = distance;

        const pointsEl = document.getElementById('reveal-points');
        pointsEl.textContent = `+${points}`;
        pointsEl.className = `points ${getScoreClass(points)}`;

        document.getElementById('reveal-result').style.animation = 'none';
        void document.getElementById('reveal-result').offsetHeight;
        document.getElementById('reveal-result').style.animation = '';
    }, 1400);

    if (points === 100) {
        setTimeout(() => launchConfetti(), 1800);
    }

    const btnNext = document.getElementById('btn-next-round');

    if (room.currentRound >= room.totalRounds) {
        btnNext.textContent = '🏆 Voir les résultats';
        btnNext.onclick = endGame;
    } else {
        btnNext.textContent = 'Manche suivante →';
        btnNext.onclick = nextRound;
    }

    btnNext.classList.remove('hidden');
}

// =============================================================================
// MANCHE SUIVANTE / FIN DE PARTIE
// =============================================================================

async function nextRound() {
    try {
        const snap = await getRoomRef(state.roomCode).once('value');
        const room = snap.val();

        const newRound = (room.currentRound || 1) + 1;
        const newRespondent = room.respondent === 'playerA' ? 'playerB' : 'playerA';
        const newGuesser = room.guesser === 'playerA' ? 'playerB' : 'playerA';

        await getRoomRef(state.roomCode).update({
            currentRound: newRound,
            respondent: newRespondent,
            guesser: newGuesser,
            theme: null,
            targetValue: null,
            hintWord: null,
            guessValue: null,
            status: 'choosing_theme'
        });
    } catch (error) {
        console.error('Erreur manche suivante:', error);
        showToast('Erreur de synchronisation', 'error');
    }
}

async function endGame() {
    try {
        await getRoomRef(state.roomCode).update({ status: 'finished' });
    } catch (error) {
        console.error('Erreur fin de partie:', error);
    }
}

function showFinalScores(room) {
    showScreen('screen-scores');

    const nameA = room.players?.playerA?.name || 'Joueur A';
    const nameB = room.players?.playerB?.name || 'Joueur B';
    const scoreA = room.players?.playerA?.score || 0;
    const scoreB = room.players?.playerB?.score || 0;

    let winnerText;
    if (scoreA > scoreB) {
        winnerText = `${nameA} remporte la partie ! 🎉`;
        document.getElementById('final-card-a').classList.add('winner');
        document.getElementById('final-card-b').classList.remove('winner');
    } else if (scoreB > scoreA) {
        winnerText = `${nameB} remporte la partie ! 🎉`;
        document.getElementById('final-card-b').classList.add('winner');
        document.getElementById('final-card-a').classList.remove('winner');
    } else {
        winnerText = 'Égalité parfaite ! 🤝';
        document.getElementById('final-card-a').classList.remove('winner');
        document.getElementById('final-card-b').classList.remove('winner');
    }

    document.getElementById('winner-name').textContent = winnerText;
    document.getElementById('final-name-a').textContent = nameA;
    document.getElementById('final-name-b').textContent = nameB;
    document.getElementById('final-total-a').textContent = scoreA;
    document.getElementById('final-total-b').textContent = scoreB;

    const historyContainer = document.getElementById('history-list');
    const history = room.history || [];
    historyContainer.innerHTML = history.map(entry => {
        const scoreClass = getScoreClass(entry.points);
        return `
            <div class="history-item">
                <span class="history-round">#${entry.round}</span>
                <span class="history-theme">
                    ${entry.theme}
                    <span class="history-theme-hint">${entry.hint}</span>
                </span>
                <span class="history-positions">
                    <span style="color: var(--accent-tertiary)">${entry.targetPos}</span>
                    /
                    <span style="color: var(--accent-warm)">${entry.guesserPos}</span>
                </span>
                <span class="history-score ${scoreClass}">+${entry.points}</span>
            </div>
        `;
    }).join('');

    launchConfetti();
}

async function startGame() {
    try {
        await getRoomRef(state.roomCode).update({
            status: 'choosing_theme',
            currentRound: 1,
            respondent: 'playerA',
            guesser: 'playerB',
        });
        showToast('La partie commence !', 'success');
    } catch (error) {
        console.error('Erreur lancement:', error);
        showToast('Erreur de synchronisation', 'error');
    }
}

async function playAgain() {
    try {
        await getRoomRef(state.roomCode).update({
            status: 'choosing_theme',
            currentRound: 1,
            respondent: 'playerA',
            guesser: 'playerB',
            theme: null,
            targetValue: null,
            hintWord: null,
            guessValue: null,
            history: [],
            'players/playerA/score': 0,
            'players/playerB/score': 0,
        });
        showToast('Nouvelle partie !', 'success');
    } catch (error) {
        console.error('Erreur rejouer:', error);
        showToast('Erreur de synchronisation', 'error');
    }
}

function backToHome() {
    cleanupListeners();
    clearSession();
    showScreen('screen-home');
}

// =============================================================================
// SESSION & PERSISTANCE
// =============================================================================

function saveSession() {
    try {
        localStorage.setItem('demiCercle_session', JSON.stringify({
            roomCode: state.roomCode,
            playerRole: state.playerRole,
            playerName: state.playerName,
        }));
    } catch (e) {
        console.warn('Impossible de sauvegarder la session:', e);
    }
}

function clearSession() {
    state.roomCode = null;
    state.playerRole = null;
    state.playerName = null;
    state.selectedValue = null;
    state.selectedTheme = null;
    try {
        localStorage.removeItem('demiCercle_session');
    } catch (e) {}
}

async function tryRestoreSession() {
    try {
        const saved = localStorage.getItem('demiCercle_session');
        if (!saved) return;

        const session = JSON.parse(saved);
        if (!session.roomCode || !session.playerRole) return;

        if (!database) return;

        const snap = await getRoomRef(session.roomCode).once('value');
        if (!snap.exists()) {
            clearSession();
            return;
        }

        const room = snap.val();
        
        if (!room.players?.[session.playerRole]) {
            clearSession();
            return;
        }

        state.roomCode = session.roomCode;
        state.playerRole = session.playerRole;
        state.playerName = session.playerName;

        setupPresence(state.roomCode, state.playerRole);
        await getPlayerRef(state.roomCode, state.playerRole).update({ connected: true });

        listenToRoom(state.roomCode);

        showToast('Session restaurée !', 'success');
    } catch (e) {
        console.warn('Impossible de restaurer la session:', e);
        clearSession();
    }
}

// =============================================================================
// UTILITAIRES & LISTENERS
// =============================================================================

function cleanupListeners() {
    state.listeners.forEach(({ ref, event, callback }) => {
        ref.off(event, callback);
    });
    state.listeners = [];
}

function copyRoomCode() {
    const code = state.roomCode;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        const toast = document.getElementById('copied-toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }).catch(() => {
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);

        const toast = document.getElementById('copied-toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#7c3aed', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = `${6 + Math.random() * 8}px`;
        confetti.style.height = `${6 + Math.random() * 8}px`;
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        container.appendChild(confetti);
    }

    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

function setupInputListeners() {
    const joinCode = document.getElementById('join-code');
    if (joinCode) {
        joinCode.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    const checkCustomThemeInputs = () => {
        const leftValue = document.getElementById('custom-theme-left')?.value.trim();
        const rightValue = document.getElementById('custom-theme-right')?.value.trim();
        const hasText = leftValue || rightValue;
        document.getElementById('btn-confirm-theme').disabled = !hasText && !state.selectedTheme;
        if (hasText) {
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
            state.selectedTheme = null;
        }
    };

    document.getElementById('custom-theme-left')?.addEventListener('input', checkCustomThemeInputs);
    document.getElementById('custom-theme-right')?.addEventListener('input', checkCustomThemeInputs);

    // Limiter à 4 mots dans le champ "indice"
    document.getElementById('place-hint-input')?.addEventListener('input', (e) => {
        const val = e.target.value;
        const words = val.trim().split(/\s+/);
        if (words.length > 4 && val.trim().length > 0) {
            e.target.value = words.slice(0, 4).join(' ') + ' ';
            showToast('Maximum 4 mots !', 'warning');
        }
        document.getElementById('btn-confirm-place').disabled = e.target.value.trim().length === 0;
    });

    document.getElementById('create-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createRoom();
    });

    document.getElementById('join-code')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
}

function confirmLeaveRoom() {
    if (confirm("Voulez-vous vraiment quitter la partie en cours ?")) {
        leaveRoom();
    }
}
