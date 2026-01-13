import React, { useState, useEffect } from 'react';
import { 
  Aperture, ShoppingCart, Send, Trash2, Upload, 
  CheckCircle2, Play, Briefcase, Clock, 
  Zap, Tag, Cpu, LogOut, LayoutDashboard, Menu, X, MessageCircle, DollarSign, ChevronRight, UserCircle, Target, Inbox, ExternalLink
} from 'lucide-react';
import { supabase } from './supabaseClient';
import CompareSlider from './components/CompareSlider';

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authTelegram, setAuthTelegram] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [userRole, setUserRole] = useState('editor'); 
  const [tenders, setTenders] = useState([]); 
  const [brandTenders, setBrandTenders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [messages, setMessages] = useState([]); 
  const [active, setActive] = useState(null);

  const [userWorks, setUserWorks] = useState([]);
  const [userTenders, setUserTenders] = useState([]);

  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ raw: false, edited: false });

  const [formData, setFormData] = useState({ 
    brand_name: '', title: '', video_raw_url: '', video_edited_url: '', 
    asset_price: '', production_time: '', complexity: 'Medium', 
    software: 'After Effects', style_tags: '', checkout_url: '' 
  });
  const [brandForm, setBrandForm] = useState({ 
    brand_name: '', task_description: '', budget: '', deadline: '' 
  });
  const [applyForm, setApplyForm] = useState({ editor_name: '', message: '' });

  const hasUnread = messages.some(m => m.receiver_id === user?.id && !m.is_read);

  // --- ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setIsDashboardOpen(false); setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) { 
      setProfile(data); 
      setAuthTelegram(data.telegram || '');
      setUserRole(data.role || 'editor');
    }
  };

  const fetchData = async () => {
    const { data: works } = await supabase.from('tenders').select('*').order('created_at', { ascending: false });
    if (works) { 
        setTenders(works); 
        if (works.length > 0 && !active) setActive(works[0]);
    }
    
    const { data: tasks } = await supabase.from('brand_tenders').select('*').order('created_at', { ascending: false });
    if (tasks) setBrandTenders(tasks);
    
    const { data: apps } = await supabase.from('tender_applications').select('*').order('created_at', { ascending: false });
    if (apps) setApplications(apps);

    if (user) {
      const { data: uWorks } = await supabase.from('tenders').select('*').eq('user_id', user.id);
      setUserWorks(uWorks || []);
      const { data: uTenders } = await supabase.from('brand_tenders').select('*').eq('user_id', user.id);
      setUserTenders(uTenders || []);
      const { data: msgs } = await supabase.from('messages')
        .select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      setMessages(msgs || []);
    }
  };

  useEffect(() => { 
    fetchData(); 
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  // --- ЛОГИКА ---
  const updateProfileRole = async (newRole) => {
    setUserRole(newRole);
    if (user) await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
  };

  const handleFileUpload = async (event, type) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      setLoading(true);
      const fileName = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('videos').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('videos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, [type === 'raw' ? 'video_raw_url' : 'video_edited_url']: data.publicUrl }));
      setUploadStatus(prev => ({ ...prev, [type]: true }));
    } catch (e) { alert("Ошибка загрузки"); } finally { setLoading(false); }
  };

  const sendMessage = async (receiverId, content) => {
    if (!content.trim() || !user) return;
    const { error } = await supabase.from('messages').insert([
      { sender_id: user.id, receiver_id: receiverId, content: content.trim(), is_read: false }
    ]);
    if (!error) fetchData();
  };

  // Проверка прав на удаление (Владелец или Админ)
  const canDelete = (itemUserId) => {
    if (!user) return false;
    return user.id === itemUserId || profile?.role === 'admin';
  };

  const deleteTender = async (id, table) => {
    if (window.confirm("Вы уверены? Это действие удалит запись навсегда.")) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        alert("Ошибка доступа: вы не можете удалить этот объект.");
      } else {
        fetchData(); 
      }
    }
  };

  const openTelegram = (tg) => {
    const nick = tg?.replace('@', '').trim();
    if (nick) window.open(`https://t.me/${nick}`, '_blank');
  };

  const handleApplyToTender = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from('tender_applications').insert([
        { tender_id: selectedTask.id, editor_name: applyForm.editor_name, portfolio_link: profile?.telegram || '', user_id: user.id }
      ]);
      await sendMessage(selectedTask.user_id, `ОТКЛИК НА ТЕНДЕР [${selectedTask.brand_name}]: ${applyForm.message}`);
      setIsApplyModalOpen(false);
      setApplyForm({ editor_name: '', message: '' });
    } catch (err) { alert("Ошибка при отклике"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-6 md:px-12 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setIsDashboardOpen(false); }}>
          <Aperture size={32} className="text-blue-600" />
          <span className="text-2xl font-black uppercase italic tracking-tighter">Aperture</span>
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
            <button 
              onClick={() => setIsDashboardOpen(!isDashboardOpen)} 
              className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 relative
                ${hasUnread ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white text-black hover:bg-blue-600 hover:text-white'}`}
            >
              <LayoutDashboard size={14}/> {isDashboardOpen ? 'Галерея' : 'Моя Студия'}
              {hasUnread && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span></span>}
            </button>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-blue-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase">Войти</button>
          )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {isDashboardOpen ? (
          /* ================= DASHBOARD (MY STUDIO) ================= */
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/40 p-2 rounded-[2.5rem] border border-white/5 max-w-xl mx-auto mb-10">
                <button onClick={() => updateProfileRole('editor')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] font-black uppercase text-[10px] transition-all ${userRole === 'editor' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}><UserCircle size={16}/> Я Эдитор</button>
                <button onClick={() => updateProfileRole('brand')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] font-black uppercase text-[10px] transition-all ${userRole === 'brand' ? 'bg-red-600 text-white' : 'text-zinc-500'}`}><Target size={16}/> Я Бренд</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                  {userRole === 'editor' ? (
                    <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase italic border-l-4 border-blue-600 pl-4">Мои Кейсы</h3>
                            <button onClick={() => setIsTenderOpen(true)} className="bg-blue-600/10 text-blue-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">+ Загрузить</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userWorks.length > 0 ? userWorks.map(w => (
                                <div key={w.id} className="bg-black/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                                    <div className="truncate">
                                        <div className="text-[9px] text-blue-500 font-bold uppercase">{w.brand_name}</div>
                                        <div className="font-black italic text-lg">{w.title}</div>
                                    </div>
                                    {canDelete(w.user_id) && (
                                      <button onClick={() => deleteTender(w.id, 'tenders')} className="text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                    )}
                                </div>
                            )) : <div className="col-span-2 text-center py-20 border-2 border-dashed border-white/5 rounded-3xl text-zinc-700 font-black uppercase text-[10px]">Тут пока пусто</div>}
                        </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase italic border-l-4 border-red-600 pl-4">Мои Тендеры</h3>
                            <button onClick={() => setIsBrandModalOpen(true)} className="bg-red-600/10 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">+ Создать</button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {userTenders.length > 0 ? userTenders.map(t => (
                                <div key={t.id} className="bg-black/60 p-6 rounded-3xl border border-white/10 relative">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-red-500 font-black italic uppercase tracking-tighter">{t.brand_name} <span className="ml-2 text-white/40 text-xs">/ {t.budget}</span></div>
                                        {canDelete(t.user_id) && (
                                          <button onClick={() => deleteTender(t.id, 'brand_tenders')} className="text-zinc-800 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 mb-6">"{t.task_description}"</p>
                                    <div className="space-y-2 pt-4 border-t border-white/5">
                                        <p className="text-[8px] font-black text-zinc-600 uppercase mb-3">Отклики:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {applications.filter(a => a.tender_id === t.id).map(app => (
                                                <div key={app.id} className="bg-zinc-900 p-4 rounded-xl flex justify-between items-center border border-white/5">
                                                    <div className="text-[10px] font-black uppercase">{app.editor_name}</div>
                                                    <button onClick={() => openTelegram(app.portfolio_link)} className="bg-blue-600 px-3 py-1.5 rounded-lg text-[9px] font-black flex items-center gap-1">TG <ExternalLink size={10}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )) : <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl text-zinc-700 font-black uppercase text-[10px]">Нет активных тендеров</div>}
                        </div>
                    </div>
                  )}
                </div>

                {/* MESSENGER */}
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5 h-fit sticky top-32">
                    <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2 border-l-4 border-white pl-4"><MessageCircle size={18}/> Inbox</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {messages.length > 0 ? messages.map(msg => (
                            <div key={msg.id} className={`p-4 rounded-2xl border transition-all ${msg.sender_id === user.id ? 'bg-blue-600/5 border-blue-600/10 ml-6' : 'bg-white/5 border-white/10 mr-6'} ${!msg.is_read && msg.receiver_id === user.id ? 'ring-2 ring-blue-500/50' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[8px] font-black uppercase text-zinc-600">{msg.sender_id === user.id ? 'Вы' : 'Отправитель'}</span>
                                    <span className="text-[8px] text-zinc-800">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-zinc-300">{msg.content}</p>
                                {msg.sender_id !== user.id && (
                                    <button onClick={() => { const r = prompt("Ваш ответ:"); if(r) sendMessage(msg.sender_id, r); }} className="mt-3 text-[9px] font-black uppercase text-blue-500 hover:text-blue-400">Ответить</button>
                                )}
                            </div>
                        )) : <div className="text-center py-10 text-zinc-800"><Inbox size={32} className="mx-auto mb-2 opacity-10"/><p className="text-[9px] font-black uppercase tracking-widest">Сообщений нет</p></div>}
                    </div>
                </div>
              </div>
          </div>
        ) : (
          /* ================= MAIN GALLERY ================= */
          <>
            <div className="flex flex-col lg:flex-row gap-12 mb-24 animate-in fade-in duration-700">
              <div className="lg:w-2/3 space-y-6">
                 <div className="aspect-video bg-zinc-900 rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-white/5 shadow-2xl relative group">
                    {active ? (
                        <CompareSlider key={active.id} rawVideo={active.video_raw_url} editedVideo={active.video_edited_url} />
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-800 font-black italic">SELECTING PROJECT...</div>
                    )}
                 </div>
                 <div className="flex justify-between items-end px-4">
                    <div>
                        <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-2">{active?.title || "Project"}</h1>
                        <span className="bg-blue-600/10 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{active?.brand_name || "Brand"}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Asset Pack</div>
                        <div className="text-4xl font-black italic text-blue-600">{active?.asset_price || "FREE"}</div>
                    </div>
                 </div>
              </div>

              <div className="lg:w-1/3 space-y-6">
                <div className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-8 md:p-10 backdrop-blur-sm">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-8">Project Passport</h3>
                    <div className="space-y-5 mb-10">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Cpu size={14}/> Software</span><span className="font-black uppercase italic text-sm">{active?.software || 'AE'}</span></div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Clock size={14}/> Time</span><span className="font-black uppercase italic text-sm">{active?.production_time || '24h'}</span></div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Zap size={14}/> Complexity</span><span className="font-black uppercase italic text-sm text-blue-600">{active?.complexity || 'Pro'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2"><Tag size={14}/> Style</span><span className="font-black uppercase italic text-xs text-zinc-300">{active?.style_tags || '#VFX'}</span></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => {
                                if (active?.checkout_url) window.open(active.checkout_url, '_blank');
                                else openTelegram(profile?.telegram);
                            }} 
                            className="w-full bg-blue-600 py-6 rounded-3xl font-black uppercase text-xs hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-blue-600/20"
                        >
                            <div className="flex items-center gap-2"><ShoppingCart size={16}/> {active?.asset_price || "FREE"}</div>
                            <span className="text-[8px] opacity-50">Instant Access</span>
                        </button>
                        <button onClick={() => openTelegram(profile?.telegram)} className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase text-xs hover:bg-zinc-200 transition-all">Hire this Editor</button>
                    </div>
                </div>

                <div className="px-4">
                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">Showcase <ChevronRight size={12}/></h4>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {tenders.map(t => (
                            <div key={t.id} onClick={() => setActive(t)} className={`min-w-[100px] aspect-square rounded-2xl border-2 transition-all cursor-pointer overflow-hidden relative group ${active?.id === t.id ? 'border-blue-600 scale-105' : 'border-white/5 opacity-40 hover:opacity-100'}`}>
                                {canDelete(t.user_id) && (
                                  <button onClick={(e) => { e.stopPropagation(); deleteTender(t.id, 'tenders'); }} className="absolute top-1 right-1 z-50 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                                )}
                                <video src={t.video_edited_url} className="w-full h-full object-cover" muted onMouseEnter={e => e.target.play()} onMouseLeave={e => {e.target.pause(); e.target.currentTime = 0;}} />
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>

            {/* OPEN TENDERS */}
            <section className="mt-20 border-t border-white/5 pt-20 pb-40">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <h2 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.8]">Open<br /><span className="text-blue-600">Tenders</span></h2>
                    <p className="text-zinc-500 max-w-xs font-bold text-[10px] uppercase leading-relaxed tracking-widest">Площадка, где бренды находят лучших художников.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {brandTenders.map((task) => (
                    <div key={task.id} className="bg-zinc-900/20 p-10 rounded-[3rem] border border-white/5 hover:border-blue-600/40 transition-all group flex flex-col justify-between relative">
                        {canDelete(task.user_id) && (
                          <button onClick={(e) => { e.stopPropagation(); deleteTender(task.id, 'brand_tenders'); }} className="absolute top-6 right-6 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        )}
                        <div>
                            <div className="flex justify-between items-start mb-8 text-blue-500 font-black uppercase text-[10px] tracking-widest">{task.brand_name} <span className="text-green-500 font-black italic text-lg">{task.budget}</span></div>
                            <h3 className="text-xl font-black uppercase italic mb-10 h-14 line-clamp-2 leading-tight">"{task.task_description}"</h3>
                        </div>
                        <button onClick={() => { setSelectedTask(task); user ? setIsApplyModalOpen(true) : setIsAuthModalOpen(true); }} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all">Откликнуться</button>
                    </div>
                    ))}
                </div>
            </section>
          </>
        )}
      </main>

      {/* MODALS */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center">{authMode === 'login' ? 'Вход' : 'Регистрация'}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault(); setLoading(true);
              const cleanEmail = authEmail.trim();
              if (authMode === 'signup') {
                const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password: authPassword });
                if (!error && data.user) {
                   await supabase.from('profiles').insert([{ id: data.user.id, username: cleanEmail.split('@')[0], telegram: authTelegram, role: userRole }]);
                }
                if (error) alert(error.message); else setIsAuthModalOpen(false);
              } else {
                const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: authPassword });
                if (error) alert("Ошибка данных"); else setIsAuthModalOpen(false);
              }
              setLoading(false);
            }} className="space-y-4">
              <input type="email" placeholder="EMAIL" required onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 font-bold" />
              <input type="password" placeholder="ПАРОЛЬ" required onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 font-bold" />
              {authMode === 'signup' && <input type="text" placeholder="TELEGRAM (@...)" required onChange={e => setAuthTelegram(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-blue-600/30 outline-none text-blue-500 font-black" />}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest">{loading ? '...' : 'Подтвердить'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-zinc-600 text-[10px] font-black uppercase block w-full text-center hover:text-white">{authMode === 'login' ? 'Создать аккаунт' : 'Уже есть профиль?'}</button>
            <button onClick={() => setIsAuthModalOpen(false)} className="mt-4 text-[10px] text-zinc-800 uppercase block w-full text-center font-black">Закрыть</button>
          </div>
        </div>
      )}

      {isTenderOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] w-full max-w-2xl p-10 rounded-[3.5rem] border border-white/5 my-10">
            <h2 className="text-2xl font-black italic uppercase mb-10 text-center text-blue-600">Новый Кейс</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Бренд" onChange={e => setFormData({ ...formData, brand_name: e.target.value })} className="md:col-span-2 bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <input type="text" placeholder="Название проекта" onChange={e => setFormData({ ...formData, title: e.target.value })} className="md:col-span-2 bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <label className="flex flex-col items-center justify-center p-10 bg-[#111] rounded-3xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600 group">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'raw')} />
                {uploadStatus.raw ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-600 group-hover:text-white" />}
                <span className="text-[10px] font-black mt-2 uppercase tracking-widest">RAW VIDEO</span>
              </label>
              <label className="flex flex-col items-center justify-center p-10 bg-[#111] rounded-3xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600 group">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'edited')} />
                {uploadStatus.edited ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-600 group-hover:text-white" />}
                <span className="text-[10px] font-black mt-2 uppercase tracking-widest">VFX VIDEO</span>
              </label>
              <input type="text" placeholder="Цена ассетов" onChange={e => setFormData({ ...formData, asset_price: e.target.value })} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none text-blue-500 font-black" />
              <input type="text" placeholder="Время работы" onChange={e => setFormData({ ...formData, production_time: e.target.value })} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <input type="text" placeholder="Ссылка на оплату (Prodamus/Crypto/Bot)" onChange={e => setFormData({ ...formData, checkout_url: e.target.value })} className="md:col-span-2 bg-[#111] p-5 rounded-2xl border border-blue-600/20 outline-none text-blue-400 font-bold text-xs" />
              <button onClick={async () => {
                setLoading(true);
                const { error } = await supabase.from('tenders').insert([{ ...formData, user_id: user.id }]);
                if (!error) { setIsTenderOpen(false); fetchData(); }
                setLoading(false);
              }} className="md:col-span-2 w-full bg-blue-600 py-6 rounded-3xl font-black uppercase text-lg mt-4 shadow-xl shadow-blue-600/20">{loading ? 'Загрузка...' : 'Опубликовать'}</button>
              <button onClick={() => setIsTenderOpen(false)} className="md:col-span-2 text-zinc-800 text-[10px] font-black uppercase text-center mt-2">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-10 rounded-[3rem] border border-white/10">
            <h2 className="text-xl font-black italic uppercase mb-8 text-red-600">Разместить заказ</h2>
            <div className="space-y-4">
              <input type="text" placeholder="НАЗВАНИЕ БРЕНДА" onChange={e => setBrandForm({...brandForm, brand_name: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <textarea placeholder="ОПИСАНИЕ ЗАДАЧИ" onChange={e => setBrandForm({...brandForm, task_description: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold min-h-[120px]" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="БЮДЖЕТ" onChange={e => setBrandForm({...brandForm, budget: e.target.value})} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold text-green-500" />
                <input type="text" placeholder="ДЕДЛАЙН" onChange={e => setBrandForm({...brandForm, deadline: e.target.value})} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              </div>
              <button onClick={async () => {
                setLoading(true);
                const { error } = await supabase.from('brand_tenders').insert([{ ...brandForm, user_id: user.id }]);
                if(!error) { setIsBrandModalOpen(false); fetchData(); }
                setLoading(false);
              }} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase">Опубликовать тендер</button>
              <button onClick={() => setIsBrandModalOpen(false)} className="w-full text-[10px] text-zinc-800 uppercase font-black">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {isApplyModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-10 rounded-[3rem] border border-white/10">
            <h2 className="text-xl font-black italic uppercase mb-6">Откликнуться</h2>
            <form onSubmit={handleApplyToTender} className="space-y-4">
              <input type="text" placeholder="ВАШЕ ИМЯ" required onChange={e => setApplyForm({...applyForm, editor_name: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <textarea placeholder="СООБЩЕНИЕ БРЕНДУ" required onChange={e => setApplyForm({...applyForm, message: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold min-h-[100px]" />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase">{loading ? '...' : 'Отправить отклик'}</button>
              <button type="button" onClick={() => setIsApplyModalOpen(false)} className="w-full text-[10px] text-zinc-800 uppercase font-black">Отмена</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}