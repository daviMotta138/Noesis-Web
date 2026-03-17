import { useState, useEffect } from 'react';
import { Settings, Copy, X } from 'lucide-react';

interface AvatarDebuggerProps {
    initialTop?: number;
    initialBottom?: number;
    initialLeft?: number;
    initialRight?: number;
    initialScale?: number;
    initialWidth?: number;
    onUpdate: (styles: any) => void;
}

export function AvatarDebugger({
    initialTop = 0,
    initialBottom = 0,
    initialLeft = 0,
    initialRight = 0,
    initialScale = 1,
    initialWidth = 100,
    onUpdate
}: AvatarDebuggerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [top, setTop] = useState(initialTop);
    const [bottom, setBottom] = useState(initialBottom);
    const [left, setLeft] = useState(initialLeft);
    const [right, setRight] = useState(initialRight);
    const [scale, setScale] = useState(initialScale);
    const [width, setWidth] = useState(initialWidth);

    useEffect(() => {
        onUpdate({
            bottom,
            top,
            left,
            right,
            transform: `scale(${scale})`,
            width
        });
    }, [top, bottom, left, right, scale, width]);

    const copyLog = () => {
        const log = `CONFIGURAÇÃO DE AVATAR:
bottom: ${bottom}, top: ${top}, left: ${left}, right: ${right},
width: ${width}, transform: 'scale(${scale})'`;
        navigator.clipboard.writeText(log);
        alert('Copiado para o clipboard!');
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-[9999] w-10 h-10 rounded-full bg-gold text-void flex items-center justify-center shadow-lg"
            >
                <Settings size={20} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-4 z-[9999] w-64 bg-void/95 border border-gold/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-gold uppercase tracking-widest">Ajuste de Avatar</h4>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>

            <div className="space-y-3">
                <Control label="Top" value={top} onChange={setTop} min={-200} max={200} />
                <Control label="Bottom" value={bottom} onChange={setBottom} min={-200} max={200} />
                <Control label="Left" value={left} onChange={setLeft} min={-200} max={200} />
                <Control label="Right" value={right} onChange={setRight} min={-200} max={200} />
                <Control label="Width" value={width} onChange={setWidth} min={50} max={300} />
                <Control label="Scale" value={scale} onChange={setScale} min={0.5} max={2} step={0.05} />
            </div>

            <button 
                onClick={copyLog}
                className="w-full mt-4 py-2 bg-gold/10 text-gold text-[10px] font-bold rounded-lg border border-gold/20 flex items-center justify-center gap-2"
            >
                <Copy size={12} /> COPIAR CONFIGURAÇÃO
            </button>
        </div>
    );
}

function Control({ label, value, onChange, min, max, step = 1 }: any) {
    return (
        <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>{label}</span>
                <span className="font-mono text-gold">{value}</span>
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step={step} 
                value={value} 
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full accent-gold h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );
}
