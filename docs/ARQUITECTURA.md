# Arquitectura de AutoReadme

Guía interna para entender la estructura del proyecto y mantenerla en futuras actualizaciones.

## Resumen

AutoReadme es un generador de `README.md` en dos capas:

1. **Análisis estático** — detecta stack, metadatos, estructura y comandos del proyecto.
2. **Generación híbrida** — una plantilla Markdown produce el esqueleto; la IA (opcional) enriquece descripción, características y textos de uso.

Se distribuye como:

| Superficie | Entrada | Salida |
|------------|---------|--------|
| **API programática** | `src/index.ts` | `analyzeProject`, `buildReadmeContent`, `writeReadme` |
| **CLI** | `src/cli.ts` → `dist/cli.js` | Comandos `generate` (default) y `app` |
| **App de escritorio** | `desktop/main.ts` → Electron | UI con vista previa y selector de carpeta |

---

## Árbol de directorios

```
AutoReadme/
├── src/                      # Núcleo compartido (CLI + API + desktop)
│   ├── index.ts              # API pública y orquestación principal
│   ├── cli.ts                  # Interfaz de línea de comandos (Commander)
│   ├── launch-desktop.ts     # Lanza Electron desde el CLI
│   ├── types.ts              # Tipos centrales del dominio
│   ├── config/
│   │   └── defaults.ts       # Constantes, modelos IA, keywords de frameworks
│   ├── scanners/             # Análisis del proyecto en disco
│   ├── parsers/              # Lectura de manifiestos por stack
│   ├── generators/           # Ensamblado del Markdown final
│   ├── ai/                   # Mejora opcional con IA
│   └── utils/                # Árbol de archivos, patrones de ignore
├── desktop/                  # Capa Electron (UI nativa)
│   ├── main.ts               # Proceso principal, IPC, ventana
│   ├── preload.ts            # Puente seguro renderer ↔ main
│   ├── api-key-store.ts      # Persistencia cifrada de API key OpenAI
│   ├── types.ts              # Tipos IPC específicos de la app
│   └── renderer/             # UI estática (HTML/CSS/JS vanilla)
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── scripts/
│   └── copy-renderer.mjs     # Copia renderer/ a dist/desktop/renderer
├── tests/                    # Vitest + fixtures
├── docs/
│   └── ARQUITECTURA.md       # Este documento
├── tsup.config.ts            # Build API + CLI
├── tsup.desktop.config.ts    # Build Electron (main ESM + preload CJS)
└── package.json              # Scripts, electron-builder, dependencias
```

---

## Flujo de datos

```
Carpeta del proyecto
        │
        ▼
┌───────────────────┐
│  scanProject()    │  scanners/project-scanner.ts
│  → AnalysisContext│
└─────────┬─────────┘
          │
          ├─► enhanceReadme() [opcional]  →  AiEnhancement
          │         ai/enhance-readme.ts
          │
          ▼
┌───────────────────┐
│ generateReadme()  │  generators/readme-generator.ts
│  → string Markdown│
└─────────┬─────────┘
          │
          ▼
   writeReadme() / stdout / vista previa UI
```

### `AnalysisContext` (`src/types.ts`)

Objeto central que viaja por todo el pipeline:

| Campo | Origen |
|-------|--------|
| `stack` | `stack-detector.ts` |
| `metadata` | Parsers según stack (`package.json`, `pyproject.toml`, etc.) |
| `languageStats`, `fileTree` | `structure-analyzer.ts` |
| `entryPoints`, `installCommands`, `runCommands` | `entry-point-finder.ts` |
| `frameworks` | Dependencias vs `FRAMEWORK_KEYWORDS` en `defaults.ts` |
| `hasLicenseFile` | Lectura de `LICENSE` en disco |

### `AiEnhancement` (`src/types.ts`)

Fragmentos que la IA puede sobrescribir o añadir:

- `description` — párrafo introductorio
- `features` — lista de características
- `usageIntro` — texto bajo la sección «Uso»
- `scriptHints` — descripciones por nombre de script (`npm run dev`, etc.)

El generador **siempre** produce estructura, instalación, scripts y árbol; la IA solo enriquece esas partes semánticas.

---

## Módulos del núcleo (`src/`)

### Escaneo (`src/scanners/`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `project-scanner.ts` | Orquestador: une stack, metadata, estructura y comandos |
| `stack-detector.ts` | Detecta Node, TypeScript, Python, Rust, Go, Java o `generic` |
| `structure-analyzer.ts` | Cuenta extensiones y genera árbol ASCII con `fast-glob` |
| `entry-point-finder.ts` | Infiere puntos de entrada y comandos install/run |
| `code-sampler.ts` | Extrae snippets de código para el prompt de IA |

### Parsers (`src/parsers/`)

Un parser por ecosistema. Todos devuelven `ProjectMetadata`:

