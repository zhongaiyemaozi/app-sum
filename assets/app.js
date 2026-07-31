const state = {
  filter: "all",
  query: "",
  catalog: null,
};

const $ = (sel) => document.querySelector(sel);

function formatTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(d);
}

function platformMatch(app, filter) {
  const p = app.platforms || [];
  if (filter === "all") return true;
  if (filter === "ios") return p.includes("ios");
  if (filter === "harmony") return p.includes("harmony");
  if (filter === "both") return p.includes("ios") && p.includes("harmony");
  return true;
}

function textMatch(app, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const hay = [app.name, app.description].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q);
}

function iconHtml(app) {
  if (app.icon) {
    return `<div class="icon" aria-hidden="true"><img src="${app.icon}" alt="" loading="lazy" width="64" height="64" /></div>`;
  }
  const ch = (app.name || "?").trim().charAt(0) || "?";
  return `<div class="icon" aria-hidden="true">${ch}</div>`;
}

function screenshotsHtml(app) {
  const shots = (app.screenshots || []).filter(Boolean).slice(0, 4);
  if (!shots.length) return "";
  return `<div class="shots">${shots
    .map(
      (u) =>
        `<a href="${u}" target="_blank" rel="noopener noreferrer"><img src="${u}" alt="" loading="lazy" height="160" /></a>`
    )
    .join("")}</div>`;
}

function badges(app) {
  const p = app.platforms || [];
  const bits = [];
  if (app.status === "unpublished" || app.statusLabel) {
    bits.push(
      `<span class="badge warn">${escapeHtml(
        app.statusLabel || "未上架 · 提供 TestFlight"
      )}</span>`
    );
  }
  if (p.includes("ios") && app.downloads?.ios) {
    bits.push(`<span class="badge ios">App Store</span>`);
  }
  if (app.downloads?.testflight) {
    bits.push(`<span class="badge ios">TestFlight</span>`);
  }
  if (p.includes("harmony") && app.downloads?.harmony) {
    bits.push(`<span class="badge harmony">华为应用市场</span>`);
  }
  return bits.join("");
}

function links(app) {
  const d = app.downloads || {};
  const items = [];
  if (d.testflight) {
    items.push(
      `<a class="primary" href="${d.testflight}" target="_blank" rel="noopener noreferrer">TestFlight 下载</a>`
    );
  }
  if (d.ios) {
    items.push(
      `<a class="${d.testflight ? "" : "primary"}" href="${d.ios}" target="_blank" rel="noopener noreferrer">App Store 下载</a>`
    );
  }
  if (d.harmony) {
    items.push(
      `<a href="${d.harmony}" target="_blank" rel="noopener noreferrer">华为应用市场</a>`
    );
  }
  return items.join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  const list = $("#list");
  const apps = (state.catalog?.apps || []).filter(
    (a) => platformMatch(a, state.filter) && textMatch(a, state.query)
  );

  if (!apps.length) {
    list.innerHTML = `<div class="empty">没有匹配的应用</div>`;
    return;
  }

  list.innerHTML = apps
    .map((app, index) => {
      const delay = Math.min(index * 0.03, 0.35);
      return `
      <article class="row" style="animation-delay:${delay}s">
        ${iconHtml(app)}
        <div>
          <h2 class="name">${escapeHtml(app.name || "未命名应用")}</h2>
          <p class="summary">${escapeHtml(app.description || "暂无简介")}</p>
          <div class="badges">${badges(app)}</div>
          ${screenshotsHtml(app)}
        </div>
        <div class="side">
          <div class="updated">更新 ${formatTime(app.updatedAt)}</div>
          <div class="links">${links(app)}</div>
        </div>
      </article>`;
    })
    .join("");
}

function bindToolbar() {
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filter = btn.getAttribute("data-filter");
      document.querySelectorAll("[data-filter]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      render();
    });
  });
  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    render();
  });
}

async function boot() {
  bindToolbar();
  const res = await fetch("./data/catalog.json", { cache: "no-store" });
  if (!res.ok) throw new Error("catalog.json missing");
  state.catalog = await res.json();
  const brand = state.catalog.brand || {};
  const stats = state.catalog.stats || {};
  $("#brand").textContent = brand.name || "AppTool";
  $("#tagline").textContent =
    brand.tagline || "独立应用作品集 · 欢迎商务合作";
  $("#stat-products").textContent = String(stats.products ?? "—");
  $("#stat-ios").textContent = String(stats.ios ?? "—");
  $("#stat-harmony").textContent = String(stats.harmony ?? "—");
  $("#generated-at").textContent = formatTime(state.catalog.updatedAt);
  document.title = `${brand.name || "AppTool"} · 全栈工程师作品集`;
  render();
}

boot().catch((err) => {
  $("#list").innerHTML = `<div class="empty">加载失败：${escapeHtml(
    err.message
  )}</div>`;
});
