# PRODE Manager — versión Vercel

Esta es la versión "standalone" del PRODE Manager, pensada para hostear en Vercel
(o para seguir desarrollándola en OpenCode/Claude Code como un proyecto normal).

## Estructura

```
prode-vercel/
├── public/
│   └── index.html      → frontend (HTML/CSS/JS, sin build step)
├── api/
│   ├── data.js          → guarda/lee/borra datos (Supabase, tabla kv_store)
│   └── parse.js          → proxy seguro hacia la API de Google Gemini (parseo con IA, gratis)
├── package.json
└── README.md
```

No hay paso de build: el frontend es HTML plano y las funciones de `/api` son
funciones serverless de Node que Vercel detecta automáticamente.

## 1. Crear la base en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (o usá uno que ya tengas).
2. En el **SQL Editor** corré esto para crear la tabla:

```sql
create table kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
```

3. Andá a **Project Settings → API** y copiá:
   - `Project URL` → esto va en la variable `SUPABASE_URL`
   - `service_role` key (¡no la `anon`!) → esto va en `SUPABASE_SERVICE_ROLE_KEY`

   La `service_role` key nunca se expone al navegador: solo la usan las funciones
   serverless de `/api`, que corren del lado del servidor.

## 2. Conseguir una API key de IA (gratis) — Google Gemini

Anthropic no tiene tier gratuito; este proyecto usa **Google Gemini** cuyo tier
gratuito es permanente (sin tarjeta de crédito) y alcanza de sobra para un prode.

1. Andá a [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (con tu cuenta de Google) → **Create API key**.
2. Esa key va en la variable `GEMINI_API_KEY`.
3. Opcional: `GEMINI_MODEL` para elegir el modelo (por defecto `gemini-flash-latest`,
   el alias que siempre apunta a la última versión gratuita de Flash).

> El endpoint `/api/parse` protege el uso sin pedir login: rechaza mensajes de más de
> 12.000 caracteres, corta la llamada a la IA a los 20 segundos y tiene un timeout de
> función de 30 s configurado en `vercel.json`.

## 3. Deploy en Vercel

### Opción A — desde GitHub
1. Subí esta carpeta a un repo de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importá el repo.
3. En **Environment Variables** cargá:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (opcional)
4. Deploy. Vercel detecta `public/` como estático y `api/*.js` como funciones automáticamente.

### Opción B — desde la CLI
```bash
npm i -g vercel
cd prode-vercel
vercel
# seguí las instrucciones, y cuando te lo pida cargá las variables de entorno
# o hacelo después con:
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

## 4. Seguir desarrollándolo en OpenCode

Esta carpeta es un proyecto normal (sin nada específico de Claude.ai), así que
podés abrirla directamente en OpenCode o Claude Code y seguir iterando —
agregar autenticación, pasar a una base relacional en vez de key-value,
sumar un dominio propio, etc.

## Notas

- No hay autenticación: cualquiera con la URL puede editar el prode. Si vas a
  compartir el link con participantes (no solo con vos), convendría agregarle
  una contraseña simple para el panel de administración antes de mandarlo.
- El endpoint `/api/parse` (el que gasta plata de la API de Anthropic) tiene límites
  de tamaño y timeout para que no lo puedan abusar desde afuera.
- El key-value store (`kv_store`) replica exactamente el mismo modelo de datos
  que la versión de Claude, así que toda la lógica de puntaje, comodines, etc.
  es idéntica.
# Prode-Campera
