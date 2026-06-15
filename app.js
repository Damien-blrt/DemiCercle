// =============================================================================
// app.js — Logique principale du Jeu du Demi-Cercle
// Architecture: État global + Firebase sync + Interactions SVG
// =============================================================================

// ─── État global ───
const state = {
    roomCode: null,
    playerRole: null,   // "playerA" ou "playerB"
    playerName: null,
    currentScreen: 'screen-home',
    selectedValue: null, // Valeur sélectionnée sur le demi-cercle (0-100)
    selectedTheme: null, // Thème sélectionné {text, category}
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

/**
 * Affiche un écran et masque les autres
 * @param {string} screenId - L'ID de l'écran à afficher
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
        // Re-déclencher l'animation d'entrée
        screen.style.animation = 'none';
        screen.offsetHeight; // Force reflow
        screen.style.animation = '';
        state.currentScreen = screenId;
    }
}

function showCreateScreen() { showScreen('screen-create'); }
function showJoinScreen() { showScreen('screen-join'); }

// =============================================================================
// GESTION DES SALLES
// =============================================================================

/**
 * Crée une nouvelle salle de jeu
 */
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
        // Générer un code unique
        let roomCode;
        let exists = true;
        while (exists) {
            roomCode = generateRoomCode();
            const snap = await getRoomRef(roomCode).once('value');
            exists = snap.exists();
        }

        // Créer la salle dans Firebase
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
            respondentPosition: null,
            guesserPosition: null,
            history: [],
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };

        await getRoomRef(roomCode).set(roomData);

        // Sauvegarder la session
        state.roomCode = roomCode;
        state.playerRole = 'playerA';
        state.playerName = name;
        saveSession();

        // Configurer la présence
        setupPresence(roomCode, 'playerA');

        // Afficher la salle d'attente
        document.getElementById('waiting-room-code').textContent = roomCode;
        document.getElementById('waiting-player-a').textContent = name;
        showScreen('screen-waiting');

        // Écouter les changements dans la salle
        listenToRoom(roomCode);

        showToast('Salle créée !', 'success');
    } catch (error) {
        console.error('Erreur création salle:', error);
        showToast('Erreur de connexion à Firebase. Vérifiez votre configuration.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Créer la salle';
}

/**
 * Rejoindre une salle existante
 */
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

        // Ajouter le joueur B
        await getPlayerRef(code, 'playerB').set({
            name: name,
            score: 0,
            connected: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });

        // Sauvegarder la session
        state.roomCode = code;
        state.playerRole = 'playerB';
        state.playerName = name;
        saveSession();

        // Configurer la présence
        setupPresence(code, 'playerB');

        // Afficher la salle d'attente
        document.getElementById('waiting-room-code').textContent = code;
        document.getElementById('waiting-player-a').textContent = room.players.playerA.name;
        document.getElementById('waiting-player-b').textContent = name;
        document.getElementById('waiting-player-b-status').innerHTML = '<span class="dot online"></span>Connecté';
        showScreen('screen-waiting');

        // Écouter les changements
        listenToRoom(code);

        showToast(`Tu as rejoint la salle de ${room.players.playerA.name} !`, 'success');
    } catch (error) {
        console.error('Erreur rejoindre salle:', error);
        showToast('Erreur de connexion', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Rejoindre';
}

/**
 * Quitter la salle actuelle
 */
async function leaveRoom() {
    if (!state.roomCode) return;

    try {
        // Supprimer le joueur de la salle
        if (state.playerRole === 'playerA') {
            // Le créateur quitte → supprimer toute la salle
            await getRoomRef(state.roomCode).remove();
        } else {
            // Le joueur B quitte → retirer son entrée
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

/**
 * Écoute les changements en temps réel dans la salle
 * @param {string} roomCode
 */
function listenToRoom(roomCode) {
    cleanupListeners();

    const roomRef = getRoomRef(roomCode);

    // Listener principal
    const mainListener = roomRef.on('value', (snap) => {
        if (!snap.exists()) {
            // La salle a été supprimée
            showToast('La salle a été fermée', 'warning');
            cleanupListeners();
            clearSession();
            showScreen('screen-home');
            return;
        }

        const room = snap.val();
        handleRoomUpdate(room);
    });

    state.listeners.push({ ref: roomRef, event: 'value', callback: mainListener });
}

/**
 * Gère les mises à jour de la salle
 * @param {Object} room - Données de la salle
 */
function handleRoomUpdate(room) {
    const isPlayerA = state.playerRole === 'playerA';
    const isRespondent = room.respondent === state.playerRole;

    // Mettre à jour l'affichage des joueurs dans la salle d'attente
    if (room.players?.playerA) {
        document.getElementById('waiting-player-a').textContent = room.players.playerA.name;
    }

    if (room.players?.playerB) {
        document.getElementById('waiting-player-b').textContent = room.players.playerB.name;
        document.getElementById('waiting-player-b-status').innerHTML = 
            room.players.playerB.connected 
                ? '<span class="dot online"></span>Connecté'
                : '<span class="dot offline"></span>Déconnecté';

        // Montrer le bouton "Lancer" si on est playerA
        if (isPlayerA && room.status === 'waiting') {
            document.getElementById('waiting-anim').classList.add('hidden');
            document.getElementById('btn-start-game').classList.remove('hidden');
        }
    }

    // Mettre à jour les scores sur tous les écrans
    updateAllScoreHeaders(room);

    // Machine d'état du jeu
    switch (room.status) {
        case 'waiting':
            // On reste sur l'écran d'attente
            if (state.currentScreen !== 'screen-waiting' && 
                state.currentScreen !== 'screen-home' && 
                state.currentScreen !== 'screen-create' &&
                state.currentScreen !== 'screen-join') {
                showScreen('screen-waiting');
            }
            break;

        case 'choosing_theme':
            if (isRespondent) {
                // Le répondant choisit le thème
                state.selectedTheme = null;
                renderThemeList();
                showScreen('screen-theme');
            } else {
                // Le devin attend
                showScreen('screen-theme-wait');
            }
            break;

        case 'placing':
            if (isRespondent) {
                // Le répondant place son curseur
                if (room.theme) {
                    document.getElementById('place-theme-text').textContent = room.theme.text;
                    document.getElementById('place-theme-cat').textContent = room.theme.category;
                }
                state.selectedValue = null;
                resetMarker('place');
                showScreen('screen-place');
                setupSemicircleInteraction('place');
            } else {
                // Le devin attend que le répondant place
                if (room.theme) {
                    document.getElementById('wo-theme-text').textContent = room.theme.text;
                    document.getElementById('wo-theme-cat').textContent = room.theme.category;
                }
                document.getElementById('wo-waiting-text').textContent = 'Le Répondant place son curseur...';
                showScreen('screen-wait-other');
            }
            break;

        case 'guessing':
            if (!isRespondent) {
                // Le devin devine
                if (room.theme) {
                    document.getElementById('guess-theme-text').textContent = room.theme.text;
                    document.getElementById('guess-theme-cat').textContent = room.theme.category;
                }
                state.selectedValue = null;
                resetMarker('guess');
                showScreen('screen-guess');
                setupSemicircleInteraction('guess');
            } else {
                // Le répondant attend
                if (room.theme) {
                    document.getElementById('wo-theme-text').textContent = room.theme.text;
                    document.getElementById('wo-theme-cat').textContent = room.theme.category;
                }
                document.getElementById('wo-waiting-text').textContent = 'Le Devin réfléchit...';
                showScreen('screen-wait-other');
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
// SCORES HEADERS — Mise à jour sur tous les écrans
// =============================================================================

function updateAllScoreHeaders(room) {
    const nameA = room.players?.playerA?.name || 'Joueur A';
    const nameB = room.players?.playerB?.name || 'Joueur B';
    const scoreA = room.players?.playerA?.score || 0;
    const scoreB = room.players?.playerB?.score || 0;
    const roundText = `${room.currentRound || 1}/${room.totalRounds || 10}`;

    // Tous les préfixes d'écrans avec score header
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

/**
 * Initialise les filtres de catégorie
 */
function initCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    container.innerHTML = CATEGORIES.map(cat => 
        `<button class="category-chip${cat === 'Toutes' ? ' active' : ''}" 
                 onclick="filterCategory('${cat}')">${cat}</button>`
    ).join('');
}

/**
 * Filtre les thèmes par catégorie
 * @param {string} category
 */
function filterCategory(category) {
    state.selectedCategory = category;

    // Mettre à jour l'UI des chips
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent === category);
    });

    renderThemeList();
}

/**
 * Affiche la liste des thèmes filtrés
 */
function renderThemeList() {
    const container = document.getElementById('theme-list');
    const themes = getThemesByCategory(state.selectedCategory);

    container.innerHTML = themes.map((theme, i) =>
        `<div class="theme-option" data-index="${i}" onclick="selectThemeOption(this, ${JSON.stringify(theme).replace(/"/g, '&quot;')})">
            ${theme.text}
        </div>`
    ).join('');
}

/**
 * Sélectionne un thème de la liste
 */
function selectThemeOption(el, theme) {
    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedTheme = theme;
    document.getElementById('custom-theme').value = '';
    document.getElementById('btn-confirm-theme').disabled = false;
}

/**
 * Sélectionne un thème aléatoire
 */
function selectRandomThemeUI() {
    const theme = getRandomTheme(state.selectedCategory);
    state.selectedTheme = theme;

    // Mettre en surbrillance le thème dans la liste
    document.querySelectorAll('.theme-option').forEach(o => {
        o.classList.toggle('selected', o.textContent.trim() === theme.text);
    });

    document.getElementById('custom-theme').value = '';
    document.getElementById('btn-confirm-theme').disabled = false;
    showToast(`Thème: "${theme.text.substring(0, 40)}..."`, 'info');
}

/**
 * Confirme le thème choisi et l'envoie à Firebase
 */
async function confirmTheme() {
    // Vérifier si c'est un thème personnalisé
    const customText = document.getElementById('custom-theme').value.trim();
    if (customText) {
        state.selectedTheme = { text: customText, category: 'Personnalisé' };
    }

    if (!state.selectedTheme) {
        showToast('Choisis ou écris un thème !', 'warning');
        return;
    }

    try {
        await getRoomRef(state.roomCode).update({
            theme: state.selectedTheme,
            status: 'placing',
            respondentPosition: null,
            guesserPosition: null,
        });
    } catch (error) {
        console.error('Erreur confirmation thème:', error);
        showToast('Erreur de synchronisation', 'error');
    }
}

// =============================================================================
// DEMI-CERCLE INTERACTIF
// =============================================================================

/**
 * Configure l'interaction avec le demi-cercle
 * @param {string} mode - "place" ou "guess"
 */
function setupSemicircleInteraction(mode) {
    const svg = document.getElementById(`${mode}-svg`);
    if (!svg) return;

    // Supprimer les anciens listeners
    const newSvg = svg.cloneNode(true);
    svg.parentNode.replaceChild(newSvg, svg);

    const handleInteraction = (event) => {
        event.preventDefault();
        const value = getValueFromEvent(newSvg, event);
        if (value !== null) {
            state.selectedValue = value;
            updateMarker(mode, value);
            updateValueDisplay(mode, value);

            // Activer le bouton de confirmation
            const btnId = mode === 'place' ? 'btn-confirm-place' : 'btn-confirm-guess';
            document.getElementById(btnId).disabled = false;
        }
    };

    // Mouse events
    newSvg.addEventListener('click', handleInteraction);
    newSvg.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) handleInteraction(e);
    });

    // Touch events
    newSvg.addEventListener('touchstart', handleInteraction, { passive: false });
    newSvg.addEventListener('touchmove', handleInteraction, { passive: false });
}

/**
 * Convertit un événement souris/touch en valeur 0-100 sur le demi-cercle
 * @param {SVGElement} svg
 * @param {Event} event
 * @returns {number|null} Valeur entre 0 et 100
 */
function getValueFromEvent(svg, event) {
    const rect = svg.getBoundingClientRect();
    const svgWidth = 400;
    const svgHeight = 230;

    // Position du clic relative au SVG
    let clientX, clientY;
    if (event.touches) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // Convertir en coordonnées SVG
    const x = ((clientX - rect.left) / rect.width) * svgWidth;
    const y = ((clientY - rect.top) / rect.height) * svgHeight;

    // Calculer l'angle par rapport au centre du demi-cercle
    const dx = x - ARC.centerX;
    const dy = ARC.centerY - y; // Y inversé en SVG

    // Angle en radians (0 = droite, PI = gauche)
    let angle = Math.atan2(dy, dx);

    // Limiter au demi-cercle (0° à 180°)
    if (angle < 0) return null; // En dessous du diamètre
    if (angle > Math.PI) angle = Math.PI;

    // Convertir: gauche (PI) = 0, droite (0) = 100
    const value = Math.round(((Math.PI - angle) / Math.PI) * 100);

    return Math.max(0, Math.min(100, value));
}

/**
 * Calcule la position (x, y) sur l'arc pour une valeur donnée
 * @param {number} value - Valeur de 0 à 100
 * @returns {{x: number, y: number}}
 */
function getPositionOnArc(value) {
    // value 0 = gauche (180°), value 100 = droite (0°)
    const angleRad = Math.PI - (value / 100) * Math.PI;
    return {
        x: ARC.centerX + ARC.radius * Math.cos(angleRad),
        y: ARC.centerY - ARC.radius * Math.sin(angleRad)
    };
}

/**
 * Met à jour le marqueur visuel sur le demi-cercle
 * @param {string} mode - "place" ou "guess"
 * @param {number} value - Valeur 0-100
 */
function updateMarker(mode, value) {
    const marker = document.getElementById(`${mode}-marker`);
    if (!marker) return;

    const pos = getPositionOnArc(value);
    marker.style.display = 'block';

    // Mettre à jour le cercle
    const dot = marker.querySelector('.marker-dot');
    dot.setAttribute('cx', pos.x);
    dot.setAttribute('cy', pos.y);

    // Mettre à jour la ligne pointillée vers le centre
    const line = marker.querySelector('.marker-line');
    line.setAttribute('x1', ARC.centerX);
    line.setAttribute('y1', ARC.centerY);
    line.setAttribute('x2', pos.x);
    line.setAttribute('y2', pos.y);

    // Mettre à jour le label
    const label = marker.querySelector('text');
    label.setAttribute('x', pos.x);
    label.setAttribute('y', pos.y);
    label.textContent = value;
}

/**
 * Réinitialise le marqueur
 */
function resetMarker(mode) {
    const marker = document.getElementById(`${mode}-marker`);
    if (marker) marker.style.display = 'none';
    document.getElementById(`${mode}-value`).textContent = '—';
}

/**
 * Met à jour l'affichage de la valeur numérique
 */
function updateValueDisplay(mode, value) {
    document.getElementById(`${mode}-value`).textContent = value;
}

// =============================================================================
// CONFIRMATION DES POSITIONS
// =============================================================================

/**
 * Confirme le placement du répondant
 */
async function confirmPlacement() {
    if (state.selectedValue === null) return;

    const btn = document.getElementById('btn-confirm-place');
    btn.disabled = true;
    btn.textContent = '✅ Position enregistrée !';

    try {
        await getRoomRef(state.roomCode).update({
            respondentPosition: state.selectedValue,
            status: 'guessing'
        });
    } catch (error) {
        console.error('Erreur placement:', error);
        showToast('Erreur de synchronisation', 'error');
        btn.disabled = false;
        btn.textContent = '✅ Confirmer ma position';
    }
}

/**
 * Confirme la devinette du devin
 */
async function confirmGuess() {
    if (state.selectedValue === null) return;

    const btn = document.getElementById('btn-confirm-guess');
    btn.disabled = true;
    btn.textContent = '🎯 Devinette envoyée !';

    try {
        // Lire la salle actuelle pour calculer le score
        const snap = await getRoomRef(state.roomCode).once('value');
        const room = snap.val();

        const respondentPos = room.respondentPosition;
        const guesserPos = state.selectedValue;
        const distance = Math.abs(respondentPos - guesserPos);
        const points = calculatePoints(distance);

        // Calculer le nouveau score du devin (le devin marque les points)
        const guesserRole = room.guesser;
        const currentScore = room.players[guesserRole]?.score || 0;
        const newScore = currentScore + points;

        // Préparer l'entrée historique
        const historyEntry = {
            round: room.currentRound,
            theme: room.theme?.text || 'Thème inconnu',
            respondent: room.respondent,
            respondentPos: respondentPos,
            guesserPos: guesserPos,
            distance: distance,
            points: points
        };

        // Récupérer l'historique existant
        const history = room.history || [];
        history.push(historyEntry);

        // Mettre à jour Firebase
        const updates = {
            guesserPosition: guesserPos,
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

// =============================================================================
// CALCUL DU SCORE
// =============================================================================

/**
 * Calcule les points selon l'écart
 * @param {number} distance - Écart absolu entre les deux positions
 * @returns {number} Points attribués
 */
function calculatePoints(distance) {
    if (distance <= 5) return 100;
    if (distance <= 10) return 75;
    if (distance <= 20) return 50;
    if (distance <= 30) return 25;
    return 0;
}

/**
 * Retourne la classe CSS selon le score
 * @param {number} points
 * @returns {string}
 */
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

/**
 * Affiche l'écran de révélation avec animations
 * @param {Object} room - Données de la salle
 */
function showRevealScreen(room) {
    if (state.currentScreen === 'screen-reveal') return; // Déjà affiché

    showScreen('screen-reveal');

    const respPos = room.respondentPosition;
    const guessPos = room.guesserPosition;
    const distance = Math.abs(respPos - guessPos);
    const points = calculatePoints(distance);

    // Thème
    document.getElementById('reveal-theme-text').textContent = room.theme?.text || '';
    document.getElementById('reveal-theme-cat').textContent = room.theme?.category || '';

    // Réinitialiser les marqueurs
    const markerResp = document.getElementById('reveal-marker-resp');
    const markerGuess = document.getElementById('reveal-marker-guess');
    const connectLine = document.getElementById('reveal-connect-line');

    markerResp.style.display = 'none';
    markerGuess.style.display = 'none';
    connectLine.style.display = 'none';

    // Noms dans les labels
    const respName = room.players[room.respondent]?.name || 'Répondant';
    const guessName = room.players[room.guesser]?.name || 'Devin';

    // Animation séquentielle
    setTimeout(() => {
        // 1. Apparition marqueur répondant
        const posResp = getPositionOnArc(respPos);
        markerResp.style.display = 'block';
        markerResp.querySelector('.marker-dot').setAttribute('cx', posResp.x);
        markerResp.querySelector('.marker-dot').setAttribute('cy', posResp.y);
        markerResp.querySelector('.marker-line').setAttribute('x1', ARC.centerX);
        markerResp.querySelector('.marker-line').setAttribute('y1', ARC.centerY);
        markerResp.querySelector('.marker-line').setAttribute('x2', posResp.x);
        markerResp.querySelector('.marker-line').setAttribute('y2', posResp.y);
        document.getElementById('reveal-resp-label').textContent = respPos;
        document.getElementById('reveal-resp-label').setAttribute('x', posResp.x);
        document.getElementById('reveal-resp-label').setAttribute('y', posResp.y);

        // Re-trigger animation
        markerResp.classList.remove('marker-reveal');
        void markerResp.offsetHeight;
        markerResp.classList.add('marker-reveal');
    }, 300);

    setTimeout(() => {
        // 2. Apparition marqueur devin
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
        // 3. Ligne de connexion
        const posResp = getPositionOnArc(respPos);
        const posGuess = getPositionOnArc(guessPos);
        connectLine.setAttribute('x1', posResp.x);
        connectLine.setAttribute('y1', posResp.y);
        connectLine.setAttribute('x2', posGuess.x);
        connectLine.setAttribute('y2', posGuess.y);
        connectLine.style.display = 'block';

        // Reset animation
        connectLine.classList.remove('connecting-line');
        void connectLine.offsetHeight;
        connectLine.classList.add('connecting-line');
    }, 1200);

    setTimeout(() => {
        // 4. Résultats numériques
        document.getElementById('reveal-resp-value').textContent = respPos;
        document.getElementById('reveal-guess-value').textContent = guessPos;
        document.getElementById('reveal-distance').textContent = distance;

        const pointsEl = document.getElementById('reveal-points');
        pointsEl.textContent = `+${points}`;
        pointsEl.className = `points ${getScoreClass(points)}`;

        document.getElementById('reveal-result').style.animation = 'none';
        void document.getElementById('reveal-result').offsetHeight;
        document.getElementById('reveal-result').style.animation = '';
    }, 1400);

    // Confetti si score parfait
    if (points === 100) {
        setTimeout(() => launchConfetti(), 1800);
    }

    // Bouton manche suivante : seulement pour le respondent (host de la manche)
    const isRespondent = room.respondent === state.playerRole;
    const btnNext = document.getElementById('btn-next-round');

    if (room.currentRound >= room.totalRounds) {
        btnNext.textContent = '🏆 Voir les résultats';
        btnNext.onclick = endGame;
    } else {
        btnNext.textContent = 'Manche suivante →';
        btnNext.onclick = nextRound;
    }

    // Les deux joueurs peuvent cliquer sur suivant
    btnNext.classList.remove('hidden');
}

// =============================================================================
// MANCHE SUIVANTE / FIN DE PARTIE
// =============================================================================

/**
 * Passe à la manche suivante en inversant les rôles
 */
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
            respondentPosition: null,
            guesserPosition: null,
            status: 'choosing_theme'
        });
    } catch (error) {
        console.error('Erreur manche suivante:', error);
        showToast('Erreur de synchronisation', 'error');
    }
}

