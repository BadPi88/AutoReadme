/* global window, document */

const state = {
  folder: "",
  lang: "es",
  activeTab: "rendered",
};

const $ = (id) => document.getElementById(id);

const dropZone = $("drop-zone");
const folderPathEl = $("folder-path");
const projectCard = $("project-card");
const projectNameEl = $("project-name");
const projectDescEl = $("project-desc");
const projectChipsEl = $("project-chips");
const depthInput = $("depth");
const depthValue = $("depth-value");
const optTree = $("opt-tree");
const optScripts = $("opt-scripts");
const optFooter = $("opt-footer");
const optForce = $("opt-force");
const optAi = $("opt-ai");
const aiSettings = $("ai-settings");
const aiProvider = $("ai-provider");
const openaiSettings = $("openai-settings");
const ollamaSettings = $("ollama-settings");
const apiKeyInput = $("api-key");
const apiKeyHint = $("api-key-hint");
const btnPreview = $("btn-preview");
const btnGenerate = $("btn-generate");
const emptyState = $("empty-state");
const previewRendered = $("preview-rendered");
const previewSource = $("preview-source");
const previewSubtitle = $("preview-subtitle");
const aiBadge = $("ai-badge");
const tabRendered = $("tab-rendered");
const tabSource = $("tab-source");
const loading = $("loading");
const statusBar = document.querySelector(".status-bar");
const statusText = $("status-text");
const toast = $("toast");

let toastTimer = null;

function setStatus(message, type = "") {
  statusText.textContent = message;
  statusBar.className = `status-bar ${type}`.trim();
}

