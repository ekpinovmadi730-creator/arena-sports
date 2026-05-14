(function () {
  const mount = document.getElementById("training-mount");
  if (!mount) return;

  mount.innerHTML = '<p class="status-msg">Жаттығулар жүктелуде...</p>';

  fetch(apiUrl("/training"))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const items = (data.items || []).map(enrichTrainingItem);
      mount.innerHTML = "";
      if (!items.length) {
        mount.innerHTML = '<p class="status-msg">Жаттығулар әлі қосылмаған.</p>';
        return;
      }
      renderTrainingPage(mount, items);
    })
    .catch(() => {
      mount.innerHTML = '<p class="status-msg error">Жаттығуларды жүктеу сәтсіз аяқталды.</p>';
    });
})();

function renderTrainingPage(mount, items) {
  const stats = loadStats();
  const leftToday = Math.max(0, 1 - (stats.completedDates[todayKey()] ? 1 : 0));
  const state = {
    levelFilter: "all",
    timeFilter: "all",
    goalFilter: "all",
    favorites: new Set(stats.favorites || []),
    activeWorkout: null,
    timerInterval: null,
    detailId: null,
    stats,
    calendarMonth: startOfMonth(new Date()),
  };

  const dashboard = document.createElement("section");
  dashboard.className = "training-dashboard training-hero-app";
  dashboard.innerHTML = `
    <article class="training-hero-card card">
      <h3>👋 Привет, User</h3>
      <p>Сегодня: <strong id="today-left">${leftToday} тренировка осталось</strong></p>
      <p>🔥 Серия: <strong id="streak-days">${buildStreak(stats.completedDates)} дня подряд</strong></p>
      <div class="training-progressbar">
        <div class="training-progressbar__fill" id="progress-fill" style="width:${calcProgressPercent(stats)}%"></div>
      </div>
      <p class="card__meta"><span id="progress-percent">${calcProgressPercent(stats)}%</span> недельной цели</p>
    </article>
    <article class="training-progress card">
      <h3>📊 Прогресс</h3>
      <p><strong id="progress-workouts">${stats.completedWorkouts}</strong> тренировок</p>
      <p><strong id="progress-minutes">${stats.totalMinutes}</strong> минут за неделю</p>
    </article>
    <article class="training-reco card">
      <h3>🧠 Ұсыныс</h3>
      <p id="training-recommendation">${buildRecommendation(stats)}</p>
    </article>
  `;

  const planSection = document.createElement("section");
  planSection.className = "training-plan card";
  planSection.innerHTML = `
    <h3>🔥 Жеке жоспар</h3>
    <div class="training-plan__row">
      <label>Мақсат
        <select id="plan-goal">
          <option value="fitness">Форма</option>
          <option value="speed">Жылдамдық</option>
          <option value="endurance">Төзімділік</option>
          <option value="weight">Салмақ тастау</option>
        </select>
      </label>
      <label>Деңгей
        <select id="plan-level">
          <option value="easy">Beginner</option>
          <option value="medium">Intermediate</option>
          <option value="hard">Advanced</option>
        </select>
      </label>
      <button type="button" class="btn" id="plan-generate">Планды жасау</button>
    </div>
    <div class="training-plan-days">
      <span>Қолайлы күндер:</span>
      <label><input type="checkbox" value="1" checked> Дс</label>
      <label><input type="checkbox" value="2" checked> Сс</label>
      <label><input type="checkbox" value="3"> Ср</label>
      <label><input type="checkbox" value="4" checked> Бс</label>
      <label><input type="checkbox" value="5"> Жм</label>
      <label><input type="checkbox" value="6"> Сб</label>
      <label><input type="checkbox" value="0"> Жс</label>
    </div>
    <p id="plan-output" class="page-sub">Мақсат пен деңгейді таңдаңыз.</p>
    <div id="plan-schedule" class="training-schedule"></div>
  `;

  const calendarSection = document.createElement("section");
  calendarSection.className = "training-calendar card";
  calendarSection.innerHTML = `
    <h3>📅 Күнтізбе</h3>
    <div id="calendar-grid" class="calendar-grid"></div>
  `;

  const filters = document.createElement("div");
  filters.className = "training-filters-wrap";
  filters.innerHTML = `
    <div class="training-filters">
      <button type="button" class="training-filter-btn is-active" data-level="all">Барлық деңгей</button>
      <button type="button" class="training-filter-btn" data-level="easy">Beginner</button>
      <button type="button" class="training-filter-btn" data-level="medium">Intermediate</button>
      <button type="button" class="training-filter-btn" data-level="hard">Advanced</button>
    </div>
    <div class="training-filters training-filters--secondary">
      <select id="time-filter" class="training-filter-select">
        <option value="all">⏱ Кез келген уақыт</option>
        <option value="short">15 мин-қа дейін</option>
        <option value="mid">16-25 мин</option>
        <option value="long">26+ мин</option>
      </select>
      <select id="goal-filter" class="training-filter-select">
        <option value="all">🎯 Кез келген мақсат</option>
        <option value="mobility">Икемділік</option>
        <option value="speed">Жылдамдық</option>
        <option value="injury">Жарақаттың алдын алу</option>
      </select>
    </div>
  `;

  const grid = document.createElement("div");
  grid.className = "grid training-grid";

  const detailPanel = document.createElement("section");
  detailPanel.className = "training-detail card";
  detailPanel.hidden = true;

  const workoutPanel = document.createElement("section");
  workoutPanel.className = "training-workout card";
  workoutPanel.hidden = true;

  mount.appendChild(dashboard);
  mount.appendChild(planSection);
  mount.appendChild(calendarSection);
  mount.appendChild(filters);
  mount.appendChild(detailPanel);
  mount.appendChild(workoutPanel);
  mount.appendChild(grid);

  detailPanel.addEventListener("click", (event) => {
    const play = event.target.closest("[data-play-video]");
    if (!play) return;
    const frameHost = detailPanel.querySelector("#detail-video-host");
    frameHost.innerHTML = `<iframe src="${escapeHtml(play.dataset.playVideo)}" title="Workout video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    frameHost.classList.add("is-open");
  });

  renderCalendar(calendarSection.querySelector("#calendar-grid"), state);
  renderCards(grid, items, state);

  filters.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-level]");
    if (!btn) return;
    state.levelFilter = btn.dataset.level || "all";
    filters.querySelectorAll("[data-level]").forEach((node) => {
      node.classList.toggle("is-active", node === btn);
    });
    renderCards(grid, items, state);
  });

  filters.querySelector("#time-filter").addEventListener("change", (event) => {
    state.timeFilter = event.target.value;
    renderCards(grid, items, state);
  });

  filters.querySelector("#goal-filter").addEventListener("change", (event) => {
    state.goalFilter = event.target.value;
    renderCards(grid, items, state);
  });

  planSection.querySelector("#plan-generate").addEventListener("click", () => {
    const goal = planSection.querySelector("#plan-goal").value;
    const level = planSection.querySelector("#plan-level").value;
    const selectedDays = Array.from(planSection.querySelectorAll('.training-plan-days input[type="checkbox"]:checked')).map((node) => Number(node.value));
    if (!selectedDays.length) {
      planSection.querySelector("#plan-output").textContent = "Кемінде 1 күнді таңдаңыз.";
      planSection.querySelector("#plan-schedule").innerHTML = "";
      return;
    }
    planSection.querySelector("#plan-output").textContent = buildPlan(goal, level);
    planSection.querySelector("#plan-schedule").innerHTML = buildWeeklySchedule(items, goal, level, selectedDays);
  });

  calendarSection.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-calendar-nav]");
    if (nav) {
      const action = nav.dataset.calendarNav;
      if (action === "prev") state.calendarMonth = addMonths(state.calendarMonth, -1);
      if (action === "next") state.calendarMonth = addMonths(state.calendarMonth, 1);
      if (action === "today") state.calendarMonth = startOfMonth(new Date());
      renderCalendar(calendarSection.querySelector("#calendar-grid"), state);
      return;
    }

    const day = event.target.closest("[data-day]");
    if (!day) return;
    const key = day.dataset.day;
    state.stats.completedDates[key] = !state.stats.completedDates[key];
    persistStats(state);
    renderCalendar(calendarSection.querySelector("#calendar-grid"), state);
  });

  grid.addEventListener("click", (event) => {
    const fav = event.target.closest("[data-favorite-id]");
    if (fav) {
      event.stopPropagation();
      const id = fav.dataset.favoriteId;
      if (state.favorites.has(id)) state.favorites.delete(id);
      else state.favorites.add(id);
      state.stats.favorites = Array.from(state.favorites);
      persistStats(state);
      renderCards(grid, items, state);
      return;
    }

    const ask = event.target.closest("[data-ask-id]");
    if (ask) {
      event.stopPropagation();
      const id = ask.dataset.askId;
      const item = items.find((row) => row.id === id);
      if (!item) return;
      const query = encodeURIComponent(`${localizeTitle(item.title)} бойынша кеңес бер`);
      window.location.href = `/chatbot.html?q=${query}`;
      return;
    }

    const startBtn = event.target.closest("[data-start-id]");
    if (startBtn) {
      event.stopPropagation();
      const item = items.find((row) => row.id === startBtn.dataset.startId);
      if (!item) return;
      startWorkout(workoutPanel, item, state, () => {
        refreshStats(dashboard, state);
        renderCards(grid, items, state);
      });
      return;
    }

    const card = event.target.closest("[data-card-id]");
    if (!card) return;
    const item = items.find((row) => row.id === card.dataset.cardId);
    if (!item) return;
    state.detailId = item.id;
    renderDetail(detailPanel, item);
    detailPanel.hidden = false;
    detailPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function renderCards(grid, items, state) {
  const visibleItems = items.filter((item) => matchesAllFilters(item, state));
  if (!visibleItems.length) {
    grid.innerHTML = '<p class="status-msg">Сүзгіге сәйкес жаттығу табылмады.</p>';
    return;
  }

  grid.innerHTML = visibleItems
    .map((t) => {
      const id = String(t.id || "");
      const levelBucket = getDifficultyBucket(t.level);
      const isFavorite = state.favorites.has(id);
      const levelClass = `training-card--${levelBucket}`;
      const isCompleted = state.stats.lastCompletedId === id;
      return `
        <article class="card training-card ${levelClass}" data-card-id="${escapeHtml(id)}" role="button" tabindex="0" aria-label="${escapeHtml(localizeTitle(t.title))}">
          <div class="training-card__top">
            <span class="training-level-pill">${levelIcon(levelBucket)} ${escapeHtml(localizeLevel(t.level))}</span>
            <button type="button" class="favorite-btn ${isFavorite ? "is-active" : ""}" data-favorite-id="${escapeHtml(id)}" aria-label="${isFavorite ? "Таңдаулыдан өшіру" : "Таңдаулыға қосу"}">${isFavorite ? "♥" : "♡"}</button>
          </div>
          <h2 class="card__title">${escapeHtml(localizeTitle(t.title))}</h2>
          <p class="card__body">${escapeHtml(localizeFocus(t.focus))}</p>
          <div class="training-card__meta">
            <span>⏱ ${t.duration_minutes} мин</span>
            <span>${goalLabel(t.goal)}</span>
            ${isCompleted ? '<span class="training-complete">✅ Орындалды</span>' : ""}
          </div>
          <div class="training-card__actions">
            <button type="button" class="btn training-start-btn" data-start-id="${escapeHtml(id)}">Start Workout</button>
            <button type="button" class="btn training-ai-btn" data-ask-id="${escapeHtml(id)}">Ask AI about this workout</button>
          </div>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-card-id]").forEach((card) => {
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
  });
}

