/* Kaiju Tracker
   Reads movies.csv, tv.csv, games.csv, and figures.csv.
   Columns, in order: title, year, group, status, rating, notes.
   No build step. */

(function () {
  "use strict";

  var FILES = {
    movies: "movies.csv",
    tv: "tv.csv",
    games: "games.csv",
    figures: "figures.csv"
  };

  var TABS = ["movies", "tv", "games", "figures"];

  var META = {
    movies: { label: "Movies", done: "seen", progress: function (done, total) { return "Movies seen " + done + "/" + total; } },
    tv: { label: "TV & Anime", done: "seen", progress: function (done, total) { return "TV & Anime seen " + done + "/" + total; } },
    games: { label: "Games", done: "played", progress: function (done, total) { return "Games played " + done + "/" + total; } },
    figures: {
      label: "Figures",
      done: "owned",
      progress: function (done, total, rows) {
        var wishlist = rows.filter(function (item) { return item.status === "wishlist"; }).length;
        return "Figures owned " + done + " · Wishlist " + wishlist;
      }
    }
  };

  var LABELS = {
    seen: "Seen",
    unseen: "Unseen",
    played: "Played",
    unplayed: "Unplayed",
    owned: "Owned",
    wishlist: "Wishlist"
  };

  var STAR_PATH = "M12 2.6l2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 17.6 6.3 20.2 7.8 13.7 2.8 9.3l6.6-.6L12 2.6z";
  var SVG = "http://www.w3.org/2000/svg";

  var data = {};
  var state = { tab: "movies", group: "" };
  var ready = false;
  var chipSignature = "";

  var progressLabel = document.getElementById("progress-label");
  var progressPct = document.getElementById("progress-pct");
  var meterFill = document.getElementById("meter-fill");
  var showingEl = document.getElementById("showing");
  var panel = document.getElementById("panel");
  var listHeading = document.getElementById("list-heading");
  var searchEl = document.getElementById("search");
  var clearBtn = document.getElementById("clear-search");
  var sortEl = document.getElementById("sort");
  var chipRow = document.getElementById("chips");
  var dock = document.getElementById("dock");
  var sentinel = document.getElementById("dock-sentinel");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    var src = text.replace(/^\uFEFF/, "");

    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      if (inQuotes) {
        if (c === '"') {
          if (src[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c !== "\r") {
        field += c;
      }
    }

    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    if (!rows.length) return [];
    var headers = rows[0].map(function (cell) { return cell.trim(); });
    return rows.slice(1).map(function (cells) {
      var item = {};
      headers.forEach(function (header, index) {
        item[header] = (cells[index] || "").trim();
      });
      return item;
    }).filter(function (item) {
      return item.title && item.title.toLowerCase() !== "title";
    });
  }

  function rawHash() {
    try {
      return decodeURIComponent(location.hash.replace(/^#/, "")).trim().toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function tabFromHash() {
    var name = rawHash();
    return TABS.indexOf(name) === -1 ? "movies" : name;
  }

  function correctUnknownHash() {
    var name = rawHash();
    if (!location.hash || TABS.indexOf(name) !== -1) return false;
    history.replaceState(null, "", "#movies");
    return true;
  }

  function isDone(tab, item) {
    return item.status === META[tab].done;
  }

  function uniqueGroups(rows) {
    var groups = [];
    rows.forEach(function (item) {
      if (item.group && groups.indexOf(item.group) === -1) groups.push(item.group);
    });
    return groups;
  }

  function parseYear(item) {
    if (!item.year || !/^\d{3,4}$/.test(item.year)) return null;
    return Number(item.year);
  }

  function statusRank(item) {
    if (item.status === "unseen" || item.status === "unplayed" || item.status === "wishlist") return 0;
    if (item.status === "seen" || item.status === "played" || item.status === "owned") return 1;
    return 2;
  }

  function compareItems(mode, a, b) {
    if (mode === "year-desc" || mode === "year-asc") {
      var ay = parseYear(a);
      var by = parseYear(b);
      if (ay === null && by === null) return 0;
      if (ay === null) return 1;
      if (by === null) return -1;
      return mode === "year-desc" ? by - ay : ay - by;
    }
    if (mode === "title-asc" || mode === "title-desc") {
      var result = a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });
      return mode === "title-desc" ? -result : result;
    }
    if (mode === "status") return statusRank(a) - statusRank(b);
    return 0;
  }

  function sortItems(items, mode) {
    var indexed = items.map(function (item, index) { return { item: item, index: index }; });
    indexed.sort(function (a, b) {
      return compareItems(mode, a.item, b.item) || a.index - b.index;
    });
    return indexed.map(function (entry) { return entry.item; });
  }

  function syncTabs() {
    TABS.forEach(function (tab) {
      var button = document.getElementById("tab-" + tab);
      var selected = tab === state.tab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
      var count = button.querySelector("[data-count]");
      if (data[tab]) count.textContent = String(data[tab].length);
    });
    panel.setAttribute("aria-labelledby", "tab-" + state.tab);
    listHeading.textContent = META[state.tab].label;
    document.title = META[state.tab].label + " · Kaiju Tracker";
  }

  function updateProgress(rows) {
    var meta = META[state.tab];
    var done = rows.filter(function (item) { return isDone(state.tab, item); }).length;
    var total = rows.length;
    progressLabel.textContent = meta.progress(done, total, rows);
    var pct = total ? (done / total) * 100 : 0;
    progressPct.textContent = Math.round(pct) + "%";
    var width = done > 0 ? Math.max(pct, 1.5) : 0;
    meterFill.style.width = width + "%";
  }

  function revealInRow(node) {
    var row = node.parentElement;
    if (!row) return;
    var rowRect = row.getBoundingClientRect();
    var nodeRect = node.getBoundingClientRect();
    if (nodeRect.left < rowRect.left + 4) {
      row.scrollLeft -= rowRect.left - nodeRect.left + 8;
    } else if (nodeRect.right > rowRect.right - 4) {
      row.scrollLeft += nodeRect.right - rowRect.right + 8;
    }
  }

  function syncChipState() {
    var chips = chipRow.querySelectorAll("[role='radio']");
    chips.forEach(function (chip) {
      var on = chip.dataset.group === state.group;
      chip.setAttribute("aria-checked", on ? "true" : "false");
      chip.tabIndex = on ? 0 : -1;
    });
  }

  function addChip(group, label, count) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.group = group;
    chip.setAttribute("role", "radio");
    chip.appendChild(document.createTextNode(label));
    chip.appendChild(el("span", "chip-count", String(count)));
    chip.addEventListener("click", function () {
      if (state.group === group) return;
      state.group = group;
      render();
      revealInRow(chip);
    });
    chip.addEventListener("keydown", function (event) {
      var keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (keys.indexOf(event.key) === -1) return;
      var list = Array.prototype.slice.call(chipRow.querySelectorAll("[role='radio']"));
      var index = list.indexOf(chip);
      if (event.key === "ArrowRight") index = (index + 1) % list.length;
      else if (event.key === "ArrowLeft") index = (index - 1 + list.length) % list.length;
      else if (event.key === "Home") index = 0;
      else index = list.length - 1;
      event.preventDefault();
      list[index].focus();
      list[index].click();
    });
    chipRow.appendChild(chip);
  }

  function ensureChips(rows) {
    var groups = uniqueGroups(rows);
    if (state.group && groups.indexOf(state.group) === -1) state.group = "";
    var signature = state.tab + "\0" + groups.join("\0");
    if (signature === chipSignature) {
      syncChipState();
      return;
    }
    chipSignature = signature;
    chipRow.replaceChildren();
    addChip("", "All", rows.length);
    groups.forEach(function (group) {
      var count = rows.filter(function (item) { return item.group === group; }).length;
      addChip(group, group, count);
    });
    syncChipState();
  }

  function createStars(rating) {
    var score = /^[1-5]$/.test(rating) ? Number(rating) : 0;
    if (!score) return null;
    var wrap = document.createElement("div");
    wrap.className = "stars";
    wrap.setAttribute("aria-label", "Rated " + score + " out of 5");
    for (var i = 1; i <= 5; i++) {
      var svg = document.createElementNS(SVG, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      svg.classList.add("star");
      if (i <= score) svg.classList.add("on");
      var path = document.createElementNS(SVG, "path");
      path.setAttribute("fill", "currentColor");
      path.setAttribute("d", STAR_PATH);
      svg.appendChild(path);
      wrap.appendChild(svg);
    }
    return wrap;
  }

  function renderCard(item, flat) {
    var card = document.createElement("article");
    card.className = "card";
    if (item.status) card.dataset.status = item.status;
    if (isDone(state.tab, item)) card.dataset.done = "true";
    var sample = /^example\b/i.test(item.title);
    if (sample) card.classList.add("is-sample");

    var main = document.createElement("div");
    main.className = "card-main";
    if (sample) main.appendChild(el("p", "sample-flag", "Sample row"));
    main.appendChild(el(flat ? "h3" : "h4", "title", item.title));

    var bits = [];
    if (flat && item.group) bits.push(item.group);
    if (item.year) bits.push(item.year);
    if (bits.length) main.appendChild(el("p", "sub", bits.join(" · ")));

    var side = document.createElement("div");
    side.className = "card-side";
    var pill = el("span", "pill", LABELS[item.status] || item.status || "—");
    if (isDone(state.tab, item)) pill.classList.add("done");
    else if (item.status === "wishlist") pill.classList.add("wish");
    side.appendChild(pill);
    var stars = createStars(item.rating);
    if (stars) side.appendChild(stars);

    card.append(main, side);
    if (item.notes) card.appendChild(el("p", "notes", item.notes));
    return card;
  }

  function filteredItems(rows) {
    var tokens = searchEl.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(function (item) {
      if (state.group && item.group !== state.group) return false;
      if (!tokens.length) return true;
      var hay = [
        item.title,
        item.year,
        item.group,
        item.status,
        LABELS[item.status] || "",
        item.notes
      ].join(" ").toLowerCase();
      return tokens.every(function (token) { return hay.indexOf(token) !== -1; });
    });
  }

  function updateFades() {
    [
      [document.querySelector(".tabs"), document.querySelector(".tabs-wrap")],
      [chipRow, document.querySelector(".chip-wrap")]
    ].forEach(function (pair) {
      var row = pair[0];
      var wrap = pair[1];
      if (!row || !wrap) return;
      wrap.classList.toggle("can-scroll", row.scrollWidth > row.clientWidth + 1);
    });
  }

  function render() {
    var rows = data[state.tab] || [];
    updateProgress(rows);
    syncChipState();
    clearBtn.hidden = searchEl.value.length === 0;

    var mode = sortEl.value;
    var flat = mode !== "group";
    var items = filteredItems(rows);
    if (flat) items = sortItems(items, mode);

    var narrowed = Boolean(state.group || searchEl.value.trim());
    showingEl.textContent = narrowed ? "Showing " + items.length + " of " + rows.length : "";

    panel.replaceChildren();

    if (!rows.length) {
      panel.appendChild(el("p", "empty", state.tab === "figures"
        ? "No figures yet. Add a row to figures.csv."
        : "Nothing in this list yet."));
      updateFades();
      return;
    }

    if (!items.length) {
      var box = el("div", "empty");
      box.appendChild(el("p", null, "Nothing matches."));
      var reset = el("button", "ghost", "Clear search and filters");
      reset.type = "button";
      reset.dataset.action = "reset";
      box.appendChild(reset);
      panel.appendChild(box);
      updateFades();
      return;
    }

    if (!flat) {
      var sections = [];
      items.forEach(function (item) {
        var name = item.group || "Other";
        var section = sections.find(function (entry) { return entry.name === name; });
        if (!section) {
          section = { name: name, items: [] };
          sections.push(section);
        }
        section.items.push(item);
      });
      sections.forEach(function (section) {
        var block = document.createElement("section");
        block.className = "section";
        var heading = el("h3", "group-name");
        heading.appendChild(document.createTextNode(section.name));
        var done = section.items.filter(function (item) { return isDone(state.tab, item); }).length;
        var count = el("span", "group-count", done + "/" + section.items.length);
        if (section.items.length && done === section.items.length) count.classList.add("complete");
        heading.appendChild(count);
        var grid = el("div", "grid");
        section.items.forEach(function (item) { grid.appendChild(renderCard(item, false)); });
        block.append(heading, grid);
        panel.appendChild(block);
      });
    } else {
      var grid = el("div", "grid");
      items.forEach(function (item) { grid.appendChild(renderCard(item, true)); });
      panel.appendChild(grid);
    }

    updateFades();
  }

  function alignList() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var stuckLine = parseFloat(getComputedStyle(dock).top) || 0;
    if (dock.getBoundingClientRect().top > stuckLine + 2) return;
    var y = sentinel.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
  }

  function selectTab(id, options) {
    var historyMode = options && options.historyMode || "none";
    var scroll = Boolean(options && options.scroll);
    var reason = options && options.reason || "";
    if (TABS.indexOf(id) === -1) id = "movies";
    var changed = id !== state.tab;
    state.tab = id;
    if (historyMode === "push" && location.hash !== "#" + id) {
      history.pushState(null, "", "#" + id);
    }
    syncTabs();
    var activeTab = document.getElementById("tab-" + id);
    if (activeTab) revealInRow(activeTab);
    if (!ready) return;
    if (!changed && reason !== "load") {
      if (scroll) alignList();
      return;
    }
    if (changed) {
      searchEl.value = "";
      state.group = "";
      chipSignature = "";
    }
    ensureChips(data[id] || []);
    render();
    if (scroll) alignList();
  }

  function showError(error) {
    progressLabel.textContent = "Could not load the lists.";
    progressPct.textContent = "";
    meterFill.style.width = "0%";
    showingEl.textContent = "";
    panel.replaceChildren();
    panel.appendChild(el("p", "error", "The page could not read " + error.message + ". Refresh and try again."));
  }

  document.querySelectorAll("[role='tab']").forEach(function (button) {
    var id = button.id.replace("tab-", "");
    button.addEventListener("click", function () {
      selectTab(id, { historyMode: "push", scroll: true });
    });
    button.addEventListener("keydown", function (event) {
      var keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (keys.indexOf(event.key) === -1) return;
      var index = TABS.indexOf(id);
      if (event.key === "ArrowRight") index = (index + 1) % TABS.length;
      else if (event.key === "ArrowLeft") index = (index - 1 + TABS.length) % TABS.length;
      else if (event.key === "Home") index = 0;
      else index = TABS.length - 1;
      event.preventDefault();
      var next = document.getElementById("tab-" + TABS[index]);
      next.focus();
      revealInRow(next);
      selectTab(TABS[index], { historyMode: "push", scroll: true });
    });
  });

  searchEl.addEventListener("input", render);
  searchEl.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (searchEl.value) {
      searchEl.value = "";
      render();
    } else {
      searchEl.blur();
    }
  });
  clearBtn.addEventListener("click", function () {
    searchEl.value = "";
    render();
    searchEl.focus();
  });
  sortEl.addEventListener("change", render);

  panel.addEventListener("click", function (event) {
    var button = event.target.closest("[data-action='reset']");
    if (!button) return;
    searchEl.value = "";
    state.group = "";
    render();
    searchEl.focus();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    var active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
    event.preventDefault();
    searchEl.focus();
    searchEl.select();
  });

  window.addEventListener("hashchange", function () {
    if (correctUnknownHash() && state.tab === "movies") return;
    var next = tabFromHash();
    if (next !== state.tab) selectTab(next, { historyMode: "none", scroll: true });
  });

  window.addEventListener("resize", updateFades);

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      dock.classList.toggle("is-stuck", !entries[0].isIntersecting);
    });
    observer.observe(sentinel);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateFades);
  }

  var initialHash = correctUnknownHash() ? "movies" : rawHash();
  state.tab = initialHash || "movies";

  Promise.all(TABS.map(function (tab) {
    return fetch(FILES[tab], { cache: "no-cache" }).then(function (response) {
      if (!response.ok) throw new Error(FILES[tab] + " (" + response.status + ")");
      return response.text().then(function (text) { return [tab, parseCSV(text)]; });
    });
  })).then(function (entries) {
    entries.forEach(function (entry) { data[entry[0]] = entry[1]; });
    ready = true;
    selectTab(state.tab, { historyMode: "none", reason: "load" });
  }).catch(showError);
})();
