// =============================================================================
// themes.js — Bibliothèque de thèmes bien trash & hilarants
// Catégories exactes : Jeux videos, Sport, Internet, Absurde, Trash
// =============================================================================

const THEMES = [
    // ─── JEUX VIDÉOS ───
    { left: "Jeu plus injouable qu'un sudoku", right: "Jeu de l'année", category: "Jeux videos" },
    { left: "Gameplay à péter la manette", right: "Gameplay ultra addictif", category: "Jeux videos" },
    { left: "Communauté toxique", right: "Bonne communauté", category: "Jeux videos" },
    { left: "Pokémon horrible", right: "Pokémon légendaire", category: "Jeux videos" },
    { left: "Starter à chier", right: "Starter de rêve", category: "Jeux videos" },
    { left: "Shiny lamentable", right: "Shiny plus rare qu'une meuf fidèle", category: "Jeux videos" },
    { left: "Combat infâme", right: "Combat iconique", category: "Jeux videos" },

    // ─── SPORT ───
    { left: "Sport pour papy", right: "Meilleur Sport", category: "Sport" },
    { left: "Athlète qui court comme un canard ivre", right: "Bête de compétition", category: "Sport" },
    { left: "Match de Futsal D2", right: "Match légendaire", category: "Sport" },
    { left: "Équipe des beauvais", right: "Équipe de champions", category: "Sport" },
    { left: "Performance ridicule", right: "Performance de dieu vivant", category: "Sport" },
    { left: "Supporter de balais", right: "Supporter ultra violent", category: "Sport" },

    // ─── INTERNET ───
    { left: "Tréfonds d'internet", right: "Ref légendaire", category: "Internet" },
    { left: "Influenceur pas drôle", right: "Influenceur drôle", category: "Internet" }
    { left: "Culture du vide", right: "Contenu révolutionnaire", category: "Internet" },
    { left: "Vidéo TikTok insupportable", right: "Vidéo à voir en boucle", category: "Internet" },
    { left: "Influenceur problématique", right: "Influenceur lisse", category: "Internet" },


    // ─── ABSURDE ───
    { left: "Super-pouvoir inutile", right: "Super super-pouvoir", category: "Absurde" },
    { left: "Mort la plus pathétique possible", right: "Mort héroïque", category: "Absurde" },
    { left: "Apocalypse ridicule", right: "Apocalypse épique", category: "Absurde" },
    { left: "Animal que tu veux écraser avec ta voiture", right: "Animal adorable", category: "Absurde" },
    { left: "Fin du monde nulle", right: "Fin du monde spectaculaire", category: "Absurde" },
    { left: "Arme de survie inutile", right: "Indispensable face aux zombies", category: "Absurde" },
    { left: "Objet magique complètement con", right: "Artefact surpuissant", category: "Absurde" },

    // ─── TRASH ───
    { left: "Pire baise de toute ta vie", right: "Meilleur coup ever", category: "Trash" },
    { left: "Extrême gauche", right: "Extrême droite", category: "Trash" },
    { left: "Relation toxique", right: "Green flag", category: "Trash" },
    { left: "Contenu complètement dégénéré", right: "Contenu culte", category: "Trash" },
    { left: "Humour noir qui passe mal", right: "Blague légendaire", category: "Trash" },
];

// Liste des catégories exactes
const CATEGORIES = [
    "Toutes",
    "Jeux videos",
    "Sport",
    "Internet",
    "Absurde",
    "Trash"
];

/**
 * Filtre les thèmes par catégorie
 * @param {string} category - La catégorie à filtrer ("Toutes" pour tout)
 * @returns {Array} Les thèmes filtrés
 */
function getThemesByCategory(category) {
    if (category === "Toutes") return [...THEMES];
    return THEMES.filter(t => t.category === category);
}

/**
 * Tire un thème aléatoire, optionnellement filtré par catégorie
 * @param {string} [category="Toutes"] - La catégorie
 * @returns {Object} Un thème aléatoire {left, right, category}
 */
function getRandomTheme(category = "Toutes") {
    const filtered = getThemesByCategory(category);
    return filtered[Math.floor(Math.random() * filtered.length)];
}