# MechatronicStore Blog

Portal de tutoriales técnicos (electrónica, robótica, DIY) servido bajo
`https://www.mechatronicstore.cl/blog/*` vía Cloudflare Worker reverse proxy
a esta app Next.js (hosted en Vercel).

Spec completo: ver `../newsletter/docs/superpowers/specs/2026-05-16-mechatronicstore-blog-design.md`

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Drizzle ORM + Turso (libSQL)
- Deploy: Vercel
- Routing público: Cloudflare Worker (proxy-blog)

## Setup local

```bash
cp .env.example .env.local
# Editar .env.local con valores reales

npm install
npm run db:push    # Sincroniza schema Drizzle a Turso
npm run dev        # http://localhost:3000/blog
```

## Deploy

Push a `main` dispara deploy automático en Vercel. El worker CF rutea
producción.

## Commits
- Push DIRECTO a main, NO PR (regla del ecosistema MechatronicStore).

## ⚠️ Reglas del Worker (CF) — leer antes de modificar `src/workers/proxy-blog.js`

El worker `proxy-blog` hace **true reverse proxy** de:
- `/blog`, `/blog/*` → Vercel (Next.js)
- `/api/blog`, `/api/blog/*` → Vercel
- `/admin/blog`, `/admin/blog/*` → Vercel
- **`/_next/*` → Vercel** ← CRÍTICO, no quitar

### Por qué `/_next/*` es obligatorio (Pablo 17-may-2026)

Next.js genera el HTML de `/blog/[slug]` con `<script src="/_next/static/chunks/*.js">`
en paths **absolutos**. Si el worker no rutea `/_next/*` a Vercel, esos
requests caen en passthrough → WordPress origin devuelve **403 Forbidden** →
**React no hidrata** → cero componentes client-side ejecutan (Comments,
botones copiar código, etc.).

Síntoma engañoso: la página renderiza perfecto en SSR pero todo lo
interactivo aparece muerto. Verificación: en DevTools console, contar
elementos con `__reactFiber*` properties → si es 0, React no hidrató.

### CF Routes obligatorias

Estas rutas deben existir en zone `4790b16d56036e02ea68d43c29851201`
apuntando al script `proxy-blog`:
- `mechatronicstore.cl/blog*`
- `www.mechatronicstore.cl/blog*`
- `mechatronicstore.cl/api/blog*`
- `www.mechatronicstore.cl/api/blog*`
- `mechatronicstore.cl/admin/blog*`
- `www.mechatronicstore.cl/admin/blog*`
- `mechatronicstore.cl/_next/*`        ← agregada 17-may-2026
- `www.mechatronicstore.cl/_next/*`    ← agregada 17-may-2026

### Deploy del worker

No hay `wrangler.toml` en este repo — el worker se deploya vía CF API:

```bash
# Token con scope Workers Scripts:Edit
curl -X PUT \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN_BLOG" \
  -F 'metadata={"main_module":"index.js","compatibility_date":"2026-03-01"};type=application/json' \
  -F "index.js=@src/workers/proxy-blog.js;type=application/javascript+module" \
  "https://api.cloudflare.com/client/v4/accounts/d28aa0b4615df08260acd468c0ede343/workers/scripts/proxy-blog"
```

## 🔐 Cloudflare Access — protección de `/admin/blog/*`

App configurada 17-may-2026 en Zero Trust:
- **Application**: "MechatronicStore Blog Admin"
- **Destination**: `www.mechatronicstore.cl/admin/blog`
- **Policy**: "Only Pablo" (Allow + Emails includes `pablo.silva.bravo.92@gmail.com`)
- **Identity provider**: One-time PIN (OTP a email)
- **Session duration**: 24 hours

El admin (Next.js server components en `/admin/blog/*`) NO tiene auth propia —
toda la gate la maneja CF Access mediante cookie JWT `CF_Authorization`.
Si Pablo necesita agregar otro admin: editar policy "Only Pablo" en
dash → Zero Trust → Access controls → Applications → MechatronicStore Blog
Admin → Policies → Only Pablo → Include rule.

## 💬 Comentarios (Giscus)

GitHub Discussions backend en repo `PabloSilvaBravo/mechatronicstore-blog`:
- **Category**: General
- **Mapping**: `specific` con `data-term=slug` (cada tutorial = un thread)
- **Config**: `src/app/blog/components/Comments.tsx` (repoId + categoryId
  hardcoded, no env vars)

Para mover a otra categoría o repo: actualizar `GISCUS_CONFIG` en
Comments.tsx. Para obtener `repoId`/`categoryId` nuevos:
```bash
gh api graphql -f query='{ repository(owner:"X",name:"Y"){ id discussionCategories(first:20){ nodes{ id name } } } }'
```
