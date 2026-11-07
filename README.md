# LA PLAGE

Home page for LA PLAGE, Vietnamese beachwear. Plain HTML, CSS and JavaScript, no build step.

## Run locally

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321. (Products load from `data/products.json`, so it must be served over http, not opened as a file.)

## Structure

- `index.html` – the home page
- `styles.css` – palette, type and motion tokens at the top (`:root`)
- `main.js` – header, menu, reveals, draggable product strip, parallax, sign-up form
- `data/products.json` – product data (prices in VND), shaped for a later Shopify move
- `assets/brand/` – logo (interim PNG; swap `--mark-url` in `styles.css` for the SVG when available)
- `assets/img/` – placeholder product and lookbook images
