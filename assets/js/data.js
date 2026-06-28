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
    movieSchedule: {
      sheetName: "上映スケジュール",
      name: "上映スケジュール",
      columns: {
        start: ["上映開始"],
        end: ["上映終了"],
        area: ["都道府県"],
        theater: ["映画館"],
        url: ["URL"],
        memo: ["メモ"]
      }
    },
    screeningSchedule: {
      sheetName: "イベント上映",
      name: "イベント上映",
      range: "C4:J"
    },
    projectMap: {
      sheetName: "ProjectMap",
      name: "ProjectMap",
      cardRange: "B3:F24",
      linkRange: "F17:J"
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
      links: [
        {
          label: "店舗一覧",
          url: "./coffee.html"
        },
        {
          label: "通販",
          url: "https://chimney-coffee.com/?srsltid=AfmBOoqdHB8fkPWbccNcj89eS-OsNKv1suqvaaM9_j6YtDUE1PgsgqhR"
        }
      ],
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
      title: "メディア",
      label: "メディア",
      icon: "🎬",
      color: "pink",
      url: "https://www.youtube.com/@akihironishino",
      links: [
        {
          label: "⧈ Instagram",
          url: "https://www.instagram.com/japanesehandsome?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
        },
        {
          label: "🎙 VOICY",
          url: "https://voicy.jp/channel/941"
        },
        {
          label: "𝕏 X",
          url: "https://x.com/nishinoakihiro?s=20"
        },
        {
          label: "▶ YouTube",
          url: "https://www.youtube.com/@akihironishino"
        },
        {
          label: "🎵 TikTok",
          url: "https://www.tiktok.com/@backstory_youtube?is_from_webapp=1&sender_device=pc"
        }
      ]
    },
    {
      title: "スナックCANDY",
      label: "スナックCANDY",
      icon: "🥃",
      color: "yellow",
      url: "https://salon.jp/candy"
    },
    {
      title: "Project Map",
      label: "Project Map",
      icon: "🎪",
      color: "cream",
      url: "./project-map.html",
      noteDescription: "えんとつ町のプロジェクト一覧はこちら。",
      links: [
        {
          label: "Project Mapを見る",
          url: "./project-map.html"
        }
      ]
    }
  ]
};

