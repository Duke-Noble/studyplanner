// app.js – Complete StudyPlanner for Vida Arthur

const SUPABASE_URL =https://wlipykzhlysdkwtqfcbl.supabase.co;
const SUPABASE_ANON_KEY =sb_publishable_j4y_edxMfOj8Is31ZnmPnw_HmqiY9uc;  // Replace with your key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hardcoded courses (from the registration form)
const courses = [
  { id: 1, code: "ASP116A", title: "Conflict Management and Prevention", color: "#f4a261" },
  { id: 2, code: "CMS108", title: "Communicative Skills", color: "#e6b8a2" },
  { id: 3, code: "EGS102", title: "Introduction to the Constitution of Ghana", color: "#d9bf77" },
  { id: 4, code: "EGS104", title: "Politics and Political Institutions in Ghana", color: "#b7b8c4" },
  { id: 5, code: "EGS106", title: "Government for Senior High Schools", color: "#c9ada7" },
  { id: 6, code: "EPS101A", title: "Educational Psychology", color: "#aec5b0" },
  { id: 7, code: "HIS104", title: "Survey of the History of Ghana in the 19th Century", color: "#e3b8b1" },
  { id: 8, code: "ITS101", title: "Information Technology Skills", color: "#c2a5cf" }
];

// Global state
let currentUser = null;
let assignments = [];
let assessments = [];
let quizzes = [];
let deadlines = [];
let notes = [];
let timetableSlots = [];
let calendarEvents = []; // combined events for display

// DOM elements
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const regInput = document.getElementById('reg-number');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');

const statsGrid = document.getElementById('stats-grid');
const upcomingList = document.getElementById('upcoming-list');
const overdueList = document.getElementById('overdue-list');
const coursesList = document.getElementById('courses-list');
const monthYearSpan = document.getElementById('month-year');
const calendarGrid = document.getElementById('calendar-grid');
const calendarEventsDiv = document.getElementById('calendar-events');
const timetableContainer = document.getElementById('timetable-container');
const notesList = document.getElementById('notes-list');
const newNoteBtn = document.getElementById('new-note-btn');

// Modal elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalForm = document.getElementById('modal-form');
const modalFields = document.getElementById('modal-fields');
const modalDeleteBtn = document.getElementById('modal-delete');
const closeModal = document.querySelector('.close');

let currentModalConfig = { type: null, id: null, day: null, time: null };

// ----------------------------- Authentication -----------------------------
const initAuth = async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    authScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    loadAllData();
  }
};

loginBtn.addEventListener('click', async () => {
  const regNo = regInput.value.trim().toUpperCase();
  if (regNo !== 'EH/GOV/25/0128') {
    authError.innerText = 'Invalid registration number.';
    return;
  }
  const email = 'vida@studydesk.local';
  const password = 'Vida2025!';
  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && error.message.includes('Invalid login')) {
    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { reg_no: regNo, name: 'Vida Arthur' } }
    });
    if (signUpError) {
      authError.innerText = signUpError.message;
      return;
    }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      authError.innerText = loginError.message;
      return;
    }
  } else if (error) {
    authError.innerText = error.message;
    return;
  }
  currentUser = (await supabase.auth.getUser()).data.user;
  authScreen.classList.remove('active');
  dashboardScreen.classList.add('active');
  loadAllData();
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  authScreen.classList.add('active');
  dashboardScreen.classList.remove('active');
});

// ----------------------------- Data Loading -----------------------------
async function loadAssignments() {
  const { data, error } = await supabase.from('assignments').select('*').order('due_date');
  if (!error) assignments = data || [];
}
async function loadAssessments() {
  const { data } = await supabase.from('assessments').select('*').order('due_date');
  if (data) assessments = data;
}
async function loadQuizzes() {
  const { data } = await supabase.from('quizzes').select('*').order('date_time');
  if (data) quizzes = data;
}
async function loadDeadlines() {
  const { data } = await supabase.from('deadlines').select('*').order('due_date');
  if (data) deadlines = data;
}
async function loadNotes() {
  const { data } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
  if (data) notes = data;
}
async function loadTimetableSlots() {
  const { data } = await supabase.from('timetable_slots').select('*');
  if (data) timetableSlots = data;
}
async function loadEventsForCalendar() {
  const events = [];
  assignments.forEach(a => events.push({ id: a.id, title: a.title, date: a.due_date, type: 'assignment', color: '#f4a261' }));
  assessments.forEach(a => events.push({ id: a.id, title: a.title, date: a.due_date, type: 'assessment', color: '#b56576' }));
  quizzes.forEach(q => events.push({ id: q.id, title: q.title, date: q.date_time, type: 'quiz', color: '#6d597a' }));
  deadlines.forEach(d => events.push({ id: d.id, title: d.title, date: d.due_date, type: 'deadline', color: '#e63946' }));
  calendarEvents = events;
}

