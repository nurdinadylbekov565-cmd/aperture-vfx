import React from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

export default function CompareSlider({ before, after }) {
  // Эти ссылки сработают, если в базе данных пусто (NULL)
  const defaultBefore = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070";
  const defaultAfter = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2070";

  return (
    <div className="w-full h-full min-h-[400px] relative group">
      <ReactCompareSlider
        itemOne={<ReactCompareSliderImage src={before || defaultBefore} alt="Raw Footage" />}
        itemTwo={<ReactCompareSliderImage src={after || defaultAfter} alt="Final VFX" />}
        className="h-full rounded-2xl overflow-hidden shadow-inner bg-zinc-800"
      />
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-white/10 pointer-events-none z-10">
        Raw Footage
      </div>
      <div className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-blue-400/20 pointer-events-none z-10 shadow-lg">
        Final VFX
      </div>
    </div>
  );
}