| Archivo | Archivo leído |
|---------|---------------|
| `package-json.ts` | `package.json` |
| `pyproject.ts` | `pyproject.toml` |
| `cargo-toml.ts` | `Cargo.toml` |
| `go-mod.ts` | `go.mod` |

Para stacks sin parser dedicado se usa el nombre de la carpeta como `projectName`.

### Generador (`src/generators/readme-generator.ts`)

- Plantillas bilingües (`es` / `en`) en constante `LABELS`.
- Secciones: descripción, stack, requisitos, instalación, uso, estructura, scripts, licencia, pie.
- Recibe `enhancement?: AiEnhancement` y fusiona sin duplicar secciones fijas.

### IA (`src/ai/`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `prompt-builder.ts` | Construye mensajes system/user con contexto + muestras de código |
| `enhance-readme.ts` | Punto de entrada: elige proveedor, maneja errores y fallback |
| `openai-client.ts` | Cliente OpenAI, parseo JSON de la respuesta |
| `ollama-client.ts` | Cliente HTTP a Ollama local (`/api/chat`) |
| `format-ai-error.ts` | Mensajes amigables (429 quota, 401, Ollama no disponible) |

**Proveedores** (`AiProvider`): `openai` | `ollama`. Configuración vía `AiOptions` en `types.ts`.

Si la IA falla, `buildReadmeContent` devuelve `aiWarning` y el README estándar se genera igualmente.

### API pública (`src/index.ts`)

Funciones exportadas para consumo externo y desktop:

```ts
analyzeProject(dir, options?)     // → AnalysisContext
buildReadmeContent(context, opts) // → { content, aiUsed, aiWarning? }
writeReadme(dir, options?)      // → WriteResult (escribe + backup opcional)
```

También reexporta tipos, `generateReadme`, `scanProject` y `enhanceReadme`.

### CLI (`src/cli.ts`)

- Comando por defecto: `generate [path]` con flags de idioma, profundidad, secciones y IA.
- Subcomando `app`: delega en `launch-desktop.ts`.
- Validación de ruta, idioma y profundidad antes de llamar a `writeReadme`.

---

## App de escritorio (`desktop/`)

### Arquitectura Electron

```
┌─────────────────────────────────────────────────────────┐
│  Renderer (renderer/app.js)                             │
│  - Sin Node.js directo                                  │
│  - Usa window.autoreadme.*                              │
└────────────────────┬────────────────────────────────────┘
                     │ contextBridge (preload.cjs)
┌────────────────────▼────────────────────────────────────┐
│  Preload (preload.ts → dist/desktop/preload.cjs)        │
│  - ipcRenderer.invoke → canales IPC                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Main (main.ts → dist/desktop/main.js)                  │
│  - BrowserWindow, dialog nativo                         │
│  - Importa ../src/index.js (mismo núcleo que CLI)       │
└─────────────────────────────────────────────────────────┘
```

**Detalle importante:** el preload se compila como **CommonJS** (`.cjs`) porque Electron fallaba con ESM puro. `sandbox: false` en `webPreferences`.

### Canales IPC

| Canal | Handler | Descripción |
|-------|---------|-------------|
| `select-folder` | `dialog.showOpenDialog` | Selector de carpeta nativo |
| `analyze-folder` | `handleAnalyzeFolder` | Resumen rápido del proyecto |
| `preview` | `handlePreview` | Genera Markdown sin escribir |
| `generate` | `handleGenerate` | Llama a `writeReadme` |
| `get-api-key-status` | `loadApiKey` + env | Estado de credenciales OpenAI |
| `save-api-key` | `saveApiKey` | Guarda key cifrada con `safeStorage` |

Tipos de petición/respuesta: `desktop/types.ts`.

### Renderer (`desktop/renderer/`)

- **Vanilla JS** sin bundler (se copia tal cual a `dist/desktop/renderer/`).
- Estado local en objeto `state`; UI con sidebar (opciones) + panel de vista previa (tabs Formato / Markdown).
- Toggle IA muestra panel OpenAI u Ollama según `ai-provider`.

### API key (`desktop/api-key-store.ts`)

- Archivo `openai-key.dat` en `app.getPath("userData")`.
- Cifrado con `safeStorage` de Electron cuando está disponible.
- Solo aplica a OpenAI; Ollama no requiere key.

---

## Build y distribución

### `tsup.config.ts`

| Entrada | Salida | Formato |
|---------|--------|---------|
| `src/index.ts` | `dist/index.js` + `.cjs` + `.d.ts` | ESM + CJS |
| `src/cli.ts` | `dist/cli.js` | ESM con shebang |

### `tsup.desktop.config.ts`

| Entrada | Salida | Notas |
|---------|--------|-------|
| `desktop/main.ts` | `dist/desktop/main.js` | ESM, bundle del núcleo |
| `desktop/preload.ts` | `dist/desktop/preload.cjs` | **CJS obligatorio** |

