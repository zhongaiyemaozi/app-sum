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
  const listings = app.listings || {};
  const hay = [
    app.name,
    app.summary,
    app.description,
    listings.ios?.description,
    listings.ios?.name,
    listings.harmony?.description,
    listings.harmony?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function iconHtml(app) {
  if (app.icon) {
    return `<div class="icon" aria-hidden="true"><img src="${app.icon}" alt="" loading="lazy" width="64" height="64" referrerpolicy="no-referrer" /></div>`;
  }
  const ch = (app.name || "?").trim().charAt(0) || "?";
  return `<div class="icon" aria-hidden="true">${ch}</div>`;
}

function shotsHtml(urls) {
  const shots = (urls || []).filter(Boolean).slice(0, 4);
  if (!shots.length) return "";
  return `<div class="shots">${shots
    .map(
      (u) =>
        `<a href="${u}" target="_blank" rel="noopener noreferrer"><img src="${u}" alt="" loading="lazy" height="140" referrerpolicy="no-referrer" /></a>`
    )
    .join("")}</div>`;
}

function listingBlock(plat, listing) {
  if (!listing) return "";
  const note =
    listing.sourceNote ||
    (plat === "ios"
      ? "以下文案与截图来自 App Store（打开页面时拉取最新图）"
      : "以下文案与截图来自华为应用市场");
  const desc = listing.description || "";
  return `
    <div class="listing ${plat}">
      <p class="source-note">${escapeHtml(note)}</p>
      ${
        desc
          ? `<p class="listing-desc">${escapeHtml(desc)}</p>`
          : `<p class="listing-desc muted">暂无商店简介</p>`
      }
      ${shotsHtml(listing.screenshots)}
    </div>`;
}

function listingsHtml(app) {
  const L = app.listings || {};
  const hasIos = !!L.ios;
  const hasHarmony = !!L.harmony;
  if (!hasIos && !hasHarmony) {
    // TestFlight-only / override without store listing
    const desc = app.summary || app.description || "";
    return desc
      ? `<p class="listing-desc">${escapeHtml(desc)}</p>`
      : "";
  }
  if (hasIos && hasHarmony) {
    return `<div class="listings dual">${listingBlock(
      "ios",
      L.ios
    )}${listingBlock("harmony", L.harmony)}</div>`;
  }
  return `<div class="listings">${listingBlock(
    hasIos ? "ios" : "harmony",
    hasIos ? L.ios : L.harmony
  )}</div>`;
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
        <div class="body">
          <h2 class="name">${escapeHtml(app.name || "未命名应用")}</h2>
          <p class="summary">${escapeHtml(app.summary || "暂无简介")}</p>
          <div class="badges">${badges(app)}</div>
          ${listingsHtml(app)}
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

function appleIdFromApp(app) {
  const listed = app.listings?.ios?.appleId;
  if (listed) return String(listed);
  const url = app.downloads?.ios || "";
  const m = url.match(/\/id(\d+)/);
  return m ? m[1] : null;
}

function storeCountryFromApp(app) {
  const listed = app.listings?.ios?.storeCountry;
  if (listed) return String(listed).toLowerCase();
  const url = app.downloads?.ios || "";
  const m = url.match(/apps\.apple\.com\/([a-z]{2})\//i);
  return (m ? m[1] : "us").toLowerCase();
}

function itunesJsonp(ids, country) {
  return new Promise((resolve, reject) => {
    const cb = `itunesCb${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("itunes timeout"));
    }, 10000);
    function cleanup() {
      clearTimeout(timer);
      try {
        delete window[cb];
      } catch {
        window[cb] = undefined;
      }
      script.remove();
    }
    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("itunes jsonp"));
    };
    script.src = `https://itunes.apple.com/lookup?id=${ids.join(",")}&country=${country}&callback=${cb}`;
    document.head.appendChild(script);
  });
}

async function itunesLookup(ids, country) {
  if (!ids.length) return [];
  const url = `https://itunes.apple.com/lookup?id=${ids.join(",")}&country=${country}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("itunes http");
    const data = await res.json();
    return data.results || [];
  } catch {
    const data = await itunesJsonp(ids, country);
    return data.results || [];
  }
}

function applyItunesResult(app, result) {
  const listing = app.listings?.ios;
  if (!listing || !result) return;
  if (result.artworkUrl512) {
    listing.icon = result.artworkUrl512;
    app.icon = result.artworkUrl512;
  }
  const shots = result.screenshotUrls?.length
    ? result.screenshotUrls
    : result.ipadScreenshotUrls;
  if (shots?.length) {
    listing.screenshots = shots.slice(0, 4);
  }
}

async function enrichIosFromAppStore(catalog) {
  const groups = new Map();
  for (const app of catalog.apps || []) {
    if (!app.listings?.ios || !app.downloads?.ios) continue;
    const id = appleIdFromApp(app);
    if (!id) continue;
    const country = storeCountryFromApp(app);
    if (!groups.has(country)) groups.set(country, []);
    groups.get(country).push({ id, app });
  }
  const jobs = [];
  for (const [country, items] of groups) {
    const unique = [...new Map(items.map((x) => [x.id, x])).values()];
    for (let i = 0; i < unique.length; i += 20) {
      const chunk = unique.slice(i, i + 20);
      jobs.push(
        itunesLookup(
          chunk.map((x) => x.id),
          country
        ).then((results) => {
          const byId = new Map(
            results.map((r) => [String(r.trackId), r])
          );
          for (const item of chunk) {
            applyItunesResult(item.app, byId.get(item.id));
          }
        }).catch(() => {})
      );
    }
  }
  await Promise.all(jobs);
}

async function boot() {
  bindToolbar();
  const res = await fetch("./data/catalog.json", { cache: "no-store" });
  if (!res.ok) throw new Error("catalog.json missing");
  state.catalog = await res.json();
  const brand = state.catalog.brand || {};
  const stats = state.catalog.stats || {};
  const notes = state.catalog.notes || {};
  $("#brand").textContent = brand.name || "AppTool";
  $("#tagline").textContent =
    brand.tagline || "独立应用作品集 · 欢迎商务合作";
  $("#stat-products").textContent = String(stats.products ?? "—");
  $("#stat-ios").textContent = String(stats.ios ?? "—");
  $("#stat-harmony").textContent = String(stats.harmony ?? "—");
  $("#generated-at").textContent = formatTime(state.catalog.updatedAt);
  const noteEl = $("#asset-note");
  if (noteEl) {
    noteEl.textContent =
      notes.assets ||
      "iOS 截图打开页面时从 App Store 实时拉取；鸿蒙商店链接会过期，截图已缓存到本站。";
  }
  document.title = `${brand.name || "AppTool"} · 全栈工程师作品集`;
  render();
  try {
    await enrichIosFromAppStore(state.catalog);
    render();
  } catch {
    // Keep catalog fallback images (Apple CDN URLs from last scan).
  }
}

boot().catch((err) => {
  $("#list").innerHTML = `<div class="empty">加载失败：${escapeHtml(
    err.message
  )}</div>`;
});
