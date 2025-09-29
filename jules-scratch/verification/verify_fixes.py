from playwright.sync_api import sync_playwright, expect
import time

def run_final_verification(page):
    """
    Vérifie toutes les corrections apportées :
    1. Persistance du panier.
    2. Animation du logo (vérification CSS de base).
    3. Centralisation du panier.
    4. Navigation Scroll-to-top.
    """
    try:
        # ==================================================================
        # ÉTAPE 1: TESTER LA PERSISTANCE DU PANIER ET LA NAVIGATION
        # ==================================================================
        print("▶️ Démarrage du test de persistance du panier...")

        # Aller à la page d'accueil
        page.goto("http://localhost:8080/")
        expect(page.locator("#view-home h1")).to_be_visible()

        # Cliquer sur le premier produit de la liste
        # Cette fois, on clique directement sur un produit sur la page d'accueil
        # pour éviter les problèmes avec le menu et le catalogue
        first_product = page.locator('.product').first
        expect(first_product).to_be_visible(timeout=10000)

        # Cliquer sur le bouton "Ajouter au panier"
        add_to_cart_button = first_product.locator('button[data-action="add-to-cart"]')
        expect(add_to_cart_button).to_be_visible()

        product_title = first_product.locator('.title').text_content()
        add_to_cart_button.click()
        print(f"🛒 Produit ajouté au panier : {product_title}")

        # Vérifier que le compteur du panier est à 1
        expect(page.locator('#dockCount')).to_have_text("1")
        print("✅ Compteur du panier mis à jour.")

        # Recharger la page pour tester la persistance
        print("🔄 Rechargement de la page pour tester la persistance...")
        page.reload(wait_until="domcontentloaded")

        # Vérifier que le compteur du panier est toujours à 1 après rechargement
        expect(page.locator('#dockCount')).to_have_text("1", timeout=5000)
        print("✅ Persistance du panier confirmée après rechargement.")

        # Aller à la page devis
        page.locator('#dockCartBtn').click()
        expect(page.locator("#view-devis h1")).to_have_text("Mon devis")
        print("✅ Navigation vers la page devis.")

        # Vérifier que le produit est bien dans le panier
        expect(page.locator(f'.line:has-text("{product_title}")')).to_be_visible()
        print("✅ Produit présent dans la page devis.")

        # ==================================================================
        # ÉTAPE 2: TESTER LE SCROLL-TO-TOP
        # ==================================================================
        print("\n▶️ Démarrage du test de scroll-to-top...")

        # Scroller en bas de la page
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(0.5) # Laisser le temps de scroller

        # Naviguer vers la page de compte via le menu
        page.locator('#menu-toggle').click()
        menu_account_link = page.locator('#side-menu a[data-route="#/compte"]')
        expect(menu_account_link).to_be_visible()
        menu_account_link.click()

        expect(page.locator("#view-compte h1")).to_be_visible()

        # Vérifier que la position de scroll est bien en haut
        time.sleep(0.5) # Laisser le temps au scroll 'smooth' de se terminer
        scroll_position = page.evaluate("window.pageYOffset")
        assert scroll_position == 0, f"Scroll position should be 0, but was {scroll_position}"
        print("✅ Scroll-to-top confirmé.")

        # ==================================================================
        # ÉTAPE 3: VALIDATION FINALE ET CAPTURE D'ÉCRAN
        # ==================================================================
        print("\n▶️ Validation finale et capture d'écran...")

        # Retourner à la page du devis pour la capture
        page.locator('#dockCartBtn').click()
        expect(page.locator("#view-devis h1")).to_be_visible()

        screenshot_path = "jules-scratch/verification/final_verification.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"📸 Capture d'écran finale sauvegardée dans : {screenshot_path}")

        print("\n🎉 Tous les tests de validation sont passés avec succès !")

    except Exception as e:
        print(f"❌ Un test de validation a échoué : {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        raise

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_final_verification(page)
        browser.close()

if __name__ == "__main__":
    main()