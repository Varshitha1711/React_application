import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './HabitTracker.css';

const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const getLastNDates = (n) => {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(todayKey(d));
  }
  return arr;
};

const STORAGE_KEY = 'habits_v1';
const CATEGORY_COLORS = { Health: '#34d399', Work: '#3b82f6', Learning: '#facc15' };

function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newHabitName, setNewHabitName] = useState('');
  const [newCategory, setNewCategory] = useState('Health');
  const [darkMode, setDarkMode] = useState(false);
  const [expandedHabitId, setExpandedHabitId] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHabits(JSON.parse(raw));
    } catch (e) {
      console.error('Failed to load habits', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const last30 = useMemo(() => getLastNDates(30), []);

  const addHabit = () => {
    const trimmed = newHabitName.trim();
    if (!trimmed) return;
    const newHabit = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: trimmed,
      category: newCategory,
      createdAt: todayKey(),
      history: {},
    };
    setHabits((prev) => [newHabit, ...prev]);
    setNewHabitName('');
  };

  const deleteHabit = (id) => {
    if (!confirm('Delete this habit?')) return;
    setHabits((s) => s.filter((h) => h.id !== id));
  };

  const toggleToday = (id) => {
    const today = todayKey();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const newHistory = { ...h.history };
        if (newHistory[today]) delete newHistory[today];
        else newHistory[today] = true;
        return { ...h, history: newHistory };
      })
    );
  };

  const completedTodayCount = habits.filter((h) => h.history[todayKey()]).length;
  const completionPercent = habits.length ? (completedTodayCount / habits.length) * 100 : 0;

  const filtered = habits
    .filter((h) => {
      if (filter === 'all') return true;
      if (filter === 'active') return !h.history[todayKey()];
      if (filter === 'done') return !!h.history[todayKey()];
      return true;
    })
    .filter((h) => categoryFilter === 'all' ? true : h.category === categoryFilter);

  const chartData = Object.keys(CATEGORY_COLORS).map((cat) => ({
    name: cat,
    value: habits.filter((h) => h.category === cat && h.history[todayKey()]).length
  }));

  return (
    <div className="app-root">
      <header className="header">
        <h1>Habit Tracker</h1>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
      </header>

      <main>
        <section className="controls">
          <div className="habit-form">
            <input value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="Add new habit" />
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {Object.keys(CATEGORY_COLORS).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button onClick={addHabit}>Add</button>
          </div>
          <div className="filters">
            <button onClick={() => setFilter('all')} className={filter==='all'?'active':''}>All</button>
            <button onClick={() => setFilter('active')} className={filter==='active'?'active':''}>Not Done</button>
            <button onClick={() => setFilter('done')} className={filter==='done'?'active':''}>Done</button>
            <select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {Object.keys(CATEGORY_COLORS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </section>

        <section className="dashboard">
          <div className="left">
            <h2>Today</h2>
            <div className="progress-wrapper">
              <div className="progress-text">{Math.round(completionPercent)}% done today</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${completionPercent}%` }} />
              </div>
            </div>

            <div className="habit-list">
              {filtered.length===0 ? <div className="empty">No habits found.</div> : filtered.map(h => {
                const isDoneToday = !!h.history[todayKey()];
                const streak = (() => { let count=0,d=new Date(); while(true){const k=todayKey(d);if(h.history[k]){count++;d.setDate(d.getDate()-1)}else break;}return count; })();
                const expanded = expandedHabitId === h.id;
                return (
                  <div key={h.id} className="habit-item" style={{ borderLeft: `6px solid ${CATEGORY_COLORS[h.category]}` }}>
                    <div className="habit-main">
                      <label>
                        <input type="checkbox" checked={isDoneToday} onChange={()=>toggleToday(h.id)} />
                        <span>{h.name}</span>
                      </label>
                      <div className="habit-controls">
                        <div className="streak">🔥 {streak}</div>
                        <button className="delete" onClick={()=>deleteHabit(h.id)}>✕</button>
                        <button onClick={()=>setExpandedHabitId(expanded ? null : h.id)}>{expanded ? 'Hide History' : 'Show History'}</button>
                      </div>
                    </div>
                    {expanded && (
                      <table className="habit-history-table">
                        <thead>
                          <tr><th>Date</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {getLastNDates(10).map(d=>(
                            <tr key={d} style={{ backgroundColor: h.history[d]?CATEGORY_COLORS[h.category]:'#eee', color: h.history[d]?'#fff':'#111' }}>
                              <td>{d}</td>
                              <td>{h.history[d] ? '✅' : '❌'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="right">
            <h3>Progress by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={5}>
                  {chartData.map((entry, index) => <Cell key={index} fill={CATEGORY_COLORS[entry.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </aside>
        </section>
      </main>

      <footer>
        <small> {darkMode ? 'Dark Mode' : 'Light Mode'}</small>
      </footer>
    </div>
  );
}

export default HabitTracker;