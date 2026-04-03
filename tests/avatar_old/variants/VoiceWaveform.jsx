import React from 'react';
import './VoiceWaveform.css';
import useSwarmStore from '../../../store/useSwarmStore';

const VALID_EMOTIONS = ['neutral', 'thinking', 'focused', 'confused', 'happy'];
const BAR_COUNT = 6;

const VoiceWaveform = ({ emotion = 'neutral' }) => {
  const colorTheme = useSwarmStore((s) => s.characterState.colorTheme ?? 'default');
  const safeEmotion = VALID_EMOTIONS.includes(emotion) ? emotion : 'neutral';

  return (
    <div
      data-color-theme={colorTheme}
      className="w-full h-full flex items-center justify-center"
    >
      <div className={`waveform-bars waveform-${safeEmotion}`}>
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <span key={i} className={`bar bar-${i}`} />
        ))}
      </div>
    </div>
  );
};

export default React.memo(VoiceWaveform);
