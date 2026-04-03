import React from 'react';
import './AuraGlow.css';
import useSwarmStore from '../../../store/useSwarmStore';

const VALID_EMOTIONS = ['neutral', 'thinking', 'focused', 'confused', 'happy'];

const AuraGlow = ({ emotion = 'neutral' }) => {
  const colorTheme = useSwarmStore((s) => s.characterState.colorTheme ?? 'default');
  const safeEmotion = VALID_EMOTIONS.includes(emotion) ? emotion : 'neutral';

  return (
    <div
      data-color-theme={colorTheme}
      className="w-full h-full flex items-center justify-center"
    >
      <div className={`aura-container emotion-move-${safeEmotion}`}>
        <div className={`aura-color-layer emotion-color-${safeEmotion}`} />
      </div>
    </div>
  );
};

export default React.memo(AuraGlow);
