
import { useRef, useEffect } from 'react';

export function useSoundAlert() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Medical "beeps" sound (short, urgent)
    // Using a base64 placeholder or a standard URL if available. 
    // For hackathon, reliable accessible URL is best.
    // Using a simple beep generated or a reliable CDN link. 
    // Since I cannot browse to find a URL, I will use a reliable high-pitch beep data URI.
    
    // Simple double-beep DATA URI (short sine wave)
    const beepUrl = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Truncated for brevity, will use a real simple one or just a function
    
    // Better approach: Web Audio API Oscillator for no-dependency sound
    // But sticking to the prompt "Browser Audio API only"
  }, []);

  const playStatSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1); // A4
      
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  return { playStatSound };
}
