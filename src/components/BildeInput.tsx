'use client';

import { useEffect, useRef } from 'react';

// Filvelger for oppskriftsbilder som krymper bildet i nettleseren før innsending. Mobilbilder er
// gjerne 3–10 MB (og HEIC på iPhone) — for tunge for opplastingen og et format bildeleseren ikke
// forstår. Her skaleres de ned og kodes om til JPEG lokalt; feiler konverteringen sendes
// originalen som før (serveren tar imot opptil 8 MB).

const MAKS_DIREKTE_BYTES = 1_500_000;
const MAKS_KANT_PX       = 2000;

async function lastBilde(fil: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap først (rask, dekoder HEIC der nettleseren kan); <img> som reserve
  try {
    return await createImageBitmap(fil);
  } catch {
    const url = URL.createObjectURL(fil);
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => reject(new Error('bildet lot seg ikke dekode'));
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function krympTilJpeg(fil: File): Promise<File | null> {
  try {
    const bilde = await lastBilde(fil);
    const skala = Math.min(1, MAKS_KANT_PX / Math.max(bilde.width, bilde.height));

    const canvas  = document.createElement('canvas');
    canvas.width  = Math.max(1, Math.round(bilde.width * skala));
    canvas.height = Math.max(1, Math.round(bilde.height * skala));

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bilde, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size === 0) return null;

    return new File([blob], 'oppskrift.jpg', { type: 'image/jpeg' });
  } catch {
    return null;
  }
}

export function BildeInput({ name, className, ariaLabel }: { name: string; className?: string; ariaLabel?: string }) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const pågående   = useRef<Promise<void> | null>(null);

  // Rekker man å trykke send mens konverteringen pågår, holdes innsendingen igjen til den er
  // ferdig — ellers går originalfilen ut i kappløp med den krympede.
  useEffect(() => {
    const input = inputRef.current;
    const form  = input?.form;
    if (!input || !form) return;

    const onSubmit = (e: SubmitEvent) => {
      const jobb = pågående.current;
      if (!jobb) return;

      e.preventDefault();
      jobb.then(() => form.requestSubmit());
    };

    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, []);

  const onChange = () => {
    const input = inputRef.current;
    const fil   = input?.files?.[0];
    if (!input || !fil) return;
    if (fil.type === 'image/jpeg' && fil.size <= MAKS_DIREKTE_BYTES) return;

    const jobb = krympTilJpeg(fil).then((jpeg) => {
      if (!jpeg) return;

      const kurv = new DataTransfer();
      kurv.items.add(jpeg);
      input.files = kurv.files;
    });

    pågående.current = jobb;
    jobb.finally(() => {
      if (pågående.current === jobb) pågående.current = null;
    });
  };

  return (
    <input
      ref={inputRef}
      type="file"
      name={name}
      accept="image/*"
      required
      onChange={onChange}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
