import Logo from './Logo';
import { STORE_NAME, STORE_NAME_TA, STORE_TAGLINE, EST_YEAR } from '../config';

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="screen animate-fade-in">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Logo className="w-28 h-28 object-contain mb-6" alt={STORE_NAME} />

        <div className="text-gold text-sm tracking-[0.25em] uppercase mb-2">
          Est. {EST_YEAR}
        </div>
        <h1 className="text-3xl font-bold text-maroon leading-tight">
          {STORE_NAME}
        </h1>
        <p className="text-base text-maroon/70 mt-2 font-medium" lang="ta">
          {STORE_NAME_TA}
        </p>

        <div className="mt-8 mb-12">
          <p className="text-lg text-ink/80 italic">{STORE_TAGLINE}</p>
        </div>

        <div className="w-full max-w-sm">
          <button className="btn-primary text-lg" onClick={onStart}>
            <CameraIcon />
            Start New Customer Session
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-ink/40 pb-6 px-4">
        Virtual Try-On • Tap to begin
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
