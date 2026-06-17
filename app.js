(async function () {
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  const typeColors = {
    "📚 全国講演会": "green",
    "🎬全国上映会ツアー": "violet",
    "🎬舞台挨拶": "violet",
    "🎬テスト上映": "violet",
    "🏛️美術館見学": "yellow",
    "🍺ビアガーデン": "yellow",
    "🎁手渡し会": "cream",
    "🥃 スナック西野": "blue",
    "チケット": "green",
    "クラファン": "pink",
    "ほん": "violet",
    "メディア": "blue"
  };

  let data = {
    pickups: [],
    events: [],
    townMap: window.CHIMNEY_STATIC_DATA.townMap,
    projects: window.CHIMNEY_STATIC_DATA.projects
  };

  function byDate(a, b) {
    return a.dateObject - b.dateObject;
  }

  function todayLocal() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function formatMonthDay(event) {
    return event.dateLabel || "";
  }

  function colorForType(type) {
    return typeColors[type] || "green";
  }

  function compactType(type) {
    return String(type || "")
      .replace(/^[^\p{Letter}\p{Number}]+/u, "")
      .replace(/\s+/g, "")
      .trim();
  }

  function compactArea(area) {
    return String(area || "").replace(/[【】]/g, "").trim();
  }

  function compactPrefecture(area) {
    return compactArea(area).replace(/[都道府県]$/, "");
  }

  function compactPlace(place) {
    return String(place || "")
      .replace(/（.*?）|\(.*?\)/g, "")
      .split(/[、,／/]/)[0]
      .trim();
  }

  function tapeColorIndex(event, eventIndex) {
    const seed = `${event.date}-${event.area}-${event.title}-${eventIndex}`;
    const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return (total % 5) + 1;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function safeHref(value) {
    return value ? escapeHtml(value) : "#";
  }

  function isHttpUrl(value) {
    return /^https?:\/\//.test(String(value || ""));
  }

  function externalLinkAttrs(value) {
    return isHttpUrl(value) ? ` target="_blank" rel="noopener noreferrer"` : "";
  }

  function isCoffeeProject(project) {
    return /COFFEE|コーヒー/i.test(String(project.title || ""));
  }

  function showLoading() {
    document.querySelectorAll("[data-pickups], [data-home-calendar], [data-calendar-list], [data-schedule-table], [data-schedule-cards]")
      .forEach((target) => {
        target.innerHTML = target.tagName === "TBODY"
          ? `<tr><td colspan="10">スプレッドシートを読み込み中です。</td></tr>`
          : `<p class="status-message">スプレッドシートを読み込み中です。</p>`;
      });
  }

  function showError(error) {
    const message = `スプレッドシートを読み込めませんでした。${error.message}`;
    document.querySelectorAll("[data-pickups], [data-home-calendar], [data-calendar-list], [data-schedule-table], [data-schedule-cards]")
      .forEach((target) => {
        target.innerHTML = target.tagName === "TBODY"
          ? `<tr><td colspan="10">${escapeHtml(message)}</td></tr>`
          : `<p class="status-message status-error">${escapeHtml(message)}</p>`;
      });
  }

  function renderPickups() {
    const target = document.querySelector("[data-pickups]");
    if (!target) return;

    if (!data.pickups.length) {
      target.innerHTML = `<p class="status-message">Pick Upの表示データがありません。</p>`;
      return;
    }

    target.innerHTML = data.pickups
      .map((item) => `
        <a class="pickup-card tape-${item.position}" href="${safeHref(item.link)}"${externalLinkAttrs(item.link)}>
          <span class="pickup-icon" aria-hidden="true">${item.icon}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </a>
      `)
      .join("");
  }

  function groupEventsByDate(events) {
    return events.reduce((groups, event) => {
      if (!groups.has(event.date)) groups.set(event.date, []);
      groups.get(event.date).push(event);
      return groups;
    }, new Map());
  }

  function renderHomeCalendar() {
    const target = document.querySelector("[data-home-calendar]");
    if (!target) return;

    const today = todayLocal();
    const eventsByDate = groupEventsByDate(data.events);
    const homeEvents = [];
    const weekdayHeader = dayLabels.map((day) => `<span class="calendar-weekday">${day}</span>`).join("");
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const events = eventsByDate.get(key) || [];
      const eventItems = events.map((event, eventIndex) => {
        const area = compactArea(event.area);
        const homeEventIndex = homeEvents.push(event) - 1;
        return `
        <button class="day-event tape-label tape-${tapeColorIndex(event, eventIndex)}" type="button" data-home-event-index="${homeEventIndex}">
          ${area ? `<strong class="day-area">${escapeHtml(area)}</strong>` : ""}
          <strong class="day-title">${escapeHtml(event.title)}</strong>
        </button>
      `;
      }).join("");

      return `
        <article class="day-card ${events.length ? "has-event" : ""}" aria-label="${date.getMonth() + 1}月${date.getDate()}日">
          <strong class="day-date">
            <span>${date.getMonth() + 1}/${date.getDate()}</span><span class="mobile-weekday">（${dayLabels[date.getDay()]}）</span>
          </strong>
          <span class="day-events">${eventItems}</span>
        </article>
      `;
    });

    target._homeCalendarEvents = homeEvents;
    target.innerHTML = `<div class="calendar-weekdays">${weekdayHeader}</div><div class="calendar-days">${days.join("")}</div>`;

    if (!target.dataset.homeCalendarBound) {
      target.addEventListener("click", (event) => {
        const button = event.target.closest("[data-home-event-index]");
        if (!button) return;

        const selected = target._homeCalendarEvents[Number(button.dataset.homeEventIndex)];
        if (selected) openEventDetail(selected);
      });
      target.dataset.homeCalendarBound = "true";
    }

    const legend = document.querySelector("[data-calendar-legend]");
    if (legend) {
      legend.innerHTML = "";
    }
  }

  function renderTownMap() {
    const target = document.querySelector("[data-town-map]");
    if (!target) return;

    target.innerHTML = data.townMap
      .slice(0, 6)
      .map((group) => `
        <a class="town-card ${group.color}" href="${safeHref(group.url)}"${externalLinkAttrs(group.url)}>
          <span class="town-icon" aria-hidden="true">${group.icon}</span>
          <span class="town-title">${escapeHtml(group.title)}</span>
        </a>
      `)
      .join("");
  }

  function renderCoffeeList() {
    const target = document.querySelector("[data-coffee-list]");
    if (!target) return;

    const coffee = data.townMap.find((item) => item.title === "CHIMNEY COFFEE");
    if (!coffee || !coffee.addresses) {
      target.innerHTML = `<p class="status-message">店舗住所がありません。</p>`;
      return;
    }

    target.innerHTML = coffee.addresses
      .map((shop) => `
        <article class="coffee-card">
          <span class="coffee-icon" aria-hidden="true">☕</span>
          <div>
            <h2>${escapeHtml(shop.name)}</h2>
            <p>${escapeHtml(shop.postalCode)}</p>
            <p>${escapeHtml(shop.address)}</p>
          </div>
        </article>
      `)
      .join("");
  }

  function renderCalendarList() {
    const target = document.querySelector("[data-calendar-list]");
    if (!target) return;

    const sortedEvents = data.events
      .slice()
      .filter((event) => event.dateObject instanceof Date && !Number.isNaN(event.dateObject.getTime()))
      .sort(byDate);
    const today = todayLocal();
    const year = 2026;
    const initialMonth = today.getFullYear() === year ? today.getMonth() : 0;

    function renderMonth(month, direction = "") {
      month = Math.min(11, Math.max(0, month));
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthEvents = sortedEvents.filter((event) =>
        event.dateObject.getFullYear() === year && event.dateObject.getMonth() === month
      );
      const eventIndexes = new Map(monthEvents.map((event, index) => [event, index]));
      const eventsByDate = groupEventsByDate(monthEvents);

      const weekdayHeader = dayLabels.map((day) => `<span class="month-weekday">${day}</span>`).join("");
      const monthTabs = Array.from({ length: 12 }, (_, index) => `
        <button class="month-tab ${index === month ? "is-active" : ""}" type="button" data-calendar-month="${index}" ${index === month ? `aria-current="true"` : ""}>${index + 1}月</button>
      `).join("");
      const blankDays = Array.from({ length: firstDay.getDay() }, () => `<div class="month-day month-day-empty" aria-hidden="true"></div>`);
      const dayCards = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = new Date(year, month, day);
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const events = eventsByDate.get(key) || [];
        const items = events.map((event) => {
          const area = compactArea(event.area);
          const eventIndex = eventIndexes.get(event);

          return `
            <button class="month-event tape-label tape-${tapeColorIndex(event, eventIndex)}" type="button" data-event-index="${eventIndex}">
              ${area ? `<span class="month-event-area">${escapeHtml(area)}</span>` : ""}
              <span class="month-event-title">${escapeHtml(event.title)}</span>
            </button>
          `;
        }).join("");

        return `
          <article class="month-day ${events.length ? "has-event" : ""}">
            <time class="month-date" datetime="${key}">
              <span class="month-date-day">${month + 1}/${day}</span><span class="month-mobile-weekday">（${dayLabels[date.getDay()]}）</span>
            </time>
            <div class="month-events">${items}</div>
          </article>
        `;
      });

      const calendarHtml = `
        <div class="month-calendar">
          <div class="month-calendar-header">
            <div class="month-tabs" aria-label="月を選択">${monthTabs}</div>
            <div class="month-calendar-top">
              <h2>${year}年${month + 1}月</h2>
            </div>
          </div>
          <div class="month-weekdays">${weekdayHeader}</div>
          <div class="month-grid">${blankDays.join("")}${dayCards.join("")}</div>
        </div>
      `;

      const commitMonth = () => {
        target.innerHTML = calendarHtml;
        target._calendarEvents = monthEvents;
        target._calendarMonth = month;

        if (direction) {
          const calendar = target.querySelector(".month-calendar");
          calendar.classList.add(`page-curl-${direction}`);
          window.setTimeout(() => {
            calendar.classList.remove(`page-curl-${direction}`);
            target.dataset.calendarAnimating = "";
          }, 220);
        } else {
          target.dataset.calendarAnimating = "";
        }
      };

      if (direction) {
        target.dataset.calendarAnimating = "true";
      }

      commitMonth();
    }

    target._renderCalendarMonth = renderMonth;
    renderMonth(typeof target._calendarMonth === "number" ? target._calendarMonth : initialMonth);

    if (!target.dataset.calendarBound) {
      target.addEventListener("click", (event) => {
        const shiftButton = event.target.closest("[data-calendar-shift]");
        if (shiftButton) {
          if (target.dataset.calendarAnimating === "true") return;
          const nextMonth = Math.min(11, Math.max(0, target._calendarMonth + Number(shiftButton.dataset.calendarShift)));
          const direction = nextMonth > target._calendarMonth ? "left" : "right";
          target._renderCalendarMonth(nextMonth, direction);
          return;
        }

        const monthButton = event.target.closest("[data-calendar-month]");
        if (monthButton) {
          if (target.dataset.calendarAnimating === "true") return;
          const nextMonth = Number(monthButton.dataset.calendarMonth);
          if (nextMonth === target._calendarMonth) return;
          const direction = nextMonth > target._calendarMonth ? "left" : "right";
          target._renderCalendarMonth(nextMonth, direction);
          return;
        }

        const button = event.target.closest("[data-event-index]");
        if (!button) return;

        const selected = target._calendarEvents[Number(button.dataset.eventIndex)];
        if (selected) openEventDetail(selected);
      });

      const swipeMonth = (deltaX, deltaY) => {
        if (target.dataset.calendarAnimating === "true") return;
        if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

        if (deltaX < 0 && target._calendarMonth > 0) {
          target._renderCalendarMonth(target._calendarMonth - 1, "right");
        } else if (deltaX > 0 && target._calendarMonth < 11) {
          target._renderCalendarMonth(target._calendarMonth + 1, "left");
        }
      };

      let touchStartX = 0;
      let touchStartY = 0;
      target.addEventListener("touchstart", (event) => {
        if (event.target.closest("[data-event-index], [data-calendar-month]")) return;
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }, { passive: true });

      target.addEventListener("touchend", (event) => {
        if (!touchStartX || target.dataset.calendarAnimating === "true") return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        touchStartX = 0;
        touchStartY = 0;

        swipeMonth(deltaX, deltaY);
      }, { passive: true });

      let pointerStartX = 0;
      let pointerStartY = 0;
      target.addEventListener("pointerdown", (event) => {
        if (event.target.closest("[data-event-index], [data-calendar-month]")) return;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
      });

      target.addEventListener("pointerup", (event) => {
        if (!pointerStartX) return;
        const deltaX = event.clientX - pointerStartX;
        const deltaY = event.clientY - pointerStartY;
        pointerStartX = 0;
        pointerStartY = 0;
        swipeMonth(deltaX, deltaY);
      });
      target.dataset.calendarBound = "true";
    }
  }

  function getEventDialog() {
    let dialog = document.querySelector("[data-event-dialog]");
    if (dialog) return dialog;

    dialog = document.createElement("div");
    dialog.className = "event-dialog";
    dialog.setAttribute("data-event-dialog", "");
    dialog.hidden = true;
    dialog.innerHTML = `
      <div class="event-dialog-backdrop" data-close-event-dialog></div>
      <section class="event-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
        <button class="event-dialog-close" type="button" data-close-event-dialog aria-label="閉じる">×</button>
        <div data-event-dialog-content></div>
      </section>
    `;
    document.body.appendChild(dialog);

    const closeDialog = () => {
      dialog.classList.remove("is-open");
      window.setTimeout(() => {
        if (!dialog.classList.contains("is-open")) {
          dialog.hidden = true;
        }
      }, 180);
    };

    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-event-dialog]")) {
        closeDialog();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !dialog.hidden) closeDialog();
    });

    return dialog;
  }

  function openEventDetail(event) {
    const dialog = getEventDialog();
    const content = dialog.querySelector("[data-event-dialog-content]");
    const area = compactArea(event.area);

    content.innerHTML = `
      <p class="event-dialog-date">${escapeHtml(formatMonthDay(event))}${area ? ` / ${escapeHtml(area)}` : ""}</p>
      <h2 id="event-dialog-title">${escapeHtml(event.title)}</h2>
      <dl class="event-dialog-details">
        <div><dt>場所</dt><dd>${escapeHtml(event.place || "-")}</dd></div>
        <div><dt>時間</dt><dd>${escapeHtml(event.time || "-")}</dd></div>
        <div><dt>メモ</dt><dd>${escapeHtml(event.memo || "-")}</dd></div>
      </dl>
      ${event.ticketUrl ? `<a class="button event-dialog-button" href="${safeHref(event.ticketUrl)}"${externalLinkAttrs(event.ticketUrl)}>詳細はこちら</a>` : ""}
    `;

    dialog.hidden = false;
    window.requestAnimationFrame(() => dialog.classList.add("is-open"));
  }

  function openCoffeeAddresses() {
    const coffee = data.townMap.find((item) => item.title === "CHIMNEY COFFEE");
    if (!coffee || !coffee.addresses) return;

    const dialog = getEventDialog();
    const content = dialog.querySelector("[data-event-dialog-content]");
    content.innerHTML = `
      <p class="event-dialog-date">店舗住所</p>
      <h2 id="event-dialog-title">CHIMNEY COFFEE</h2>
      <div class="coffee-dialog-list">
        ${coffee.addresses.map((shop) => `
          <article class="coffee-dialog-card">
            <h3>${escapeHtml(shop.name)}</h3>
            <p>${escapeHtml(shop.postalCode)}<br>${escapeHtml(shop.address)}</p>
          </article>
        `).join("")}
      </div>
    `;

    dialog.hidden = false;
    window.requestAnimationFrame(() => dialog.classList.add("is-open"));
  }

  function projectAction(project) {
    if (isCoffeeProject(project)) {
      return `<button class="project-open-link" type="button" data-project-coffee>開く</button>`;
    }
    return `<a class="project-open-link" href="${safeHref(project.link)}"${externalLinkAttrs(project.link)}>開く</a>`;
  }

  function renderScheduleTable() {
    const target = document.querySelector("[data-schedule-table]");
    const cardTarget = document.querySelector("[data-schedule-cards]");
    if (!target && !cardTarget) return;

    if (!data.events.length) {
      if (target) target.innerHTML = `<tr><td colspan="10">スケジュールデータがありません。</td></tr>`;
      if (cardTarget) cardTarget.innerHTML = `<p class="status-message">スケジュールデータがありません。</p>`;
      return;
    }

    const sortedEvents = data.events
      .slice()
      .sort(byDate);

    if (target) {
      target.innerHTML = sortedEvents
      .map((event) => `
        <tr>
          <td>${escapeHtml(event.month)}</td>
          <td>${escapeHtml(formatMonthDay(event))}</td>
          <td>
            <span class="schedule-title-text">${escapeHtml(event.title)}</span>
            ${event.type ? `<span class="schedule-title-type">${escapeHtml(event.type)}</span>` : ""}
          </td>
          <td>${event.ticketUrl ? `<a class="schedule-link-button schedule-ticket-button" href="${safeHref(event.ticketUrl)}"${externalLinkAttrs(event.ticketUrl)}>🎫 詳細・申込</a>` : ""}</td>
          <td>${isHttpUrl(event.official) ? `<a class="schedule-link-button schedule-official-button" href="${safeHref(event.official)}"${externalLinkAttrs(event.official)}>🌐公式</a>` : ""}</td>
          <td><span class="table-pill ${colorForType(event.type)}">${escapeHtml(event.type)}</span></td>
          <td>${escapeHtml(compactPrefecture(event.area))}</td>
          <td><span class="schedule-place-text">${escapeHtml(compactPlace(event.place))}</span></td>
          <td>${escapeHtml(event.time)}</td>
          <td><span class="schedule-memo-text">${escapeHtml(event.memo)}</span></td>
        </tr>
      `)
      .join("");
    }

    if (cardTarget) {
      cardTarget.innerHTML = sortedEvents
        .map((event) => {
          const date = event.dateObject instanceof Date && !Number.isNaN(event.dateObject.getTime())
            ? `${formatMonthDay(event)}（${dayLabels[event.dateObject.getDay()]}）`
            : formatMonthDay(event);
          const area = compactArea(event.area);
          const detailRows = [
            event.type ? ["種別", event.type] : null,
            area ? ["地域", area] : null,
            event.place ? ["場所", event.place] : null,
            event.time ? ["時間", event.time] : null,
            event.memo ? ["メモ", event.memo] : null
          ].filter(Boolean);

          return `
            <article class="schedule-card">
              <p class="schedule-card-date">${escapeHtml(date)}</p>
              <h2>${escapeHtml(event.title)}</h2>
              <div class="schedule-card-actions">
                ${event.ticketUrl ? `<a class="schedule-link-button schedule-ticket-button" href="${safeHref(event.ticketUrl)}"${externalLinkAttrs(event.ticketUrl)}>🎫 詳細・申込</a>` : ""}
                ${isHttpUrl(event.official) ? `<a class="schedule-link-button schedule-official-button" href="${safeHref(event.official)}"${externalLinkAttrs(event.official)}>🌐公式</a>` : ""}
              </div>
              <dl>
                ${detailRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
              </dl>
            </article>
          `;
        })
        .join("");
    }
  }

  function renderProjects() {
    const target = document.querySelector("[data-project-map]");
    if (!target) return;

    target.innerHTML = data.projects
      .map((project, index) => `
        <article class="project-spot ${project.tone || "cream"} ${project.isFeatured ? "is-featured" : ""}" style="--spot-index: ${index};">
          <span class="project-icon" aria-hidden="true">${project.icon}</span>
          <div>
            <h2>${escapeHtml(project.title)}</h2>
            <p>${escapeHtml(project.description)}</p>
          </div>
          ${projectAction(project)}
        </article>
      `)
      .join("");

    if (!target.dataset.projectBound) {
      target.addEventListener("click", (event) => {
        const button = event.target.closest("[data-project-coffee]");
        if (!button) return;
        openCoffeeAddresses();
      });
      target.dataset.projectBound = "true";
    }
  }

  function setupMenu() {
    const button = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".site-nav");
    if (!button || !nav) return;

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });
  }

  function renderAll() {
    renderPickups();
    renderHomeCalendar();
    renderTownMap();
    renderCalendarList();
    renderScheduleTable();
    renderProjects();
    renderCoffeeList();
  }

  setupMenu();
  renderTownMap();
  renderProjects();
  renderCoffeeList();
  showLoading();

  try {
    data = await window.loadChimneyData();
    renderAll();
  } catch (error) {
    showError(error);
    renderTownMap();
    renderProjects();
    renderCoffeeList();
  }
}());