/**
 * Termine la partie et affiche les résultats
 */
async function endGame() {
    try {
        await getRoomRef(state.roomCode).update({ status: 'finished' });
    } catch (error) {
        console.error('Erreur fin de partie:', error);
    }
}

/**
 * Affiche le tableau des scores final
 */
function showFinalScores(room) {
    showScreen('screen-scores');

    const nameA = room.players?.playerA?.name || 'Joueur A';
    const nameB = room.players?.playerB?.name || 'Joueur B';
    const scoreA = room.players?.playerA?.score || 0;
    const scoreB = room.players?.playerB?.score || 0;

    // Gagnant
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

    // Historique
    const historyContainer = document.getElementById('history-list');
    const history = room.history || [];
    historyContainer.innerHTML = history.map(entry => {
        const respName = room.players[entry.respondent]?.name || '?';
        const scoreClass = getScoreClass(entry.points);
        return `
            <div class="history-item">
                <span class="history-round">#${entry.round}</span>
                <span class="history-theme">${entry.theme}</span>
                <span class="history-positions">
                    <span style="color: var(--accent-tertiary)">${entry.respondentPos}</span>
                    /
                    <span style="color: var(--accent-warm)">${entry.guesserPos}</span>
                </span>
                <span class="history-score ${scoreClass}">+${entry.points}</span>
            </div>
        `;
    }).join('');

    // Confetti pour le gagnant
    launchConfetti();
}

