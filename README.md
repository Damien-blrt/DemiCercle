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
