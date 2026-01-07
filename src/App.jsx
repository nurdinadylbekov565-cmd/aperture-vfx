import React, { useState, useEffect } from 'react';
import { 
  Aperture, ShoppingCart, Send, Trash2, Upload, 
  CheckCircle2, Play, Briefcase, Clock, 
  Zap, Tag, Cpu, LogOut, LayoutDashboard, Menu, X, MessageCircle, DollarSign, ChevronRight
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [tenders, setTenders] = useState([]); 
  const [brandTenders, setBrandTenders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [active, setActive] = useState(null);

  const [userWorks, setUserWorks] = useState([]);
  const [userTenders, setUserTenders] = useState([]);

  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ raw: false, edited: false });

  const [formData, setFormData] = useState({ brand_name: '', title: '', video_raw_url: '', video_edited_url: '', asset_price: '', production_time: '', complexity: 'Medium', software: 'After Effects', style_tags: '' });
  const [brandForm, setBrandForm] = useState({ brand_name: '', task_description: '', budget: '', deadline: '' });
  const [applyForm, setApplyForm] = useState({ editor_name: '', message: '' });

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
    if (data) { setProfile(data); setAuthTelegram(data.telegram || ''); }
  };

  const fetchData = async () => {
    const { data: works } = await supabase.from('tenders').select('*').order('created_at', { ascending: false });
    if (works) { setTenders(works); if (works.length > 0 && !active) setActive(works[0]); }
    const { data: tasks } = await supabase.from('brand_tenders').select('*').order('created_at', { ascending: false });
    if (tasks) setBrandTenders(tasks);
    const { data: apps } = await supabase.from('tender_applications').select('*').order('created_at', { ascending: false });
    if (apps) setApplications(apps);

    if (user) {
      const { data: uWorks } = await supabase.from('tenders').select('*').eq('user_id', user.id);
      setUserWorks(uWorks || []);
      const { data: uTenders } = await supabase.from('brand_tenders').select('*').eq('user_id', user.id);
      setUserTenders(uTenders || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

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
    } catch (e) { alert("Ошибка загрузки видео. Проверьте соединение."); } finally { setLoading(false); }
  };

  const openTelegram = (tg) => {
    const nick = tg?.replace('@', '').trim();
    if (nick) window.open(`https://t.me/${nick}`, '_blank');
    else alert("Контакт автора не указан");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-6 md:px-12 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsDashboardOpen(false)}>
          <Aperture size={32} className="text-blue-600" />
          <span className="text-2xl font-black uppercase italic tracking-tighter">Aperture</span>
        </div>

        <div className="flex gap-4 items-center">
          {user ? (
            <button onClick={() => setIsDashboardOpen(!isDashboardOpen)} className="bg-white text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 hover:bg-blue-600 hover:text-white">
              <LayoutDashboard size={14}/> {isDashboardOpen ? 'В Галерею' : 'Моя Студия'}
            </button>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-blue-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase">Войти</button>
          )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        
        {isDashboardOpen ? (
          /* ================= DASHBOARD ================= */
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">My <span className="text-blue-600">Studio</span></h2>
                <button onClick={() => supabase.auth.signOut()} className="text-zinc-600 text-[10px] font-black uppercase border border-white/10 px-4 py-2 rounded-lg hover:text-red-500 transition-colors">Выйти из аккаунта</button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                  <h3 className="text-xl font-black uppercase italic mb-6 border-l-4 border-blue-600 pl-4">Мои Работы</h3>
                  <button onClick={() => setIsTenderOpen(true)} className="w-full py-10 border-2 border-dashed border-white/5 rounded-[2rem] text-zinc-600 font-black uppercase text-xs hover:border-blue-600 transition-all mb-6">+ Добавить кейс</button>
                  <div className="space-y-3">
                    {userWorks.map(w => (
                      <div key={w.id} className="bg-black/40 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div className="truncate"><div className="text-[9px] text-blue-500 font-bold uppercase">{w.brand_name}</div><div className="font-black italic text-lg">{w.title}</div></div>
                        <button onClick={async () => { if(confirm("Удалить?")) { await supabase.from('tenders').delete().eq('id', w.id); fetchData(); } }} className="text-zinc-800 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                  <h3 className="text-xl font-black uppercase italic mb-6 border-l-4 border-red-600 pl-4">Мои Заказы</h3>
                  <button onClick={() => setIsBrandModalOpen(true)} className="w-full py-10 border-2 border-dashed border-white/5 rounded-[2rem] text-zinc-600 font-black uppercase text-xs hover:border-red-600 transition-all mb-6">+ Создать тендер</button>
                  <div className="space-y-6">
                    {userTenders.map(t => (
                      <div key={t.id} className="bg-black/60 p-6 rounded-3xl border border-white/10">
                        <div className="flex justify-between items-center mb-4 text-red-500 font-black italic uppercase tracking-tighter">{t.brand_name} <span>{t.budget}</span></div>
                        <div className="space-y-2">
                          {applications.filter(a => a.tender_id === t.id).map(app => (
                            <div key={app.id} className="bg-zinc-900 p-4 rounded-xl flex justify-between items-center">
                              <div className="text-xs font-black uppercase">{app.editor_name}</div>
                              <button onClick={() => openTelegram(app.portfolio_link)} className="bg-blue-600 p-2 rounded-lg"><MessageCircle size={14}/></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        ) : (
          /* ================= MAIN GALLERY ================= */
          <>
            <div className="flex flex-col lg:flex-row gap-12 mb-24">
              <div className="lg:w-2/3 space-y-6">
                 <div className="aspect-video bg-zinc-900 rounded-[2.5rem] md:rounded-[4rem] overflow-hidden border border-white/5 shadow-2xl">
                    {active ? <CompareSlider key={active.id} rawVideo={active.video_raw_url} editedVideo={active.video_edited_url} /> : <div className="h-full flex items-center justify-center text-zinc-800 font-black italic">CHOOSE PROJECT</div>}
                 </div>
                 <div className="flex justify-between items-end px-4">
                    <div>
                        <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-2">{active?.title || "Project"}</h1>
                        <span className="bg-blue-600/10 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{active?.brand_name || "Brand"}</span>
                    </div>
                    <div className="text-right"><div className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Asset Pack</div><div className="text-4xl font-black italic">{active?.asset_price || "FREE"}</div></div>
                 </div>
              </div>

              <div className="lg:w-1/3 space-y-6">
                <div className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-8 md:p-10">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-8">Project Passport</h3>
                    <div className="space-y-5 mb-10">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase">Software</span><span className="font-black uppercase italic text-sm">{active?.software || 'AE'}</span></div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase">Time</span><span className="font-black uppercase italic text-sm">{active?.production_time || '24h'}</span></div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase">Complexity</span><span className="font-black uppercase italic text-sm text-blue-600">{active?.complexity || 'Pro'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-zinc-500 uppercase">Style</span><span className="font-black uppercase italic text-xs text-zinc-300">{active?.style_tags || '#VFX'}</span></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => openTelegram(profile?.telegram)} className="w-full bg-blue-600 py-6 rounded-3xl font-black uppercase text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><ShoppingCart size={16}/> Buy Assets</button>
                        <button onClick={() => openTelegram(profile?.telegram)} className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase text-xs hover:bg-zinc-200 transition-all">Hire this Editor</button>
                    </div>
                </div>

                <div className="px-4">
                    <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">Showcase <ChevronRight size={12}/></h4>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {tenders.map(t => (
                            <div key={t.id} onClick={() => setActive(t)} className={`min-w-[100px] aspect-square rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${active?.id === t.id ? 'border-blue-600' : 'border-white/5 opacity-40'}`}>
                                <video src={t.video_edited_url} className="w-full h-full object-cover" muted onMouseEnter={e => e.target.play()} />
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>

            <section className="mt-20 border-t border-white/5 pt-20">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <h2 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.8]">Open<br /><span className="text-blue-600">Tenders</span></h2>
                    <p className="text-zinc-500 max-w-xs font-bold text-xs uppercase leading-relaxed">Площадка, где бренды находят лучших визуальных художников. Найди свой проект.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {brandTenders.map((task) => (
                    <div key={task.id} className="bg-zinc-900/20 p-10 rounded-[3rem] border border-white/5 hover:border-blue-600/40 transition-all group">
                        <div className="flex justify-between items-start mb-8 text-blue-500 font-black uppercase text-[10px] tracking-widest">{task.brand_name} <span className="text-green-500 font-black italic text-lg">{task.budget}</span></div>
                        <h3 className="text-xl font-black uppercase italic mb-10 h-14 line-clamp-2">{task.task_description}</h3>
                        <button onClick={() => { setSelectedTask(task); user ? setIsApplyModalOpen(true) : setIsAuthModalOpen(true); }} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all">Откликнуться</button>
                    </div>
                    ))}
                </div>
            </section>
          </>
        )}
      </main>

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center">{authMode === 'login' ? 'Вход' : 'Регистрация'}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault(); setLoading(true);
              const cleanEmail = authEmail.trim();
              if (authMode === 'signup') {
                const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password: authPassword });
                if (!error && data.user) await supabase.from('profiles').insert([{ id: data.user.id, username: cleanEmail.split('@')[0], telegram: authTelegram }]);
                if (error) alert(error.message); else setIsAuthModalOpen(false);
              } else {
                const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: authPassword });
                if (error) alert("Ошибка данных"); else setIsAuthModalOpen(false);
              }
              setLoading(false);
            }} className="space-y-4">
              <input type="email" placeholder="EMAIL" required onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              <input type="password" placeholder="ПАРОЛЬ" required onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              {authMode === 'signup' && <input type="text" placeholder="TELEGRAM (@...)" required onChange={e => setAuthTelegram(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-blue-600/30 outline-none text-blue-500 font-bold" />}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase">{loading ? '...' : 'Подтвердить'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-zinc-600 text-[10px] font-black uppercase block w-full text-center hover:text-white">{authMode === 'login' ? 'Создать аккаунт' : 'Уже есть профиль?'}</button>
            <button onClick={() => setIsAuthModalOpen(false)} className="mt-4 text-[10px] text-zinc-800 uppercase block w-full text-center">Закрыть</button>
          </div>
        </div>
      )}

      {/* CREATE WORK */}
      {isTenderOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] w-full max-w-2xl p-10 rounded-[3.5rem] border border-white/5 my-10">
            <h2 className="text-2xl font-black italic uppercase mb-10 text-center text-blue-600">Новый Кейс</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Бренд" onChange={e => setFormData({ ...formData, brand_name: e.target.value })} className="md:col-span-2 bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <input type="text" placeholder="Название проекта" onChange={e => setFormData({ ...formData, title: e.target.value })} className="md:col-span-2 bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <label className="flex flex-col items-center justify-center p-10 bg-[#111] rounded-3xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'raw')} />
                {uploadStatus.raw ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-600" />}
                <span className="text-[10px] font-black mt-2">RAW VIDEO</span>
              </label>
              <label className="flex flex-col items-center justify-center p-10 bg-[#111] rounded-3xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'edited')} />
                {uploadStatus.edited ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-600" />}
                <span className="text-[10px] font-black mt-2">VFX VIDEO</span>
              </label>
              <input type="text" placeholder="Цена ассетов (напр. $100)" onChange={e => setFormData({ ...formData, asset_price: e.target.value })} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none text-blue-500 font-bold" />
              <input type="text" placeholder="Время работы (напр. 2 дня)" onChange={e => setFormData({ ...formData, production_time: e.target.value })} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <button onClick={async () => {
                setLoading(true);
                const { error } = await supabase.from('tenders').insert([{ ...formData, user_id: user.id }]);
                if (!error) { setIsTenderOpen(false); fetchData(); }
                setLoading(false);
              }} className="md:col-span-2 w-full bg-blue-600 py-6 rounded-3xl font-black uppercase text-lg mt-4">{loading ? 'Загрузка...' : 'Опубликовать'}</button>
              <button onClick={() => setIsTenderOpen(false)} className="md:col-span-2 text-zinc-800 text-[10px] font-black uppercase text-center">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* BRAND MODAL */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-[#0a0a0a] w-full max-w-md p-10 rounded-[3rem] border border-white/5">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center text-red-600">Новый Заказ</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Название компании" onChange={e => setBrandForm({...brandForm, brand_name: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <textarea placeholder="Что нужно сделать?" onChange={e => setBrandForm({...brandForm, task_description: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 h-32 outline-none" />
              <input type="text" placeholder="Бюджет" onChange={e => setBrandForm({...brandForm, budget: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <button onClick={async () => {
                const { error } = await supabase.from('brand_tenders').insert([{ ...brandForm, user_id: user.id }]);
                if (!error) { setIsBrandModalOpen(false); fetchData(); }
              }} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-lg">Опубликовать заказ</button>
              <button onClick={() => setIsBrandModalOpen(false)} className="w-full text-zinc-800 text-[10px] font-black uppercase text-center pt-2">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* APPLY MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-[#0a0a0a] w-full max-w-md p-10 rounded-[3rem] border border-blue-600/20">
            <h2 className="text-2xl font-black uppercase italic mb-8 text-center">Откликнуться</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Ваше Имя" onChange={e => setApplyForm({...applyForm, editor_name: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <textarea placeholder="Сообщение для бренда..." onChange={e => setApplyForm({...applyForm, message: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 h-40 outline-none" />
              <button onClick={async () => {
                   const { error } = await supabase.from('tender_applications').insert([{ ...applyForm, portfolio_link: profile?.telegram, user_id: user.id, tender_id: selectedTask.id, status: 'pending' }]);
                   if (!error) { setIsApplyModalOpen(false); fetchData(); } else alert("Ошибка отклика");
                }} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-lg shadow-xl shadow-blue-600/20">Отправить</button>
              <button onClick={() => setIsApplyModalOpen(false)} className="w-full text-zinc-800 text-[10px] font-black uppercase text-center pt-2">Отмена</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}