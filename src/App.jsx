import React, { useState, useEffect } from 'react';
import { 
  Aperture, ShoppingCart, Send, Trash2, 
  CheckCircle2, Play, Clock, Zap, Tag, Cpu, 
  LayoutDashboard, MessageCircle, ChevronRight, 
  UserCircle, Target, Inbox, ExternalLink, ArrowLeft, Share2, Star, Check, CheckCheck
} from 'lucide-react';
import { supabase } from './supabaseClient';

// Твои компоненты из файлов Cursor
import CompareSlider from './components/CompareSlider';
import TenderModal from './components/TenderModal';

export default function App() {
  // --- СОСТОЯНИЕ (AUTH & PROFILE) ---
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authTelegram, setAuthTelegram] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [userRole, setUserRole] = useState('editor'); 

  // --- СОСТОЯНИЕ (UI) ---
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // --- ДАННЫЕ ---
  const [tenders, setTenders] = useState([]); 
  const [brandTenders, setBrandTenders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [messages, setMessages] = useState([]); 
  const [active, setActive] = useState(null);
  const [userWorks, setUserWorks] = useState([]);
  const [userTenders, setUserTenders] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  
  // --- ФОРМЫ ---
  const [brandForm, setBrandForm] = useState({ brand_name: '', task_description: '', budget: '', deadline: '', reference_video_url: '' });
  const [applyForm, setApplyForm] = useState({ editor_name: '', message: '' });
  const [rating, setRating] = useState(5);

  const hasUnread = messages.some(m => m.receiver_id === user?.id && !m.is_read);

  // --- ЭФФЕКТЫ (AUTH) ---
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
    const { data } = await supabase.from('profiles').select('*, reviews:reviews(rating)').eq('id', userId).maybeSingle();
    if (data) { 
      const avgRating = data.reviews?.length > 0 
        ? (data.reviews.reduce((acc, curr) => acc + curr.rating, 0) / data.reviews.length).toFixed(1)
        : '0';
      setProfile({ ...data, avgRating, totalReviews: data.reviews?.length || 0 }); 
      setUserRole(data.role || 'editor');
    }
  };

  const updateProfileRole = async (newRole) => {
    setUserRole(newRole);
    if (user) await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
  };

  // --- ЗАГРУЗКА ДАННЫХ ---
  const fetchData = async () => {
    const { data: works } = await supabase.from('tenders').select('*').order('created_at', { ascending: false });
    if (works) { setTenders(works); if (works.length > 0 && !active) setActive(works[0]); }
    
    const { data: tasks } = await supabase.from('brand_tenders').select('*').order('created_at', { ascending: false });
    if (tasks) setBrandTenders(tasks);

    if (user) {
      const { data: uWorks } = await supabase.from('tenders').select('*').eq('user_id', user.id);
      setUserWorks(uWorks || []);
      const { data: uTenders } = await supabase.from('brand_tenders').select('*').eq('user_id', user.id);
      setUserTenders(uTenders || []);
      const { data: msgs } = await supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false });
      setMessages(msgs || []);
      const { data: apps } = await supabase.from('tender_applications').select('*');
      setApplications(apps || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  // --- ЛОГИКА ЧАТА ---
  const sendMessage = async (receiverId, content) => {
    if (!content.trim() || !user) return;
    await supabase.from('messages').insert([{ sender_id: user.id, receiver_id: receiverId, content: content.trim() }]);
    fetchData();
  };

  const openTelegram = (tg) => {
    const nick = tg?.replace('@', '').trim();
    if (nick) window.open(`https://t.me/${nick}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-6 md:px-12 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsDashboardOpen(false)}>
          <Aperture size={32} className="text-blue-600 animate-spin-slow" />
          <span className="text-2xl font-black uppercase italic tracking-tighter">Aperture</span>
        </div>
        <div className="flex gap-4">
          {user ? (
            <button onClick={() => setIsDashboardOpen(!isDashboardOpen)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 ${hasUnread ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-white text-black'}`}>
              <LayoutDashboard size={14}/> {isDashboardOpen ? 'Галерея' : 'Моя Студия'}
            </button>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-blue-600 px-8 py-3 rounded-2xl font-black text-[10px] uppercase">Войти</button>
          )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-10">
        {isDashboardOpen ? (
          /* ================= STUDIO DASHBOARD ================= */
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/40 p-2 rounded-[2.5rem] border border-white/5 max-w-xl mx-auto">
                <button onClick={() => updateProfileRole('editor')} className={`flex-1 py-4 rounded-[2rem] font-black uppercase text-[10px] ${userRole === 'editor' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>Я Эдитор</button>
                <button onClick={() => updateProfileRole('brand')} className={`flex-1 py-4 rounded-[2rem] font-black uppercase text-[10px] ${userRole === 'brand' ? 'bg-red-600 text-white' : 'text-zinc-500'}`}>Я Бренд</button>
             </div>

             <div className="flex justify-between items-end">
                <div>
                   <h2 className="text-5xl font-black uppercase italic tracking-tighter">Studio <span className={userRole === 'editor' ? 'text-blue-600' : 'text-red-600'}>{userRole}</span></h2>
                   <div className="flex items-center gap-2 text-yellow-500 font-black italic mt-2"><Star size={14} fill="currentColor"/> {profile?.avgRating || '0'}</div>
                </div>
                <button onClick={() => supabase.auth.signOut()} className="text-[9px] font-black uppercase border border-white/10 px-4 py-2 rounded-lg text-zinc-600">Выйти</button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                   {userRole === 'editor' ? (
                     <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                        <h3 className="text-xl font-black uppercase italic mb-6 border-l-4 border-blue-600 pl-4">Мои Кейсы</h3>
                        <button onClick={() => setIsTenderModalOpen(true)} className="w-full py-10 border-2 border-dashed border-white/5 rounded-[2rem] text-zinc-600 font-black uppercase text-xs hover:border-blue-600 transition-all mb-6">+ Добавить работу (Passport)</button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {userWorks.map(w => (
                              <div key={w.id} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                 <span className="font-black italic uppercase truncate">{w.title}</span>
                                 <button onClick={() => supabase.from('tenders').delete().eq('id', w.id).then(fetchData)} className="text-zinc-700 hover:text-red-500"><Trash2 size={16}/></button>
                              </div>
                           ))}
                        </div>
                     </div>
                   ) : (
                     <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                        <h3 className="text-xl font-black uppercase italic mb-6 border-l-4 border-red-600 pl-4">Мои Тендеры</h3>
                        <button onClick={() => setIsBrandModalOpen(true)} className="w-full py-10 border-2 border-dashed border-white/5 rounded-[2rem] text-zinc-600 font-black uppercase text-xs hover:border-red-600 mb-6">+ Создать заказ</button>
                        {userTenders.map(t => (
                           <div key={t.id} className="bg-black/60 p-6 rounded-3xl border border-white/10 mb-4">
                              <div className="flex justify-between font-black text-red-500 italic uppercase"><span>{t.brand_name}</span><span>{t.budget}</span></div>
                              <p className="text-xs text-zinc-500 mt-2 italic">"{t.task_description}"</p>
                           </div>
                        ))}
                     </div>
                   )}
                </div>

                {/* INBOX */}
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5 h-fit">
                    <h3 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2"><MessageCircle size={18}/> Inbox</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {messages.map(msg => (
                            <div key={msg.id} className={`p-4 rounded-2xl border ${msg.sender_id === user.id ? 'bg-blue-600/10 border-blue-600/20 ml-4' : 'bg-white/5 border-white/10 mr-4'}`}>
                                <div className="text-[8px] font-black uppercase text-zinc-500 mb-1">{msg.sender_id === user.id ? 'Вы' : 'Собеседник'}</div>
                                <p className="text-[11px] leading-relaxed">{msg.content}</p>
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
              <div className="lg:w-2/3">
                 <div className="aspect-video bg-zinc-900 rounded-[4rem] overflow-hidden border border-white/5 shadow-2xl">
                    {active ? <CompareSlider key={active.id} rawVideo={active.video_raw_url} editedVideo={active.video_edited_url} /> : <div className="h-full flex items-center justify-center text-zinc-800 font-black italic">CHOOSE PROJECT...</div>}
                 </div>
                 <h1 className="hero-title mt-10">
                    {active?.title || 'Project'}<br /><span>{active?.brand_name || 'Brand'}</span>
                 </h1>
              </div>

              <div className="lg:w-1/3">
                <div className="bg-zinc-900/30 rounded-[3rem] border border-white/5 p-10">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-8">Project Passport</h3>
                    <div className="space-y-5 mb-10">
                        <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase">Software</span><span className="font-black italic">After Effects</span></div>
                        <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-[10px] font-bold text-zinc-500 uppercase">Production</span><span className="font-black italic">{active?.production_time || '24h'}</span></div>
                        <div className="flex justify-between"><span className="text-[10px] font-bold text-zinc-500 uppercase">Asset Price</span><span className="font-black italic text-blue-500">{active?.asset_price || 'FREE'}</span></div>
                    </div>
                    <button className="w-full bg-blue-600 py-6 rounded-3xl font-black uppercase text-xs hover:scale-105 transition-all">Buy Assets</button>
                    <button onClick={() => openTelegram(profile?.telegram)} className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase text-xs mt-4">Hire this Editor</button>
                </div>
              </div>
            </div>

            {/* TENDERS SECTION */}
            <section className="mt-20 border-t border-white/5 pt-20">
                <h2 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.8] mb-16">Open<br /><span className="text-blue-600">Tenders</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {brandTenders.map((task) => (
                      <div key={task.id} className="tender-card group">
                          <div className="flex justify-between text-blue-500 font-black uppercase text-[10px] mb-6">{task.brand_name} <span className="text-green-500 italic text-lg">{task.budget}</span></div>
                          <h3 className="text-xl font-black uppercase italic mb-8 h-12 line-clamp-2">{task.task_description}</h3>
                          <button onClick={() => { setSelectedTask(task); setIsApplyModalOpen(true); }} className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all">Откликнуться</button>
                      </div>
                    ))}
                </div>
            </section>
          </>
        )}
      </main>

      {/* ================= MODALS ================= */}
      
      {/* Твой компонент из Cursor */}
      <TenderModal 
        isOpen={isTenderModalOpen} 
        onClose={() => setIsTenderModalOpen(false)} 
        userId={user?.id}
        onRefresh={fetchData}
      />

      {/* ОСТАЛЬНЫЕ МОДАЛКИ (AUTH, BRAND, APPLY) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-md p-10 rounded-[3rem] border border-white/10">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center">{authMode === 'login' ? 'Вход' : 'Регистрация'}</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (authMode === 'signup') {
                const { data } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
                if (data.user) await supabase.from('profiles').insert([{ id: data.user.id, username: authEmail.split('@')[0], role: userRole, telegram: authTelegram }]);
              } else {
                await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
              }
              setIsAuthModalOpen(false);
            }} className="space-y-4">
              <input type="email" placeholder="EMAIL" required onChange={e => setAuthEmail(e.target.value)} className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <input type="password" placeholder="ПАРОЛЬ" required onChange={e => setAuthPassword(e.target.value)} className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              {authMode === 'signup' && <input type="text" placeholder="TELEGRAM" onChange={e => setAuthTelegram(e.target.value)} className="w-full bg-white/5 p-5 rounded-2xl border border-blue-600/30 text-blue-500 font-black" />}
              <button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest">Подтвердить</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-zinc-600 text-[10px] font-black uppercase block w-full text-center">{authMode === 'login' ? 'Создать аккаунт' : 'Уже есть профиль?'}</button>
          </div>
        </div>
      )}

      {/* BRAND TENDER MODAL */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-10 rounded-[3rem] border border-white/10">
            <h2 className="text-xl font-black italic uppercase mb-8 text-red-600">Разместить заказ</h2>
            <div className="space-y-4">
              <input type="text" placeholder="БРЕНД" onChange={e => setBrandForm({...brandForm, brand_name: e.target.value})} className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              <textarea placeholder="ОПИСАНИЕ" onChange={e => setBrandForm({...brandForm, task_description: e.target.value})} className="w-full bg-white/5 p-5 rounded-2xl border border-white/5 outline-none font-bold min-h-[120px]" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="БЮДЖЕТ" onChange={e => setBrandForm({...brandForm, budget: e.target.value})} className="bg-white/5 p-5 rounded-2xl border border-white/5 outline-none font-bold text-green-500" />
                <input type="text" placeholder="ДЕДЛАЙН" onChange={e => setBrandForm({...brandForm, deadline: e.target.value})} className="bg-white/5 p-5 rounded-2xl border border-white/5 outline-none font-bold" />
              </div>
              <button onClick={async () => {
                await supabase.from('brand_tenders').insert([{ ...brandForm, user_id: user.id }]);
                setIsBrandModalOpen(false); fetchData();
              }} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase">Опубликовать</button>
              <button onClick={() => setIsBrandModalOpen(false)} className="w-full text-[10px] text-zinc-800 uppercase font-black">Отмена</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}