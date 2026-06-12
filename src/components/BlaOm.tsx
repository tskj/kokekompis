'use client';

import { usePathname } from 'next/navigation';

// Bla-i-boka-følelsen: hvert oppslag glir inn fra ryggen med en anelse perspektiv, som et ark
// som legger seg. Ren CSS-animasjon på ~240 ms (bare transform/opacity — koster ingenting), og
// nøkkelen på stien gjør at den spilles ved hver navigering. Slått av ved prefers-reduced-motion.
export function BlaOm({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="bla-om">
      {children}
    </div>
  );
}