function showToast(message, type = "") {
  toast.textContent = message;
  toast.className = `toast visible ${type}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast hidden";
  }, 3200);
}

function setLoading(active, text = "Analizando proyecto…") {
  loading.querySelector("span").textContent = text;
  loading.classList.toggle("hidden", !active);
  btnPreview.disabled = active || !state.folder;
  btnGenerate.disabled = active || !state.folder;
}

function getOptions() {
  return {
    projectPath: state.folder,
    lang: state.lang,
    depth: Number(depthInput.value) || 3,
    includeTree: optTree.checked,
    includeScripts: optScripts.checked,
    includeFooter: optFooter.checked,
    force: optForce.checked,
    useAi: optAi.checked,
    aiProvider: aiProvider.value,
    apiKey: apiKeyInput.value.trim() || undefined,
    aiModel: aiProvider.value === "ollama" ? "llama3.2" : undefined,
  };
}

function updateAiPanel() {
  const enabled = optAi.checked;
  aiSettings.classList.toggle("hidden", !enabled);

  if (!enabled) return;

  const isOllama = aiProvider.value === "ollama";
  openaiSettings.classList.toggle("hidden", isOllama);
  ollamaSettings.classList.toggle("hidden", !isOllama);
}

async function initApiKeyStatus() {
  if (!window.autoreadme?.getApiKeyStatus) return;

  const status = await window.autoreadme.getApiKeyStatus();
  if (status.hasStoredKey) {
    apiKeyHint.textContent = "Hay una API key guardada en este equipo. Déjala vacía para usarla.";
  } else if (status.hasEnvKey) {
    apiKeyHint.textContent = "Se detectó OPENAI_API_KEY en el entorno.";
  } else {
    apiKeyHint.textContent = "Obtén tu key en platform.openai.com";
  }
}

function updateActions() {
  const hasFolder = Boolean(state.folder);
  btnPreview.disabled = !hasFolder;
  btnGenerate.disabled = !hasFolder;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(md) {
  const lines = md.split("\n");
  const html = [];
  let inCode = false;
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];

  function flushTable() {
    if (tableRows.length === 0) return;
    const [header, ...body] = tableRows;
    const headerCells = header
      .split("|")
      .filter((c) => c.trim())
      .map((c) => `<th>${inlineFormat(c.trim())}</th>`)
      .join("");
    const bodyHtml = body
      .map((row) => {
        const cells = row
          .split("|")
          .filter((c) => c.trim())
          .map((c) => `<td>${inlineFormat(c.trim())}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
    html.push(`<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
    tableRows = [];
    inTable = false;
  }

  function inlineFormat(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        flushTable();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      if (/^\|[-| :]+\|$/.test(line.trim())) continue;
      inTable = true;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.startsWith("# ")) {
      html.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      html.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ")) {
      html.push(`<ul><li>${inlineFormat(line.slice(2))}</li></ul>`);
    } else if (line.startsWith("---")) {
      html.push("<hr>");
    } else if (line.trim() === "") {
      html.push("");
    } else if (line.startsWith("![")) {
      html.push(`<p>${line}</p>`);
    } else {
      html.push(`<p>${inlineFormat(line)}</p>`);
    }
  }

  if (inCode && codeBuffer.length) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  flushTable();

  return html.join("\n").replace(/<\/ul>\n<ul>/g, "");
}

function showPreview(content, meta) {
  emptyState.classList.add("hidden");
  previewRendered.innerHTML = renderMarkdown(content);
  previewSource.value = content;

  if (state.activeTab === "rendered") {
    previewRendered.classList.remove("hidden");
    previewSource.classList.add("hidden");
  } else {
    previewRendered.classList.add("hidden");
    previewSource.classList.remove("hidden");
  }

  previewSubtitle.textContent = meta
    ? `${meta.projectName} · ${meta.stack} · ${meta.fileCount} archivos`
    : "Vista previa del README generado";
}

function clearPreview() {
  emptyState.classList.remove("hidden");
  previewRendered.classList.add("hidden");
  previewSource.classList.add("hidden");
  previewRendered.innerHTML = "";
  previewSource.value = "";
  previewSubtitle.textContent = "Selecciona un proyecto para ver el README generado";
}

function showProjectInfo(info) {
  if (!info.ok) return;

  projectCard.classList.remove("hidden");
  projectNameEl.textContent = info.projectName || "Proyecto";
  projectDescEl.textContent = info.description || "Sin descripción en el manifest.";
  projectChipsEl.innerHTML = "";

  const chips = [
    info.stack,
    info.languages,
    info.fileCount ? `${info.fileCount} archivos` : null,
  ].filter(Boolean);

  for (const label of chips) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = label;
    projectChipsEl.appendChild(chip);
  }
}

function setFolder(folder) {
  state.folder = folder;
  folderPathEl.textContent = folder;
  folderPathEl.classList.remove("hidden");
  dropZone.classList.add("has-folder");
  dropZone.querySelector(".drop-title").textContent = "Cambiar carpeta";
  dropZone.querySelector(".drop-hint").textContent = folder;
  updateActions();
  clearPreview();
}

async function selectFolder() {
  if (!window.autoreadme?.selectFolder) {
    setStatus("Error interno: reinicia la aplicación.", "error");
    showToast("No se pudo conectar con el sistema. Cierra y abre de nuevo.", "error");
    return;
  }

  try {
    const folder = await window.autoreadme.selectFolder();
    if (!folder) return;

    setFolder(folder);
    setStatus("Analizando carpeta seleccionada…");
    setLoading(true, "Detectando proyecto…");

    try {
      const info = await window.autoreadme.analyzeFolder(folder);
      if (!info.ok) {
        setStatus(info.error || "No se pudo analizar la carpeta.", "error");
        showToast(info.error || "Error al analizar", "error");
        return;
      }
      showProjectInfo(info);
      setStatus(`Proyecto listo: ${info.projectName}`);
      showToast(`Proyecto detectado: ${info.projectName}`, "success");
    } finally {
      setLoading(false);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(message, "error");
    showToast(message, "error");
  }
}

function setAiBadge(result) {
  if (!optAi.checked) {
    aiBadge.className = "ai-badge hidden";
    return;
  }

  if (result.aiUsed) {
    aiBadge.textContent = "IA aplicada — incluye Características y texto enriquecido";
    aiBadge.className = "ai-badge success";
    return;
  }

  if (result.aiWarning) {
    aiBadge.textContent = result.aiWarning;
    aiBadge.className = "ai-badge error";
    return;
  }

  aiBadge.textContent = "IA activada pero sin cambios detectados";
  aiBadge.className = "ai-badge neutral";
}

function handleAiResult(result) {
  setAiBadge(result);

  if (result.aiWarning) {
    setStatus(result.aiWarning, "error");
    showToast(result.aiWarning, "error");
    return;
  }

  if (result.aiUsed) {
    setStatus("README mejorado con IA. Busca la sección «Características».", "success");
    showToast("README mejorado con IA", "success");
  }
}

async function runPreview() {
  if (optAi.checked && aiProvider.value === "openai" && !apiKeyInput.value.trim()) {
    const status = await window.autoreadme.getApiKeyStatus();
    if (!status.hasStoredKey && !status.hasEnvKey) {
      setStatus(
        "OpenAI requiere API key con créditos. Añádela aquí o elige «Ollama» (gratis).",
        "error",
      );
      showToast("Falta API key — prueba Ollama si no tienes créditos", "error");
      return;
    }
  }

  const loadingText = optAi.checked ? "Analizando y mejorando con IA…" : "Generando vista previa…";
  setLoading(true, loadingText);
  setStatus(loadingText);

  try {
    const result = await window.autoreadme.preview(getOptions());
    if (!result.ok) {
      setStatus(result.error || "Error en la vista previa.", "error");
      showToast(result.error || "Error", "error");
      return;
    }
    showPreview(result.content, result);
    handleAiResult(result);
    if (!optAi.checked) {
      setStatus("Vista previa lista. Revisa el contenido antes de guardar.", "success");
    } else if (!result.aiUsed && !result.aiWarning) {
      setStatus("Vista previa lista (IA activada).", "success");
    }
  } finally {
    setLoading(false);
  }
}

async function runGenerate() {
  const loadingText = optAi.checked
    ? "Generando README con IA…"
    : "Generando y guardando README.md…";
  setLoading(true, loadingText);
  setStatus(loadingText);

  try {
    const result = await window.autoreadme.generate(getOptions());
    if (!result.ok) {
      setStatus(result.error || "Error al generar.", "error");
      showToast(result.error || "Error al guardar", "error");
      return;
    }
    showPreview(result.content, result);
    handleAiResult(result);

    if (!result.aiWarning) {
      let msg = `README guardado en ${result.outputPath}`;
      if (result.backedUp) msg += " (backup .bak creado)";
      if (result.aiUsed) msg += " — con mejora IA";
      setStatus(msg, "success");
      if (!result.aiUsed) {
        showToast("README generado correctamente", "success");
      }
    }
  } finally {
    setLoading(false);
  }
}

function setTab(tab) {
  state.activeTab = tab;
  tabRendered.classList.toggle("active", tab === "rendered");
  tabSource.classList.toggle("active", tab === "source");
  tabRendered.setAttribute("aria-selected", tab === "rendered");
  tabSource.setAttribute("aria-selected", tab === "source");

  if (previewSource.value) {
    previewRendered.classList.toggle("hidden", tab !== "rendered");
    previewSource.classList.toggle("hidden", tab !== "source");
    emptyState.classList.add("hidden");
  }
}

document.querySelectorAll(".segment").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.lang = btn.dataset.lang;
  });
});

depthInput.addEventListener("input", () => {
  depthValue.textContent = depthInput.value;
});

optAi.addEventListener("change", updateAiPanel);
aiProvider.addEventListener("change", updateAiPanel);

dropZone.addEventListener("click", selectFolder);
btnPreview.addEventListener("click", runPreview);
btnGenerate.addEventListener("click", runGenerate);
tabRendered.addEventListener("click", () => setTab("rendered"));
tabSource.addEventListener("click", () => setTab("source"));

updateActions();
updateAiPanel();
initApiKeyStatus();
