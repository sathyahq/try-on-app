import { GARMENT_TYPES } from '../utils/garmentPositions';

const ICONS = {
  saree: SareeIcon,
  kurti: KurtiIcon,
  tshirt: TshirtIcon,
  lehenga: LehengaIcon,
  full: FullIcon,
};

export default function GarmentTypeSelector({
  customerThumbDataUrl,
  tryOnCount,
  onPick,
  onBack,
  onViewGallery,
  onNewCustomer,
}) {
  return (
    <div className="screen animate-fade-in">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost !min-h-[40px] !px-3">←</button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-maroon leading-tight">Choose garment type</h2>
          <p className="text-xs text-ink/60">{tryOnCount} try-on{tryOnCount === 1 ? '' : 's'} this session</p>
        </div>
        {customerThumbDataUrl && (
          <img
            src={customerThumbDataUrl}
            alt="Customer"
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-maroon/30"
          />
        )}
      </header>

      <div className="flex-1 px-4 py-3 grid grid-cols-1 gap-3">
        {GARMENT_TYPES.map((g) => {
          const Icon = ICONS[g.icon] || TshirtIcon;
          return (
            <button
              key={g.id}
              onClick={() => onPick(g.id)}
              className="surface flex items-center gap-4 p-4 active:scale-[0.99] transition-transform text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-maroon/10 flex items-center justify-center text-maroon flex-shrink-0">
                <Icon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink">{g.label}</div>
                <div className="text-xs text-ink/60">{g.description}</div>
              </div>
              <ChevronRight />
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-6 pt-2 flex gap-2">
        <button className="btn-secondary flex-1" onClick={onViewGallery} disabled={tryOnCount === 0}>
          View Try-Ons {tryOnCount > 0 ? `(${tryOnCount})` : ''}
        </button>
        <button className="btn-ghost flex-1" onClick={onNewCustomer}>
          New Customer
        </button>
      </div>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-maroon">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function SareeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6 L24 6 L26 14 Q22 18 16 18 Q10 18 6 14 Z" />
      <path d="M9 18 Q12 24 14 28" />
      <path d="M23 18 Q26 24 27 28" />
      <path d="M8 6 Q14 14 26 26" strokeDasharray="2 2" />
    </svg>
  );
}
function KurtiIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 6 L16 4 L22 6 L26 10 L24 14 L22 13 L22 26 L10 26 L10 13 L8 14 L6 10 Z" />
      <path d="M16 4 L16 12" />
    </svg>
  );
}
function TshirtIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5 L16 7 L22 5 L28 9 L25 14 L22 13 L22 25 L10 25 L10 13 L7 14 L4 9 Z" />
    </svg>
  );
}
function LehengaIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 6 L21 6 L21 12 L11 12 Z" />
      <path d="M11 12 L5 26 L27 26 L21 12" />
      <path d="M9 20 L23 20" strokeDasharray="2 2" />
    </svg>
  );
}
function FullIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="6" r="2.5" />
      <path d="M10 12 L16 10 L22 12 L24 18 L22 18 L22 28 L10 28 L10 18 L8 18 Z" />
    </svg>
  );
}
