import { useState } from 'react';
import { LOGO_PATH } from '../config';

// Renders the optional store logo if `public/logo.png` exists.
// Silently hides itself when the asset is missing so the welcome screen
// still looks polished out-of-the-box.
export default function Logo({ className = '', alt = 'Logo' }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={LOGO_PATH}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
