const historyKey = "healthcheck-history";

function saveToHistory(entry) {
  let history = JSON.parse(localStorage.getItem(historyKey)) || [];
  history.unshift(entry);
  history = history.slice(0, 5);
  localStorage.setItem(historyKey, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById("historyContainer");
  if (!container) return;

  const history = JSON.parse(localStorage.getItem(historyKey)) || [];
  container.innerHTML = "";

  if (history.length === 0) {
    container.innerHTML = "<p class='text-gray-500'>Sin historial.</p>";
    return;
  }

  history.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "text-sm text-blue-600 hover:underline cursor-pointer";
    div.textContent = entry.url;
    div.onclick = () => {
      document.getElementById("urlInput").value = entry.url;
      checkURL();
    };
    container.appendChild(div);
  });
}

function downloadResult(data) {
  try {
    const urlObj = new URL(data.url);
    const domain = urlObj.hostname.replace(/\./g, "_"); // Ej: conexseguros_com_co
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `healthcheck_${domain}_${timestamp}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Error al generar el archivo: " + err.message);
  }
}

async function checkURL() {
  const url = document.getElementById("urlInput").value;
  if (!url) return alert("Por favor ingresa una URL válida");

  try {
    // ✅ URL relativa en vez de localhost
    const res = await fetch(`/check?url=${encodeURIComponent(url)}`);

    if (!res.ok) {
      throw new Error(`Error del servidor: ${res.status}`);
    }

    const data = await res.json();

    document.getElementById("resultUrl").textContent = data.url;
    document.getElementById("resultStatus").textContent = data.status === 200 ? `✅ OK (${data.status})` : `❌ Error (${data.status})`;
    document.getElementById("resultTime").textContent = data.elapsed_ms ? `${data.elapsed_ms} ms` : "N/A";

    if (data.ssl) {
      document.getElementById("resultSSL").textContent = data.ssl.valid ? `🔒 Válido, expira en ${data.ssl.expires_on} (${data.ssl.days_left} días)` : "❌ No válido o ausente";
    } else {
      document.getElementById("resultSSL").textContent = "⚠️ No se pudo verificar SSL";
    }

    document.getElementById("resultHeaders").textContent = JSON.stringify(data.headers, null, 2);
    document.getElementById("resultBody").textContent = data.body || "[Contenido vacío]";

    document.getElementById("resultContainer").classList.remove("hidden");
    document.getElementById("downloadButton").onclick = () => downloadResult(data);

    saveToHistory({ url: data.url });
  } catch (err) {
    alert("Error al verificar la URL: " + err.message);
  }
}

window.onload = renderHistory;



