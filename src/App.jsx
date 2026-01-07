import React, { useState, useEffect } from 'react';
import { 
  Aperture, ShoppingCart, Send, Trash2, Upload, 
  CheckCircle2, Loader2, Play, Briefcase, Clock, 
  Zap, ExternalLink, XCircle, Tag, Cpu, User, LogOut, LayoutDashboard, Menu, X
} from 'lucide-react';
import { supabase } from './supabaseClient';
import CompareSlider from './components/CompareSlider';

export default function App() {
  // --- СОСТОЯНИЯ (STATES) ---
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [isAdminView, setIsAdminView] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- ДАННЫЕ ---
  const [tenders, setTenders] = useState([]);
  const [brandTenders, setBrandTenders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [active, setActive] = useState(null);

  // --- ЛИЧНЫЕ ДАННЫЕ ---
  const [userWorks, setUserWorks] = useState([]);
  const [userTenders, setUserTenders] = useState([]);
  const [userApps, setUserApps] = useState([]);

  // --- ФОРМЫ ---
  const [isTenderOpen, setIsTenderOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ raw: false, edited: false });

  const [formData, setFormData] = useState({ brand_name: '', title: '', video_raw_url: '', video_edited_url: '', asset_price: '', production_time: '', complexity: '', software: '', style_tags: '' });
  const [brandForm, setBrandForm] = useState({ brand_name: '', task_description: '', budget: '', deadline: '' });
  const [applyForm, setApplyForm] = useState({ editor_name: '', portfolio_link: '', message: '' });

  // --- ЛОГИКА ---
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
      const { data: uApps } = await supabase.from('tender_applications').select('*').eq('user_id', user.id);
      setUserApps(uApps || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const updateAppStatus = async (appId, newStatus) => {
    const { error } = await supabase.from('tender_applications').update({ status: newStatus }).eq('id', appId);
    if (!error) fetchData();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = authMode === 'signup' 
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (error) alert(error.message); else setIsAuthModalOpen(false);
    setLoading(false);
  };

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

  return (
    <div className={`min-h-screen ${isAdminView ? 'bg-zinc-950' : 'bg-black'} text-white font-sans overflow-x-hidden`}>
      
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 md:p-8 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-[100]">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
          if (isAdminView) setIsAdminView(false);
          else { const p = prompt("Admin Code:"); if (p === "7777") setIsAdminView(true); }
        }}>
          <Aperture size={28} className={`${isAdminView ? 'text-red-500' : 'text-blue-600'} animate-spin`} />
          <span className="text-xl font-black uppercase italic tracking-tighter">Aperture</span>
        </div>

        <div className="hidden md:flex gap-4 items-center">
          {user ? (
            <>
              <button onClick={() => setIsDashboardOpen(!isDashboardOpen)} className={`px-6 py-3 rounded-full font-black text-[10px] uppercase transition-all ${isDashboardOpen ? 'bg-blue-600' : 'bg-zinc-900'}`}>
                {isDashboardOpen ? 'Close Studio' : 'My Studio'}
              </button>
              <button onClick={() => supabase.auth.signOut()} className="text-zinc-500 hover:text-red-500"><LogOut size={20}/></button>
            </>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-blue-600 px-8 py-3 rounded-full font-black text-[10px] uppercase">Initialize</button>
          )}
        </div>

        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[90] bg-black pt-24 p-6 space-y-4">
          {user ? (
            <>
              <button onClick={() => { setIsDashboardOpen(!isDashboardOpen); setIsMobileMenuOpen(false); }} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase italic">
                {isDashboardOpen ? 'Back to Showcase' : 'My Studio'}
              </button>
              <button onClick={() => supabase.auth.signOut()} className="w-full bg-zinc-900 py-5 rounded-2xl font-black uppercase italic">Sign Out</button>
            </>
          ) : (
            <button onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase italic">Initialize</button>
          )}
          <button onClick={() => setIsMobileMenuOpen(false)} className="w-full text-zinc-500 uppercase text-[10px] font-black pt-10">Close Menu</button>
        </div>
      )}

      <main className="px-4 md:px-8 pb-20">
        
        {isDashboardOpen ? (
          /* ==========================================
             DASHBOARD
             ========================================== */
          <div className="mt-6 md:mt-10 space-y-8">
             <h2 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter">My <span className="text-blue-600">Studio</span></h2>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Showcase */}
                <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase italic border-l-4 border-blue-600 pl-4">Your Assets</h3>
                  <button onClick={() => setIsTenderOpen(true)} className="w-full py-5 border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 font-black uppercase text-[10px] hover:border-blue-600 hover:text-blue-500 transition-all">+ Upload New</button>
                  <div className="space-y-3">
                    {userWorks.map(w => (
                      <div key={w.id} className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div className="truncate pr-4"><div className="text-[10px] text-blue-500 font-bold uppercase">{w.brand_name}</div><div className="font-black italic text-sm truncate">{w.title}</div></div>
                        <button onClick={async () => { if(confirm("Delete?")) { await supabase.from('tenders').delete().eq('id', w.id); fetchData(); } }} className="text-zinc-700 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Requests */}
                <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase italic border-l-4 border-red-600 pl-4">Incoming</h3>
                  <button onClick={() => setIsBrandModalOpen(true)} className="w-full py-5 border-2 border-dashed border-white/5 rounded-2xl text-zinc-600 font-black uppercase text-[10px] hover:border-red-600 hover:text-red-500 transition-all">+ Post Task</button>
                  <div className="space-y-4">
                    {userTenders.map(t => (
                      <div key={t.id} className="bg-zinc-900/40 p-5 rounded-3xl border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                          <div className="font-black italic text-sm text-red-500 uppercase">{t.brand_name}</div>
                          <button onClick={async () => { if(confirm("Delete?")) { await supabase.from('brand_tenders').delete().eq('id', t.id); fetchData(); } }} className="text-zinc-800 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                        <div className="space-y-2">
                          {applications.filter(a => a.tender_id === t.id).map(app => (
                            <div key={app.id} className="bg-black/50 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                              <div className="truncate pr-2">
                                <div className="text-[10px] font-black uppercase">{app.editor_name}</div>
                              </div>
                              <div className="flex gap-2">
                                {app.status === 'pending' ? (
                                  <>
                                    <button onClick={() => updateAppStatus(app.id, 'accepted')} className="text-green-500"><CheckCircle2 size={16}/></button>
                                    <button onClick={() => updateAppStatus(app.id, 'declined')} className="text-red-500"><XCircle size={16}/></button>
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

                {/* Column 3: Sent */}
                <div className="space-y-6">
                  <h3 className="text-lg font-black uppercase italic border-l-4 border-green-600 pl-4">Outbound</h3>
                  <div className="space-y-3">
                    {userApps.map(a => (
                      <div key={a.id} className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5 relative">
                        <div className={`absolute top-0 right-0 px-2 py-1 text-[8px] font-black uppercase ${a.status === 'accepted' ? 'bg-green-600' : 'bg-blue-600'}`}>{a.status}</div>
                        <p className="text-xs italic text-zinc-300 pr-10">"{a.message}"</p>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        ) : (
          /* ==========================================
             MAIN SHOWCASE
             ========================================== */
          <>
            <div className="mt-8 md:mt-10 mb-10 md:mb-20 space-y-8 md:space-y-0 md:flex md:justify-between md:items-end">
              <h1 className="text-[13vw] md:text-[10vw] leading-[0.85] font-black uppercase italic tracking-tighter">Create.<br />Discover.<br /><span className="text-blue-600">Convince.</span></h1>
              <div className="flex flex-col md:flex-row gap-3">
                <button onClick={() => user ? setIsBrandModalOpen(true) : setIsAuthModalOpen(true)} className="bg-white/5 border border-white/10 px-8 py-5 rounded-full font-black text-xs uppercase hover:bg-white/10 transition-all">I am a Brand</button>
                <button onClick={() => user ? setIsTenderOpen(true) : setIsAuthModalOpen(true)} className="bg-white text-black px-8 py-5 rounded-full font-black text-xs uppercase hover:bg-blue-600 hover:text-white transition-all">Post My Work</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
              {/* Sidebar: Works List */}
              <div className="lg:col-span-3 order-2 lg:order-1">
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-4">Showcase Assets</h3>
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto gap-4 pb-4 lg:h-[650px] custom-scrollbar">
                  {tenders.map((t) => (
                    <div key={t.id} onClick={() => setActive(t)} className={`min-w-[280px] lg:min-w-0 p-6 md:p-8 rounded-[2rem] border transition-all cursor-pointer ${active?.id === t.id ? 'bg-zinc-900 border-blue-600' : 'bg-transparent border-white/5 opacity-40'}`}>
                      <div className="text-[8px] font-black uppercase text-blue-500 mb-2">{t.brand_name}</div>
                      <h4 className="text-xl md:text-2xl font-black uppercase italic leading-none truncate md:whitespace-normal">{t.title}</h4>
                    </div>
                  ))}
                </div>
              </div>

              {/* Player & Details */}
              <div className="lg:col-span-9 order-1 lg:order-2 space-y-6 md:space-y-10">
                <div className="aspect-video bg-zinc-900 rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-white/5 relative">
                  {active && <CompareSlider key={active.id} rawVideo={active.video_raw_url} editedVideo={active.video_edited_url} />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-8 bg-[#0a0a0a] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4"><Clock className="text-blue-500" size={20}/><div className="text-xl font-black italic uppercase leading-none">{active?.production_time || '---'}</div></div>
                      <div className="flex items-center gap-4"><Zap className="text-blue-500" size={20}/><div className="text-xl font-black italic uppercase text-blue-500 leading-none">{active?.complexity || '---'}</div></div>
                    </div>
                    <div className="md:border-l border-white/5 md:pl-10 space-y-6">
                      <div><div className="text-[9px] text-zinc-500 font-black uppercase mb-2">Software</div><span className="bg-zinc-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/5 inline-block">{active?.software || 'AE'}</span></div>
                      <div><div className="text-[9px] text-zinc-500 font-black uppercase mb-2">Style Tags</div><div className="text-blue-500 text-[10px] font-black uppercase truncate">{active?.style_tags || '#VFX'}</div></div>
                    </div>
                  </div>
                  <div className="md:col-span-4 bg-blue-600 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col justify-between gap-6 md:gap-0">
                    <div className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">{active?.asset_price || 'FREE'}</div>
                    <button className="w-full bg-white text-black py-5 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-xs hover:scale-105 transition-all">Buy Assets</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Requests */}
            <section className="mt-20 md:mt-32">
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-10">Brand <span className="text-zinc-800 text-outline">Requests</span></h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brandTenders.map((task) => (
                  <div key={task.id} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 hover:border-blue-600 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-blue-500 font-black uppercase text-[10px]">{task.brand_name}</span>
                      <span className="text-green-500 font-black italic">{task.budget}</span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic mb-8 h-12 line-clamp-2">{task.task_description}</h3>
                    <button onClick={() => { setSelectedTask(task); user ? setIsApplyModalOpen(true) : setIsAuthModalOpen(true); }} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px]">Apply Now</button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* ==========================================
          MODALS (ADAPTIVE)
          ========================================== */ }

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <div className="bg-[#0a0a0a] w-full max-w-md p-8 md:p-10 rounded-[2.5rem] border border-blue-600/30">
            <h2 className="text-2xl md:text-3xl font-black italic uppercase mb-8 text-center">{authMode === 'login' ? 'Authorize' : 'Join'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" placeholder="EMAIL" required onChange={e => setAuthEmail(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 font-bold" />
              <input type="password" placeholder="PASSWORD" required onChange={e => setAuthPassword(e.target.value)} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600 font-bold" />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-lg">{loading ? '...' : 'Connect'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-zinc-600 text-[10px] uppercase font-black block w-full text-center">Switch to {authMode === 'login' ? 'Sign Up' : 'Login'}</button>
            <button onClick={() => setIsAuthModalOpen(false)} className="mt-4 text-[10px] text-zinc-800 uppercase font-black block w-full text-center">Close</button>
          </div>
        </div>
      )}

      {/* UPLOAD WORK */}
      {isTenderOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-[#0a0a0a] w-full max-w-2xl p-6 md:p-10 rounded-[2.5rem] border border-white/5 max-h-[95vh] overflow-y-auto">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center text-blue-600">Upload Engine</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Brand Name" onChange={e => setFormData({ ...formData, brand_name: e.target.value })} className="md:col-span-2 w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <input type="text" placeholder="Project Title" onChange={e => setFormData({ ...formData, title: e.target.value })} className="md:col-span-2 w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <label className="flex flex-col items-center justify-center p-8 bg-[#111] rounded-2xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'raw')} />
                {uploadStatus.raw ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-500" />}
                <span className="text-[9px] uppercase font-black mt-2 text-center">RAW VIDEO</span>
              </label>
              <label className="flex flex-col items-center justify-center p-8 bg-[#111] rounded-2xl border-2 border-dashed border-white/5 cursor-pointer hover:border-blue-600">
                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'edited')} />
                {uploadStatus.edited ? <CheckCircle2 className="text-green-500" /> : <Upload className="text-zinc-500" />}
                <span className="text-[9px] uppercase font-black mt-2 text-center">EDITED VIDEO</span>
              </label>
              <input type="text" placeholder="Price" onChange={e => setFormData({ ...formData, asset_price: e.target.value })} className="md:col-span-2 bg-[#111] p-5 rounded-2xl border border-white/5 text-blue-500 font-bold" />
              <button onClick={handlePublishWork} className="md:col-span-2 w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl shadow-lg">Deploy Work</button>
              <button onClick={() => setIsTenderOpen(false)} className="md:col-span-2 text-zinc-700 text-[10px] uppercase font-black text-center pt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* BRAND REQUEST */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-8 md:p-10 rounded-[2.5rem] border border-white/5">
            <h2 className="text-2xl font-black italic uppercase mb-8 text-center text-red-600">Request Task</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Brand Name" onChange={e => setBrandForm({...brandForm, brand_name: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              <textarea placeholder="Description..." onChange={e => setBrandForm({...brandForm, task_description: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 h-32 outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Budget" onChange={e => setBrandForm({...brandForm, budget: e.target.value})} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
                <input type="text" placeholder="Deadline" onChange={e => setBrandForm({...brandForm, deadline: e.target.value})} className="bg-[#111] p-5 rounded-2xl border border-white/5 outline-none" />
              </div>
              <button onClick={handlePublishBrandTask} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl mt-2">Submit</button>
              <button onClick={() => setIsBrandModalOpen(false)} className="w-full text-zinc-800 text-[10px] font-black uppercase text-center pt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* APPLY MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-[#0a0a0a] w-full max-w-lg p-8 md:p-10 rounded-[2.5rem] border border-blue-600/20">
            <h2 className="text-2xl font-black uppercase italic mb-8 text-center">Submit Proposal</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Your Name" onChange={e => setApplyForm({...applyForm, editor_name: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              <input type="text" placeholder="Portfolio Link" onChange={e => setApplyForm({...applyForm, portfolio_link: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 outline-none focus:border-blue-600" />
              <textarea placeholder="Message" onChange={e => setApplyForm({...applyForm, message: e.target.value})} className="w-full bg-[#111] p-5 rounded-2xl border border-white/5 h-32 outline-none focus:border-blue-600" />
              <button onClick={handleApplySubmit} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase text-xl shadow-lg">Send</button>
              <button onClick={() => setIsApplyModalOpen(false)} className="w-full text-zinc-800 text-[10px] font-black uppercase text-center pt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}