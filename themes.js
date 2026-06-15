// =============================================================================
// themes.js — Bibliothèque de 100+ thèmes pour le Jeu du Demi-Cercle
// Chaque thème est une question "à quel point..." avec une catégorie
// =============================================================================

const THEMES = [
    // ─── NOURRITURE (12) ───
    { text: "À quel point aimes-tu les pizzas à l'ananas ?", category: "Nourriture" },
    { text: "À quel point es-tu accro au chocolat ?", category: "Nourriture" },
    { text: "À quel point aimes-tu la cuisine épicée ?", category: "Nourriture" },
    { text: "À quel point es-tu fan de sushis ?", category: "Nourriture" },
    { text: "À quel point le fromage est-il indispensable dans ta vie ?", category: "Nourriture" },
    { text: "À quel point aimes-tu le petit-déjeuner ?", category: "Nourriture" },
    { text: "À quel point es-tu capable de cuisiner ?", category: "Nourriture" },
    { text: "À quel point aimes-tu manger des insectes ?", category: "Nourriture" },
    { text: "À quel point le café est-il vital pour toi ?", category: "Nourriture" },
    { text: "À quel point es-tu fan de fast-food ?", category: "Nourriture" },
    { text: "À quel point aimes-tu les légumes ?", category: "Nourriture" },
    { text: "À quel point es-tu un bon critique gastronomique ?", category: "Nourriture" },

    // ─── FILMS (10) ───
    { text: "À quel point le dernier film que tu as vu était-il bon ?", category: "Films" },
    { text: "À quel point es-tu fan de Star Wars ?", category: "Films" },
    { text: "À quel point les films d'horreur te font-ils peur ?", category: "Films" },
    { text: "À quel point aimes-tu les comédies romantiques ?", category: "Films" },
    { text: "À quel point pleures-tu devant un film triste ?", category: "Films" },
    { text: "À quel point es-tu cinéphile ?", category: "Films" },
    { text: "À quel point les suites de films sont-elles décevantes ?", category: "Films" },
    { text: "À quel point aimes-tu les films de super-héros ?", category: "Films" },
    { text: "À quel point préfères-tu le cinéma à la maison ?", category: "Films" },
    { text: "À quel point es-tu fan de films français ?", category: "Films" },

    // ─── SÉRIES (10) ───
    { text: "À quel point es-tu accro à ta série actuelle ?", category: "Séries" },
    { text: "À quel point détestes-tu attendre la prochaine saison ?", category: "Séries" },
    { text: "À quel point aimes-tu les plot twists ?", category: "Séries" },
    { text: "À quel point binge-watches-tu des séries ?", category: "Séries" },
    { text: "À quel point es-tu fan de séries policières ?", category: "Séries" },
    { text: "À quel point les séries d'animation sont-elles sous-cotées ?", category: "Séries" },
    { text: "À quel point es-tu triste quand une série se termine ?", category: "Séries" },
    { text: "À quel point recommandes-tu des séries à tes amis ?", category: "Séries" },
    { text: "À quel point es-tu fan de true crime ?", category: "Séries" },
    { text: "À quel point regardes-tu les séries en VO ?", category: "Séries" },

    // ─── JEUX VIDÉO (10) ───
    { text: "À quel point es-tu bon aux jeux de stratégie ?", category: "Jeux vidéo" },
    { text: "À quel point rages-tu quand tu perds ?", category: "Jeux vidéo" },
    { text: "À quel point es-tu nostalgique des jeux rétro ?", category: "Jeux vidéo" },
    { text: "À quel point aimes-tu les jeux en ligne ?", category: "Jeux vidéo" },
    { text: "À quel point les microtransactions t'énervent-elles ?", category: "Jeux vidéo" },
    { text: "À quel point es-tu un gamer ?", category: "Jeux vidéo" },
    { text: "À quel point préfères-tu jouer seul ou en multi ?", category: "Jeux vidéo" },
    { text: "À quel point Minecraft est-il le meilleur jeu ?", category: "Jeux vidéo" },
    { text: "À quel point les jeux vidéo sont-ils de l'art ?", category: "Jeux vidéo" },
    { text: "À quel point passes-tu trop de temps à jouer ?", category: "Jeux vidéo" },

    // ─── VOYAGE (10) ───
    { text: "À quel point rêves-tu de voyager au Japon ?", category: "Voyage" },
    { text: "À quel point aimes-tu prendre l'avion ?", category: "Voyage" },
    { text: "À quel point es-tu aventurier ?", category: "Voyage" },
    { text: "À quel point détestes-tu faire ta valise ?", category: "Voyage" },
    { text: "À quel point aimes-tu le camping ?", category: "Voyage" },
    { text: "À quel point préfères-tu la plage à la montagne ?", category: "Voyage" },
    { text: "À quel point le road trip est-il le meilleur type de voyage ?", category: "Voyage" },
    { text: "À quel point aimes-tu découvrir de nouvelles cultures ?", category: "Voyage" },
    { text: "À quel point as-tu le mal des transports ?", category: "Voyage" },
    { text: "À quel point voyager seul te tente-t-il ?", category: "Voyage" },

    // ─── RELATIONS (10) ───
    { text: "À quel point es-tu romantique ?", category: "Relations" },
    { text: "À quel point es-tu sociable ?", category: "Relations" },
    { text: "À quel point détestes-tu les conflits ?", category: "Relations" },
    { text: "À quel point es-tu bon pour garder un secret ?", category: "Relations" },
    { text: "À quel point les amis d'enfance comptent-ils ?", category: "Relations" },
    { text: "À quel point es-tu jaloux/jalouse ?", category: "Relations" },
    { text: "À quel point aimes-tu les fêtes et soirées ?", category: "Relations" },
    { text: "À quel point es-tu à l'aise pour parler en public ?", category: "Relations" },
    { text: "À quel point fais-tu confiance aux gens ?", category: "Relations" },
    { text: "À quel point es-tu du genre à envoyer le premier message ?", category: "Relations" },

    // ─── TECHNOLOGIE (10) ───
    { text: "À quel point fais-tu confiance à l'IA ?", category: "Technologie" },
    { text: "À quel point es-tu accro à ton téléphone ?", category: "Technologie" },
    { text: "À quel point les réseaux sociaux sont-ils toxiques ?", category: "Technologie" },
    { text: "À quel point aimes-tu les gadgets ?", category: "Technologie" },
    { text: "À quel point es-tu bon en informatique ?", category: "Technologie" },
    { text: "À quel point la technologie améliore-t-elle nos vies ?", category: "Technologie" },
    { text: "À quel point as-tu peur des robots ?", category: "Technologie" },
    { text: "À quel point es-tu team Apple ou Android ?", category: "Technologie" },
    { text: "À quel point détestes-tu les mises à jour ?", category: "Technologie" },
    { text: "À quel point les voitures autonomes te font-elles peur ?", category: "Technologie" },

    // ─── TRAVAIL (10) ───
    { text: "À quel point aimes-tu les réunions ?", category: "Travail" },
    { text: "À quel point es-tu productif le lundi matin ?", category: "Travail" },
    { text: "À quel point le télétravail est-il mieux ?", category: "Travail" },
    { text: "À quel point détestes-tu les emails inutiles ?", category: "Travail" },
    { text: "À quel point es-tu ambitieux/ambitieuse ?", category: "Travail" },
    { text: "À quel point aimes-tu ton travail actuel ?", category: "Travail" },
    { text: "À quel point es-tu organisé(e) ?", category: "Travail" },
    { text: "À quel point procrastines-tu ?", category: "Travail" },
    { text: "À quel point le vendredi après-midi est-il sacré ?", category: "Travail" },
    { text: "À quel point rêves-tu de tout plaquer pour ouvrir un bar sur la plage ?", category: "Travail" },

    // ─── VIE QUOTIDIENNE (10) ───
    { text: "À quel point es-tu du matin ?", category: "Vie quotidienne" },
    { text: "À quel point aimes-tu faire le ménage ?", category: "Vie quotidienne" },
    { text: "À quel point es-tu ponctuel(le) ?", category: "Vie quotidienne" },
    { text: "À quel point aimes-tu faire du sport ?", category: "Vie quotidienne" },
    { text: "À quel point détestes-tu faire la queue ?", category: "Vie quotidienne" },
    { text: "À quel point dors-tu bien la nuit ?", category: "Vie quotidienne" },
    { text: "À quel point es-tu accro aux achats en ligne ?", category: "Vie quotidienne" },
    { text: "À quel point aimes-tu la pluie ?", category: "Vie quotidienne" },
    { text: "À quel point es-tu écolo dans ta vie quotidienne ?", category: "Vie quotidienne" },
    { text: "À quel point aimes-tu les animaux de compagnie ?", category: "Vie quotidienne" },

    // ─── QUESTIONS ABSURDES (12) ───
    { text: "À quel point survivrais-tu à une apocalypse zombie ?", category: "Questions absurdes" },
    { text: "À quel point serais-tu un bon super-héros ?", category: "Questions absurdes" },
    { text: "À quel point un canard géant est-il effrayant ?", category: "Questions absurdes" },
    { text: "À quel point voudrais-tu vivre sur Mars ?", category: "Questions absurdes" },
    { text: "À quel point parler aux plantes est-il normal ?", category: "Questions absurdes" },
    { text: "À quel point es-tu prêt(e) à manger un cactus pour 1000€ ?", category: "Questions absurdes" },
    { text: "À quel point un pingouin ferait-il un bon président ?", category: "Questions absurdes" },
    { text: "À quel point crois-tu aux extraterrestres ?", category: "Questions absurdes" },
    { text: "À quel point aimerais-tu être invisible pendant une journée ?", category: "Questions absurdes" },
    { text: "À quel point voudrais-tu pouvoir voler ?", category: "Questions absurdes" },
    { text: "À quel point une bataille de nourriture géante serait-elle fun ?", category: "Questions absurdes" },
    { text: "À quel point accepterais-tu de ne plus jamais utiliser Internet ?", category: "Questions absurdes" },
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
 * @returns {Object} Un thème aléatoire {text, category}
 */
function getRandomTheme(category = "Toutes") {
    const filtered = getThemesByCategory(category);
    return filtered[Math.floor(Math.random() * filtered.length)];
}