function renderDetail(panel, item) {
  const preview = item.preview || "/olympic-games-sports-background-with-copy-space-text_916191-34938.jpg";
  panel.innerHTML = `
    <h3>💪 Толық жаттығу: ${escapeHtml(localizeTitle(item.title))}</h3>
    <p class="card__body">${escapeHtml(localizeFocus(item.focus))}</p>
    <p class="card__meta">${escapeHtml(localizeLevel(item.level))} · ⏱ ${item.duration_minutes} мин</p>
    <h4>Жаттығулар тізімі</h4>
    <ul class="training-list">
      ${item.exercises.map((ex) => `<li>${escapeHtml(ex)}</li>`).join("")}
    </ul>
    <h4>Видео</h4>
    <div class="training-video-preview" data-play-video="${escapeHtml(item.video)}">
      <img src="${escapeHtml(preview)}" alt="Video preview" />
      <button type="button" class="training-video-preview__play">▶</button>
    </div>
    <div class="training-video-wrap" id="detail-video-host">
      <div class="status-msg">Нажмите ▶ чтобы открыть видео</div>
    </div>
  `;
}

function startWorkout(panel, item, state, onComplete) {
  if (state.timerInterval) clearInterval(state.timerInterval);
  const duration = Math.max(30, Math.min(90, item.duration_minutes * 60));
  state.activeWorkout = {
    id: item.id,
    totalSeconds: duration,
    leftSeconds: duration,
    currentExercise: 0,
    exercises: item.exercises,
  };

  panel.hidden = false;
  renderWorkout(panel, state.activeWorkout);
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

  state.timerInterval = setInterval(() => {
    if (!state.activeWorkout) return;
    state.activeWorkout.leftSeconds -= 1;
    if (state.activeWorkout.leftSeconds <= 0) {
      finishWorkout(state, item);
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      renderWorkoutDone(panel, item);
      onComplete();
      return;
    }
    renderWorkout(panel, state.activeWorkout);
  }, 1000);

  panel.onclick = (event) => {
    const next = event.target.closest("[data-next]");
    if (next && state.activeWorkout) {
      state.activeWorkout.currentExercise = Math.min(
        state.activeWorkout.currentExercise + 1,
        state.activeWorkout.exercises.length - 1,
      );
      renderWorkout(panel, state.activeWorkout);
    }

    const stop = event.target.closest("[data-stop]");
    if (stop) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      panel.hidden = true;
    }
  };
}