(function () {
  const config = window.CHIMNEY_SHEET_CONFIG;
  let sheetRequestSequence = 0;

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
      const callbackName = `chimneySheetCallback_${String(sheetKey).replace(/\W/g, "")}_${Date.now()}_${sheetRequestSequence += 1}`;
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

  function loadSheetRange(sheet, range, label) {
    return new Promise((resolve, reject) => {
      const url = new URL(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/gviz/tq`);
      url.searchParams.set("sheet", sheet.sheetName || sheet.name);
      url.searchParams.set("range", range);
      url.searchParams.set("headers", "0");
      url.searchParams.set("tqx", "out:json");

      const script = document.createElement("script");
      const previousGoogle = window.google;
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error(`${sheet.name} ${label} の読み込みがタイムアウトしました。`));
      }, 12000);

      function cleanup() {
        window.clearTimeout(timeout);
        if (previousGoogle === undefined) delete window.google;
        else window.google = previousGoogle;
        script.remove();
      }

      window.google = {
        visualization: {
          Query: {
            setResponse(response) {
              cleanup();
              if (response.status !== "ok") {
                reject(new Error(`${sheet.name} ${label} の読み込みに失敗しました。`));
                return;
              }
              resolve(response.table.rows.map((row) => (row.c || []).map(readCell)));
            }
          }
        }
      };

      script.onerror = () => {
        cleanup();
        reject(new Error(`${sheet.name} ${label} に接続できませんでした。`));
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

  function normalizeMovieSchedule(row) {
    const startDate = parseFlexibleDate(row.start);
    const endDate = parseFlexibleDate(row.end);
    return {
      start: row.start,
      end: row.end,
      startDate,
      endDate,
      area: row.area || "",
      theater: row.theater || "",
      url: row.url || "",
      memo: row.memo || ""
    };
  }

  function normalizeScreeningSchedule(row) {
    const [dateValue, time, areaValue, place, titleValue, url, memo, calendarVisible] = row;
    const dateObject = parseFlexibleDate(dateValue);
    const title = String(titleValue || "").trim();
    const area = String(areaValue || "").trim();
    return {
      date: dateObject ? dateToIso(dateObject) : "",
      dateLabel: String(dateValue || "").trim(),
      dateObject,
      time: time || "",
      area,
      place: place || "",
      title,
      displayTitle: title || "イベント上映",
      url: url || "",
      memo: memo || "",
      visible: String(calendarVisible || "").trim().toUpperCase() !== "FALSE"
    };
  }

  function dateToIso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function parseFlexibleDate(value) {
    const label = String(value || "").trim();
    if (!label) return null;

    const dateCall = label.match(/^Date\((\d+),(\d+),(\d+)\)$/);
    if (dateCall) {
      return new Date(Number(dateCall[1]), Number(dateCall[2]), Number(dateCall[3]));
    }

    const normalized = label
      .replace(/[年月]/g, "/")
      .replace(/日/g, "")
      .replace(/[.-]/g, "/");
    const parts = normalized.split("/").map((part) => Number(part));
    if (parts.length >= 3 && parts.every(Number.isFinite)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    if (parts.length === 2 && parts.every(Number.isFinite)) {
      return new Date(new Date().getFullYear(), parts[0] - 1, parts[1]);
    }

    const parsed = new Date(label);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    if (value.includes("上映会")) return "🎞️";
    if (value.includes("映画")) return "🎬";
    if (value.includes("全国講演会") || value.includes("講演")) return "🎤";
    if (value.includes("美術館")) return "🏛️";
    if (value.includes("クラウドファンデ") || value.includes("クラファン")) return "🌱";
    if (upperValue.includes("COFFEE") || value.includes("コーヒー")) return "☕";
    if (value.includes("チムチケ") || value.includes("チケット")) return "🎫";
    if (value.includes("見上げる家")) return "🏠";
    if (value.includes("ニシノコンサル")) return "💡";
    return "📍";
  }

  async function loadProjectMap() {
    const sheet = config.sheets.projectMap;
    const cardRows = await loadSheetRange(sheet, sheet.cardRange, "カード情報");
    const linkRows = await loadSheetRange(sheet, sheet.linkRange, "リンク情報");
    const linksByProject = new Map();
    const usesRequestedCardColumns = cardRows.filter((row) => isOrderValue(row[1])).length
      >= cardRows.filter((row) => isOrderValue(row[0])).length;
    const usesRequestedLinkColumns = linkRows.filter((row) => isHttpUrlValue(row[3])).length
      >= linkRows.filter((row) => isHttpUrlValue(row[2])).length;

    linkRows.forEach((row) => {
      const [projectName, linkLabel, url, hidden] = usesRequestedLinkColumns
        ? [row[1], row[2], row[3], row[4]]
        : [row[0], row[1], row[2], row[3]];
      const name = String(projectName || "").trim();
      const label = String(linkLabel || "").trim();
      const href = String(url || "").trim();
      if (
        !name ||
        name === "プロジェクト名" ||
        !label ||
        !href ||
        String(hidden || "").trim().toUpperCase() === "FALSE"
      ) return;
      if (!linksByProject.has(name)) linksByProject.set(name, []);
      linksByProject.get(name).push({
        label,
        url: href
      });
    });

    return cardRows
      .map((row) => {
        const [orderValue, featuredValue, titleValue, descriptionValue] = usesRequestedCardColumns
          ? [row[1], row[2], row[3], row[4]]
          : [row[0], row[1], row[2], row[3]];
        const order = Number(orderValue);
        const title = String(titleValue || "").trim();
        const featured = String(featuredValue || "").trim();
        return {
          order: Number.isFinite(order) ? order : 9999,
          featured,
          isFeatured: featured === "大",
          icon: iconForProject(title),
          title,
          description: String(descriptionValue || "").trim(),
          links: linksByProject.get(title) || [],
          tone: "cream"
        };
      })
      .filter((project) => project.title && project.title !== "プロジェクト名")
      .sort((a, b) => a.order - b.order);
  }

  async function loadScreeningSchedule() {
    return loadSheetRange(
      config.sheets.screeningSchedule,
      config.sheets.screeningSchedule.range,
      "上映情報"
    );
  }

  function isHttpUrlValue(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  function isOrderValue(value) {
    const text = String(value || "").trim();
    return text !== "" && Number.isFinite(Number(text));
  }

  window.loadChimneyData = async function loadChimneyData() {
    const projectResultPromise = loadProjectMap()
      .then((rows) => ({ rows, error: null }))
      .catch((error) => ({ rows: [], error }));
    const movieResultPromise = loadSheet(config.sheets.movieSchedule)
      .then((rows) => ({ rows, error: null }))
      .catch((error) => ({ rows: [], error }));
    const screeningResultPromise = projectResultPromise
      .then(() => loadScreeningSchedule())
      .then((rows) => ({ rows, error: null }))
      .catch((error) => ({ rows: [], error }));
    const [pickupRows, scheduleRows, projectResult, movieResult, screeningResult] = await Promise.all([
      loadSheet(config.sheets.pickups),
      loadSheet(config.sheets.schedule),
      projectResultPromise,
      movieResultPromise,
      screeningResultPromise
    ]);
    const sheetProjects = Array.isArray(projectResult.rows) ? projectResult.rows : [];
    const movieSchedules = Array.isArray(movieResult.rows)
      ? movieResult.rows
        .map(normalizeMovieSchedule)
        .filter((item) => item.startDate && item.theater)
        .sort((a, b) => a.startDate - b.startDate)
      : [];
    const screeningEvents = Array.isArray(screeningResult.rows)
      ? screeningResult.rows
        .map(normalizeScreeningSchedule)
        .filter((item) => item.visible && item.date && item.dateObject)
        .sort((a, b) => a.dateObject - b.dateObject)
      : [];
    const calendarScreenings = screeningEvents.map((item) => ({
      date: item.date,
      dateLabel: item.dateLabel,
      dateObject: item.dateObject,
      title: item.displayTitle,
      area: item.area,
      place: item.place,
      time: item.time,
      memo: item.memo,
      ticketUrl: item.url,
      source: "screening"
    }));

    return {
      pickups: pickupRows
        .map(normalizePickup)
        .filter((item) => item.position >= 1 && item.position <= 3 && item.title)
        .sort((a, b) => a.position - b.position),
      events: scheduleRows
        .map(normalizeEvent)
        .filter((event) => event.date && event.title)
        .concat(calendarScreenings)
        .sort((a, b) => a.dateObject - b.dateObject),
      townMap: window.CHIMNEY_STATIC_DATA.townMap,
      projects: sheetProjects,
      projectError: projectResult.error ? projectResult.error.message : "",
      movieSchedules,
      movieScheduleError: movieResult.error ? movieResult.error.message : "",
      screeningEvents,
      screeningScheduleError: screeningResult.error ? screeningResult.error.message : ""
    };
  };
}());
