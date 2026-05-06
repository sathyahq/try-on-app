import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { composeTryOn } from '../utils/canvasCompositor';

// Interactive canvas editor.
//
// Coordinates:
//   - The "world" is the customer photo's natural pixel space (canvas.width/height).
//   - The canvas is rendered scaled-to-fit its container; we map pointer coords
//     (CSS pixels in the canvas) into world coords for transform updates.
//
// Transform model: garment center (cx, cy), uniform scale, rotation in degrees,
// and opacity 0..1. This matches canvasCompositor's expectations.
//
// Gestures:
//   - 1 pointer on garment → drag (translate cx, cy)
//   - 2 pointers           → pinch-zoom + rotate (anchored on the midpoint)
//   - rotate handle pointer → rotate around the garment center
//   - pointer on background → no-op (stays in idle)
const OverlayEditor = forwardRef(function OverlayEditor(
  { customerImage, garmentImage, initialTransform, opacity, onTransformChange, onOpacityChange },
  ref
) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const transformRef = useRef({ ...initialTransform, opacity });
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const [active, setActive] = useState(true); // shows the dashed editing border
  const idleTimerRef = useRef(null);
  const pointersRef = useRef(new Map()); // id -> {x, y, target}
  const gestureRef = useRef(null); // multi-touch baseline
  const dragRef = useRef(null);    // single-touch baseline
  const handleRef = useRef(null);  // rotate-handle baseline
  const rafRef = useRef(0);

  // Re-render canvas whenever inputs change
  useEffect(() => {
    transformRef.current = { ...transformRef.current, opacity };
    scheduleDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opacity]);

  useEffect(() => {
    transformRef.current = { ...initialTransform, opacity };
    scheduleDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTransform, customerImage, garmentImage]);

  // Imperative handle for the parent (export the composited blob)
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getTransform: () => ({ ...transformRef.current }),
  }));

  function scheduleDraw() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      draw();
    });
  }

  async function draw() {
    if (!canvasRef.current || !customerImage) return;
    await composeTryOn({
      customerImage,
      garmentImage,
      transform: transformRef.current,
      targetCanvas: canvasRef.current,
    });
  }

  function setActiveBriefly() {
    setActive(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setActive(false), 1200);
  }

  function getGarmentBoxWorld() {
    const t = transformRef.current;
    if (!garmentImage) return null;
    const gw = garmentImage.naturalWidth || garmentImage.width;
    const gh = garmentImage.naturalHeight || garmentImage.height;
    const w = gw * t.scale;
    const h = gh * t.scale;
    return { cx: t.cx, cy: t.cy, w, h, rotation: t.rotation || 0 };
  }

  // Convert client (CSS pixel) coords to world (canvas pixel) coords.
  function clientToWorld(clientX, clientY) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
    };
  }

  function pointInsideGarment(world) {
    const box = getGarmentBoxWorld();
    if (!box) return false;
    // Rotate the test point into the garment's local frame
    const dx = world.x - box.cx;
    const dy = world.y - box.cy;
    const r = (-box.rotation * Math.PI) / 180;
    const lx = dx * Math.cos(r) - dy * Math.sin(r);
    const ly = dx * Math.sin(r) + dy * Math.cos(r);
    return Math.abs(lx) <= box.w / 2 && Math.abs(ly) <= box.h / 2;
  }

  // The rotate handle sits at the rotated top-right corner of the garment box.
  function handleWorldPos() {
    const box = getGarmentBoxWorld();
    if (!box) return null;
    const r = (box.rotation * Math.PI) / 180;
    // Local offset to top-right corner, plus a small outward offset
    const lx = box.w / 2 + 24;
    const ly = -box.h / 2 - 24;
    return {
      x: box.cx + lx * Math.cos(r) - ly * Math.sin(r),
      y: box.cy + lx * Math.sin(r) + ly * Math.cos(r),
    };
  }

  function pointNearHandle(world) {
    const h = handleWorldPos();
    if (!h) return false;
    const dx = world.x - h.x;
    const dy = world.y - h.y;
    // Generous hit radius for touch (in world pixels). Scale with canvas size.
    const canvas = canvasRef.current;
    const px = canvas ? canvas.width / canvas.getBoundingClientRect().width : 1;
    const r = 28 * px;
    return dx * dx + dy * dy <= r * r;
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function angle(a, b) {
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  }

  function onPointerDown(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(e.pointerId);
    const world = clientToWorld(e.clientX, e.clientY);
    pointersRef.current.set(e.pointerId, world);

    if (pointersRef.current.size === 2) {
      // Begin pinch/rotate gesture
      const [p1, p2] = [...pointersRef.current.values()];
      gestureRef.current = {
        startDist: distance(p1, p2),
        startAngle: angle(p1, p2),
        startScale: transformRef.current.scale,
        startRotation: transformRef.current.rotation || 0,
        startCx: transformRef.current.cx,
        startCy: transformRef.current.cy,
        startMid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      };
      dragRef.current = null;
      handleRef.current = null;
    } else if (pointersRef.current.size === 1) {
      if (pointNearHandle(world)) {
        const t = transformRef.current;
        handleRef.current = {
          startAngle: (Math.atan2(world.y - t.cy, world.x - t.cx) * 180) / Math.PI,
          startRotation: t.rotation || 0,
        };
      } else if (pointInsideGarment(world)) {
        dragRef.current = {
          startWorld: world,
          startCx: transformRef.current.cx,
          startCy: transformRef.current.cy,
        };
      } else {
        // Allow dragging from anywhere as long as a touch starts on the canvas.
        // This is more forgiving for staff than requiring precision.
        dragRef.current = {
          startWorld: world,
          startCx: transformRef.current.cx,
          startCy: transformRef.current.cy,
        };
      }
    }
    setActiveBriefly();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return;
    const world = clientToWorld(e.clientX, e.clientY);
    pointersRef.current.set(e.pointerId, world);

    if (pointersRef.current.size >= 2 && gestureRef.current) {
      const [p1, p2] = [...pointersRef.current.values()];
      const newDist = distance(p1, p2);
      const newAngle = angle(p1, p2);
      const factor = newDist / Math.max(1, gestureRef.current.startDist);
      const scale = clamp(gestureRef.current.startScale * factor, 0.05, 6);
      const rotation = gestureRef.current.startRotation + (newAngle - gestureRef.current.startAngle);

      // Anchor the transform around the gesture midpoint so pinch feels natural
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const dxMid = mid.x - gestureRef.current.startMid.x;
      const dyMid = mid.y - gestureRef.current.startMid.y;
      transformRef.current = {
        ...transformRef.current,
        scale,
        rotation,
        cx: gestureRef.current.startCx + dxMid,
        cy: gestureRef.current.startCy + dyMid,
      };
    } else if (handleRef.current && pointersRef.current.size === 1) {
      const t = transformRef.current;
      const cur = (Math.atan2(world.y - t.cy, world.x - t.cx) * 180) / Math.PI;
      transformRef.current = {
        ...transformRef.current,
        rotation: handleRef.current.startRotation + (cur - handleRef.current.startAngle),
      };
    } else if (dragRef.current && pointersRef.current.size === 1) {
      const dx = world.x - dragRef.current.startWorld.x;
      const dy = world.y - dragRef.current.startWorld.y;
      transformRef.current = {
        ...transformRef.current,
        cx: dragRef.current.startCx + dx,
        cy: dragRef.current.startCy + dy,
      };
    }

    onTransformChange?.({ ...transformRef.current });
    setActiveBriefly();
    scheduleDraw();
    rerender();
    e.preventDefault();
  }

  function onPointerUp(e) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      handleRef.current = null;
    }
  }

  // Render the garment-frame overlay (dashed border, corner dots, rotate handle)
  // as absolutely-positioned DOM elements aligned with the canvas, in CSS px.
  const overlayElems = (() => {
    const box = getGarmentBoxWorld();
    const canvas = canvasRef.current;
    if (!box || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const sx = rect.width / canvas.width;
    const sy = rect.height / canvas.height;
    const cx = box.cx * sx;
    const cy = box.cy * sy;
    const w = box.w * sx;
    const h = box.h * sy;
    const handle = handleWorldPos();
    const hx = handle ? handle.x * sx : cx;
    const hy = handle ? handle.y * sy : cy;

    return (
      <>
        <div
          className={`absolute pointer-events-none border-2 border-dashed transition-opacity duration-300 ${
            active ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: cx - w / 2,
            top: cy - h / 2,
            width: w,
            height: h,
            transform: `rotate(${box.rotation}deg)`,
            transformOrigin: 'center',
            borderColor: '#D4A843',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.15) inset',
          }}
        >
          {/* Corner dots */}
          {['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5'].map((cls) => (
            <span
              key={cls}
              className={`absolute ${cls} block w-3 h-3 rounded-full bg-gold ring-2 ring-white`}
            />
          ))}
        </div>
        {/* Rotate handle (intercepts pointer events through the canvas via a hit-test, so
            we don't need it to be a DOM target — we just render it visually) */}
        <div
          className={`absolute pointer-events-none transition-opacity duration-300 ${
            active ? 'opacity-100' : 'opacity-60'
          }`}
          style={{ left: hx - 14, top: hy - 14 }}
        >
          <div className="w-7 h-7 rounded-full bg-white shadow-lift flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#800020" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 4 21 10 15 10" />
            </svg>
          </div>
        </div>
      </>
    );
  })();

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <div className="relative max-w-full max-h-full">
        <canvas
          ref={canvasRef}
          className="block max-w-full max-h-[70vh] rounded-2xl shadow-soft no-touch-action select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {overlayElems}
      </div>
    </div>
  );
});

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export default OverlayEditor;
