import type { VoiceAuthStatus } from './VoiceAuthContext';
import { Mic, Check, X, MicOff } from 'lucide-react';

const STATUS_COLOR: Record<VoiceAuthStatus, string> = {
  initializing: '#F5A623',
  needsSetup: '#F5A623',
  locked: '#F5A623',
  listening: '#FFC670',
  matched: '#34D399',
  denied: '#EF6461',
  micUnavailable: '#71828C',
};

export function VoiceOrb({ status, soundLevel }: { status: VoiceAuthStatus; soundLevel: number }) {
  const color = STATUS_COLOR[status];
  const pulse = status === 'listening';
  const scale = 1 + (pulse ? soundLevel * 0.25 : 0);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      {pulse && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ background: `${color}33`, animationDuration: '1.6s' }}
        />
      )}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-40 transition-all duration-150"
        style={{ background: color, transform: `scale(${scale})` }}
      />
      <div
        className="relative rounded-full flex items-center justify-center transition-transform duration-150"
        style={{
          width: 96,
          height: 96,
          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          transform: `scale(${scale})`,
          boxShadow: `0 0 0 6px ${color}22`,
        }}
      >
        {status === 'matched' ? (
          <Check color="#0B1826" size={36} strokeWidth={3} />
        ) : status === 'denied' ? (
          <X color="#0B1826" size={36} strokeWidth={3} />
        ) : status === 'micUnavailable' ? (
          <MicOff color="#0B1826" size={32} />
        ) : (
          <Mic color="#0B1826" size={32} />
        )}
      </div>
    </div>
  );
}
