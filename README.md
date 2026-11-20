# NiCER website (main site)

Plain HTML, CSS and JavaScript. No build step, no dependencies. Open `index.html`, or upload the whole folder to any static host.

## Structure
- `index.html`, `about.html`, `programmes.html`, `partners.html`, `get-involved.html`, `contact.html`, `404.html`
- `programmes/` holds the five programme pages
- `assets/css/styles.css` holds the whole design system (colour tokens are at the top of the file)
- `assets/js/main.js` handles the dropdown menus, mobile menu, tabs, hero animation and contact form
- `assets/img/` holds the logo variants and favicon; `assets/fonts/` holds the self-hosted fonts (Montserrat, Lato)

## Brand colours (from the NiCER logo)
Navy `#032241` · Green `#95C21D` · Orange `#F38406`

## Platform links
The Notice Board, Academy and Marketplace links point to `noticeboard.nicer.org`, `academy.nicer.org` and `marketplace.nicer.org`.
To change an address, search the folder for that address and replace it.
Sign in, Create an account and Admin dashboard are not live yet. They appear as `href="#" data-pending="..."` and show a short "will open here once the platform goes live" message.
When the real addresses exist, replace `href="#" data-pending="Sign in"` with the real `href` (search for `data-pending`).

## Partner logos
Partners currently show as text. To show a logo, replace the text with an image, for example in `index.html` and `partners.html`:
`<img src="assets/partners/sasol.svg" alt="Sasol" height="40">` inside the partner item. Use SVG or PNG with a transparent background.

## Contact form
There is no server. The form opens the visitor's email app with the message filled in. To receive messages directly, point the form at a form service.


## Notice Board, sign in and admin (Supabase)
New files: `signin.html`, `noticeboard.html`, `admin.html`, `assets/js/{supabase-config,auth,signin,noticeboard,admin}.js`, `assets/css/app.css`, `supabase/schema.sql`.
1. Create a Supabase project, then run `supabase/schema.sql` in the SQL Editor.
2. Put the project URL and anon key in `assets/js/supabase-config.js` (never the service_role key).
3. In Supabase → Authentication → URL Configuration, add the site's address (and `http://localhost:PORT` for testing) to Site URL / Redirect URLs.
4. Create an account on `signin.html`, then make it an admin with the SQL at the bottom of `schema.sql`.
Admins add and manage notices at `admin.html`. Signed-in members read them at `noticeboard.html`. Security is enforced by Row Level Security, not by the pages.
The nav "Sign in", "Create an account" and "Admin dashboard" links now point at these pages. All "Notice Board" links now point at `noticeboard.html`. Signed-out visitors are sent to `signin.html` and returned to the board after signing in. "Share an opportunity" points to the contact page, since only admins post notices.

## Fonts
Body text is Montserrat (variable) and headings are Lato Bold 700, both self-hosted in `assets/fonts/`. They are set by `--font-ui` and `--font-display` at the top of `assets/css/styles.css`.

## Psychometric test
`assessment.html` + `assets/js/assessment.js`. Fifteen statements (3 per programme) on a 5-point scale; the programme with the highest score is recommended, and near-ties are shown as "also a strong fit". Questions, programme descriptions and the start links are at the top of `assessment.js`. Nothing is stored or sent. It is linked from the "Get started" block at the end of the relevant programme pages, not from the main navigation.


## v2: News and Events, partner logos, new admin dashboard
- **News & Events**: `news.html` + `assets/js/news.js` (reads published rows from the `news` table). Added to the menu, mobile menu and footer on every page.
- **Partner logos**: upload them in Admin > Partner logos (stored in Supabase Storage), or drop files in `assets/partners/` (see the README there). Home strip and Partners page both pick them up.
- **Admin**: `admin.html` + `assets/css/admin.css` + `assets/js/admin.js`. Views: Dashboard, Notice Board, News & Events, Partner logos, Sign-ups, Reports (CSV exports).
- **Mobile logo**: pages declare `color-scheme: only light`, and the open mobile menu uses the white logo on a navy card.
- **Database**: run the updated `supabase/schema.sql` once (adds `news`, `partners`, and the `site-media` storage bucket).