function renderWorkout(panel, workout) {
  const current = workout.exercises[workout.currentExercise];
  panel.innerHTML = `
    <h3>▶ Режим тренировки</h3>
    <p><strong>Exercise:</strong> ${escapeHtml(current.name)}</p>
    <p><strong>Reps:</strong> ${escapeHtml(String(current.reps))}</p>
    <p class="training-timer">${formatTime(workout.leftSeconds)}</p>
    <p>Упражнение: ${workout.currentExercise + 1} / ${workout.exercises.length}</p>
    <div class="training-card__actions">
      <button type="button" class="btn" data-next>Next</button>
      <button type="button" class="btn training-ai-btn" data-stop>Stop</button>
    </div>
  `;
}

function renderWorkoutDone(panel, item) {
  panel.innerHTML = `
    <h3>✅ Жаттығу аяқталды</h3>
    <p class="card__body">${escapeHtml(localizeTitle(item.title))} аяқталды. Керемет жұмыс!</p>
  `;
}

function finishWorkout(state, item) {
  state.stats.completedWorkouts += 1;
  state.stats.totalMinutes += Number(item.duration_minutes || 0);
  state.stats.lastLevel = getDifficultyBucket(item.level);
  state.stats.lastCompletedId = item.id;
  state.stats.completedDates[todayKey()] = true;
  persistStats(state);
}

