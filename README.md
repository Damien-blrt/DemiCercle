# 🎯 Demi-Cercle — Le Jeu de Devinettes

Jeu multijoueur en temps réel pour 2 joueurs. Devinez la position de votre adversaire sur un demi-cercle !

## 🎮 Comment jouer

1. **Joueur A** crée une partie et partage le code de 6 caractères
2. **Joueur B** rejoint avec ce code
3. Le **Répondant** choisit un thème et place secrètement son curseur (0-100)
4. Le **Devin** essaie de deviner la position
5. **Révélation** : découvrez l'écart et gagnez des points !
6. Les rôles s'inversent à chaque manche

### Barème des points

| Écart | Points |
|-------|--------|
| 0 à 5 | 🟢 100 points |
| 6 à 10 | 🔵 75 points |
| 11 à 20 | 🟡 50 points |
| 21 à 30 | 🟠 25 points |
| 31+ | 🔴 0 point |

---

## 🚀 Déploiement

### Étape 1 : Configurer Firebase

1. Rendez-vous sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez **Ajouter un projet** → Nommez-le (ex: "demi-cercle-jeu")
3. Désactivez Google Analytics (optionnel) → **Créer le projet**
4. Dans le menu à gauche : **Build → Realtime Database**
5. Cliquez **Créer une base de données**
6. Choisissez l'emplacement (Europe recommandé : `europe-west1`)
7. Sélectionnez **Démarrer en mode test** → **Activer**

### Étape 2 : Récupérer la configuration

1. Allez dans **⚙️ Paramètres du projet** (icône engrenage en haut à gauche)
2. Descendez à **Vos applications** → Cliquez l'icône **Web** (`</>`)
3. Nommez l'app (ex: "demi-cercle") → **Enregistrer l'application**
4. Copiez l'objet `firebaseConfig` affiché
5. Remplacez les valeurs dans le fichier `firebase-config.js` :

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",              // ← Votre clé API
    authDomain: "votre-projet.firebaseapp.com",
    databaseURL: "https://votre-projet-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "votre-projet",
    storageBucket: "votre-projet.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

### Étape 3 : Configurer les règles de sécurité

Dans Firebase Console → Realtime Database → **Règles**, collez :

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> ⚠️ Ces règles sont ouvertes pour le développement. Pour la production, ajoutez des validations.

### Étape 4 : Déployer sur GitHub Pages

1. Créez un repository GitHub (ex: `demi-cercle`)
2. Poussez les fichiers :

```bash
git init
git add .
git commit -m "🎯 Jeu du Demi-Cercle"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/demi-cercle.git
git push -u origin main
```

3. Sur GitHub → **Settings** → **Pages**
4. Source : **Deploy from a branch** → `main` → `/ (root)`
5. Cliquez **Save**
6. Attendez 1-2 minutes → Votre jeu est en ligne à `https://VOTRE_USER.github.io/demi-cercle/`

---

## 📁 Structure des fichiers

```
DemiCercle/
├── index.html          → Structure HTML (SPA avec sections)
├── style.css           → Design dark mode, glassmorphism, animations
├── app.js              → Logique de jeu, Firebase sync, SVG interaction
├── firebase-config.js  → Configuration Firebase + helpers
├── themes.js           → 104 thèmes en 10 catégories
└── README.md           → Ce fichier
```

## 🛠️ Technologies

- **HTML5 / CSS3 / JavaScript ES6+** — Aucun framework
- **Firebase Realtime Database** — Synchronisation temps réel
- **SVG** — Demi-cercle interactif
- **CSS Glassmorphism** — Design moderne
- **Google Fonts** — Outfit + Inter

## 📝 Licence

MIT — Utilisez et modifiez librement !
