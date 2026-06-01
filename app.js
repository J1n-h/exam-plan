/* ================================================
   시험 공부 플래너 - 메인 애플리케이션 로직
   ================================================ */

// ── State ───────────────────────────────────────
let subjects = [];
let dailyPlans = [];

// ── Constants ───────────────────────────────────
const SUBJECT_STYLES = {
  '국어': {
    color: '#c084fc',
    gradient: 'linear-gradient(135deg, #c084fc, #a855f7)',
    glow: 'rgba(192, 132, 252, 0.25)'
  },
  '영어': {
    color: '#22d3ee',
    gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
    glow: 'rgba(34, 211, 238, 0.25)'
  },
  '수학': {
    color: '#fb923c',
    gradient: 'linear-gradient(135deg, #fb923c, #f97316)',
    glow: 'rgba(251, 146, 60, 0.25)'
  },
  '과학': {
    color: '#4ade80',
    gradient: 'linear-gradient(135deg, #4ade80, #22c55e)',
    glow: 'rgba(74, 222, 128, 0.25)'
  },
  '사회': {
    color: '#f472b6',
    gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
    glow: 'rgba(244, 114, 182, 0.25)'
  }
};

const EXAM_DATES = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-06'];

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

// ── Initialize ──────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    await loadData();
    renderDashboard();
    renderExamTable();
    renderCalendar();
    updateDDay();
    setupResetModal();
    setupHourlyModal();
    hideLoading();
  } catch (err) {
    console.error('초기화 오류:', err);
    hideLoading();
    showError('데이터를 불러오는 데 실패했습니다. Supabase 설정을 확인해주세요.');
  }
}

