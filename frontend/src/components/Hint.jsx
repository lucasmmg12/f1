import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Inline hint tooltip component.
 * Usage: <Hint text="Explanation text here" />
 */
export default function Hint({ text, position = 'top' }) {
    const [show, setShow] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <span className="relative inline-flex items-center"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}>
            <HelpCircle size={12} className="text-text-muted/50 hover:text-[#1D9BF0] cursor-help transition-colors" />
            {show && (
                <div className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}>
                    <div className="bg-[#1A1A2E] text-white text-[10px] leading-relaxed px-3 py-2 rounded-lg shadow-lg max-w-[220px] whitespace-normal font-normal"
                        style={{ animation: 'fadeIn 150ms ease-out' }}>
                        {text}
                    </div>
                </div>
            )}
        </span>
    );
}
