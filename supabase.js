/* ================================================
   Supabase REST API 클라이언트
   config.js의 SUPABASE_URL, SUPABASE_KEY 사용
   ================================================ */

const API_BASE = `${SUPABASE_URL}/rest/v1`;

function getHeaders(prefer = 'return=representation') {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': prefer
  };
}

// ── 과목 (subjects) ──────────────────────────

async function fetchSubjects() {
  try {
    const res = await fetch(`${API_BASE}/subjects?order=id`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('과목 데이터 로드 실패:', err);
    return [];
  }
}

async function updateSubject(id, data) {
  try {
    const res = await fetch(`${API_BASE}/subjects?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('과목 업데이트 실패:', err);
    return null;
  }
}

// ── 날짜별 계획 (daily_plans) ─────────────────

async function fetchDailyPlans() {
  try {
    const res = await fetch(`${API_BASE}/daily_plans?order=date`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('계획 데이터 로드 실패:', err);
    return [];
  }
}

async function updateDailyPlan(id, data) {
  try {
    const res = await fetch(`${API_BASE}/daily_plans?id=eq.${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('계획 업데이트 실패:', err);
    return null;
  }
}

// ── 전체 초기화 ──────────────────────────────

async function resetAllData() {
  try {
    // 과목 초기화: 진도율 0, 시험 날짜 '미정', 시험 범위 비움
    await fetch(`${API_BASE}/subjects?id=gt.0`, {
      method: 'PATCH',
      headers: getHeaders('return=minimal'),
      body: JSON.stringify({
        exam_date: '미정',
        exam_range: '',
        progress: 0
      })
    });

    // 할 일 및 시간대별 일과 초기화: 내용 비움, hourly_schedule 빈 JSON
    await fetch(`${API_BASE}/daily_plans?id=gt.0`, {
      method: 'PATCH',
      headers: getHeaders('return=minimal'),
      body: JSON.stringify({ 
        content: '',
        hourly_schedule: {}
      })
    });

    return true;
  } catch (err) {
    console.error('초기화 실패:', err);
    return false;
  }
}