async function loadData() {
  [subjects, dailyPlans] = await Promise.all([
    fetchSubjects(),
    fetchDailyPlans()
  ]);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function showError(message) {
  const container = document.querySelector('.container');
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.textContent = `⚠️ ${message}`;
  container.prepend(banner);
}

// ── D-Day Counter ───────────────────────────────
function updateDDay() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureExams = EXAM_DATES
    .map(d => new Date(d + 'T00:00:00'))
    .filter(d => d >= today)
    .sort((a, b) => a - b);

  const ddayEl = document.getElementById('dday-value');
  if (!ddayEl) return;

  if (futureExams.length === 0) {
    ddayEl.textContent = '시험 완료! 🎉';
    ddayEl.style.color = '#4ade80';
    return;
  }

  const diff = Math.ceil((futureExams[0] - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) {
    ddayEl.textContent = 'D-Day 🔥';
  } else {
    ddayEl.textContent = `D-${diff}`;
  }
}

// ── Dashboard ───────────────────────────────────
function renderDashboard() {
  const container = document.getElementById('subject-cards');
  if (!container) return;
  container.innerHTML = '';

  subjects.forEach((subject, index) => {
    const style = SUBJECT_STYLES[subject.name] || {
      color: '#e8edf5',
      gradient: 'linear-gradient(135deg, #e8edf5, #94a3b8)',
      glow: 'rgba(232, 237, 245, 0.2)'
    };

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.style.setProperty('--accent-gradient', style.gradient);
    card.style.setProperty('--accent-glow', style.glow);
    card.style.animationDelay = `${index * 0.08}s`;

    const progress = subject.progress || 0;
    const fillWidth = Math.min(progress, 100);
    const isCompleted = progress >= 100;

    card.innerHTML = `
      <div class="card-top">
        <span class="subject-name" style="color: ${style.color}">${subject.name}</span>
        <div class="card-top-actions">
          <span class="subject-exam-date">${subject.exam_date || '미정'}</span>
          <button class="btn-reset-subject" data-id="${subject.id}" aria-label="${subject.name} 진도 초기화" title="진도 초기화">↺</button>
        </div>
      </div>
      <div class="progress-section">
        <div class="progress-info">
          <span class="progress-label">진도율</span>
          <span class="progress-text" style="color: ${style.color}">${progress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill${isCompleted ? ' completed' : ''}"
               style="width: ${fillWidth}%; background: ${style.gradient}; --accent-glow: ${style.glow};">
          </div>
        </div>
      </div>
      <button class="btn-study"
              data-id="${subject.id}"
              style="background: ${style.gradient};"
              aria-label="${subject.name} 공부 완료">
        📖 공부 완료 (+50%)
      </button>
    `;

    container.appendChild(card);
  });

  // Bind study buttons
  container.querySelectorAll('.btn-study').forEach(btn => {
    btn.addEventListener('click', handleStudyClick);
  });

  // Bind subject reset buttons
  container.querySelectorAll('.btn-reset-subject').forEach(btn => {
    btn.addEventListener('click', handleSubjectResetClick);
  });

  updateOverallProgress();
}

async function handleSubjectResetClick(e) {
  const btn = e.currentTarget;
  const id = parseInt(btn.dataset.id);
  const subject = subjects.find(s => s.id === id);
  if (!subject) return;

  if (!confirm(`${subject.name} 과목의 진도를 0%로 초기화하시겠습니까?`)) return;

  subject.progress = 0;
  
  // Optimistic UI update
  renderDashboard();

  // Persist
  const result = await updateSubject(id, { progress: 0 });
  if (result) {
    showToast(`🔄 ${subject.name} 진도 초기화됨`);
  } else {
    showToast(`⚠️ 저장 실패 - 다시 시도해주세요`);
  }
}

async function handleStudyClick(e) {
  const btn = e.currentTarget;
  const id = parseInt(btn.dataset.id);
  const subject = subjects.find(s => s.id === id);
  if (!subject) return;

  // Ripple effect
  createRipple(btn, e);

  // Confetti burst
  createConfetti(btn);

  // Update progress
  subject.progress = (subject.progress || 0) + 50;

  // Optimistic UI update
  renderDashboard();

  // Persist to Supabase
  const result = await updateSubject(id, { progress: subject.progress });
  if (result) {
    showToast(`✅ ${subject.name} 진도율 ${subject.progress}%`);
  } else {
    showToast(`⚠️ 저장 실패 - 다시 시도해주세요`);
  }
}

function createRipple(button, event) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function createConfetti(element) {
  const rect = element.getBoundingClientRect();
  const colors = ['#c084fc', '#22d3ee', '#fb923c', '#4ade80', '#f472b6', '#fbbf24'];

  for (let i = 0; i < 8; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-burst';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = (rect.left + rect.width / 2) + 'px';
    confetti.style.top = (rect.top + rect.height / 2) + 'px';
    confetti.style.position = 'fixed';
    confetti.style.setProperty('--tx', `${(Math.random() - 0.5) * 120}px`);
    confetti.style.setProperty('--ty', `${(Math.random() - 0.8) * 100}px`);
    document.body.appendChild(confetti);
    confetti.addEventListener('animationend', () => confetti.remove());
  }
}

function updateOverallProgress() {
  const fill = document.getElementById('overall-progress-fill');
  const text = document.getElementById('overall-progress-text');
  if (!fill || !text) return;

  const avg = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + (s.progress || 0), 0) / subjects.length)
    : 0;

  fill.style.width = Math.min(avg, 100) + '%';
  text.textContent = avg + '%';
}

// ── Exam Info Table ─────────────────────────────
function renderExamTable() {
  const tbody = document.getElementById('exam-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  subjects.forEach(subject => {
    const style = SUBJECT_STYLES[subject.name] || { color: '#e8edf5' };
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>
        <span class="subject-badge"
              style="background: ${style.color}15; color: ${style.color}; border: 1px solid ${style.color}30;">
          ${subject.name}
        </span>
      </td>
      <td>
        <span class="editable"
              contenteditable="true"
              data-field="exam_date"
              data-id="${subject.id}"
              data-placeholder="날짜를 입력하세요"
              spellcheck="false">${escapeHtml(subject.exam_date || '미정')}</span>
      </td>
      <td>
        <span class="editable"
              contenteditable="true"
              data-field="exam_range"
              data-id="${subject.id}"
              data-placeholder="시험 범위를 입력하세요"
              spellcheck="false">${escapeHtml(subject.exam_range || '')}</span>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Bind inline editing
  tbody.querySelectorAll('.editable').forEach(el => {
    el.addEventListener('blur', handleSubjectEdit);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    });
  });
}

