import React, { useState, useEffect } from 'react';
import { 
  Aperture, ShoppingCart, Send, Trash2, Upload, 
  CheckCircle2, Loader2, Play, Briefcase, Clock, 
  Zap, ExternalLink, XCircle, Tag, Cpu, User, LogOut, LayoutDashboard 
} from 'lucide-react';
import { supabase } from './supabaseClient';
import CompareSlider from './components/CompareSlider';

export default function App() {
  // ==========================================
  // 1. СОСТОЯНИЯ (STATES)
  // ==========================================

  // --- Авторизация ---
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');

  // --- Системные ---
  const [isAdminView, setIsAdminView] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Данные (Общие) ---
  const [tenders, setTenders] = useState([]);
  const [brandTenders, setBrandTenders] = useState([]);
  const [applications, setApplications] = useState([]); // Все отклики (важно для брендов)
  const [active, setActive] = useState(null);

  // --- Данные (Личные) ---
  const [userWorks, setUserWorks] = useState([]);
  const [userTenders, setUserTenders] = useState([]);
  const [userApps, setUserApps] = useState([]);

  // --- Модалки и Формы ---
  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ raw: false, edited: false });

  const [formData, setFormData] = useState({ brand_name: '', title: '', video_raw_url: '', video_edited_url: '', asset_price: '', production_time: '', complexity: '', software: '', style_tags: '' });
  const [brandForm, setBrandForm] = useState({ brand_name: '', task_description: '', budget: '', deadline: '' });
  const [applyForm, setApplyForm] = useState({ editor_name: '', portfolio_link: '', message: '' });

  // ==========================================
  // 2. ЛОГИКА (LOGIC)
  // ==========================================

  // Инициализация сессии
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setIsDashboardOpen(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Загрузка всех данных
  const fetchData = async () => {
    // 1. Все видео-работы
    const { data: works } = await supabase.from('tenders').select('*').order('created_at', { ascending: false });
    if (works) { setTenders(works); if (works.length > 0 && !active) setActive(works[0]); }
    
    // 2. Все тендеры брендов
    const { data: tasks } = await supabase.from('brand_tenders').select('*').order('created_at', { ascending: false });
    if (tasks) setBrandTenders(tasks);
    
    // 3. Все отклики (для системы уведомлений)
    const { data: apps } = await supabase.from('tender_applications').select('*').order('created_at', { ascending: false });
    if (apps) setApplications(apps);

    // 4. Личные данные текущего пользователя
    if (user) {
      const { data: uWorks } = await supabase.from('tenders').select('*').eq('user_id', user.id);
      setUserWorks(uWorks || []);
      const { data: uTenders } = await supabase.from('brand_tenders').select('*').eq('user_id', user.id);
      setUserTenders(uTenders || []);
      const { data: uApps } = await supabase.from('tender_applications').select('*').eq('user_id', user.id);
      setUserApps(uApps || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  // Функции авторизации
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = authMode === 'signup' 
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) alert(error.message); else setIsAuthModalOpen(false);
    setLoading(false);
  };

  // Загрузка файлов
  const handleFileUpload = async (event, type) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      setLoading(true);
      const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('videos').upload(fileName, file);
      const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, [type === 'raw' ? 'video_raw_url' : 'video_edited_url']: data.publicUrl }));
      setUploadStatus(prev => ({ ...prev, [type]: true }));
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  // --- НОВАЯ ФУНКЦИЯ: Смена статуса отклика (для Брендов) ---
  const updateAppStatus = async (appId, newStatus) => {
    const { error } = await supabase
      .from('tender_applications')
      .update({ status: newStatus })
      .eq('id', appId);
    if (!error) fetchData();
    else alert("Error updating status");
  };

  // Публикация данных
  const handlePublishWork = async () => {
    const { error } = await supabase.from('tenders').insert([{ ...formData, user_id: user.id }]);
    if (!error) { setIsTenderOpen(false); fetchData(); }
  };

  const handlePublishBrandTask = async () => {
    const { error } = await supabase.from('brand_tenders').insert([{ ...brandForm, user_id: user.id }]);
    if (!error) { setIsBrandModalOpen(false); fetchData(); }
  };

  const handleApplySubmit = async () => {
    const { error } = await supabase.from('tender_applications').insert([{ ...applyForm, user_id: user.id, tender_id: selectedTask.id, status: 'pending' }]);
    if (!error) { setIsApplyModalOpen(false); fetchData(); }
  };

  // ==========================================
  // 3. ИНТЕРФЕЙС (UI)
  // ==========================================

  return (
    <div className={`min-h-screen ${isAdminView ? 'bg-zinc-950' : 'bg-black'} text-white font-sans selection:bg-blue-500`}>
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-8 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
          if (isAdminView) setIsAdminView(false);
          else { const p = prompt("Admin Code:"); if (p === "7777") setIsAdminView(true); }
        }}>
          <Aperture size={35} className={`${isAdminView ? 'text-red-500' : 'text-blue-600'} animate-spin`} style={{ animationDuration: '6s' }} />
          <span className="text-2xl font-black uppercase italic tracking-tighter">Aperture</span>
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDashboardOpen(!isDashboardOpen)} className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase transition-all ${isDashboardOpen ? 'bg-blue-600' : 'bg-zinc-900 text-zinc-400'}`}>
                <LayoutDashboard size={14}/> {isDashboardOpen ? 'Close Studio' : 'My Studio'}
              </button>
              <button onClick={() => supabase.auth.signOut()} className="text-zinc-500 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
            </div>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-blue-600 px-8 py-3 rounded-full font-black text-[10px] uppercase hover:bg-blue-500 transition-all">Initialize</button>
          )}
        </div>
      </header>

      <main className="px-8 pb-20">
        {isDashboardOpen ? (
          /* ==========================================
             DASHBOARD (ЛИЧНЫЙ КАБИНЕТ)
             ========================================== */
          <div className="mt-10 animate-in fade-in duration-500">
             <div className="mb-12">
                <h2 className="text-7xl font-black uppercase italic tracking-tighter">My <span className="text-blue-600">Studio</span></h2>
                <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Active session: {user?.email}</p>
             </div>

             <div className="grid grid-cols-12 gap-10">
                {/* КОЛОНКА 1: МОИ РАБОТЫ */}
                <div className="col-span-4 space-y-6">
                  <h3 className="text-xl font-black uppercase italic border-l-4 border-blue-600 pl-4">Showcase Assets</h3>
                  <button onClick={() => setIsTenderOpen(true)} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 font-black uppercase text-[10px] hover:border-blue-600 hover:text-blue-500 transition-all">+ Upload Work</button>
                  <div className="space-y-3">
                    {userWorks.map(w => (
                      <div key={w.id} className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 flex justify-between items-center group">
                        <div><div className="text-[10px] text-blue-500 font-bold uppercase">{w.brand_name}</div><div className="font-black italic text-sm">{w.title}</div></div>
                        <button onClick={async () => { if(confirm("Delete?")) { await supabase.from('tenders').delete().eq('id', w.id); fetchData(); } }} className="text-zinc-700 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* КОЛОНКА 2: МОИ ТЕНДЕРЫ (ИНБОКС БРЕНДА) */}
                <div className="col-span-4 space-y-6">
                  <h3 className="text-xl font-black uppercase italic border-l-4 border-red-600 pl-4">Project Tenders</h3>
                  <button onClick={() => setIsBrandModalOpen(true)} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 font-black uppercase text-[10px] hover:border-red-600 hover:text-red-500 transition-all">+ New Request</button>
                  <div className="space-y-4">
                    {userTenders.map(t => (
                      <div key={t.id} className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                          <div className="font-black italic text-sm text-red-500 uppercase">{t.brand_name}</div>
                          <button onClick={async () => { if(confirm("Remove?")) { await supabase.from('brand_tenders').delete().eq('id', t.id); fetchData(); } }} className="text-zinc-800 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                        {/* Список заявок на этот тендер */}
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-zinc-600 uppercase mb-2">Editor Applications:</p>
                          {applications.filter(a => a.tender_id === t.id).map(app => (
                            <div key={app.id} className="bg-black/50 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                              <div>
                                <div className="text-[10px] font-black uppercase italic">{app.editor_name}</div>
                                <div className="text-[9px] text-zinc-500 line-clamp-1 italic">"{app.message}"</div>
                              </div>
                              <div className="flex gap-2">
                                {app.status === 'pending' ? (
                                  <>
                                    <button onClick={() => updateAppStatus(app.id, 'accepted')} className="text-green-500 hover:scale-110 transition-transform"><CheckCircle2 size={16}/></button>
                                    <button onClick={() => updateAppStatus(app.id, 'declined')} className="text-red-500 hover:scale-110 transition-transform"><XCircle size={16}/></button>
                                  </>
                                ) : (
                                  <span className={`text-[8px] font-black uppercase ${app.status === 'accepted' ? 'text-green-500' : 'text-zinc-600'}`}>{app.status}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* КОЛОНКА 3: МОИ ОТКЛИКИ (УВЕДОМЛЕНИЯ ЭДИТОРА) */}
                <div className="col-span-4 space-y-6">
                  <h3 className="text-xl font-black uppercase italic border-l-4 border-green-600 pl-4">Sent Proposals</h3>
                  <div className="space-y-3">
                    {userApps.map(a => (
                      <div key={a.id} className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5 relative group">
                        <div className={`absolute top-0 right-0 px-2 py-1 text-[8px] font-black uppercase ${a.status === 'accepted' ? 'bg-green-600' : a.status === 'declined' ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600'}`}>
                          {a.status}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Sent to Brand</div>
                        <p className="text-xs italic text-zinc-300">"{a.message}"</p>
                        {a.status === 'accepted' && <p className="mt-3 text-[9px] text-green-500 font-black uppercase animate-pulse">✓ Brand is interested! Check contact info.</p>}
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        ) : isAdminView ? (
          /* ==========================================
             ADMIN PANEL (7777)
             ========================================== */
          <div className="mt-10">
            <h2 className="text-5xl font-black uppercase italic mb-10 text-red-600">Global Control</h2>
            <div className="grid grid-cols-3 gap-10 text-zinc-500 font-bold uppercase text-[10px]">
              <div>Works: {tenders.length}</div>
              <div>Applications: {applications.length}</div>
              <div>Tasks: {brandTenders.length}</div>
            </div>
            {/* ... (админские списки аналогичны Личному Кабинету) ... */}
          </div>
        ) : (
          /* ==========================================
             MAIN PAGE (ГЛАВНАЯ СТРАНИЦА)
             ========================================== */
          <>
            <div className="mt-10 mb-20 flex justify-between items-end">
              <h1 className="text-[10vw] leading-[0.85] font-black uppercase italic tracking-tighter">Create.<br />Discover.<br /><span className="text-blue-600">Convince.</span></h1>
              <div className="flex gap-4 mb-6">
                <button onClick={() => user ? setIsBrandModalOpen(true) : setIsAuthModalOpen(true)} className="bg-white/5 border border-white/10 px-8 py-4 rounded-full font-black text-xs uppercase hover:bg-white/10 transition-all">I am a Brand</button>
                <button onClick={() => user ? setIsTenderOpen(true) : setIsAuthModalOpen(true)} className="bg-white text-black px-8 py-4 rounded-full font-black text-xs uppercase hover:bg-blue-600 hover:text-white transition-all">Post My Work</button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-10">
              {/* Список видео слева */}
              <div className="col-span-3 space-y-4">
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-6">Live Showcase</h3>
                <div className="h-[600px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {tenders.map((t) => (
                    <div key={t.id} onClick={() => setActive(t)} className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer ${active?.id === t.id ? 'bg-zinc-900 border-blue-600' : 'bg-transparent border-white/5 opacity-50 hover:opacity-100'}`}>
                      <div className="text-[8px] font-black uppercase text-blue-500 mb-4">{t.brand_name}</div>
                      <h4 className="text-2xl font-black uppercase italic leading-none">{t.title}</h4>
                    </div>
                  ))}
                </div>
              </div>

              {/* Плеер и Паспорт справа */}
              <div className="col-span-9 space-y-10">
                <div className="aspect-video bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/5 relative shadow-2xl">
                  {active && <CompareSlider key={active.id} rawVideo={active.video_raw_url} editedVideo={active.video_edited_url} />}
                </div>

                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 bg-[#0a0a0a] rounded-[3rem] p-10 border border-white/5 grid grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4"><Clock className="text-blue-500"/><div className="text-xl font-black italic uppercase leading-none">{active?.production_time || '---'}</div></div>
                      <div className="flex items-center gap-4"><Zap className="text-blue-500"/><div className="text-xl font-black italic uppercase text-blue-500 leading-none">{active?.complexity || '---'}</div></div>
                    </div>
                    <div className="border-l border-white/5 pl-10 space-y-6">
                      <div><div className="text-[9px] text-zinc-500 font-black uppercase mb-2">Software</div><span className="bg-zinc-900 px-3 py-1 rounded text-[10px] font-black uppercase border border-white/5">{active?.software || 'AE'}</span></div>
                      <div><div className="text-[9px] text-zinc-500 font-black uppercase mb-2">Tags</div><div className="text-blue-500 text-[10px] font-black uppercase tracking-tighter">{active?.style_tags || '#VFX'}</div></div>
                    </div>
                  </div>
                  <div className="col-span-4 bg-blue-600 p-10 rounded-[3.5rem] flex flex-col justify-between">
                    <div className="text-5xl font-black uppercase italic tracking-tighter">{active?.asset_price || 'FREE'}</div>
                    <button className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase text-xs hover:scale-105 transition-all">Buy Assets</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Тендеры внизу */}
            <section className="mt-32">
              <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-12">Open <span className="text-zinc-800 text-outline">Requests</span></h2>
              <div className="grid grid-cols-3 gap-6">
                {brandTenders.map((task) => (
                  <div key={task.id} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 hover:border-blue-600 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-blue-500 font-black uppercase text-[10px] tracking-widest">{task.brand_name}</span>
                      <span className="text-green-500 font-black italic">{task.budget}</span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic mb-8 h-12 line-clamp-2">{task.task_description}</h3>
                    <button onClick={() => { setSelectedTask(task); user ? setIsApplyModalOpen(true) : setIsAuthModalOpen(true); }} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-blue-600 hover:text-white transition-all">Apply Proposal</button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ==========================================
          MODALS
          ========================================== */}

      {/* AUTH */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
          <div className="bg-[#0a0a0a] w-full max-w-md p-10 rounded-[3rem] border border-blue-600/30 text-center">
            <h2 className="text-3xl font-black italic uppercase mb-8">{authMode === 'login' ? 'Authorize' : 'Join'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" placeholder="EMAIL" required onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 font-bold" />
              <input type="password" placeholder="PASSWORD" required onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 font-bold" />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-xl">{loading ? '...' : 'Connect'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-zinc-600 text-[9px] uppercase font-black hover:text-white block w-full">{authMode === 'login' ? 'Need account?' : 'Have account?'}</button>
            <button onClick={() => setIsAuthModalOpen(false)} className="mt-4 text-[9px] text-zinc-800 uppercase font-black">Close</button>
          </div>
        </div>
      )}

      {/* UPLOAD WORK */}
      {isTenderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-2xl p-10 rounded-[3rem] border border-white/5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center text-blue-600">Upload Engine</h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Brand Name" onChange={e => setFormData({ ...formData, brand_name: e.target.value })} className="col-span-2 w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <input type="text" placeholder="Project Title" onChange={e => setFormData({ ...formData, title: e.target.value })} className="col-span-2 w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <label className="flex flex-col items-center justify-center p-8 bg-[#111] rounded-2xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'raw')} />
                {uploadStatus.raw ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-500" />}
                <span className="text-[9px] uppercase font-black mt-2">RAW VIDEO</span>
              </label>
              <label className="flex flex-col items-center justify-center p-8 bg-[#111] rounded-2xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'edited')} />
                {uploadStatus.edited ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-500" />}
                <span className="text-[9px] uppercase font-black mt-2">EDITED VIDEO</span>
              </label>
              <input type="text" placeholder="Price" onChange={e => setFormData({ ...formData, asset_price: e.target.value })} className="col-span-2 bg-[#111] p-5 rounded-2xl border border-white/5 text-blue-500 font-bold" />
              <button onClick={handlePublishWork} className="col-span-2 w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl">Deploy Work</button>
              <button onClick={() => setIsTenderOpen(false)} className="col-span-2 text-zinc-700 text-[10px] uppercase font-black">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* BRAND MODAL */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-10 rounded-[3rem] border border-white/5">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center text-red-600">Request Task</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Brand Name" onChange={e => setBrandForm({...brandForm, brand_name: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none" />
              <textarea placeholder="Task description..." onChange={e => setBrandForm({...brandForm, task_description: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 h-32 outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Budget" onChange={e => setBrandForm({...brandForm, budget: e.target.value})} className="bg-[#111] p-4 rounded-2xl border border-white/5 outline-none" />
                <input type="text" placeholder="Deadline" onChange={e => setBrandForm({...brandForm, deadline: e.target.value})} className="bg-[#111] p-4 rounded-2xl border border-white/5 outline-none" />
              </div>
              <button onClick={handlePublishBrandTask} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl">Submit</button>
              <button onClick={() => setIsBrandModalOpen(false)} className="w-full text-zinc-800 text-[10px] font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* APPLY MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-10 rounded-[3rem] border border-blue-600/20">
            <h2 className="text-2xl font-black uppercase italic mb-8 text-center tracking-tighter">Submit <span className="text-blue-600">Proposal</span></h2>
            <div className="space-y-4">
              <input type="text" placeholder="Your Name" onChange={e => setApplyForm({...applyForm, editor_name: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none" />
              <input type="text" placeholder="Portfolio Link" onChange={e => setApplyForm({...applyForm, portfolio_link: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none" />
              <textarea placeholder="How can you help?" onChange={e => setApplyForm({...applyForm, message: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 h-32 outline-none" />
              <button onClick={handleApplySubmit} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl shadow-lg">Send Proposal</button>
              <button onClick={() => setIsApplyModalOpen(false)} className="w-full text-zinc-800 text-[10px] font-black uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}