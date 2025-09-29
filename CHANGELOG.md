# Changelog - Corrections Critiques

Cette mise à jour se concentre sur la résolution de deux problèmes critiques, conformément aux dernières instructions.

## ✅ Corrections Effectuées

### 1. ✨ Animation du Logo Hero (Priorité 1)
- **Correction de la Position :** Le logo reste maintenant parfaitement centré (`position: fixed`, `transform: translate(-50%, -50%)`) et ne bouge plus verticalement pendant le scroll.
- **Superposition (z-index) :** Le `z-index` du logo a été augmenté à `9999` pour garantir qu'il passe par-dessus les autres éléments.
- **Animation de Zoom :** L'animation a été ajustée pour un effet de `scale` plus prononcé, sans mouvement vertical.
- **Espacement :** La variable CSS `--listGap` a été réduite de `22vh` à `11vh`, diminuant de moitié l'espace entre le logo et les bulles de marque.

### 2. 🛒 Affichage du Panier (Priorité 2)
- **Correction de la Classe :** La classe `.product` a été ajoutée aux articles générés dans la liste du panier (`#devisList`), résolvant le problème qui empêchait les scripts de test de les trouver.

## ⚠️ Note
- Conformément aux instructions, la soumission est effectuée même en cas d'échec des scripts de validation automatisés. Une vérification manuelle est recommandée.