function refreshStats(dashboard, state) {
  dashboard.querySelector("#progress-workouts").textContent = state.stats.completedWorkouts;
  dashboard.querySelector("#progress-minutes").textContent = state.stats.totalMinutes;
  dashboard.querySelector("#training-recommendation").textContent = buildRecommendation(state.stats);
  dashboard.querySelector("#streak-days").textContent = `${buildStreak(state.stats.completedDates)} дня подряд`;
  const percent = calcProgressPercent(state.stats);
  dashboard.querySelector("#progress-percent").textContent = `${percent}%`;
  dashboard.querySelector("#progress-fill").style.width = `${percent}%`;
  dashboard.querySelector("#today-left").textContent = `${Math.max(0, 1 - (state.stats.completedDates[todayKey()] ? 1 : 0))} тренировка осталось`;
}

function buildRecommendation(stats) {
  if (stats.lastLevel === "easy") return "Сіз beginner жаттығуын аяқтадыңыз. Келесіде intermediate байқап көріңіз.";
  if (stats.lastLevel === "medium") return "Орташа деңгей жақсы! Қаласаңыз advanced деңгейіне өтуге болады.";
  if (stats.lastLevel === "hard") return "Қиын деңгейді орындадыңыз. Енді recovery үшін жеңіл сессия қосыңыз.";
  return "Жаттығуды бастаңыз, жеке ұсыныс автоматты түрде шығады.";
}

