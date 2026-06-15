// =============================================================================
// firebase-config.js — Configuration Firebase Realtime Database
// Remplacez les valeurs ci-dessous par celles de votre projet Firebase
// =============================================================================

// ─── Configuration Firebase ───
// Rendez-vous sur https://console.firebase.google.com/
// Créez un projet → Realtime Database → Récupérez votre config
const firebaseConfig = {
    apiKey: "AIzaSyDxwWnaKzcua9HXbrw-tiJchfA1r_bQ14s",
    authDomain: "demicercle-db.firebaseapp.com",
    databaseURL: "https://demicercle-db-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "demicercle-db",
    storageBucket: "demicercle-db.firebasestorage.app",
    messagingSenderId: "684352788522",
    appId: "1:684352788522:web:b5cd50113fc84931938b53",
    measurementId: "G-FL814PNBKK"
};

// ─── Initialisation Firebase ───
let app, database;

try {
    app = firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log("✅ Firebase initialisé avec succès");
} catch (error) {
    console.error("❌ Erreur d'initialisation Firebase:", error);
    // On affichera un message à l'utilisateur dans app.js
}

// ─── Helpers Firebase ───

/**
 * Référence à une salle dans la base de données
 * @param {string} roomCode - Code de la salle
 * @returns {firebase.database.Reference}
 */
function getRoomRef(roomCode) {
    return database.ref(`rooms/${roomCode}`);
}

/**
 * Référence à un joueur dans une salle
 * @param {string} roomCode - Code de la salle
 * @param {string} playerRole - "playerA" ou "playerB"
 * @returns {firebase.database.Reference}
 */
function getPlayerRef(roomCode, playerRole) {
    return database.ref(`rooms/${roomCode}/players/${playerRole}`);
}

/**
 * Configure la détection de présence pour un joueur
 * Marque le joueur comme déconnecté quand il quitte la page
 * @param {string} roomCode - Code de la salle
 * @param {string} playerRole - "playerA" ou "playerB"
 */
function setupPresence(roomCode, playerRole) {
    const playerRef = getPlayerRef(roomCode, playerRole);
    const connectedRef = database.ref('.info/connected');

    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            // Marquer comme connecté
            playerRef.update({ connected: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });

            // En cas de déconnexion, marquer comme déconnecté
            playerRef.onDisconnect().update({
                connected: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
    });

    // Heartbeat toutes les 30 secondes
    setInterval(() => {
        playerRef.update({ lastSeen: firebase.database.ServerValue.TIMESTAMP });
    }, 30000);
}

/**
 * Génère un code de salle aléatoire de 6 caractères
 * @returns {string} Code alphanumérique majuscule
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 0, 1 pour éviter confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
