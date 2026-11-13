'use client';

import { useT } from '@datapal/ui-web';
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Reads a customer's wallet QR from the counter webcam. The code inside is the code id. */
export function QrScanner({ onCode, onError }: { onCode: (codeId: string) => void; onError: () => void }) {
  const t = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');

    const scan = () => {
      const el = video.current;
      if (stopped || !el) return;
      if (el.readyState === el.HAVE_ENOUGH_DATA && el.videoWidth > 0) {
        canvas.width = el.videoWidth;
        canvas.height = el.videoHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(el, 0, 0);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(image.data, image.width, image.height);
          const match = result ? UUID.exec(result.data) : null;
          if (match) {
            stopped = true;
            onCode(match[0].toLowerCase());
            return;
          }
        }
      }
      frame = requestAnimationFrame(scan);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (stopped) {
          for (const track of s.getTracks()) track.stop();
          return;
        }
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        setReady(true);
        frame = requestAnimationFrame(scan);
      })
      .catch(onError);

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      if (stream) for (const track of stream.getTracks()) track.stop();
    };
  }, [onCode, onError]);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-ink">
      <video ref={video} muted playsInline aria-label={t('rd.redeem.scan')} className="aspect-video w-full object-cover" />
      {ready ? null : <p className="p-4 text-center text-caption text-white">{t('common.loading')}</p>}
    </div>
  );
}
