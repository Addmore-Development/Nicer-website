# NiCER website (main site)

Plain HTML, CSS and JavaScript. No build step, no dependencies. Open `index.html`, or upload the whole folder to any static host.

## Structure
- `index.html`, `about.html`, `programmes.html`, `partners.html`, `get-involved.html`, `contact.html`, `404.html`
- `programmes/` holds the five programme pages
- `assets/css/styles.css` holds the whole design system (colour tokens are at the top of the file)
- `assets/js/main.js` handles the dropdown menus, mobile menu, tabs, hero animation and contact form
- `assets/img/` holds the logo variants and favicon; `assets/fonts/` holds the self-hosted fonts

## Brand colours (from the NiCER logo)
Navy `#032241` · Green `#95C21D` · Orange `#F38406`

## Platform links
The Notice Board, Academy and Creativity shop links point to `noticeboard.nicer.org`, `academy.nicer.org` and `shop.nicer.org`.
To change an address, search the folder for that address and replace it.
Sign in, Create an account and Admin dashboard are not live yet. They appear as `href="#" data-pending="..."` and show a short "will open here once the platform goes live" message.
When the real addresses exist, replace `href="#" data-pending="Sign in"` with the real `href` (search for `data-pending`).

## Partner logos
Partners currently show as text. To show a logo, replace the text with an image, for example in `index.html` and `partners.html`:
`<img src="assets/partners/sasol.svg" alt="Sasol" height="40">` inside the partner item. Use SVG or PNG with a transparent background.

## Contact form
There is no server. The form opens the visitor's email app with the message filled in. To receive messages directly, point the form at a form service.
