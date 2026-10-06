# Evaluación Formativa Docente

App web para el proyecto de **Evaluación Formativa de la Docencia**: permite a estudiantes evaluar a sus profesores, a docentes autoevaluarse y construir planes de mejora, y a directivos consultar reportes agregados y comparativos.

Tres roles, cada uno con su propio panel:

- **Estudiante** — evalúa a los profesores que le correspondan (21 preguntas likert + 3 abiertas), un profesor completo por página** y avanzando profesor por profesor, con autoguardado.
- **Docente** — se autoevalúa, revisa sus resultados frente a la percepción estudiantil, y gestiona planes de mejora.
- **Directivo** — ve estadísticas generales, gráficas comparativas y exporta un reporte CSV con todo (promedios y respuestas abiertas).

## Tabla de contenidos

- [Arquitectura y stack](#arquitectura-y-stack)
- [Estructura de directorios](#estructura-de-directorios)
- [Modelo de datos](#modelo-de-datos)
- [Autenticación y roles](#autenticación-y-roles)
- [Variables de entorno](#variables-de-entorno)
- [Cómo correr el proyecto en local](#cómo-correr-el-proyecto-en-local)
- [Scripts disponibles](#scripts-disponibles)
- [Endpoints de la API](#endpoints-de-la-api)
- [Despliegue](#despliegue)
- [Notas de seguridad](#notas-de-seguridad)
- [Convenciones](#convenciones)

## Arquitectura y stack

Monorepo con dos proyectos independientes (`Frontend/` y `Backend/`), cada uno con su propio `package.json`, node_modules y despliegue.

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8, React Router 7, Bootstrap 5 (+ bootstrap-icons), Recharts (gráficas del panel de directivo) |
| Backend | Node.js + Express 5 (ESM, `"type": "module"`) |
| Base de datos | MongoDB Atlas + Mongoose 9 |
| Autenticación | Clerk (`@clerk/clerk-react` en frontend, `@clerk/backend` en backend) |
| Hosting | Frontend en **Vercel** (SPA), Backend en **Render** (proceso Node persistente) |

Frontend y backend son despliegues completamente separados, comunicados solo por HTTP (`VITE_API_URL` en el frontend apunta a la URL pública del backend en Render). No hay SSR ni monorepo tooling (Turborepo/Nx) — son dos apps independientes que conviene tratar como tal.

## Estructura de directorios

```
Evaluacion-Formativa-App/
├── Backend/
│   ├── data/                        # Plantillas JSON de preguntas (seed inicial)
│   │   ├── teacher-questions-template.json
│   │   └── student-questions-template.json
│   ├── scripts/
│   │   ├── seed.js                        # Carga las preguntas iniciales a Mongo
│   │   ├── checkEvaluationDuplicates.js   # Verificación read-only pre-índice único
│   │   └── createEvaluationIndex.js       # Crea el índice único de Evaluation (manual)
│   └── src/
│       ├── config/db.js             # Conexión a Mongo (autoIndex deshabilitado en prod)
│       ├── middleware/auth.js       # requireAuth (verifica token de Clerk) + requireRole
│       ├── models/                  # Teacher, Question, Evaluation, ImprovementPlan
│       ├── routes/                  # auth, teachers, question, evaluations, improvementPlans, directorStats
│       └── index.js                 # Entry point de Express
└── Frontend/
    ├── src/
    │   ├── api/axios.js             # Instancia de axios + inyección del token de Clerk
    │   ├── hooks/                   # useStudentData, useTeacherData, useDirectorData
    │   ├── components/              # AppLayout, TeacherEvalForm, TeacherResults, ImprovementPlanModal,TeacherFeedbackModal, DirectorFeedbackCard
    │   ├── pages/                   # LoginPage, StudentPage, TeacherPage, DirectorPage
    │   ├── App.jsx                  # Ruteo por rol (react-router-dom)
    │   └── main.jsx                 # Bootstrap de la app + ClerkProvider
    └── vercel.json                  # Rewrite de rutas para SPA
```

## Modelo de datos

Cuatro colecciones en MongoDB (`Backend/src/models/`):

- **Teacher** — `{ id (email), name, subject }`. Se crea automáticamente cuando alguien se registra como docente.
- **Question** — banco de preguntas fijo, compartido por todos (no hay preguntas por materia/profesor). `type: 'teacher' | 'student'` separa el cuestionario de autoevaluación del de estudiantes; `questionType: 'likert' | 'abierta'`.
- **Evaluation** — una evaluación de un usuario a un profesor. `userRole: 'estudiante' | 'docente'`, `evaluationData: { scores: Map, openAnswers: Map }` (clave = número de pregunta), y `status: 'draft' | 'submitted'`:
  - `'draft'` = el flujo de autoguardado del estudiante todavía está en progreso para ese profesor.
  - `'submitted'` = evaluación completa y enviada (es también el default, para no afectar los documentos ya creados por el flujo de un solo paso de autoevaluación docente).
  - Índice único en `{ userEmail, teacherId, userRole }` — un usuario no puede tener dos evaluaciones para el mismo profesor.
  - Cualquier query nueva sobre `Evaluation` que alimente reportes/resultados debe filtrar `status: { $ne: 'draft' }`, o contará borradores a medio responder.
- **ImprovementPlan** — plan de mejora de un docente (`goal`, `actions`, `indicators`, `deadline`, `status: 'activo' | 'completado'`).

No existe una relación explícita estudiante↔profesor (matrícula). El estudiante arma su propia lista de "profesores que le corresponden" desde un selector en su panel; cualquier profesor de la base de datos es un candidato.

## Autenticación y roles

- Clerk maneja login/registro. El rol (`estudiante | docente | directivo`) se guarda en `publicMetadata.role` del usuario en Clerk, no en Mongo.
- En el registro (`LoginPage.jsx` → `POST /api/auth/update-role`), si el rol es `docente` también se crea el documento `Teacher` correspondiente con nombre completo y materia.
- El frontend obtiene un token de sesión de Clerk y lo manda como `Authorization: Bearer <token>` (ver `src/api/axios.js` y `setAuthToken`), refrescándolo cada 50 segundos (`App.jsx`).
- El backend valida ese token con `@clerk/backend` (`middleware/auth.js` → `requireAuth`), y expone `req.userEmail` / `req.userRole` ya verificados server-side; `requireRole(...roles)` protege cada ruta.
- El frontend rutea por rol en `App.jsx` (`/student`, `/teacher`, `/director`), redirigiendo si el rol no coincide con la ruta.
- **Timeout de sesión por inactividad**: se configura desde el Dashboard de Clerk (Configure → Sessions → Inactivity timeout), no hay código para esto en el repo — importante en computadores compartidos (salas de cómputo).

## Variables de entorno

Ninguna se versiona (ver `.gitignore`). Nunca commitear archivos `.env` reales.

**`Backend/.env`**

| Variable | Para qué |
|---|---|
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk (backend), para verificar tokens |
| `FRONTEND_URL` | Origen permitido por CORS (URL del frontend desplegado) |
| `PORT` | Puerto local (opcional, default `5000`) |

**`Frontend/.env`** (local) y **`Frontend/.env.production`** (build de producción)

| Variable | Para qué |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk (frontend) |
| `VITE_API_URL` | URL del backend desplegado (solo en `.env.production`; en local usa el default `http://localhost:5000`) |

En Atlas, recuerda que la whitelist de IPs (Network Access) bloquea conexiones nuevas — si vas a correr scripts contra la base de datos desde una máquina distinta, agrega su IP pública primero.

## Cómo correr el proyecto en local

Requiere Node.js `^20.19.0` o `>=22.12.0` (lo exige Vite 8).

```bash
# Backend
cd Backend
npm install
# crear .env con MONGODB_URI, CLERK_SECRET_KEY, FRONTEND_URL=http://localhost:3000
npm run seed   # carga las preguntas iniciales (solo la primera vez / si cambian las plantillas)
npm run dev    # http://localhost:5000

# Frontend (en otra terminal)
cd Frontend
npm install
# crear .env con VITE_CLERK_PUBLISHABLE_KEY
npm run dev    # http://localhost:3000
```

Ambos deben apuntar a la **misma** instancia de Clerk (mismo par de claves pub/secret) para que el rol asignado en el registro sea consistente.

## Scripts disponibles

**Backend** (`Backend/package.json`)

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor con nodemon (recarga en caliente) |
| `npm run seed` | Reemplaza todas las preguntas en Mongo por las de `data/*.json` |
| `node scripts/checkEvaluationDuplicates.js` | Read-only: busca duplicados `(userEmail, teacherId, userRole)` antes de tocar el índice único |
| `node scripts/createEvaluationIndex.js` | Crea/sincroniza los índices de `Evaluation` (correr solo tras confirmar cero duplicados) |

No hay suite de tests automatizados todavía (`npm test` solo imprime un error).

**Frontend** (`Frontend/package.json`)

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm run build` | Build de producción a `dist/` |
| `npm run lint` | ESLint sobre todo `src/` |
| `npm run preview` | Sirve el build de `dist/` localmente |

## Endpoints de la API

Todas bajo el prefijo `/api`. Salvo donde se indica "pública", todas requieren `Authorization: Bearer <token de Clerk>` y el rol indicado.

| Método y ruta | Rol(es) | Qué hace |
|---|---|---|
| `POST /auth/update-role` | pública | Asigna rol en Clerk; crea `Teacher` si el rol es docente |
| `GET /teachers` | estudiante, docente, directivo | Lista todos los profesores |
| `GET /teachers/me` | docente | Datos del profesor autenticado |
| `POST /teachers` | directivo, docente | Crea un profesor manualmente |
| `GET /questions?type=teacher\|student` | estudiante, docente, directivo | Banco de preguntas de un cuestionario |
| `GET /evaluations/student` | estudiante | Progreso del estudiante por profesor (borradores + enviadas) |
| `PATCH /evaluations/answer` | estudiante | Autoguarda la respuesta de una pregunta para un profesor |
| `POST /evaluations/finalize` | estudiante | Marca como enviada la evaluación de un profesor (valida que estén las 24 respuestas) |
| `POST /evaluations/submit` | estudiante, docente | Envío en un solo paso (usado hoy solo por la autoevaluación docente) |
| `GET /evaluations/teacher-results` | docente, directivo | Autoevaluación + evaluaciones de estudiantes de un profesor |
| `GET /evaluations/teacher-self-check` | docente | Si el docente ya se autoevaluó |

| `GET /improvement-plans` | docente, directivo | Planes de mejora del docente autenticado |
| `POST /improvement-plans` | docente | Crea un plan de mejora |
| `PATCH /improvement-plans/:id` | docente | Marca un plan como completado |
| `DELETE /improvement-plans/:id` | docente | Elimina un plan |
| `GET /director-stats` | directivo | Estadísticas agregadas (promedios, categorías, respuestas abiertas) |
| `GET /health` | pública | Chequeo de salud del servidor |
| `GET /improvement-plans/teacher/:teacherId`  | directivo | Retroalimentación que la dirección dejó a un docente |
| `POST /improvement-plans/teacher/:teacherId` | directivo | Crea retroalimentación de la dirección para un docente |
| `GET /improvement-plans/from-director`       | docente   | Retroalimentación que la dirección le dejó al docente autenticado |

## Despliegue

- **Frontend → Vercel**: build estático (`vite build`), `vercel.json` hace rewrite de todas las rutas a `index.html` (necesario para que funcione el ruteo de `react-router-dom` en refresh/deep-link).
- **Backend → Render**: proceso Node persistente (no serverless) — necesario porque mantiene una conexión abierta a Mongoose.
- **Orden de despliegue**: backend primero, frontend después. El frontend viejo tolera respuestas nuevas del backend con más campos, pero no al revés.
- Antes de un cambio de esquema en `Evaluation` que agregue índices únicos, correr `checkEvaluationDuplicates.js` contra producción — si hay datos ya duplicados, `createEvaluationIndex.js` (o el arranque del backend, si `autoIndex` estuviera activo) fallaría.

## Notas de seguridad

- El rol del usuario se valida siempre server-side (`requireRole` lee `req.userRole` del token verificado, nunca del body de la petición).
- `mongoose.set('autoIndex', ...)` está deshabilitado en producción (`Backend/src/config/db.js`) para que un índice único nunca se intente crear automáticamente al arrancar — si hubiera duplicados, tumbaría el proceso en cada deploy.
- El timeout de sesión por inactividad de Clerk (ver arriba) es la mitigación recomendada para computadores compartidos; no hay lógica de "logout automático" implementada en el código.

## Convenciones

- Todo el código (nombres de variables donde aplica, comentarios, mensajes de error y de UI) está en español, siguiendo el resto del proyecto.
- Sin TypeScript; ESLint (`Frontend/eslint.config.js`) con `eslint-plugin-react-hooks` en modo estricto (por ejemplo, no se permite `setState` síncrono dentro de un efecto — se prefiere ajustar el estado durante el render, guardado con una bandera, para inicializaciones dependientes de datos async).
- Autor: Tomas Murillo Aristizabal · Licencia: ISC (ver `Backend/package.json`).