// =============================================================================
// LANCEMENT DE PARTIE
// =============================================================================

/**
 * Lance la partie (uniquement par le joueur A)
 */
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

// =============================================================================
// REJOUER / RETOUR ACCUEIL
// =============================================================================

async function playAgain() {
    try {
        // Réinitialiser les scores et l'état
        await getRoomRef(state.roomCode).update({
            status: 'choosing_theme',
            currentRound: 1,
            respondent: 'playerA',
            guesser: 'playerB',
            theme: null,
            respondentPosition: null,
            guesserPosition: null,
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

/**
 * Tente de restaurer une session précédente (après rechargement de page)
 */
async function tryRestoreSession() {
    try {
        const saved = localStorage.getItem('demiCercle_session');
        if (!saved) return;

        const session = JSON.parse(saved);
        if (!session.roomCode || !session.playerRole) return;

        // Vérifier que la salle existe encore
        if (!database) return;

        const snap = await getRoomRef(session.roomCode).once('value');
        if (!snap.exists()) {
            clearSession();
            return;
        }

        const room = snap.val();
        
        // Vérifier que notre place est toujours là
        if (!room.players?.[session.playerRole]) {
            clearSession();
            return;
        }

        // Restaurer la session
        state.roomCode = session.roomCode;
        state.playerRole = session.playerRole;
        state.playerName = session.playerName;

        // Reconfigurer la présence
        setupPresence(state.roomCode, state.playerRole);
        await getPlayerRef(state.roomCode, state.playerRole).update({ connected: true });

        // Écouter les changements
        listenToRoom(state.roomCode);

        showToast('Session restaurée !', 'success');
    } catch (e) {
        console.warn('Impossible de restaurer la session:', e);
        clearSession();
    }
}

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Nettoie tous les listeners Firebase
 */
function cleanupListeners() {
    state.listeners.forEach(({ ref, event, callback }) => {
        ref.off(event, callback);
    });
    state.listeners = [];
}

/**
 * Copie le code de salle dans le presse-papier
 */
function copyRoomCode() {
    const code = state.roomCode;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        const toast = document.getElementById('copied-toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }).catch(() => {
        // Fallback
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

/**
 * Affiche un toast de notification
 * @param {string} message
 * @param {string} type - "info", "success", "warning", "error"
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-suppression après 3 secondes
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Lance une animation de confetti
 */
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

    // Nettoyer après l'animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// =============================================================================
// LISTENERS D'INPUTS
// =============================================================================

function setupInputListeners() {
    // Code de salle en majuscules automatiques
    const joinCode = document.getElementById('join-code');
    if (joinCode) {
        joinCode.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }

    // Thème personnalisé active le bouton
    const customTheme = document.getElementById('custom-theme');
    if (customTheme) {
        customTheme.addEventListener('input', (e) => {
            const hasText = e.target.value.trim().length > 0;
            document.getElementById('btn-confirm-theme').disabled = !hasText && !state.selectedTheme;
            if (hasText) {
                // Désélectionner les thèmes de la liste
                document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
                state.selectedTheme = null;
            }
        });
    }

    // Enter pour soumettre
    document.getElementById('create-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createRoom();
    });

    document.getElementById('join-code')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
}
