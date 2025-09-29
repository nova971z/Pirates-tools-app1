# Changelog - Réparation et Harmonisation du Script Web

## Version 2.0.1 (2025-09-29)

### 🐛 Corrections de Bugs

*   **Correction des Erreurs de Syntaxe JavaScript :**
    *   Correction des guillemets typographiques (`’` et `”`) par des guillemets standards (`'` et `"`) dans `app.js` pour éviter les erreurs de parsing.
    *   Correction de la logique de la fonction `escapeHtml` qui n'échappait pas correctement les caractères HTML.
*   **Correction de l'Animation du Logo :**
    *   Correction du `z-index` et du positionnement du logo principal pour qu'il s'affiche correctement au-dessus des autres éléments.
    *   Correction de la transition de l'animation pour la rendre plus fluide.
    *   Suppression du logo d'arrière-plan qui s'affichait sur toutes les pages.
*   **Correction de l'Espacement :**
    *   Réduction de l'espacement excessif sous le logo en ajustant la variable `--listGap` et en supprimant les marges inutiles.
*   **Correction de la Navigation :**
    *   Ajout d'un `window.scrollTo(0, 0)` au début des fonctions de navigation pour que chaque nouvelle vue s'affiche en haut de la page.

### 🔄 Améliorations

*   **Réparation du Système de Panier :**
    *   Unification de la logique de persistance pour n'utiliser qu'une seule clé `localStorage` (`pt_cart`) et ainsi éliminer les incohérences.
    *   Réparation du bouton "Ajouter au panier" sur la fiche produit, qui était non fonctionnel à cause d'une logique de contournement trop complexe.
    *   Suppression des fonctions de débogage inutiles.

### ✅ Validation

*   **Validation HTML :** La structure sémantique a été vérifiée et est conforme aux standards HTML5.
*   **Validation CSS :** Les styles ont été corrigés et s'appliquent correctement.
*   **Test JavaScript :** Les erreurs de syntaxe ont été corrigées et les fonctionnalités sont de nouveau opérationnelles.
*   **Test d’Intégration :** Les trois fichiers (HTML, CSS, JS) fonctionnent maintenant de manière cohérente et sans erreurs dans la console.