async function handleSubjectEdit(e) {
  const el = e.target;
  const id = parseInt(el.dataset.id);
  const field = el.dataset.field;
  const value = el.textContent.trim();
  const subject = subjects.find(s => s.id === id);

  if (!subject) return;

  // Skip if value didn't change
  if (subject[field] === value) return;

  subject[field] = value;
  const result = await updateSubject(id, { [field]: value });

  if (result) {
    showToast(`✏️ ${subject.name} ${field === 'exam_date' ? '시험 날짜' : '시험 범위'} 저장됨`);
    // Also refresh dashboard exam dates shown on cards
    if (field === 'exam_date') renderDashboard();
  }
}

// ── Calendar ────────────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Header cells (Mon-Sun)
  DAY_NAMES.forEach((name, i) => {
    const header = document.createElement('div');
    header.className = 'calendar-header-cell' + (i >= 5 ? ' weekend' : '');
    header.textContent = name;
    grid.appendChild(header);
  });

  // Date range: 2026-06-01 (Mon) → 2026-07-06 (Mon)
  const startDate = new Date(2026, 5, 1); // June 1
  const endDate = new Date(2026, 6, 6);   // July 6
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = formatDate(current);
    const plan = dailyPlans.find(p => p.date === dateStr);
    const isExamDay = EXAM_DATES.includes(dateStr);
    const isToday = current.getTime() === today.getTime();

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isExamDay) cell.classList.add('exam-day');
    if (isToday) cell.classList.add('today');
    cell.dataset.date = dateStr;
    if (plan) cell.dataset.planId = plan.id;

    const month = current.getMonth() + 1;
    const day = current.getDate();

    // Date label
    const dateLabel = document.createElement('div');
    dateLabel.className = 'cell-date';
    
    // 날짜 텍스트
    const dateSpan = document.createElement('span');
    dateSpan.innerHTML = `${month}/${day}`;
    if (isToday) {
      dateSpan.innerHTML += '<span class="today-dot"></span>';
    }
    dateLabel.appendChild(dateSpan);

    // 액션 그룹 (시험 뱃지 + 일과 버튼)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'cell-actions';

    if (isExamDay) {
      const badge = document.createElement('span');
      badge.className = 'exam-badge-inline';
      badge.textContent = '🔥 시험';
      actionsDiv.appendChild(badge);
    }

    const hourlyBtn = document.createElement('button');
    hourlyBtn.className = 'btn-hourly';
    hourlyBtn.innerHTML = '🕒 일과';
    hourlyBtn.addEventListener('click', () => {
      openHourlyModal(dateStr, plan ? plan.id : null);
    });
    actionsDiv.appendChild(hourlyBtn);

    dateLabel.appendChild(actionsDiv);
    cell.appendChild(dateLabel);

    // Content (editable)
    const content = document.createElement('div');
    content.className = 'cell-content';
    content.contentEditable = 'true';
    content.spellcheck = false;
    content.dataset.planId = plan ? plan.id : '';
    content.dataset.placeholder = '할 일 입력...';
    content.textContent = plan ? (plan.content || '') : '';
    cell.appendChild(content);

    grid.appendChild(cell);
    current.setDate(current.getDate() + 1);
  }

  // Fill remaining cells in the last week (Jul 6 = Mon, so 6 empty cells for Tue-Sun)
  const lastDayOfWeek = endDate.getDay(); // 0=Sun, 1=Mon
  // July 6 is Monday (1), so we need 6 more cells
  const emptyCells = lastDayOfWeek === 0 ? 0 : 7 - ((lastDayOfWeek === 0 ? 7 : lastDayOfWeek));
  // Actually: Monday = dayOfWeek 1 in JS. Our grid is Mon-Sun.
  // For Mon (1): remaining = 7 - 1 = 6 cells
  // But we need to account for Mon-based grid: Mon=0, Tue=1, ..., Sun=6
  // JS getDay(): Mon=1, so position in grid = (getDay()+6)%7 = 0 for Mon
  // Remaining after Mon = 6
  for (let i = 0; i < 6; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell empty';
    grid.appendChild(emptyCell);
  }

  // Bind editing — Enter는 줄바꿈 허용, 저장은 blur 시에만
  grid.querySelectorAll('.cell-content').forEach(el => {
    el.addEventListener('blur', handleCalendarEdit);
  });
}

