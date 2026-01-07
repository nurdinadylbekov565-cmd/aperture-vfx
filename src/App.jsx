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
  // 1. СОСТОЯНИЯ (STATES) - СЕРДЦЕ ПРИЛОЖЕНИЯ
  // ==========================================

  // --- Авторизация ---
  const [user, setUser] = useState(null); // Хранит данные текущего юзера
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Модалка входа
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' или 'signup'

  // --- Системные/Навигация ---
  const [isAdminView, setIsAdminView] = useState(false); // Режим админа (7777)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false); // Режим личного кабинета
  const [loading, setLoading] = useState(false); // Состояние загрузки (спиннеры)

  // --- Данные из Базы (Общие) ---
  const [tenders, setTenders] = useState([]); // Список всех готовых видео (Showcase)
  const [brandTenders, setBrandTenders] = useState([]); // Список заказов от брендов
  const [applications, setApplications] = useState([]); // Все отклики (для админа)
  const [active, setActive] = useState(null); // Текущее выбранное видео в плеере

  // --- Данные из Базы (Личные) ---
  const [userWorks, setUserWorks] = useState([]); // Мои видео
  const [userTenders, setUserTenders] = useState([]); // Мои заказы (если я бренд)
  const [userApps, setUserApps] = useState([]); // Мои отклики (куда я подался)

  // --- Формы и Модалки ---
  const [isTenderOpen, setIsTenderOpen] = useState(false); // Модалка "Post Work"
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false); // Модалка "I am a Brand"
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false); // Модалка отклика на заказ
  const [selectedTask, setSelectedTask] = useState(null); // Заказ, на который юзер хочет откликнуться
  const [uploadStatus, setUploadStatus] = useState({ raw: false, edited: false }); // Галочки загрузки файлов

  // Данные для отправки в базу
  const [formData, setFormData] = useState({ brand_name: '', title: '', video_raw_url: '', video_edited_url: '', asset_price: '', production_time: '', complexity: '', software: '', style_tags: '' });
  const [brandForm, setBrandForm] = useState({ brand_name: '', task_description: '', budget: '', deadline: '' });
  const [applyForm, setApplyForm] = useState({ editor_name: '', portfolio_link: '', message: '' });

  // ==========================================
  // 2. ЭФФЕКТЫ (EFFECTS) - СЛУШАТЕЛИ СОБЫТИЙ
  // ==========================================

  useEffect(() => {
    // Проверка: залогинен ли юзер прямо сейчас?
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Слушаем изменения: вход, выход, смена пароля
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setIsDashboardOpen(false); // Если вышел - закрываем кабинет
    });

    return () => subscription.unsubscribe();
  }, []);

  // Загружаем данные при старте или смене юзера
  useEffect(() => { fetchData(); }, [user]);

  // ==========================================
  // 3. ФУНКЦИИ (LOGIC) - ДЕЙСТВИЯ ПРИЛОЖЕНИЯ
  // ==========================================

  const fetchData = async () => {
    // 1. Получаем все видео для главной
    const { data: works } = await supabase.from('tenders').select('*').order('created_at', { ascending: false });
    if (works) { setTenders(works); if (works.length > 0 && !active) setActive(works[0]); }
    
    // 2. Получаем все заказы брендов
    const { data: tasks } = await supabase.from('brand_tenders').select('*').order('created_at', { ascending: false });
    if (tasks) setBrandTenders(tasks);
    
    // 3. Если админ - получаем все отклики
    const { data: apps } = await supabase.from('tender_applications').select('*').order('created_at', { ascending: false });
    if (apps) setApplications(apps);

    // 4. Личные данные юзера (для Dashboard)
    if (user) {
      const { data: uWorks } = await supabase.from('tenders').select('*').eq('user_id', user.id);
      setUserWorks(uWorks || []);
      const { data: uTenders } = await supabase.from('brand_tenders').select('*').eq('user_id', user.id);
      setUserTenders(uTenders || []);
      const { data: uApps } = await supabase.from('tender_applications').select('*').eq('user_id', user.id);
      setUserApps(uApps || []);
    }
  };

  // Регистрация и Вход
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = authMode === 'signup' 
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) alert(error.message);
    else setIsAuthModalOpen(false);
    setLoading(false);
  };

  // Загрузка видеофайлов в хранилище (Storage)
  const handleFileUpload = async (event, type) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      setLoading(true);
      const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, [type === 'raw' ? 'video_raw_url' : 'video_edited_url']: data.publicUrl }));
      setUploadStatus(prev => ({ ...prev, [type]: true }));
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  // Публикация готовой работы
  const handlePublishWork = async () => {
    if (!user) return setIsAuthModalOpen(true);
    const { error } = await supabase.from('tenders').insert([{ ...formData, user_id: user.id }]);
    if (!error) { setIsTenderOpen(false); fetchData(); }
  };

  // Публикация заказа от бренда
  const handlePublishBrandTask = async () => {
    if (!user) return setIsAuthModalOpen(true);
    const { error } = await supabase.from('brand_tenders').insert([{ ...brandForm, user_id: user.id }]);
    if (!error) { setIsBrandModalOpen(false); fetchData(); }
  };

  // Отправка отклика на заказ
  const handleApplySubmit = async () => {
    if (!user) return setIsAuthModalOpen(true);
    const { error } = await supabase.from('tender_applications').insert([{ ...applyForm, user_id: user.id, tender_id: selectedTask.id }]);
    if (!error) { alert("Proposal Sent!"); setIsApplyModalOpen(false); fetchData(); }
  };

  // ==========================================
  // 4. ИНТЕРФЕЙС (UI) - ТО, ЧТО МЫ ВИДИМ
  // ==========================================

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isAdminView ? 'bg-zinc-950' : 'bg-black'} text-white font-sans selection:bg-blue-500`}>

      {/* ХЕДЕР (ШАПКА) */}
      <header className="flex justify-between items-center p-8 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => {
          if (isAdminView) setIsAdminView(false);
          else { const p = prompt("Enter Admin Access Code:"); if (p === "7777") setIsAdminView(true); }
        }}>
          <Aperture size={35} className={`${isAdminView ? 'text-red-500' : 'text-blue-600'} animate-spin`} style={{ animationDuration: '6s' }} />
          <span className="text-2xl font-black uppercase italic tracking-tighter">
            {isAdminView ? 'Control Center' : 'Aperture'}
          </span>
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsDashboardOpen(!isDashboardOpen)} 
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-black text-[10px] uppercase transition-all ${isDashboardOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'}`}
              >
                <LayoutDashboard size={14}/> {isDashboardOpen ? 'Exit Studio' : 'My Studio'}
              </button>
              <button onClick={() => supabase.auth.signOut()} className="bg-zinc-900/50 p-3 rounded-full hover:text-red-500 transition-all border border-white/5"><LogOut size={16}/></button>
            </div>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center gap-2">
              <User size={14}/> Initialize
            </button>
          )}

          {!isAdminView && !isDashboardOpen && (
            <div className="flex gap-4 ml-4">
              <button onClick={() => user ? setIsBrandModalOpen(true) : setIsAuthModalOpen(true)} className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-full font-black text-xs uppercase hover:bg-white/10 transition-all">I am a Brand</button>
              <button onClick={() => user ? setIsTenderOpen(true) : setIsAuthModalOpen(true)} className="bg-white text-black px-8 py-3 rounded-full font-black text-xs uppercase hover:bg-zinc-200 transition-all">Post My Work</button>
            </div>
          )}
        </div>
      </header>

      <main className="px-8 pb-20">
        
        {isDashboardOpen ? (
          // -------------------------------------------------------------------
          // ЛИЧНЫЙ КАБИНЕТ (MY STUDIO)
          // -------------------------------------------------------------------
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="mb-12 border-b border-blue-600/20 pb-8">
                <h2 className="text-7xl font-black uppercase italic tracking-tighter leading-none">Creative <span className="text-blue-600">Studio</span></h2>
                <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest mt-4">Authorized User: {user?.email}</p>
             </div>

             <div className="grid grid-cols-12 gap-10">
                {/* Колонка 1: Мои видео */}
                <div className="col-span-4 space-y-6">
                  <h3 className="text-xl font-black uppercase italic border-l-4 border-blue-600 pl-4 flex justify-between">My Showcase <span>{userWorks.length}</span></h3>
                  <button onClick={() => setIsTenderOpen(true)} className="w-full py-6 border-2 border-dashed border-white/5 rounded-3xl text-zinc-600 font-black uppercase text-[10px] tracking-widest hover:border-blue-600/50 hover:text-blue-500 transition-all">+ Upload Asset</button>
                  <div className="space-y-3">
                    {userWorks.map(w => (
                      <div key={w.id} className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                        <div className="truncate"><div className="text-[10px] text-blue-500 font-bold uppercase mb-1">{w.brand_name}</div><div className="font-black italic text-sm">{w.title}</div></div>
                        <button onClick={async () => { if(confirm("Delete this asset?")) { await supabase.from('tenders').delete().eq('id', w.id); fetchData(); } }} className="text-zinc-700 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Колонка 2: Мои тендеры */}
                <div className="col-span-4 space-y-6">
                  <h3 className="text-xl font-black uppercase italic border-l-4 border-red-600 pl-4 flex justify-between">Active Requests <span>{userTenders.length}</span></h3>
                  <button onClick={() => setIsBrandModalOpen(true)} className="w-full py-6 border-2 border-dashed border-white/5 rounded-3xl text-zinc-600 font-black uppercase text-[10px] tracking-widest hover:border-red-600/50 hover:text-red-500 transition-all">+ Post New Task</button>
                  <div className="space-y-3">
                    {userTenders.map(t => (
                      <div key={t.id} className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                        <div className="truncate"><div className="text-[10px] text-red-500 font-bold uppercase mb-1">{t.budget}</div><div className="font-black italic text-sm">{t.brand_name}</div></div>
                        <button onClick={async () => { if(confirm("Remove request?")) { await supabase.from('brand_tenders').delete().eq('id', t.id); fetchData(); } }} className="text-zinc-700 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Колонка 3: Мои отклики */}
                <div className="col-span-4 space-y-6">
                  <h3 className="text-xl font-black uppercase italic border-l-4 border-green-600 pl-4 flex justify-between">Sent Proposals <span>{userApps.length}</span></h3>
                  <div className="space-y-3">
                    {userApps.map(a => (
                      <div key={a.id} className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5 relative group">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-black uppercase tracking-widest">Active Application</span>
                          <button onClick={async () => { if(confirm("Withdraw proposal?")) { await supabase.from('tender_applications').delete().eq('id', a.id); fetchData(); } }} className="text-zinc-700 hover:text-red-500 transition-all"><XCircle size={16}/></button>
                        </div>
                        <p className="text-xs text-zinc-400 italic line-clamp-2">"{a.message}"</p>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        ) : isAdminView ? (
          // -------------------------------------------------------------------
          // АДМИН ПАНЕЛЬ (CONTROL CENTER)
          // -------------------------------------------------------------------
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-12 border-b border-red-500/20 pb-8">
              <div>
                <p className="text-red-500 font-black uppercase text-xs tracking-widest mb-2">System Management</p>
                <h2 className="text-7xl font-black uppercase italic tracking-tighter">Global <span className="text-zinc-800 text-outline">Panel</span></h2>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-4 space-y-6">
                <h3 className="text-white font-black uppercase italic text-xl border-l-4 border-blue-600 pl-4 flex justify-between">Showcase <span>{tenders.length}</span></h3>
                <div className="space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {tenders.map(t => (
                    <div key={t.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex justify-between items-center group">
                      <div className="truncate mr-4">
                        <div className="text-[10px] text-blue-500 font-bold uppercase">{t.brand_name}</div>
                        <div className="font-black uppercase italic text-sm truncate">{t.title}</div>
                      </div>
                      <button onClick={async () => { if(confirm("Delete globally?")) { await supabase.from('tenders').delete().eq('id', t.id); fetchData(); } }} className="text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <h3 className="text-white font-black uppercase italic text-xl border-l-4 border-green-600 pl-4 flex justify-between">Inbound Apps <span>{applications.length}</span></h3>
                <div className="space-y-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {applications.map((app) => (
                    <div key={app.id} className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black uppercase italic text-blue-500">{app.editor_name}</h4>
                        <button onClick={async () => { if(confirm("Delete globally?")) { await supabase.from('tender_applications').delete().eq('id', app.id); fetchData(); } }} className="text-red-500 opacity-50 hover:opacity-100"><XCircle size={16}/></button>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-3 mb-4">{app.message}</p>
                      <a href={app.portfolio_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase bg-white/5 p-2 rounded-lg hover:bg-blue-600 transition-all"><ExternalLink size={12} /> Portfolio</a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <h3 className="text-white font-black uppercase italic text-xl border-l-4 border-red-600 pl-4 flex justify-between">Tenders <span>{brandTenders.length}</span></h3>
                <div className="space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {brandTenders.map(t => (
                    <div key={t.id} className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded font-bold uppercase">{t.budget}</span>
                        <button onClick={async () => { if(confirm("Delete globally?")) { await supabase.from('brand_tenders').delete().eq('id', t.id); fetchData(); } }} className="text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                      <div className="font-black uppercase italic text-sm mb-1">{t.brand_name}</div>
                      <div className="text-[10px] text-zinc-500 uppercase font-bold line-clamp-2">{t.task_description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // -------------------------------------------------------------------
          // ГЛАВНАЯ СТРАНИЦА (SHOWCASE)
          // -------------------------------------------------------------------
          <>
            <div className="mt-10 mb-20">
              <h1 className="text-[10vw] leading-[0.85] font-black uppercase italic tracking-tighter text-white">Create.<br />Discover.<br /><span className="text-blue-600">Convince.</span></h1>
            </div>

            <div className="grid grid-cols-12 gap-10">
              {/* Левый список видео */}
              <div className="col-span-3 space-y-6">
                <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live Tenders ({tenders.length})
                </h3>
                <div className="h-[650px] overflow-y-auto pr-4 space-y-4 custom-scrollbar">
                  {tenders.map((t) => (
                    <div key={t.id} onClick={() => setActive(t)} className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer group ${active?.id === t.id ? 'bg-zinc-900 border-blue-600' : 'bg-transparent border-white/5 opacity-50 hover:opacity-100 hover:border-white/20'}`}>
                      <div className="flex justify-between text-[8px] font-bold uppercase mb-6 tracking-widest text-blue-500">
                        <span>{t.brand_name}</span>
                        <span className="text-green-500">{t.asset_price}</span>
                      </div>
                      <h4 className="text-2xl font-black uppercase italic leading-none group-hover:text-blue-400 transition-colors">{t.title}</h4>
                    </div>
                  ))}
                </div>
              </div>

              {/* Центральный плеер и инфо */}
              <div className="col-span-9 space-y-10">
                <div className="aspect-video bg-zinc-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl relative">
                  {active ? <CompareSlider key={active.id} rawVideo={active.video_raw_url} editedVideo={active.video_edited_url} /> : <div className="h-full flex items-center justify-center text-zinc-700 font-black uppercase tracking-widest">No Signal</div>}
                </div>

                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-8 bg-[#0a0a0a] rounded-[3rem] p-10 border border-white/5 relative overflow-hidden group">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-10">Project Passport</h3>
                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5"><Clock size={20} className="text-blue-500" /></div>
                          <div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Production</div>
                            <div className="text-2xl font-black uppercase italic leading-none">{active?.production_time || '---'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5"><Zap size={20} className="text-blue-500" /></div>
                          <div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Complexity</div>
                            <div className="text-2xl font-black uppercase italic text-blue-500 leading-none">{active?.complexity || '---'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6 border-l border-white/5 pl-12">
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase font-bold mb-3 tracking-widest">Software Stack</div>
                          <span className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/5">{active?.software || 'After Effects'}</span>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase font-bold mb-3 tracking-widest">Style Tags</div>
                          <div className="text-blue-500 text-[11px] font-black uppercase tracking-tighter break-words">{active?.style_tags || '#VISUALS'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4 bg-blue-600 p-10 rounded-[3.5rem] flex flex-col justify-between shadow-2xl shadow-blue-600/20">
                    <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none">{active?.asset_price || 'FREE'}</h2>
                    <button className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase text-sm hover:scale-105 transition-all shadow-xl"><ShoppingCart size={18} className="inline mr-2" /> Buy Assets</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Секция Заказов Брендов */}
            <section className="mt-32">
              <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-12">Brand <span className="text-zinc-800 text-outline">Requests</span></h2>
              <div className="grid grid-cols-3 gap-6">
                {brandTenders.map((task) => (
                  <div key={task.id} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 hover:border-blue-600/50 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-blue-500 font-black uppercase text-[10px] tracking-widest bg-blue-500/10 px-3 py-1 rounded-full">{task.brand_name}</span>
                      <span className="text-green-500 font-black text-xl italic">{task.budget}</span>
                    </div>
                    <h3 className="text-2xl font-black uppercase italic mb-8 leading-tight">{task.task_description}</h3>
                    <button onClick={() => { setSelectedTask(task); user ? setIsApplyModalOpen(true) : setIsAuthModalOpen(true); }} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs hover:bg-blue-600 hover:text-white transition-all">Apply Now</button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ==========================================
          5. МОДАЛЬНЫЕ ОКНА (OVERLAYS)
      ========================================== */}

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <div className="bg-[#0a0a0a] w-full max-w-md p-10 rounded-[3rem] border border-blue-600/30 shadow-2xl text-center">
            <Aperture size={50} className="text-blue-600 mx-auto mb-6 animate-spin" style={{ animationDuration: '10s' }}/>
            <h2 className="text-3xl font-black italic uppercase mb-2 tracking-tighter">{authMode === 'login' ? 'Authorized Only' : 'Create Identity'}</h2>
            <form onSubmit={handleAuth} className="space-y-4 mt-8">
              <input type="email" placeholder="E-MAIL" required onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 text-center font-bold" />
              <input type="password" placeholder="PASSWORD" required onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 text-center font-bold" />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-xl mt-4 hover:bg-blue-500 transition-all">{loading ? <Loader2 className="animate-spin mx-auto"/> : (authMode === 'login' ? 'Authorize' : 'Initialize')}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-8 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white block w-full">{authMode === 'login' ? "New here? Register" : "Have account? Login"}</button>
            <button onClick={() => setIsAuthModalOpen(false)} className="mt-4 text-zinc-700 text-[9px] uppercase font-bold hover:text-zinc-500">Close Terminal</button>
          </div>
        </div>
      )}

      {/* DEPLOY WORK (UPLOAD) */}
      {isTenderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] w-full max-w-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-black italic uppercase mb-8 tracking-tighter text-center">Deploy <span className="text-blue-600">Engine</span></h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Brand Name" onChange={e => setFormData({ ...formData, brand_name: e.target.value })} className="col-span-2 w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              <input type="text" placeholder="Project Title" onChange={e => setFormData({ ...formData, title: e.target.value })} className="col-span-2 w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              <div className="grid grid-cols-2 gap-4 col-span-2">
                <label className="flex flex-col items-center justify-center p-6 bg-[#111] rounded-2xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600 transition">
                  <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'raw')} />
                  {uploadStatus.raw ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-500" />}
                  <span className="text-[10px] uppercase font-black mt-2">Raw Video</span>
                </label>
                <label className="flex flex-col items-center justify-center p-6 bg-[#111] rounded-2xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600 transition">
                  <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'edited')} />
                  {uploadStatus.edited ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-500" />}
                  <span className="text-[10px] uppercase font-black mt-2">Edited Video</span>
                </label>
              </div>
              <input type="text" placeholder="Prod. Time" onChange={e => setFormData({ ...formData, production_time: e.target.value })} className="bg-[#111] p-5 rounded-2xl border border-white/5" />
              <input type="text" placeholder="Complexity" onChange={e => setFormData({ ...formData, complexity: e.target.value })} className="bg-[#111] p-5 rounded-2xl border border-white/5" />
              <input type="text" placeholder="Asset Price" onChange={e => setFormData({ ...formData, asset_price: e.target.value })} className="col-span-2 bg-[#111] p-5 rounded-2xl border border-white/5 text-blue-500 font-bold" />
              <button onClick={handlePublishWork} className="col-span-2 w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl shadow-lg shadow-blue-600/20">Publish Work</button>
              <button onClick={() => setIsTenderOpen(false)} className="col-span-2 text-zinc-600 text-[10px] uppercase mt-2 hover:text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* BRAND TENDER MODAL */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-10 rounded-[3rem] border border-blue-600/20 shadow-2xl">
            <h2 className="text-3xl font-black italic uppercase mb-8 tracking-tighter text-blue-500 text-center">Post a <span className="text-white">Tender</span></h2>
            <div className="space-y-4">
              <input type="text" placeholder="Brand Name" onChange={e => setBrandForm({...brandForm, brand_name: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none focus:border-blue-600 transition" />
              <textarea placeholder="Describe task..." onChange={e => setBrandForm({...brandForm, task_description: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none h-32 focus:border-blue-600" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Budget" onChange={e => setBrandForm({...brandForm, budget: e.target.value})} className="bg-[#111] p-4 rounded-2xl border border-white/5 outline-none" />
                <input type="text" placeholder="Deadline" onChange={e => setBrandForm({...brandForm, deadline: e.target.value})} className="bg-[#111] p-4 rounded-2xl border border-white/5 outline-none" />
              </div>
              <button onClick={handlePublishBrandTask} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl mt-4 active:scale-95 transition-all">Submit Task</button>
              <button onClick={() => setIsBrandModalOpen(false)} className="w-full text-zinc-600 uppercase text-[10px] text-center mt-2 hover:text-white transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* APPLY MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-10 rounded-[3rem] border border-blue-600/30 shadow-2xl">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8 text-center">Proposal to <span className="text-blue-500">{selectedTask?.brand_name}</span></h2>
            <div className="space-y-4">
              <input type="text" placeholder="Your Name" onChange={e => setApplyForm({...applyForm, editor_name: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              <input type="text" placeholder="Portfolio Link" onChange={e => setApplyForm({...applyForm, portfolio_link: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              <textarea placeholder="Your Message" onChange={e => setApplyForm({...applyForm, message: e.target.value})} className="w-full bg-[#111] p-4 rounded-2xl border border-white/5 outline-none h-32 focus:border-blue-600" />
              <button onClick={handleApplySubmit} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl mt-4 hover:bg-blue-500 shadow-lg shadow-blue-600/20">Submit Application</button>
              <button onClick={() => setIsApplyModalOpen(false)} className="w-full text-zinc-600 uppercase text-[10px] text-center mt-2 hover:text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}