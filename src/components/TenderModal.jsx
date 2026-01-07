import { useState } from 'react';
import { supabase } from '../supabaseClient';
import CompareSlider from './CompareSlider';

export default function TenderModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);

  // Начальное состояние с твоими тестовыми видео
  const [formData, setFormData] = useState({
    title: '',
    budget: '',
    deadline: '',
    tags: '',
    brand: '',
    productionTime: '',
    videoRawUrl: 'https://pggvfqmuepnuqofpsvto.supabase.co/storage/v1/object/public/videos/raw_sample.mp4',
    videoEditedUrl: 'https://pggvfqmuepnuqofpsvto.supabase.co/storage/v1/object/public/videos/edited_sample.mp4'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tenders')
        .insert([
          {
            title: formData.title,
            budget: formData.budget,
            deadline: formData.deadline,
            brand: formData.brand,
            production_time: formData.productionTime,
            video_raw_url: formData.videoRawUrl,
            video_edited_url: formData.videoEditedUrl,
            tags: formData.tags,
            status: 'open'
          }
        ]);

      if (error) throw error;

      // --- ВОТ ТУТ МАГИЯ ОЧИСТКИ ---

      // 1. Очищаем поля формы в памяти React
      setFormData({
        title: '',
        budget: '',
        deadline: '',
        tags: '',
        brand: '',
        productionTime: '',
        videoRawUrl: 'https://pggvfqmuepnuqofpsvto.supabase.co/storage/v1/object/public/videos/raw_sample.mp4',
        videoEditedUrl: 'https://pggvfqmuepnuqofpsvto.supabase.co/storage/v1/object/public/videos/edited_sample.mp4'
      });

      // 2. Закрываем модальное окно
      onClose();

      // 3. Сообщаем пользователю (можно заменить на красивый тост/нотификацию)
      alert('Project Passport Deployed Successfully!');

    } catch (error) {
      console.error('Error:', error.message);
      alert('Failed to deploy: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-6xl flex flex-col md:flex-row overflow-hidden shadow-2xl h-[85vh]">

        {/* ЛЕВАЯ СТОРОНА: Плеер (обновляется на лету) */}
        <div className="flex-1 bg-black relative border-b md:border-b-0 md:border-r border-white/10">
          <CompareSlider
            rawVideo={formData.videoRawUrl}
            editedVideo={formData.videoEditedUrl}
          />
        </div>

        {/* ПРАВАЯ СТОРОНА: Форма */}
        <form onSubmit={handleSubmit} className="w-full md:w-[400px] p-8 bg-[#0D0D0D] flex flex-col overflow-y-auto">
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white mb-1 uppercase italic text-blue-500">Project Passport</h2>
              <p className="text-white/40 text-[10px] uppercase tracking-widest">VFX Verification System</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  className="bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  placeholder="Brand (e.g. Nike)"
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
                <input
                  className="bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  placeholder="Budget ($)"
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>

              <input
                className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                placeholder="Project Title"
                required
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-blue-400 font-bold ml-1">Raw Footage URL</label>
                <input
                  className="w-full bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl text-white text-sm outline-none focus:border-blue-500"
                  value={formData.videoRawUrl}
                  onChange={(e) => setFormData({ ...formData, videoRawUrl: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-green-400 font-bold ml-1">Edited Video URL</label>
                <input
                  className="w-full bg-green-500/5 border border-green-500/20 p-3 rounded-xl text-white text-sm outline-none focus:border-green-500"
                  value={formData.videoEditedUrl}
                  onChange={(e) => setFormData({ ...formData, videoEditedUrl: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white font-black uppercase rounded-2xl hover:bg-blue-500 shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? 'Uploading...' : 'Deploy Tender'}
            </button>
            <button type="button" onClick={onClose} className="w-full text-white/20 text-xs uppercase hover:text-white transition-colors">
              Discard Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}