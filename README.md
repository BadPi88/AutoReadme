# AutoReadme

Generador automático de `README.md` basado en el análisis del código fuente de un proyecto. Detecta el stack tecnológico, extrae metadatos de manifests, genera la estructura de directorios y produce documentación lista para usar.

## Características

- Detección automática de stack: Node.js, TypeScript, Python, Rust, Go, Java
- Análisis de manifests: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`
- Árbol de directorios con profundidad configurable
- Secciones de instalación, uso, scripts y licencia
- Salida en español o inglés
- API programática, CLI y **aplicación de escritorio**
- **Modo IA:** OpenAI u **Ollama** (gratis en local) para enriquecer el README
- Funciona offline sin IA

## Instalación

```bash
npm install -g autoreadme
```

O ejecutar sin instalar (desde este repositorio):

```bash
npm install
npm run build
node dist/cli.js --help
```

## Uso

### Aplicación de escritorio

Interfaz gráfica con selector de carpeta nativo (Windows/macOS/Linux):

```bash
npm install
npm run app
```

O desde la CLI compilada:

```bash
npx autoreadme app
```

La app de escritorio incluye:
- Selector de carpeta con el explorador nativo de Windows/macOS/Linux
- Tarjeta con el proyecto detectado (nombre, stack, lenguajes)
- Opciones con interruptores y control deslizante de profundidad
- Vista previa en **formato legible** o **Markdown crudo**
- Indicador de carga, barra de estado y notificaciones
- Generación de `README.md` con backup automático
- Toggle **Mejorar con IA** y guardado seguro de API key (Windows)

Para empaquetar instalador Windows (opcional):

```bash
npm run app:pack
```

### CLI

```bash
# Vista previa del directorio actual (no escribe archivo)
npx autoreadme --dry-run .

# Generar README en el directorio actual
npx autoreadme .

# Probar con un fixture incluido en el repo
npx autoreadme --dry-run tests/fixtures/node-project

# README en inglés sobre un proyecto de ejemplo
npx autoreadme --lang en tests/fixtures/node-project

# Sobrescribir sin backup
npx autoreadme --force .

# Personalizar profundidad del árbol
npx autoreadme --depth 4 .

# Modo IA (requiere OPENAI_API_KEY)
npx autoreadme --ai --dry-run tests/fixtures/node-project
```

### Modo IA

Modo **híbrido**: la plantilla genera estructura, scripts e instalación; la IA enriquece descripción, características y texto de uso.

#### Opción A — Ollama (gratis, recomendado si no tienes créditos OpenAI)

```bash
# 1. Instala Ollama: https://ollama.com
# 2. Descarga un modelo
ollama pull llama3.2

# 3. Genera con IA local (sin API key)
npx autoreadme --ai --ai-provider ollama --dry-run tests/fixtures/node-project
```

En la **app de escritorio**: activa «Mejorar con IA» → proveedor **Ollama — gratis en tu PC**.

#### Opción B — OpenAI (requiere créditos en la cuenta)

> Las cuentas nuevas **ya no incluyen API gratuita** por defecto. Si ves error **429 quota**, necesitas añadir créditos en [platform.openai.com/settings/billing](https://platform.openai.com/settings/billing).

```bash
export OPENAI_API_KEY=sk-...
npx autoreadme --ai tests/fixtures/node-project
npx autoreadme --ai --ai-model gpt-4o --dry-run .
```

| Opción IA | Descripción |
|-----------|-------------|
| `--ai` | Activar mejora con IA |
| `--ai-provider <openai\|ollama>` | Proveedor (default: `openai`) |
| `--ai-model <model>` | Modelo (`gpt-4o-mini` o `llama3.2`) |
| `--ai-key <key>` | API key de OpenAI |
| `--ollama-host <url>` | URL de Ollama (default: `http://localhost:11434`) |

Si la IA falla, se genera el README estándar con un aviso explicando el motivo.

> **Nota:** La ruta que pases debe existir. `./proyecto` u otras carpetas de ejemplo solo funcionan si las creas o apuntas a una ruta real (por ejemplo `tests/fixtures/node-project`).

### Opciones

| Opción | Descripción |
|--------|-------------|
| `-o, --output <file>` | Archivo de salida (default: `README.md`) |
| `-f, --force` | Sobrescribir sin crear backup |
| `--dry-run` | Imprimir a stdout sin escribir |
| `--lang <es\|en>` | Idioma del README (default: `es`) |
| `--depth <n>` | Profundidad del árbol (default: `3`) |
| `--no-tree` | Omitir estructura de directorios |
| `--no-scripts` | Omitir tabla de scripts |
| `--no-footer` | Omitir pie de página |
| `--backup` | Crear `.bak` antes de sobrescribir |
| `--ai` | Mejorar con OpenAI |
| `--ai-model <model>` | Modelo OpenAI |
| `--ai-key <key>` | API key de OpenAI |

### API programática

```typescript
import { analyzeProject, generateReadme, writeReadme } from "autoreadme";

const context = await analyzeProject("./tests/fixtures/node-project", { depth: 3 });
const markdown = generateReadme(context, { lang: "es" });

const result = await writeReadme("./tests/fixtures/node-project", {
  lang: "es",
  force: true,
  ai: { enabled: true, model: "gpt-4o-mini" },
});
console.log(result.outputPath, result.aiUsed);
```

## Códigos de salida

| Código | Significado |
|--------|-------------|
| `0` | Éxito |
| `1` | Error de análisis o ruta inválida |
| `2` | Error de escritura |

## Desarrollo

```bash
npm install
npm run build
npm test
npm run lint
npm run typecheck
```

Guía de arquitectura y mantenimiento: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Licencia

MIT