Después: `scripts/copy-renderer.mjs` copia HTML/CSS/JS al `dist`.

### Scripts npm relevantes

| Script | Uso |
|--------|-----|
| `npm run build` | Compila todo (API + CLI + desktop) |
| `npm run app:dev` | Electron sobre build existente (desarrollo rápido) |
| `npm run app` | Build + lanzar app |
| `npm run app:pack` | Instalador Windows (NSIS) en `release/` |
| `npm test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |

---

## Tests (`tests/`)

| Archivo | Qué cubre |
|---------|-----------|
| `stack-detector.test.ts` | Detección de stack en fixtures |
| `readme-generator.test.ts` | Secciones del Markdown generado |
| `cli.integration.test.ts` | CLI end-to-end con `--dry-run` y escritura |
| `launch-desktop.test.ts` | Rutas y errores de `launchDesktopApp` |
| `ai/enhance-readme.test.ts` | Mock de OpenAI, fallback sin key |
| `ai/prompt-builder.test.ts` | Estructura del prompt |
| `ai/format-ai-error.test.ts` | Mensajes 429/401/Ollama |

Fixtures en `tests/fixtures/node-project` y `python-project`.

`tests/global-setup.ts` ejecuta `npm run build` antes de los tests de integración.

---

## Variables de entorno

Ver `.env.example`:

| Variable | Uso |
|----------|-----|
| `OPENAI_API_KEY` | Proveedor OpenAI (CLI y desktop) |

Ollama no usa variables; host por defecto `http://localhost:11434`.

---

## Guía de extensiones

### Añadir un nuevo stack (ej. Ruby)

1. **`src/scanners/stack-detector.ts`** — Regla de detección (`Gemfile`, etc.).
2. **`src/parsers/`** — Nuevo parser si hay manifiesto estándar.
3. **`src/scanners/project-scanner.ts`** — `case` en `parseMetadata` y, si aplica, en `inferInstallCommands`.
4. **`src/generators/readme-generator.ts`** — Entradas en `stackRuntime` y `stackPrerequisites`.
5. **`src/config/defaults.ts`** — `LANGUAGE_LABELS` si hay extensiones nuevas.
6. **Fixture + test** en `tests/fixtures/` y `stack-detector.test.ts`.

### Añadir una sección al README

1. Extender `generateReadme` en `readme-generator.ts` (labels en `LABELS.es` / `LABELS.en`).
2. Si necesita datos nuevos, ampliar `AnalysisContext` y poblarlo en `project-scanner.ts`.
3. Actualizar tests en `readme-generator.test.ts`.

### Añadir un proveedor de IA

1. Tipo en `AiProvider` (`src/types.ts`).
2. Cliente en `src/ai/`.
3. Rama en `requestFromProvider` (`enhance-readme.ts`).
4. Mensajes de error en `format-ai-error.ts`.
5. Flags CLI en `cli.ts`, UI en `renderer/app.js` + `index.html`, y `resolveAiOptions` en `main.ts`.
6. Defaults en `config/defaults.ts`.

### Cambiar la UI de escritorio

- **HTML/CSS:** `desktop/renderer/`
- **Lógica cliente:** `desktop/renderer/app.js`
- **Nuevo canal IPC:** `preload.ts` → `main.ts` (`registerIpc`) → tipos en `desktop/types.ts`
- Tras cambios: `npm run build` (el renderer se copia, no se transpila)

### Cambiar opciones del CLI

Editar `src/cli.ts` y, si afectan al núcleo, `WriteOptions` / `AiOptions` en `types.ts` y `buildReadmeContent` en `index.ts`.

---

## Decisiones de diseño (para no romperlas)

| Decisión | Motivo |
|----------|--------|
| Núcleo único en `src/` | CLI y desktop comparten la misma lógica; un solo lugar para bugs y features |
| Plantilla + IA híbrida | README usable sin red ni créditos; IA solo mejora texto |
| Preload como `.cjs` | Compatibilidad Electron en Windows |
| Renderer sin bundler | Simplicidad; copia directa al `dist` |
| Fallback silencioso con `aiWarning` | Nunca bloquear la generación por fallo de IA |
| `fast-glob` + ignore patterns | Árbol rápido sin indexar `node_modules` |

---

## Checklist antes de publicar cambios

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Probar CLI: `node dist/cli.js --dry-run tests/fixtures/node-project`
- [ ] Si tocaste desktop: `npm run app:dev` y flujo carpeta → vista previa → generar
- [ ] Si tocaste IA: probar `--ai-provider ollama` y/o OpenAI con key válida

---

## Referencias rápidas

- README de usuario: [`../README.md`](../README.md)
- Tipos del dominio: [`../src/types.ts`](../src/types.ts)
- Constantes globales: [`../src/config/defaults.ts`](../src/config/defaults.ts)
- Punto de orquestación: [`../src/index.ts`](../src/index.ts)