async function loadAllData() {
  await Promise.all([
    loadAssignments(), loadAssessments(), loadQuizzes(), loadDeadlines(),
    loadNotes(), loadTimetableSlots(), loadEventsForCalendar()
  ]);
  renderDashboard();
  renderCourses();
  renderCalendar();
  renderTimetable();
  renderNotes();
}

// ----------------------------- Dashboard -----------------------------
function renderDashboard() {
  const now = new Date();
  const upcoming = [...assignments, ...assessments, ...quizzes, ...deadlines]
    .filter(item => new Date(item.due_date || item.date_time) > now)
    .sort((a,b) => new Date(a.due_date || a.date_time) - new Date(b.due_date || b.date_time))
    .slice(0, 5);
  const overdue = [...assignments, ...assessments, ...deadlines]
    .filter(item => new Date(item.due_date || item.date_time) < now && item.status !== 'Done' && item.status !== 'Graded')
    .sort((a,b) => new Date(b.due_date || b.date_time) - new Date(a.due_date || a.date_time));

  statsGrid.innerHTML = `
    <div class="stat-card"><div class="stat-number">${assignments.length}</div><div class="stat-label">Assignments</div></div>
    <div class="stat-card"><div class="stat-number">${assessments.length}</div><div class="stat-label">Assessments</div></div>
    <div class="stat-card"><div class="stat-number">${quizzes.length}</div><div class="stat-label">Quizzes</div></div>
    <div class="stat-card"><div class="stat-number">${deadlines.length}</div><div class="stat-label">Deadlines</div></div>
  `;
  upcomingList.innerHTML = upcoming.map(item => `
    <div class="event-item"><div class="event-title">${item.title}</div><div class="event-meta">${item.due_date || item.date_time} · ${item.type || 'task'}</div></div>
  `).join('') || '<div class="event-item">No upcoming events</div>';
  overdueList.innerHTML = overdue.map(item => `
    <div class="event-item overdue-item"><div class="event-title">${item.title}</div><div class="event-meta">Due: ${item.due_date || item.date_time}</div></div>
  `).join('') || '<div class="event-item">All caught up! ✅</div>';
}

function renderCourses() {
  coursesList.innerHTML = courses.map(c => `
    <div class="course-card"><div class="course-code">${c.code}</div><div class="course-title">${c.title}</div></div>
  `).join('');
}

// ----------------------------- Calendar -----------------------------
let currentDate = new Date();
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  monthYearSpan.innerText = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  let gridHtml = '<div class="cal-day">S</div><div class="cal-day">M</div><div class="cal-day">T</div><div class="cal-day">W</div><div class="cal-day">T</div><div class="cal-day">F</div><div class="cal-day">S</div>';
  for (let i = 0; i < firstDay; i++) gridHtml += '<div class="cal-day"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEvent = calendarEvents.some(e => e.date.startsWith(dateStr));
    gridHtml += `<div class="cal-day ${hasEvent ? 'event-day' : ''}" data-day="${d}">${d}</div>`;
  }
  calendarGrid.innerHTML = gridHtml;
  document.querySelectorAll('.cal-day[data-day]').forEach(dayDiv => {
    dayDiv.addEventListener('click', () => showEventsForDay(parseInt(dayDiv.dataset.day)));
  });
  showEventsForDay(1); // default
}
function showEventsForDay(day) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const events = calendarEvents.filter(e => e.date.startsWith(dateStr));
  calendarEventsDiv.innerHTML = events.length ? events.map(e => `<div class="event-item" style="border-left-color:${e.color}"><div class="event-title">${e.title}</div><div class="event-meta">${e.type}</div></div>`).join('') : '<div>No events this day</div>';
}
document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(); });
document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(); });

