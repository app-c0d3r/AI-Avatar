import React from 'react';
import './Minimalist.css';
import useSwarmStore from '../../../store/useSwarmStore';

const VALID_EMOTIONS = ['neutral', 'thinking', 'focused', 'confused', 'happy'];

const Minimalist = ({ emotion = 'neutral' }) => {
  const colorTheme      = useSwarmStore((s) => s.characterState.colorTheme      ?? 'default');
  const minimalistStyle = useSwarmStore((s) => s.characterState.minimalistStyle ?? 'comic');
  const safeEmotion     = VALID_EMOTIONS.includes(emotion) ? emotion : 'neutral';

  return (
    <div
      data-color-theme={colorTheme}
      data-style={minimalistStyle}
      className="w-full h-full flex items-center justify-center"
    >
      <div className={`minimalist-shape emotion-shape-${safeEmotion}`} />
    </div>
  );
};

export default React.memo(Minimalist);
