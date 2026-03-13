import { useRef, useEffect, useCallback } from 'react';

/**
 * InteractiveTrackMap - Canvas-based track map synced with telemetry hover.
 * Shows a glowing dot moving along the circuit as user hovers the telemetry chart.
 */
export default function InteractiveTrackMap({ trackCoords, hoverDistance, width = 400, height = 350 }) {
    const canvasRef = useRef(null);
    const prevHoverRef = useRef(null);

    // Turbo-like colormap
    const speedToColor = useCallback((t) => {
        t = Math.max(0, Math.min(1, t));
        let r, g, b;
        if (t < 0.25) {
            r = 60 + t * 4 * 70; g = 10 + t * 4 * 180; b = 150 + t * 4 * 105;
        } else if (t < 0.5) {
            r = 130 + (t - 0.25) * 4 * 125; g = 190 + (t - 0.25) * 4 * 65; b = 255 - (t - 0.25) * 4 * 255;
        } else if (t < 0.75) {
            r = 255; g = 255 - (t - 0.5) * 4 * 100; b = 0;
        } else {
            r = 255 - (t - 0.75) * 4 * 100; g = 155 - (t - 0.75) * 4 * 155; b = 0;
        }
        return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !trackCoords) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const { x, y, distance, speed } = trackCoords;
        if (!x || x.length < 2) return;

        ctx.clearRect(0, 0, width, height);

        // Bounds with padding
        const pad = 35;
        const minX = Math.min(...x), maxX = Math.max(...x);
        const minY = Math.min(...y), maxY = Math.max(...y);
        const rX = maxX - minX || 1, rY = maxY - minY || 1;
        const sc = Math.min((width - 2 * pad - 30) / rX, (height - 2 * pad) / rY);
        const oX = (width - 30 - rX * sc) / 2, oY = (height - rY * sc) / 2;

        const cx = (px) => (px - minX) * sc + oX;
        const cy = (py) => height - ((py - minY) * sc + oY);

        const minSpd = Math.min(...speed), maxSpd = Math.max(...speed);
        const spdRange = maxSpd - minSpd || 1;

        // Track shadow
        ctx.beginPath();
        ctx.moveTo(cx(x[0]), cy(y[0]));
        for (let i = 1; i < x.length; i++) ctx.lineTo(cx(x[i]), cy(y[i]));
        ctx.lineWidth = 9;
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Speed-colored segments
        for (let i = 0; i < x.length - 1; i++) {
            const t = (speed[i] - minSpd) / spdRange;
            ctx.beginPath();
            ctx.moveTo(cx(x[i]), cy(y[i]));
            ctx.lineTo(cx(x[i + 1]), cy(y[i + 1]));
            ctx.lineWidth = 4.5;
            ctx.strokeStyle = speedToColor(t);
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Start/Finish marker
        ctx.beginPath();
        ctx.arc(cx(x[0]), cy(y[0]), 5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // HOVER DOT
        if (hoverDistance !== null && hoverDistance !== undefined && !isNaN(hoverDistance)) {
            let closestIdx = 0, minDiff = Infinity;
            for (let i = 0; i < distance.length; i++) {
                const diff = Math.abs(distance[i] - hoverDistance);
                if (diff < minDiff) { minDiff = diff; closestIdx = i; }
            }

            const dotX = cx(x[closestIdx]);
            const dotY = cy(y[closestIdx]);
            const dotSpd = speed[closestIdx];

            // Trail
            const trailLen = 20;
            const startT = Math.max(0, closestIdx - trailLen);
            for (let i = startT; i < closestIdx; i++) {
                const alpha = ((i - startT) / trailLen) * 0.6;
                const r = 2 + ((i - startT) / trailLen) * 2;
                ctx.beginPath();
                ctx.arc(cx(x[i]), cy(y[i]), r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(229, 57, 53, ${alpha})`;
                ctx.fill();
            }

            // Outer glow
            const grd = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 28);
            grd.addColorStop(0, 'rgba(229, 57, 53, 0.7)');
            grd.addColorStop(0.3, 'rgba(229, 57, 53, 0.3)');
            grd.addColorStop(0.6, 'rgba(229, 57, 53, 0.1)');
            grd.addColorStop(1, 'rgba(229, 57, 53, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 28, 0, Math.PI * 2);
            ctx.fill();

            // Main dot
            ctx.beginPath();
            ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#E53935';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            // Speed label (no roundRect — compatible approach)
            const label = `${Math.round(dotSpd)} km/h`;
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            const lw = ctx.measureText(label).width;
            let lx = dotX + 18, ly = dotY - 8;
            // Keep label in bounds
            if (lx + lw + 10 > width) lx = dotX - lw - 22;
            if (ly - 14 < 5) ly = dotY + 20;

            // Background pill (manual rounded rect)
            const bx = lx - 5, by = ly - 13, bw = lw + 10, bh = 18, br = 4;
            ctx.beginPath();
            ctx.moveTo(bx + br, by);
            ctx.lineTo(bx + bw - br, by);
            ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
            ctx.lineTo(bx + bw, by + bh - br);
            ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
            ctx.lineTo(bx + br, by + bh);
            ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
            ctx.lineTo(bx, by + br);
            ctx.arcTo(bx, by, bx + br, by, br);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,0,0,0.88)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(229,57,53,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#E53935';
            ctx.fillText(label, lx, ly);

            // Distance label
            const dLabel = `${Math.round(hoverDistance)}m`;
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText(dLabel, lx, ly + 14);
        }

        // Colorbar
        const cbX = width - 18, cbY = 25, cbH = height - 55;
        for (let i = 0; i < cbH; i++) {
            ctx.fillStyle = speedToColor(1 - i / cbH);
            ctx.fillRect(cbX, cbY + i, 8, 1.5);
        }
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#9CA3AF';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(maxSpd)}`, cbX - 2, cbY + 8);
        ctx.fillText(`${Math.round(minSpd)}`, cbX - 2, cbY + cbH);
        ctx.fillText('km/h', cbX - 2, cbY - 5);
        ctx.textAlign = 'left';

    }, [trackCoords, hoverDistance, width, height, speedToColor]);

    useEffect(() => {
        const raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [draw]);

    if (!trackCoords) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <span className="text-text-gray/40 font-mono text-[9px]">NO TRACK DATA</span>
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            style={{ width: `${width}px`, height: `${height}px`, display: 'block' }}
        />
    );
}