// ----------------------------- Timetable -----------------------------
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const timeSlots = Array.from({length: 31}, (_,i) => `${Math.floor(6.5+i*0.5)}:${i%2===0?'00':'30'}`);
function renderTimetable() {
  let table = '<table class="timetable"><tr><th>Time</th>' + days.map(d => `<th>${d.slice(0,3)}</th>`).join('') + '</tr>';
  for (let time of timeSlots) {
    table += `<tr><td>${time}</td>`;
    for (let day of days) {
      const slot = timetableSlots.find(s => s.day === day && s.start_time === time);
      const filled = !!slot;
      table += `<td class="${filled ? 'slot-filled' : ''}" data-day="${day}" data-time="${time}">${filled ? (slot.course_code || 'Class') : ''}</td>`;
    }
    table += '</tr>';
  }
  table += '</table>';
  timetableContainer.innerHTML = table;
  document.querySelectorAll('.timetable td[data-day]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const day = cell.dataset.day;
      const time = cell.dataset.time;
      const existing = timetableSlots.find(s => s.day === day && s.start_time === time);
      openTimetableModal(day, time, existing);
    });
  });
}
function openTimetableModal(day, time, existing) {
  currentModalConfig = { type: 'timetable', id: existing?.id, day, time };
  modalTitle.innerText = existing ? 'Edit Slot' : 'Add Slot';
  modalFields.innerHTML = `
    <select id="modal-course-id"><option value="">-- Select course --</option>${courses.map(c => `<option value="${c.id}" ${existing?.course_id == c.id ? 'selected' : ''}>${c.code}</option>`).join('')}</select>
    <input type="text" id="modal-label" placeholder="Custom label (optional)" value="${existing?.label || ''}">
    <input type="time" id="modal-start" value="${existing?.start_time || time}" required>
    <input type="time" id="modal-end" value="${existing?.end_time || ''}">
  `;
  modal.style.display = 'flex';
  modalDeleteBtn.style.display = existing ? 'inline-block' : 'none';
  modalForm.onsubmit = async (e) => {
    e.preventDefault();
    const courseId = document.getElementById('modal-course-id').value;
    const label = document.getElementById('modal-label').value;
    const start = document.getElementById('modal-start').value;
    const end = document.getElementById('modal-end').value;
    const course = courses.find(c => c.id == courseId);
    const slotData = { day, start_time: start, end_time: end, course_id: courseId || null, label: label || null, course_code: course?.code || null };
    if (existing) {
      await supabase.from('timetable_slots').update(slotData).eq('id', existing.id);
    } else {
      await supabase.from('timetable_slots').insert([slotData]);
    }
    await loadTimetableSlots();
    renderTimetable();
    modal.style.display = 'none';
  };
}

// ----------------------------- Notes CRUD -----------------------------
function renderNotes() {
  notesList.innerHTML = notes.map(n => `
    <div class="note-card" data-id="${n.id}">
      <div class="note-title">${n.title}</div>
      <div class="note-preview">${n.content?.substring(0, 80) || ''}</div>
      <button class="edit-note-btn btn-secondary" style="margin-top:8px">Edit</button>
      <button class="delete-note-btn btn-secondary" style="margin-top:8px; background:#f0d5cf;">Delete</button>
    </div>
  `).join('');
  document.querySelectorAll('.edit-note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const noteId = btn.closest('.note-card').dataset.id;
      const note = notes.find(n => n.id == noteId);
      openNoteModal(note);
    });
  });
  document.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const noteId = btn.closest('.note-card').dataset.id;
      if (confirm('Delete this note?')) {
        await supabase.from('notes').delete().eq('id', noteId);
        await loadNotes();
        renderNotes();
      }
    });
  });
}
newNoteBtn.addEventListener('click', () => openNoteModal(null));
function openNoteModal(note) {
  currentModalConfig = { type: 'note', id: note?.id };
  modalTitle.innerText = note ? 'Edit Note' : 'New Note';
  modalFields.innerHTML = `
    <input type="text" id="note-title" placeholder="Title" value="${note?.title || ''}" required>
    <textarea id="note-content" placeholder="Write your note here..." rows="4">${note?.content || ''}</textarea>
  `;
  modal.style.display = 'flex';
  modalDeleteBtn.style.display = note ? 'inline-block' : 'none';
  modalForm.onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    if (note) {
      await supabase.from('notes').update({ title, content, updated_at: new Date() }).eq('id', note.id);
    } else {
      await supabase.from('notes').insert([{ title, content, updated_at: new Date() }]);
    }
    await loadNotes();
    renderNotes();
    modal.style.display = 'none';
  };
}

// Modal delete for timetable & notes
modalDeleteBtn.addEventListener('click', async () => {
  if (currentModalConfig.type === 'timetable' && currentModalConfig.id) {
    await supabase.from('timetable_slots').delete().eq('id', currentModalConfig.id);
    await loadTimetableSlots();
    renderTimetable();
  }
  if (currentModalConfig.type === 'note' && currentModalConfig.id) {
    await supabase.from('notes').delete().eq('id', currentModalConfig.id);
    await loadNotes();
    renderNotes();
  }
  modal.style.display = 'none';
});

closeModal.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

// ----------------------------- Tab Navigation -----------------------------
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    showTab(tab);
  });
});
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`${tab}-tab`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'calendar') renderCalendar();
  if (tab === 'timetable') renderTimetable();
}

// ----------------------------- Initialisation -----------------------------
initAuth();
