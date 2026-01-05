import React, { useState, useEffect } from 'react';
import { 
  Aperture, Briefcase, Layers, ShoppingCart, UserPlus, 
  Trash2, ExternalLink, MessageSquare, Clock, Zap, Cpu, Send 
} from 'lucide-react';
import { supabase } from './supabaseClient';
import CompareSlider from './components/CompareSlider';

export default function App() {
  // --- СОСТОЯНИЯ ---
  const [selectedId, setSelectedId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для ЧАТА
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Состояния для ФОРМ
  const [form, setForm] = useState({ brand: '', title: '', budget: '', software: '', imgBefore: '', imgAfter: '' });
  const [applyForm, setApplyForm] = useState({ name: '', portfolio: '', message: '' });

  // --- ЭФФЕКТЫ ---
  useEffect(() => { fetchTenders(); }, []);

  // Эффект для загрузки сообщений и Realtime подписки
  useEffect(() => {
    if (!selectedId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('tender_id', selectedId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };

    fetchMessages();

    // Подписка на новые сообщения в реальном времени
    const channel = supabase
      .channel(`chat-${selectedId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `tender_id=eq.${selectedId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  // --- ФУНКЦИИ ---
  async function fetchTenders() {
    setLoading(true);
    const { data, error } = await supabase.from('tenders').select('*').order('created_at', { ascending: false });
    if (!error) {
      setTenders(data || []);
      if (data?.length > 0) setSelectedId(data[0].id);
    }
    setLoading(false);
  }

  const handlePublish = async () => {
    if (!form.brand || !form.title) return alert("Fill in Brand and Title!");
    const { data, error } = await supabase.from('tenders').insert([{ 
      brand_name: form.brand, 
      title: form.title, 
      budget: form.budget || 'TBD',
      software: form.software ? form.software.split(',').map(s => s.trim()) : ['VFX'],
      image_before: form.imgBefore, 
      image_after: form.imgAfter
    }]).select();
    if (!error) {
      setTenders([data[0], ...tenders]);
      setIsModalOpen(false);
      setForm({ brand: '', title: '', budget: '', software: '', imgBefore: '', imgAfter: '' });
      setSelectedId(data[0].id);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedId) return;
    const { error } = await supabase.from('messages').insert([
      { tender_id: selectedId, text: newMessage, sender_role: 'client' }
    ]);
    if (!error) setNewMessage('');
  };

  const handleApply = async () => {
    if (!applyForm.name || !applyForm.portfolio) return alert("Name and Portfolio required!");
    const { error } = await supabase.from('applications').insert([{
      tender_id: selectedId, artist_name: applyForm.name, portfolio_url: applyForm.portfolio, message: applyForm.message
    }]);
    if (!error) {
      alert("Application sent!");
      setIsApplyModalOpen(false);
      setApplyForm({ name: '', portfolio: '', message: '' });
    }
  };

  const active = tenders.find(t => t.id === selectedId);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-blue-500 font-black uppercase tracking-[0.4em] animate-pulse text-[10px]">Initializing Engine</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full z-40 bg-black/60 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.location.reload()}>
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-transform group-hover:rotate-12">
            <Aperture className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic text-white">Aperture</span>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-white text-black hover:bg-blue-500 hover:text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-none cursor-pointer">Post Tender</button>
      </nav>

      <main className="max-w-[1400px] mx-auto pt-36 pb-20 px-8">
        <header className="mb-20 text-left">
          <h2 className="text-6xl md:text-8xl font-[1000] tracking-[-0.06em] uppercase leading-[0.8] text-white">
            Create. <br />Discover. <br /><span className="text-blue-600">Convince.</span>
          </h2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 text-left">
          {/* TENDERS LIST */}
          <div className="lg:col-span-4 space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 border-b border-zinc-800 pb-5">Live Tenders ({tenders.length})</h3>
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-3 custom-scrollbar">
              {tenders.map((t) => (
                <div key={t.id} onClick={() => setSelectedId(t.id)} className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer ${selectedId === t.id ? 'bg-zinc-900 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.1)]' : 'bg-zinc-900/30 border-zinc-800'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-500/10 px-4 py-1.5 rounded-full">{t.brand_name}</span>
                    <span className="text-green-500 font-mono text-sm font-bold">{t.budget}</span>
                  </div>
                  <h4 className="font-black text-2xl uppercase text-white leading-none">{t.title}</h4>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVE CONTENT */}
          <div className="lg:col-span-8">
            {active ? (
              <div className="space-y-12">
                {/* VIDEO PLAYER AREA */}
                <div className="space-y-6">
                  <div className="rounded-[3.5rem] overflow-hidden border border-white/5 bg-zinc-900 p-3 shadow-2xl">
                    <CompareSlider before={active?.image_before} after={active?.image_after} />
                  </div>
                  
                  {/* REALTIME CHAT MODULE */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 flex items-center gap-2">
                        <MessageSquare size={14} className="text-blue-500" /> Project Timeline & Feedback
                      </h3>
                      <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest animate-pulse">● Realtime Active</span>
                    </div>
                    
                    <div className="h-[250px] overflow-y-auto space-y-4 mb-6 pr-4 custom-scrollbar">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 items-start ${msg.sender_role === 'client' ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black italic ${msg.sender_role === 'client' ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                            {msg.sender_role === 'client' ? 'CL' : 'ED'}
                          </div>
                          <div className={`p-4 rounded-2xl border border-white/5 max-w-md ${msg.sender_role === 'client' ? 'bg-zinc-800/50 rounded-tl-none' : 'bg-blue-900/20 rounded-tr-none'}`}>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {msg.timecode && <span className="text-blue-500 font-mono font-bold mr-2">{msg.timecode}</span>}
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <div className="text-center py-10 text-zinc-700 uppercase text-[10px] font-black tracking-widest">No messages yet. Start collaboration.</div>
                      )}
                    </div>

                    <div className="relative">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Add a comment or feedback..." 
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-blue-500 transition-all" 
                      />
                      <button onClick={sendMessage} className="absolute right-4 top-3 p-1.5 text-zinc-500 hover:text-blue-500 transition-colors bg-transparent border-none cursor-pointer">
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* PROJECT PASSPORT STATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900/80 border border-white/5 p-7 rounded-[2.5rem]">
                        <p className="text-[9px] font-black text-zinc-500 uppercase mb-3 flex items-center gap-2"><Clock size={12}/> Production</p>
                        <p className="text-3xl font-black italic text-white">14 <span className="text-xs text-zinc-600 not-italic uppercase">Hours</span></p>
                      </div>
                      <div className="bg-zinc-900/80 border border-white/5 p-7 rounded-[2.5rem]">
                        <p className="text-[9px] font-black text-blue-500 uppercase mb-3 flex items-center gap-2"><Zap size={12}/> Complexity</p>
                        <p className="text-3xl font-black italic text-blue-500 uppercase tracking-tighter">Elite</p>
                      </div>
                    </div>
                    
                    {/* Software & Tags */}
                    <div className="bg-zinc-900/80 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase mb-4 flex items-center gap-2"><Cpu size={12} className="text-blue-500" /> Software Stack</p>
                        <div className="flex gap-2">
                          {(active.software || ['Pr', 'Ae', 'Ps']).map(s => (
                            <span key={s} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase mb-4 flex items-center gap-2"><Layers size={12} className="text-blue-500" /> Style Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {['#VFX', '#3D-TRACK', '#CYBERPUNK', '#DYNAMIC'].map(t => (
                            <span key={t} className="text-[9px] text-zinc-500 font-bold px-2 py-1 bg-white/5 rounded-md">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTION CARD */}
                  <div className="bg-blue-600 p-10 rounded-[3.5rem] flex flex-col justify-between shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h4 className="text-4xl font-black text-white uppercase mb-8 leading-[0.9]">Ready to <br />collaborate?</h4>
                    </div>
                    <div className="space-y-4 relative z-10">
                      <button className="w-full bg-white text-black font-[1000] py-6 rounded-2xl flex items-center justify-center gap-3 border-none cursor-pointer text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-transform">
                        <ShoppingCart size={18} /> Buy Assets
                      </button>
                      <button onClick={() => setIsApplyModalOpen(true)} className="w-full bg-black/20 text-white font-[1000] py-6 rounded-2xl flex items-center justify-center gap-3 border-none cursor-pointer text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm border border-white/10 hover:bg-black/40 transition-all">
                        <UserPlus size={18} /> Send Proposal
                      </button>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[500px] border-2 border-dashed border-zinc-900 rounded-[4rem] flex flex-col items-center justify-center gap-4 text-zinc-800">
                <Briefcase size={40} />
                <span className="uppercase tracking-[0.4em] text-[10px] font-black">Select an active tender to preview engine</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODALS (Post Tender & Apply) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-50 flex items-center justify-center p-6 text-left">
          <div className="bg-[#0c0c0c] border border-white/5 p-12 rounded-[4rem] w-full max-w-2xl shadow-2xl">
            <h2 className="text-4xl font-black uppercase text-white mb-10 italic">Deploy <span className="text-blue-600">Tender</span></h2>
            <div className="grid grid-cols-2 gap-6">
              <input type="text" placeholder="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white outline-none" />
              <input type="text" placeholder="Budget" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className="w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white outline-none" />
              <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="col-span-2 w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white outline-none" />
              <input type="text" placeholder="Before Image URL" value={form.imgBefore} onChange={e => setForm({...form, imgBefore: e.target.value})} className="col-span-2 w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white font-mono text-xs outline-none" />
              <input type="text" placeholder="After Image URL" value={form.imgAfter} onChange={e => setForm({...form, imgAfter: e.target.value})} className="col-span-2 w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white font-mono text-xs outline-none" />
            </div>
            <button onClick={handlePublish} className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl mt-10 border-none cursor-pointer uppercase tracking-[0.3em]">Publish Engine</button>
            <button onClick={() => setIsModalOpen(false)} className="w-full mt-6 text-zinc-600 font-bold uppercase tracking-widest bg-transparent border-none cursor-pointer text-[10px]">Cancel Operation</button>
          </div>
        </div>
      )}

      {isApplyModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-50 flex items-center justify-center p-6 text-left">
          <div className="bg-[#0c0c0c] border border-white/5 p-12 rounded-[4rem] w-full max-w-xl shadow-2xl">
            <h2 className="text-3xl font-black uppercase text-white mb-10 italic">Send <span className="text-blue-600">Proposal</span></h2>
            <div className="space-y-4">
              <input type="text" placeholder="Name" value={applyForm.name} onChange={e => setApplyForm({...applyForm, name: e.target.value})} className="w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white outline-none" />
              <input type="text" placeholder="Portfolio Link" value={applyForm.portfolio} onChange={e => setApplyForm({...applyForm, portfolio: e.target.value})} className="w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white outline-none" />
              <textarea placeholder="Message" value={applyForm.message} onChange={e => setApplyForm({...applyForm, message: e.target.value})} className="w-full bg-zinc-900 border-none rounded-2xl px-6 py-5 text-white outline-none h-32 resize-none" />
            </div>
            <button onClick={handleApply} className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl mt-10 border-none cursor-pointer uppercase tracking-widest">Submit Proposal</button>
            <button onClick={() => setIsApplyModalOpen(false)} className="w-full mt-4 text-zinc-600 font-bold uppercase bg-transparent border-none cursor-pointer text-[10px]">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}