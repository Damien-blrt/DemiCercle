// =============================================================================
// themes.js — Bibliothèque de thèmes avec pôles opposés
// Chaque thème possède un pôle gauche (0%) et un pôle droit (100%)
// =============================================================================

const THEMES = [
    // ─── NOURRITURE ───
    { left: "Pire nourriture", right: "Meilleure nourriture", category: "Nourriture" },
    { left: "Plat fade", right: "Explosion de saveurs", category: "Nourriture" },
    { left: "Infecte", right: "Délicieux", category: "Nourriture" },
    { left: "Trop cuit", right: "Cuisson parfaite", category: "Nourriture" },
    { left: "Répugnant", right: "Appétissant", category: "Nourriture" },
    { left: "À jeter", right: "Digne d'un étoilé", category: "Nourriture" },

    // ─── FILMS / SÉRIES ───
    { left: "Film catastrophique", right: "Chef-d'œuvre", category: "Films" },
    { left: "Acteurs épouvantables", right: "Prestation aux Oscars", category: "Films" },
    { left: "Pire fin possible", right: "Fin mémorable", category: "Films" },
    { left: "Série ennuyeuse", right: "Binge-watching immédiat", category: "Séries" },
    { left: "Saison ratée", right: "Meilleure saison", category: "Séries" },
    { left: "Effets spéciaux ridicules", right: "Visuellement bluffant", category: "Films" },

    // ─── JEUX VIDÉO ───
    { left: "Jeu injouable", right: "Jeu de l'année", category: "Jeux vidéo" },
    { left: "Gameplay frustrant", right: "Gameplay addictif", category: "Jeux vidéo" },
    { left: "Histoire inexistante", right: "Scénario captivant", category: "Jeux vidéo" },
    { left: "Pire communauté", right: "Communauté en or", category: "Jeux vidéo" },

    // ─── VOYAGE ───
    { left: "Pire destination", right: "Voyage de rêve", category: "Voyage" },
    { left: "Cauchemar logistique", right: "Séjour parfait", category: "Voyage" },
    { left: "Hôtel miteux", right: "Palace", category: "Voyage" },
    { left: "Enfer touristique", right: "Paradis caché", category: "Voyage" },

    // ─── TECHNOLOGIE ───
    { left: "Inutile", right: "Révolutionnaire", category: "Technologie" },
    { left: "Obsolète", right: "Futuriste", category: "Technologie" },
    { left: "Pire invention", right: "Invention du siècle", category: "Technologie" },
    { left: "Cauchemar pour la vie privée", right: "Totalement sécurisé", category: "Technologie" },

    // ─── VIE QUOTIDIENNE / TRAVAIL ───
    { left: "Pire corvée", right: "Plaisir coupable", category: "Vie quotidienne" },
    { left: "Journée cauchemardesque", right: "Journée parfaite", category: "Vie quotidienne" },
    { left: "Tâche épuisante", right: "Tâche relaxante", category: "Travail" },
    { left: "Job détestable", right: "Métier de rêve", category: "Travail" },
    { left: "Collègue toxique", right: "Collègue en or", category: "Travail" },

    // ─── RELATIONS ───
    { left: "Pire défaut", right: "Meilleure qualité", category: "Relations" },
    { left: "Comportement inacceptable", right: "Comportement exemplaire", category: "Relations" },
    { left: "Pire tue-l'amour", right: "Totalement irrésistible", category: "Relations" },
    { left: "Sujet de dispute", right: "Sujet passionnant", category: "Relations" },

    // ─── DIVERS / ABSURDE ───
    { left: "Super-pouvoir inutile", right: "Super-pouvoir ultime", category: "Questions absurdes" },
    { left: "Arme de survie inutile", right: "Indispensable face aux zombies", category: "Questions absurdes" },
    { left: "Pire mort possible", right: "Mort héroïque", category: "Questions absurdes" },
    { left: "Animal terrifiant", right: "Animal adorable", category: "Questions absurdes" },
    { left: "Pire objet magique", right: "Meilleur objet magique", category: "Questions absurdes" }
];

// Liste des catégories disponibles
const CATEGORIES = [
    "Toutes",
    "Nourriture",
    "Films",
    "Séries",
    "Jeux vidéo",
    "Voyage",
    "Relations",
    "Technologie",
    "Travail",
    "Vie quotidienne",
    "Questions absurdes"
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