function buildPlan(goal, level) {
  const goalText = {
    fitness: "форма",
    speed: "жылдамдық",
    endurance: "төзімділік",
    weight: "салмақ тастау",
  }[goal] || "форма";
  const levelText = { easy: "Beginner", medium: "Intermediate", hard: "Advanced" }[level] || "Beginner";
  return `Сіздің жоспарыңыз: мақсат — ${goalText}, деңгей — ${levelText}. Аптасына 3 сессия: 1) қыздыру, 2) негізгі жаттығу, 3) қалпына келу күні.`;
}

function buildWeeklySchedule(items, goal, level, selectedDays) {
  const dayNames = ["Жс", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"];
  const targetLevel = level === "easy" ? "easy" : level === "medium" ? "medium" : "hard";
  let pool = items.filter((item) => getDifficultyBucket(item.level) === targetLevel);
  if (!pool.length) pool = items.slice();

  if (goal === "weight") {
    const weightPool = items.filter((item) => {
      const f = String(item.focus || "").toLowerCase();
      return f.includes("conditioning") || f.includes("speed") || f.includes("mobility");
    });
    if (weightPool.length) pool = weightPool;
  }

  const sortedDays = [...selectedDays].sort((a, b) => {
    const aMonBased = a === 0 ? 7 : a;
    const bMonBased = b === 0 ? 7 : b;
    return aMonBased - bMonBased;
  });

  return sortedDays
    .map((day, index) => {
      const workout = pool[index % pool.length];
      return `
        <article class="training-schedule-item">
          <div>
            <strong>${dayNames[day]}</strong>
            <p>${escapeHtml(localizeTitle(workout.title))} · ⏱ ${workout.duration_minutes} мин</p>
          </div>
          <a class="btn training-schedule-video" href="${escapeHtml(workout.video)}" target="_blank" rel="noopener noreferrer">Видео ▶</a>
        </article>
      `;
    })
    .join("");
}

function renderCalendar(container, state) {
  const monthStart = startOfMonth(state.calendarMonth || new Date());
  const firstWeekdayMondayBased = (monthStart.getDay() + 6) % 7;
  const daysInCurrentMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const today = todayKey();

  const labels = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"];
  const cells = [];

  for (let i = 0; i < firstWeekdayMondayBased; i += 1) {
    cells.push('<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>');
  }

  for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum += 1) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayNum);
    const key = dateKey(d);
    const done = !!state.stats.completedDates[key];
    const isToday = key === today;
    cells.push(
      `<button type="button" class="calendar-day ${done ? "is-done" : ""} ${isToday ? "is-today" : ""}" data-day="${key}">${dayNum}</button>`,
    );
  }

  while (cells.length % 7 !== 0) {
    cells.push('<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>');
  }

  const monthTitle = monthStart.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  container.innerHTML = `
    <div class="calendar-head">
      <button type="button" class="calendar-nav-btn" data-calendar-nav="prev">←</button>
      <div class="calendar-title">${escapeHtml(monthTitle)}</div>
      <button type="button" class="calendar-nav-btn" data-calendar-nav="next">→</button>
    </div>
    <button type="button" class="calendar-today-btn" data-calendar-nav="today">Сегодня</button>
    <div class="calendar-weekdays">${labels.map((lbl) => `<span>${lbl}</span>`).join("")}</div>
    <div class="calendar-days">${cells.join("")}</div>
  `;
}

function matchesAllFilters(item, state) {
  const level = getDifficultyBucket(item.level);
  if (state.levelFilter !== "all" && level !== state.levelFilter) return false;
  if (state.timeFilter !== "all") {
    const d = Number(item.duration_minutes || 0);
    if (state.timeFilter === "short" && d > 15) return false;
    if (state.timeFilter === "mid" && (d < 16 || d > 25)) return false;
    if (state.timeFilter === "long" && d < 26) return false;
  }
  if (state.goalFilter !== "all" && item.goal !== state.goalFilter) return false;
  return true;
}

