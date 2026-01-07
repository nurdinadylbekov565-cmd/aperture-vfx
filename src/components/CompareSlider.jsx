import React, { useEffect, useRef } from 'react';
import { ReactCompareSlider, ReactCompareSliderHandle } from 'react-compare-slider';

export default function CompareSlider({ rawVideo, editedVideo }) {
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);

  // Принудительный запуск при смене видео
  useEffect(() => {
    if (video1Ref.current) video1Ref.current.load();
    if (video2Ref.current) video2Ref.current.load();
  }, [rawVideo, editedVideo]);

  return (
    <div className="w-full h-full bg-black">
      <ReactCompareSlider
        itemOne={
          <video
            ref={video1Ref}
            src={rawVideo}
            autoPlay
            muted
            loop
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
          />
        }
        itemTwo={
          <video
            ref={video2Ref}
            src={editedVideo}
            autoPlay
            muted
            loop
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
          />
        }
        handle={
          <ReactCompareSliderHandle
            buttonStyle={{
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.9)',
              border: 0,
              color: '#333',
              width: '40px',
              height: '40px'
            }}
            linesStyle={{ opacity: 0.5, width: 2 }}
          />
        }
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}