window.CHIMNEY_SHEET_CONFIG = {
  spreadsheetId: "1w6nPVdoVzSvqGpQPdtlmYaFTSUduCI2nHF7W9bO_J08",
  sheets: {
    schedule: {
      gid: "0",
      name: "スケジュール表",
      columns: {
        month: ["月"],
        date: ["日付"],
        title: ["タイトル"],
        official: ["公式サイト"],
        type: ["種別", "列 4"],
        area: ["地域", "G"],
        place: ["場所"],
        time: ["時間"],
        memo: ["メモ", "📝"],
        ticketUrl: ["チケット", "チケットURL"]
      }
    },
    pickups: {
      gid: "384521294",
      name: "Pick Up",
      columns: {
        position: ["表示位置"],
        title: ["タイトル"],
        description: ["説明"],
        link: ["リンク"],
        type: ["種別"]
      }
    },
    projectMap: {
      sheetName: "ProjectMap",
      name: "ProjectMap",
      columns: {
        order: ["表示順"],
        featured: ["注目"],
        title: ["プロジェクト名"],
        description: ["説明"],
        link: ["リンク"]
      }
    }
  }
};

window.CHIMNEY_STATIC_DATA = {
  townMap: [
    {
      title: "公式サイト",
      label: "Chimney Town公式サイト",
      icon: "🏠",
      color: "violet",
      url: "https://chimney.town/"
    },
    {
      title: "チムチケ",
      label: "チムチケ",
      icon: "🎫",
      color: "green",
      url: "https://chimney-ticket.jp"
    },
    {
      title: "オンラインショップ",
      label: "オンラインショップ",
      icon: "🛍",
      color: "blue",
      url: "https://chimneytown.net"
    },
    {
      title: "CHIMNEY COFFEE",
      label: "店舗住所",
      icon: "☕",
      color: "cream",
      url: "./coffee.html",
      addresses: [
        {
          name: "CHIMNEY COFFEE 渋谷本店",
          postalCode: "〒150-0031",
          address: "東京都渋谷区桜丘町25-18 NT渋谷ビル 1F"
        },
        {
          name: "CHIMNEY COFFEE 渋谷BTBホテル店",
          postalCode: "〒150-0044",
          address: "東京都渋谷区円山町1-17 渋谷BTBホテル 1階"
        }
      ]
    },
    {
      title: "YouTube",
      label: "YouTube",
      icon: "▶",
      color: "pink",
      url: "https://www.youtube.com/@akihironishino"
    },
    {
      title: "スナックCANDY",
      label: "スナックCANDY",
      icon: "🥃",
      color: "yellow",
      url: "https://salon.jp/candy"
    }
  ],
  projects: [
    { icon: "🎬", title: "映画", description: "映画関連の上映会・お知らせ。", link: "./calendar.html", tone: "blue" },
    { icon: "🎤", title: "全国講演会ツアー", description: "全国各地で行う講演会の日程一覧。", link: "./calendar.html", tone: "violet" },
    { icon: "🎠", title: "美術館", description: "美術館の開催情報やイベント日程。", link: "./calendar.html", tone: "yellow" },
    { icon: "🌱", title: "クラウドファンディング", description: "現在実施中の応援プロジェクト情報。", link: "./calendar.html", tone: "pink" },
    { icon: "☕", title: "CHIMNEY COFFEE", description: "イベントや出店情報。", link: "./calendar.html", tone: "green" },
    { icon: "🎫", title: "チムチケ", description: "チケットに関するイベントやお知らせ。", link: "./calendar.html", tone: "cream" }
  ]
};

