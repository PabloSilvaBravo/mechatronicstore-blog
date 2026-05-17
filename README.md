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
