# Launch checklist for john-beno.com

Total running cost: the domain, about $11 a year. Everything else is free.
Do the steps in order. Each one takes 5 to 15 minutes.

---

## Before launch: things only you can fill in

These live in `src/site.config.ts`.

- [ ] **Impressum address** (`legal.address`). German law (§ 5 DDG) requires a
      postal address that can receive mail on a site that presents your professional
      work. Options:
      1. Your home address (your current CV already contains it).
      2. An "Impressum service" / c/o address from a provider (about €5–15/month).
      3. Your parents' address, if you are registered there.
      A P.O. box is not allowed. The build prints a warning until this is set.
- [ ] **Profiles** (`profiles`). Add LinkedIn first, then GitHub, Instagram, Behance,
      Dribbble or whatever you use. These links appear in the footer and tell Google
      the profiles are yours.
- [ ] **CV PDF** (`public/files/john-beno-lakshman-cv.pdf`). The current one still
      points to the old Framer address and shows your home address and phone number.
      Export an updated version with `john-beno.com` and replace the file.

---

## 1. Put the code on GitHub

1. Create a free account at github.com (if you don't have one) and turn on
   two-factor authentication.
2. Create a new repository called `john-beno-portfolio` (no README, no license).
3. Either ask Claude to push it for you (attach the repository to the session), or
   run these commands in this folder:

```bash
git remote add origin https://github.com/YOUR-USERNAME/john-beno-portfolio.git
```

```bash
git push -u origin main
```

## 2. Buy the domain

1. Create a Cloudflare account at dash.cloudflare.com and turn on two-factor
   authentication (My Profile → Authentication).
2. Go to **Domain Registration → Register Domains**, search `john-beno.com` and buy it.
   Cloudflare charges the wholesale price with no markup. Leave **auto-renew** on.

## 3. Connect Cloudflare to GitHub (automatic deploys)

1. In Cloudflare go to **Workers & Pages → Create → Import a repository**.
2. Connect your GitHub account and pick `john-beno-portfolio`.
3. Settings:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy` (the default)
   - Everything else can stay as it is. `wrangler.jsonc` in this folder tells
     Cloudflare to serve the `dist` folder as a static site.
4. Click **Deploy**. After about a minute the site is live on a `*.workers.dev` address.

From now on, every `git push` to `main` updates the live site in about a minute.
Pushes to other branches get their own preview link.

## 4. Attach the domain

1. Open the Worker → **Settings → Domains & Routes → Add → Custom domain**.
2. Add `john-beno.com`, then add `www.john-beno.com` as well.
3. Send `www` to the bare domain: **Rules → Redirect Rules → Create rule → template
   "Redirect from WWW to root"**. Keep "Preserve query string" ticked.

SSL certificates are created automatically.

## 5. Tell Google and Bing (the most important step for search)

1. Go to search.google.com/search-console → **Add property → Domain** → enter
   `john-beno.com`. Choose Cloudflare as the provider and let it add the TXT record.
2. In the new property: **Sitemaps** → submit `https://john-beno.com/sitemap-index.xml`.
3. **URL Inspection** → enter `https://john-beno.com/` → **Request indexing**.
   Repeat for `/about` and each case study.
4. Go to bing.com/webmasters → **Import from Google Search Console**. One click.
   Bing also feeds DuckDuckGo and several AI search tools.

## 6. Email: hello@john-beno.com with iCloud+

1. On iPhone: **Settings → [your name] → iCloud → Custom Email Domain**
   (or icloud.com/settings → Custom Email Domain).
2. Add `john-beno.com`, choose "Only you", and create `hello@john-beno.com`.
3. iCloud shows a list of DNS records (MX, TXT, CNAME). Add each one in Cloudflare
   under **DNS → Records**. Set them to **DNS only** (grey cloud), not proxied.
   iCloud may offer to add them to Cloudflare automatically; that's fine too.
4. Back in iCloud, finish setup. Send yourself a test email both ways.
5. Change `email` in `src/site.config.ts` to `hello@john-beno.com` and push.

Note: Cloudflare Email Routing and iCloud custom domains can't be used at the same
time, because both need the domain's MX records. Use iCloud.

## 7. Analytics (no cookies, no banner)

Cloudflare dashboard → **Analytics & Logs → Web Analytics → Add a site** →
`john-beno.com` → choose automatic setup. Nothing needs to change in the code.

## 8. Link everything to the new site

Use exactly the same name (John Beno Lakshman) and photo everywhere.

- [ ] LinkedIn: Contact info → Website → `https://john-beno.com`, and add the site
      as a **Featured** item.
- [ ] GitHub, Instagram, Behance, Dribbble, any other profile: put the link in the bio.
- [ ] Ask your Nightlight teammates or anyone who credits you to link to the site.
- [ ] Ask whether your university program has a student work or alumni page that can
      link to you.
- [ ] Put the URL on your CV, your email signature and every application.

## 9. Retire the Framer site

1. Replace the Framer homepage with one line and a link: "My portfolio has moved to
   john-beno.com".
2. Once Google shows the new site for your name, unpublish the Framer site.

---

## Checking progress

Search Console → **Performance → Search results**. Add a filter for the query
`john beno` and watch impressions and position. Indexing usually happens within days;
reaching the top for the name can take a few weeks, faster with every link from step 8.