(function () {
  const config = window.CHIMNEY_SHEET_CONFIG;

  function normalizeHeader(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  function readCell(cell) {
    if (!cell) return "";
    if (cell.f) return String(cell.f).trim();
    if (cell.v === null || cell.v === undefined) return "";
    return String(cell.v).trim();
  }

  function readRawCell(cell) {
    if (!cell || cell.v === null || cell.v === undefined) return "";
    return cell.v;
  }

  function parseGoogleDate(value, label) {
    const raw = String(value || "");
    const match = raw.match(/^Date\((\d+),(\d+),(\d+)\)$/);
    if (match) {
      const year = Number(match[1]);
      const monthIndex = Number(match[2]);
      const day = Number(match[3]);
      const date = new Date(year, monthIndex, day);
      return {
        iso: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        label: label || `${monthIndex + 1}/${day}`,
        date
      };
    }

    if (!label) return { iso: "", label: "", date: null };
    const date = new Date(`${label}/${new Date().getFullYear()}`);
    return { iso: "", label, date: Number.isNaN(date.getTime()) ? null : date };
  }

  function buildHeaderIndex(table) {
    const index = new Map();
    table.cols.forEach((col, colIndex) => {
      const key = normalizeHeader(col.label || col.id);
      if (key) index.set(key, colIndex);
    });
    return index;
  }

  function pickColumn(headerIndex, names) {
    for (const name of names) {
      const key = normalizeHeader(name);
      if (headerIndex.has(key)) return headerIndex.get(key);
    }
    return -1;
  }

  function tableToRows(table, columns) {
    const headerIndex = buildHeaderIndex(table);
    const mappedColumns = Object.fromEntries(
      Object.entries(columns).map(([key, names]) => [key, pickColumn(headerIndex, names)])
    );
    if (mappedColumns.area < 0) mappedColumns.area = 6;

    return table.rows.map((row) => {
      const cells = row.c || [];
      return Object.fromEntries(
        Object.entries(mappedColumns).map(([key, index]) => {
          const cell = index >= 0 ? cells[index] : null;
          return [key, key === "date" ? { raw: readRawCell(cell), label: readCell(cell) } : readCell(cell)];
        })
      );
    });
  }

  function loadSheet(sheet) {
    return new Promise((resolve, reject) => {
      const sheetKey = sheet.gid || sheet.sheetName || sheet.name;
      const callbackName = `chimneySheetCallback_${String(sheetKey).replace(/\W/g, "")}_${Date.now()}`;
      const url = new URL(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq`);
      if (sheet.gid) {
        url.searchParams.set("gid", sheet.gid);
      } else {
        url.searchParams.set("sheet", sheet.sheetName || sheet.name);
      }
      url.searchParams.set("tqx", `out:json;responseHandler:${callbackName}`);

      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error(`${sheet.name} の読み込みがタイムアウトしました。`));
      }, 12000);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = (response) => {
        cleanup();
        if (response.status !== "ok") {
          reject(new Error(`${sheet.name} の読み込みに失敗しました。`));
          return;
        }
        resolve(tableToRows(response.table, sheet.columns));
      };

      script.onerror = () => {
        cleanup();
        reject(new Error(`${sheet.name} に接続できませんでした。`));
      };

      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  function normalizePickup(row) {
    const position = Number(row.position);
    return {
      position,
      icon: iconForType(row.type),
      title: row.title,
      description: row.description,
      link: row.link || "#",
      type: row.type
    };
  }

  function normalizeEvent(row) {
    const parsedDate = parseGoogleDate(row.date.raw, row.date.label);
    return {
      month: row.month,
      date: parsedDate.iso,
      dateLabel: parsedDate.label,
      dateObject: parsedDate.date,
      title: row.title,
      official: row.official,
      type: row.type,
      area: row.area,
      place: row.place,
      time: row.time,
      memo: row.memo,
      ticketUrl: row.ticketUrl
    };
  }

  function normalizeProject(row) {
    const order = Number(row.order);
    const featured = String(row.featured || "").trim();
    const title = cleanProjectTitle(row.title);
    const link = projectLinkFor(title, row.link);

    return {
      order: Number.isFinite(order) ? order : 9999,
      featured,
      isFeatured: featured === "大" || featured.includes("⭐"),
      icon: iconForProject(title),
      title,
      description: row.description || "",
      link,
      tone: "cream"
    };
  }

  function iconForType(type) {
    const value = String(type || "");
    if (value.includes("チケット")) return "🎫";
    if (value.includes("クラファン")) return "🌱";
    if (value.includes("本") || value.includes("ほん")) return "📖";
    if (value.includes("メディア")) return "📺";
    return "📌";
  }

  function iconForProject(title) {
    const value = String(title || "");
    const upperValue = value.toUpperCase();
    if (value.includes("映画")) return "🎬";
    if (value.includes("講演")) return "🎤";
    if (value.includes("美術館")) return "🖼️";
    if (value.includes("クラウド")) return "🌱";
    if (upperValue.includes("COFFEE") || value.includes("コーヒー")) return "☕";
    if (value.includes("チムチケ") || value.includes("チケット")) return "🎫";
    if (value.includes("本") || value.includes("絵本")) return "📖";
    return "📍";
  }

  function projectLinkFor(title, link) {
    const value = String(title || "");
    const upperValue = value.toUpperCase();
    const sheetLink = String(link || "").trim();
    if (upperValue.includes("COFFEE") || value.includes("コーヒー")) return "#coffee-addresses";
    if (sheetLink) return sheetLink;
    if (value.includes("映画")) return "https://poupelle.com";
    if (value.includes("講演")) return "https://kouenkai.chimney.town/";
    if (value.includes("美術館")) return "https://kawaguchikomusicforest.jp/";
    if (value.includes("クラウド")) return "https://www.picture-book.jp/";
    if (value.includes("チムチケ") || value.includes("チケット")) return "https://chimney-ticket.jp/";
    return "#";
  }

  function cleanProjectTitle(title) {
    const value = String(title || "").trim();
    if (/chimney coffee/i.test(value)) return "CHIMNEY COFFEE";
    if (value === "クラウドファンデング") return "クラウドファンディング";
    return value;
  }

  window.loadChimneyData = async function loadChimneyData() {
    const projectRowsPromise = loadSheet(config.sheets.projectMap).catch(() => (
      loadSheet({ ...config.sheets.projectMap, sheetName: "Project Map", name: "Project Map" }).catch(() => null)
    ));
    const [pickupRows, scheduleRows, projectRows] = await Promise.all([
      loadSheet(config.sheets.pickups),
      loadSheet(config.sheets.schedule),
      projectRowsPromise
    ]);
    const sheetProjects = Array.isArray(projectRows)
      ? projectRows
        .map(normalizeProject)
        .filter((project) => project.title)
        .sort((a, b) => a.order - b.order)
      : [];

    return {
      pickups: pickupRows
        .map(normalizePickup)
        .filter((item) => item.position >= 1 && item.position <= 3 && item.title)
        .sort((a, b) => a.position - b.position),
      events: scheduleRows
        .map(normalizeEvent)
        .filter((event) => event.date && event.title)
        .sort((a, b) => a.dateObject - b.dateObject),
      townMap: window.CHIMNEY_STATIC_DATA.townMap,
      projects: sheetProjects.length ? sheetProjects : window.CHIMNEY_STATIC_DATA.projects
    };
  };
}());