async function handleCalendarEdit(e) {
  const el = e.target;
  const planId = parseInt(el.dataset.planId);
  if (!planId) return;

  const value = el.textContent.trim();
  const plan = dailyPlans.find(p => p.id === planId);
  if (!plan) return;

  // Skip if unchanged
  if (plan.content === value) return;

  plan.content = value;
  const result = await updateDailyPlan(planId, { content: value });

  if (result) {
    showToast('📝 계획 저장됨');
  }
}

// ── Reset Modal ─────────────────────────────────
function setupResetModal() {
  const resetBtn = document.getElementById('reset-btn');
  const modal = document.getElementById('reset-modal');
  const confirmBtn = document.getElementById('reset-confirm');
  const cancelBtn = document.getElementById('reset-cancel');

  if (!resetBtn || !modal) return;

  resetBtn.addEventListener('click', () => {
    modal.classList.add('active');
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Close on overlay click
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });

  confirmBtn.addEventListener('click', handleReset);
}

async function handleReset() {
  const modal = document.getElementById('reset-modal');
  const confirmBtn = document.getElementById('reset-confirm');

  confirmBtn.textContent = '초기화 중...';
  confirmBtn.disabled = true;

  const success = await resetAllData();

  if (success) {
    // Reload data and re-render everything
    await loadData();
    renderDashboard();
    renderExamTable();
    renderCalendar();
    showToast('🔄 계획이 초기화되었습니다');
  } else {
    showToast('⚠️ 초기화에 실패했습니다');
  }

  confirmBtn.textContent = '네';
  confirmBtn.disabled = false;
  modal.classList.remove('active');
}

// ── Hourly Schedule Modal ───────────────────────
function setupHourlyModal() {
  const modal = document.getElementById('hourly-modal');
  const closeBtn = document.getElementById('hourly-modal-close');

  if (!modal || !closeBtn) return;

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Close on overlay click
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });
}

function openHourlyModal(dateStr, planId) {
  const modal = document.getElementById('hourly-modal');
  const titleEl = document.getElementById('hourly-modal-title');
  const listEl = document.getElementById('hourly-list');
  const autoSaveText = document.querySelector('.auto-save-text');

  if (!modal || !listEl) return;

  // Format date for title (e.g., 2026-06-01 -> 6/1 일과)
  const d = new Date(dateStr);
  titleEl.textContent = `${d.getMonth() + 1}/${d.getDate()} 일과`;

  const plan = dailyPlans.find(p => p.id === planId);
  if (!plan) return;

  // Ensure hourly_schedule exists
  if (!plan.hourly_schedule) plan.hourly_schedule = {};

  listEl.innerHTML = '';

  // 0시부터 23시까지 24개 입력창 생성
  for (let i = 0; i < 24; i++) {
    const hourStr = String(i).padStart(2, '0');
    const item = document.createElement('div');
    item.className = 'hourly-item';

    const timeLabel = document.createElement('div');
    timeLabel.className = 'hourly-time';
    timeLabel.textContent = `${hourStr}:00`;

    const contentInput = document.createElement('div');
    contentInput.className = 'hourly-content';
    contentInput.contentEditable = 'true';
    contentInput.spellcheck = false;
    contentInput.dataset.hour = hourStr;
    contentInput.dataset.placeholder = '일정 추가...';
    contentInput.textContent = plan.hourly_schedule[hourStr] || '';

    item.appendChild(timeLabel);
    item.appendChild(contentInput);
    listEl.appendChild(item);

    // 저장 로직 (blur 시)
    contentInput.addEventListener('blur', async (e) => {
      const val = e.target.textContent.trim();
      const h = e.target.dataset.hour;

      if (plan.hourly_schedule[h] === val) return; // 변경 없으면 무시

      // 값 업데이트 (빈 문자열이면 키 삭제)
      if (val === '') {
        delete plan.hourly_schedule[h];
      } else {
        plan.hourly_schedule[h] = val;
      }

      // API 호출
      const result = await updateDailyPlan(planId, { hourly_schedule: plan.hourly_schedule });
      if (result) {
        // 자동 저장 알림 표시
        autoSaveText.classList.add('visible');
        setTimeout(() => autoSaveText.classList.remove('visible'), 2000);
      } else {
        showToast('⚠️ 저장 실패');
      }
    });

    // Enter키 처리 (줄바꿈 허용)
  }

  modal.classList.add('active');
}

// ── Toast Notifications ─────────────────────────
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  // Remove after animation ends
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3000);
}

// ── Utilities ───────────────────────────────────
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
