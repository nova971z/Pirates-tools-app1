import asyncio
from playwright.async_api import async_playwright, expect
import os
import mimetypes
import http.server
import socketserver
import threading
import time

# Use a less common port to avoid conflicts
PORT = 8888

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

def run_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

async def main():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))

        project_root = os.getcwd()

        async def handle_route(route):
            request = route.request
            url = request.url

            if f"http://localhost:{PORT}/Pirates-tools-app1/" in url:
                local_path = url.replace(f"http://localhost:{PORT}/Pirates-tools-app1/", "")
                file_path = os.path.join(project_root, local_path.split('?')[0])

                if os.path.exists(file_path):
                    mime_type, _ = mimetypes.guess_type(file_path)
                    if mime_type is None:
                        mime_type = 'application/octet-stream'

                    with open(file_path, 'rb') as f:
                        await route.fulfill(
                            status=200,
                            content_type=mime_type,
                            body=f.read()
                        )
                    return

            await route.continue_()

        await page.route(f"http://localhost:{PORT}/Pirates-tools-app1/**", handle_route)

        try:
            await page.goto(f"http://localhost:{PORT}/index.html", wait_until="networkidle")
            await expect(page.locator("h1#home-h1")).to_be_visible(timeout=10000)
            await page.wait_for_timeout(2000)

        except Exception as e:
            print(f"An error occurred during verification: {e}")

        finally:
            await page.screenshot(path="jules-scratch/verification/verification.png")

            print("--- BROWSER CONSOLE OUTPUT ---")
            if console_messages:
                for msg in console_messages:
                    print(msg)
            else:
                print("No console messages were captured.")
            print("------------------------------")

            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())