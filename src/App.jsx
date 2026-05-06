import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import CustomerCapture from './components/CustomerCapture';
import GarmentTypeSelector from './components/GarmentTypeSelector';
import GarmentCapture from './components/GarmentCapture';
import TryOnResult from './components/TryOnResult';
import SessionGallery from './components/SessionGallery';
import { preloadBackgroundRemovalModel } from './utils/backgroundRemoval';
import { MAX_TRYONS_PER_SESSION, SESSION_WARN_THRESHOLD } from './config';

// Linear screen flow:
//   welcome → customerCapture → garmentType → garmentCapture → tryOnResult
//                                    ↑                              │
//                                    └──── "Try Another" ───────────┘
//
// Gallery is an overlay reachable from garmentType or tryOnResult.
const SCREENS = {
  WELCOME: 'welcome',
  CUSTOMER: 'customer',
  GARMENT_TYPE: 'garment-type',
  GARMENT_CAPTURE: 'garment-capture',
  TRY_ON: 'try-on',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.WELCOME);
  const [customerPhoto, setCustomerPhoto] = useState(null); // { dataUrl, width, height }
  const [selectedGarmentType, setSelectedGarmentType] = useState(null);
  const [pendingGarment, setPendingGarment] = useState(null); // { dataUrl, garmentType }
  const [tryOns, setTryOns] = useState([]); // session entries
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [warning, setWarning] = useState(null);

  // Track committed try-on IDs so we don't double-save when staff hits multiple
  // navigation buttons that all call onSave.
  const committedIds = useRef(new Set());

  useEffect(() => {
    // Pre-warm the WASM module while staff is on the welcome screen.
    preloadBackgroundRemovalModel();
  }, []);

  const handleStart = () => setScreen(SCREENS.CUSTOMER);

  const handleCustomerConfirmed = (photo) => {
    setCustomerPhoto(photo);
    setScreen(SCREENS.GARMENT_TYPE);
  };

  const handleGarmentTypePicked = (garmentType) => {
    if (tryOns.length >= MAX_TRYONS_PER_SESSION) {
      setWarning(
        `This session has reached the maximum of ${MAX_TRYONS_PER_SESSION} try-ons. Start a new customer to continue.`
      );
      return;
    }
    setSelectedGarmentType(garmentType);
    setScreen(SCREENS.GARMENT_CAPTURE);
  };

  const handleGarmentReady = ({ dataUrl, garmentType }) => {
    setPendingGarment({ dataUrl, garmentType });
    setScreen(SCREENS.TRY_ON);
  };

  const handleSaveTryOn = useCallback(
    (entry) => {
      if (committedIds.current.has(entry.id)) return;
      committedIds.current.add(entry.id);
      setTryOns((prev) => {
        const next = [...prev, entry];
        if (next.length >= SESSION_WARN_THRESHOLD && next.length < MAX_TRYONS_PER_SESSION) {
          setWarning(
            `${MAX_TRYONS_PER_SESSION - next.length} try-on${
              MAX_TRYONS_PER_SESSION - next.length === 1 ? '' : 's'
            } remaining in this session.`
          );
        }
        return next;
      });
    },
    []
  );

  const goTryAnother = () => {
    setPendingGarment(null);
    setSelectedGarmentType(null);
    setScreen(SCREENS.GARMENT_TYPE);
  };

  const goNewCustomer = () => {
    // Wipe everything and return to welcome.
    setCustomerPhoto(null);
    setPendingGarment(null);
    setSelectedGarmentType(null);
    setTryOns([]);
    committedIds.current = new Set();
    setGalleryOpen(false);
    setScreen(SCREENS.WELCOME);
  };

  const customerThumb = useMemo(() => customerPhoto?.dataUrl || null, [customerPhoto]);

  let body;
  if (screen === SCREENS.WELCOME) {
    body = <WelcomeScreen onStart={handleStart} />;
  } else if (screen === SCREENS.CUSTOMER) {
    body = (
      <CustomerCapture
        onConfirm={handleCustomerConfirmed}
        onCancel={() => setScreen(SCREENS.WELCOME)}
      />
    );
  } else if (screen === SCREENS.GARMENT_TYPE) {
    body = (
      <GarmentTypeSelector
        customerThumbDataUrl={customerThumb}
        tryOnCount={tryOns.length}
        onPick={handleGarmentTypePicked}
        onBack={() => setScreen(SCREENS.WELCOME)}
        onViewGallery={() => setGalleryOpen(true)}
        onNewCustomer={goNewCustomer}
      />
    );
  } else if (screen === SCREENS.GARMENT_CAPTURE) {
    body = (
      <GarmentCapture
        garmentType={selectedGarmentType}
        onReady={handleGarmentReady}
        onCancel={() => setScreen(SCREENS.GARMENT_TYPE)}
      />
    );
  } else if (screen === SCREENS.TRY_ON && customerPhoto && pendingGarment) {
    body = (
      <TryOnResult
        customerPhoto={customerPhoto}
        garmentDataUrl={pendingGarment.dataUrl}
        garmentType={pendingGarment.garmentType}
        tryOnCount={tryOns.length}
        onSave={handleSaveTryOn}
        onTryAnother={goTryAnother}
        onViewGallery={() => setGalleryOpen(true)}
        onNewCustomer={goNewCustomer}
        onBack={() => setScreen(SCREENS.GARMENT_TYPE)}
      />
    );
  }

  return (
    <div className="min-h-full">
      {body}
      {galleryOpen && (
        <SessionGallery
          tryOns={tryOns}
          onClose={() => setGalleryOpen(false)}
        />
      )}
      {warning && <Toast message={warning} onClose={() => setWarning(null)} />}
    </div>
  );
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 pointer-events-none">
      <div className="surface px-4 py-3 max-w-sm w-full pointer-events-auto flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-gold mt-2 flex-shrink-0" />
        <div className="text-sm text-ink/80 flex-1">{message}</div>
        <button onClick={onClose} className="text-ink/50 text-xl leading-none">×</button>
      </div>
    </div>
  );
}