function enrichTrainingItem(item) {
  const levelBucket = getDifficultyBucket(item.level);
  const goal = inferGoal(item.focus);
  const exercisesByLevel = {
    easy: [
      { name: "Warm-up walk", reps: 20, seconds: 30 },
      { name: "Bodyweight squats", reps: 12, seconds: 30 },
      { name: "Plank hold", reps: 1, seconds: 30 },
    ],
    medium: [
      { name: "Interval run", reps: 3, seconds: 30 },
      { name: "Push-ups", reps: 15, seconds: 30 },
      { name: "Mountain climbers", reps: 20, seconds: 30 },
    ],
    hard: [
      { name: "Burpees", reps: 12, seconds: 30 },
      { name: "Jump lunges", reps: 16, seconds: 30 },
      { name: "Plank to push-up", reps: 12, seconds: 30 },
    ],
  };
  return {
    ...item,
    goal,
    exercises: item.exercises && item.exercises.length ? item.exercises : exercisesByLevel[levelBucket],
    video: item.video || "https://www.youtube.com/embed/oAPCPjnU1wA",
    preview: item.preview || "/olympic-games-sports-background-with-copy-space-text_916191-34938.jpg",
  };
}

function inferGoal(focus) {
  const text = String(focus || "").toLowerCase();
  if (text.includes("speed")) return "speed";
  if (text.includes("injury")) return "injury";
  return "mobility";
}

function levelIcon(level) {
  if (level === "easy") return "🟢";
  if (level === "medium") return "🔵";
  return "🔴";
}

function goalLabel(goal) {
  if (goal === "speed") return "🎯 Жылдамдық";
  if (goal === "injury") return "🎯 Қауіпсіздік";
  return "🎯 Икемділік";
}

function loadStats() {
  try {
    const raw = localStorage.getItem("trainingProgressV2");
    if (!raw) {
      return { completedWorkouts: 3, totalMinutes: 65, favorites: [], completedDates: {}, lastLevel: "", lastCompletedId: "" };
    }
    return JSON.parse(raw);
  } catch (_) {
    return { completedWorkouts: 3, totalMinutes: 65, favorites: [], completedDates: {}, lastLevel: "", lastCompletedId: "" };
  }
}

function calcProgressPercent(stats) {
  const weekGoalMinutes = 100;
  const minutes = Number(stats.totalMinutes || 0);
  return Math.max(0, Math.min(100, Math.round((minutes / weekGoalMinutes) * 100)));
}

function buildStreak(completedDates) {
  let streak = 0;
  for (let i = 0; i < 30; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (completedDates[dateKey(d)]) streak += 1;
    else if (i !== 0) break;
  }
  return streak || 0;
}

function persistStats(state) {
  localStorage.setItem("trainingProgressV2", JSON.stringify(state.stats));
}

function getDifficultyBucket(level) {
  const normalized = String(level || "").trim().toLowerCase();
  if (normalized.includes("intermediate")) return "medium";
  if (normalized.includes("advanced") || normalized.includes("hard") || normalized.includes("pro")) return "hard";
  return "easy";
}

function localizeLevel(level) {
  const map = { "All levels": "Beginner", Intermediate: "Intermediate", Beginner: "Beginner", Advanced: "Advanced" };
  return map[level] || level;
}

function localizeTitle(title) {
  const map = {
    "Dynamic warm-up (15 min)": "Динамикалық қыздыру",
    "Interval running": "Интервалды жүгіру",
    "Core & stability circuit": "Кор және тұрақтылық жаттығуы",
  };
  return map[title] || title;
}

function localizeFocus(focus) {
  const map = {
    "Mobility & activation": "Қозғалғыштық және белсендіру",
    "Speed & conditioning": "Жылдамдық және төзімділік",
    "Injury prevention": "Жарақаттың алдын алу",
  };
  return map[focus] || focus;
}

function formatTime(total) {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
