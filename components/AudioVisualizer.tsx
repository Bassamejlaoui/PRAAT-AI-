
import React, { useEffect, useRef } from 'react';
import { AudioProcessingRefs } from '../types';

interface AudioVisualizerProps {
  isActive: boolean;
  isModelSpeaking: boolean;
  isUserSpeaking: boolean;
  audioRefs: React.MutableRefObject<AudioProcessingRefs>;
}

interface Particle {
  angle: number;
  baseRadius: number;
  speed: number;
  opacity: number;
  sizeOffset: number;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, isModelSpeaking, isUserSpeaking, audioRefs }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // Smooth transition states
  const colorRef = useRef({ r: 255, g: 255, b: 255 });
  const bassRef = useRef(0);
  const midRef = useRef(0);
  const highRef = useRef(0);
  const phaseRef = useRef(0);

  // Initialize particles once
  useEffect(() => {
    const count = 40;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        angle: (Math.PI * 2 * i) / count,
        baseRadius: 60 + Math.random() * 80, // Distance from center
        speed: 0.002 + Math.random() * 0.004 * (Math.random() > 0.5 ? 1 : -1),
        opacity: 0.2 + Math.random() * 0.5,
        sizeOffset: Math.random() * 2
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Increase resolution for smoother waves
    const bufferLength = 128; 
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      // 1. Target Color Logic
      let tr = 255, tg = 255, tb = 255;
      let isIdle = false;

      if (isModelSpeaking) {
        tr = 178; tg = 217; tb = 0; // #B2D900 (Lime)
      } else if (isUserSpeaking) {
        tr = 10; tg = 132; tb = 255; // #0A84FF (Blue)
      } else {
        isIdle = true;
      }

      // Smooth color transition
      const cs = 0.08;
      colorRef.current.r += (tr - colorRef.current.r) * cs;
      colorRef.current.g += (tg - colorRef.current.g) * cs;
      colorRef.current.b += (tb - colorRef.current.b) * cs;

      const r = Math.round(colorRef.current.r);
      const g = Math.round(colorRef.current.g);
      const b = Math.round(colorRef.current.b);
      const currentColor = `rgb(${r},${g},${b})`;
      const currentColorAlpha = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;

      // 2. Audio Data Analysis
      const analyzer = isModelSpeaking 
        ? audioRefs.current.outputAnalyzer 
        : (isUserSpeaking ? audioRefs.current.inputAnalyzer : null);

      let rawBass = 0, rawMid = 0, rawHigh = 0;

      if (analyzer) {
        analyzer.getByteFrequencyData(dataArray);
        
        // Analyze bands (0-128 range mapped from FFT)
        // Bass: Lower frequencies
        for(let i=0; i<10; i++) rawBass += dataArray[i];
        rawBass = rawBass / (10 * 255);

        // Mid: Voice fundamentals
        for(let i=10; i<60; i++) rawMid += dataArray[i];
        rawMid = rawMid / (50 * 255);

        // High: Air/Sibilance
        for(let i=60; i<120; i++) rawHigh += dataArray[i];
        rawHigh = rawHigh / (60 * 255);
      } else {
        // Simulated breathing for idle state
        const time = Date.now() / 2000;
        rawBass = 0.1 + Math.sin(time) * 0.05;
        rawMid = 0.05 + Math.cos(time * 1.3) * 0.02;
        rawHigh = 0;
      }

      // Smooth audio values (decay)
      const vs = 0.15;
      bassRef.current += (rawBass - bassRef.current) * vs;
      midRef.current += (rawMid - midRef.current) * vs;
      highRef.current += (rawHigh - highRef.current) * vs;
      
      const vol = (bassRef.current + midRef.current * 1.5 + highRef.current * 0.5) / 2.5;

      // 3. Clear & Setup
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      
      ctx.clearRect(0, 0, w, h);
      
      // Use additive blending for "light" feel
      ctx.globalCompositeOperation = 'screen';

      phaseRef.current += 0.005 + (vol * 0.02);

      // --- LAYER 1: PARTICLES ---
      // Particles orbit and expand with bass
      particlesRef.current.forEach((p) => {
        p.angle += p.speed * (isIdle ? 1 : 2);
        
        // Push particles out based on bass energy
        const expansion = bassRef.current * 80; 
        const radius = p.baseRadius + expansion + (Math.sin(phaseRef.current * 2 + p.angle) * 10);
        
        const px = cx + Math.cos(p.angle) * radius;
        const py = cy + Math.sin(p.angle) * radius;
        
        const size = (isIdle ? 1.5 : 2) + p.sizeOffset + (midRef.current * 3);
        
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = currentColorAlpha(p.opacity * (0.3 + vol));
        ctx.fill();
      });

      // --- LAYER 2: DYNAMIC RINGS ---
      const drawDistortedRing = (baseR: number, intensity: number, harmonic: number, width: number, alpha: number, speedMult: number) => {
        ctx.beginPath();
        const segments = 120;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          
          // Organic movement using sin waves + phase
          const wave = Math.sin(angle * harmonic + (phaseRef.current * speedMult)) * (intensity * 20);
          
          // Audio reactivity mapping
          let audioMod = 0;
          if (analyzer) {
             const dataIdx = Math.floor((i / segments) * (bufferLength / 2));
             // Mirror audio data around the circle
             const val = dataArray[dataIdx % dataArray.length] / 255.0;
             audioMod = val * (intensity * 40);
          }
          
          const r = baseR + wave + audioMod;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = currentColorAlpha(alpha);
        ctx.lineWidth = width;
        ctx.stroke();
      };

      // Outer 'Bass' Ring
      drawDistortedRing(90, bassRef.current, 3, 1.5, 0.4, 1.0);
      
      // Middle 'Mid' Ring - Active only when sound exists
      if (!isIdle || bassRef.current > 0.15) {
         drawDistortedRing(70, midRef.current, 5, 2, 0.7, -1.5);
      }
      
      // Inner 'High' Ring - Fast nervous energy
      if (highRef.current > 0.05) {
         drawDistortedRing(50, highRef.current, 9, 1, 0.5, 3.0);
      }

      // --- LAYER 3: CORE ENERGY ---
      // The central orb that pulses with overall energy
      const coreBase = 35;
      const corePulse = coreBase + (bassRef.current * 40);
      
      // Outer glow
      const grad = ctx.createRadialGradient(cx, cy, corePulse * 0.5, cx, cy, corePulse * 2.5);
      grad.addColorStop(0, currentColorAlpha(0.8));
      grad.addColorStop(0.4, currentColorAlpha(0.2));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, corePulse * 3, 0, Math.PI * 2);
      ctx.fill();

      // Solid inner core
      ctx.fillStyle = currentColorAlpha(0.95);
      ctx.beginPath();
      // Deform inner core slightly
      const deform = Math.sin(phaseRef.current * 5) * 2;
      ctx.arc(cx, cy, (corePulse * 0.6) + deform, 0, Math.PI * 2);
      ctx.fill();

      // High frequency central sparks
      if (highRef.current > 0.15) {
         ctx.strokeStyle = '#fff';
         ctx.lineWidth = 1.5;
         ctx.beginPath();
         const numSparks = 6;
         for(let i=0; i<numSparks; i++) {
            const a = Math.random() * Math.PI * 2;
            const len = corePulse * (0.8 + Math.random() * 0.5);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
         }
         ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isActive, isModelSpeaking, isUserSpeaking, audioRefs]);

  return (
    <div className="w-full h-full flex items-center justify-center pointer-events-none fade-in">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full max-w-[500px] max-h-[500px]"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default AudioVisualizer;