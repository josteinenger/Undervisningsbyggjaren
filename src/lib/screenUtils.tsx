import React from 'react';

/**
 * Gjenbrukbart ikon for takmontert lerret
 */
export function ProjectorScreenIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Opphengskassett i taket */}
      <rect x="2" y="3" width="20" height="3" rx="1" fill="currentColor" fillOpacity="0.15" />
      {/* Lerretet dradd ned */}
      <path d="M4 6v10h16V6" />
      {/* Botnstang med lodd */}
      <line x1="3" y1="16" x2="21" y2="16" strokeWidth="2.5" />
      {/* Snor / ring under for å dra lerretet ned */}
      <line x1="12" y1="16" x2="12" y2="18.5" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Smart fleirskjerm-automasjon (Window Management API)
 * 1. Startar alltid leiarvisinga på laptopen.
 * 2. Dersom meir enn éin skjerm er tilkopla (lerret/TV), opnast publikumsvindauget direkte på ekstraskjermen.
 * 3. Dersom berre éin skjerm er tilkopla (laptopen åleine): IKKJE opne ein ny fane automatisk som stel fokus.
 */
export async function launchPresenterOnScreens(audienceUrl: string, onStartLeader: () => void) {
  // 1. Start leiarvising på laptopen/hovudfana direkte
  onStartLeader();

  // 2. Prøv Window Management API dersom Chrome har tilgjenge til fleire skjermar
  if (typeof window !== 'undefined' && ('getScreenDetails' in window || (window.screen && 'getScreenDetails' in window.screen))) {
    try {
      // @ts-ignore - experimental web API
      const getDetailsFn = (window as any).getScreenDetails || (window.screen as any)?.getScreenDetails;
      const screenDetails = await getDetailsFn.call(window);
      const allScreens = screenDetails?.screens || [];
      
      if (allScreens.length > 1) {
        // Finn den andre skjermen (lerretet / TV-en)
        const primary = screenDetails.currentScreen;
        const external = allScreens.find((s: any) => s !== primary) || allScreens[1];
        
        if (external) {
          // Posisjonskoordinatar på ekstraskjermen utan å gøyme nettlesarkontrollar
          const winFeatures = `left=${external.availLeft},top=${external.availTop},width=${external.availWidth},height=${external.availHeight}`;
          window.open(audienceUrl, 'audienceWindow', winFeatures);
        }
      }
    } catch (err) {
      console.log('Window management fallback notice:', err);
    }
  }

  // Dersom berre éin skjerm er tilkopla: IKKJE opne window.open(_blank) her!
  // Brukaren vert verande direkte i Leiarpanelet på laptopen, og kan klikke «Opne storskjerm ↗» manuelt om ønskjeleg.
}

/**
 * Manuell opning av storskjerm (når leiar klikkar «Opne storskjerm ↗» i leiarpanelet)
 */
export async function openAudienceWindowManual(audienceUrl: string) {
  let openedOnExternal = false;

  if (typeof window !== 'undefined' && ('getScreenDetails' in window || (window.screen && 'getScreenDetails' in window.screen))) {
    try {
      // @ts-ignore
      const getDetailsFn = (window as any).getScreenDetails || (window.screen as any)?.getScreenDetails;
      const screenDetails = await getDetailsFn.call(window);
      const allScreens = screenDetails?.screens || [];

      if (allScreens.length > 1) {
        const primary = screenDetails.currentScreen;
        const external = allScreens.find((s: any) => s !== primary) || allScreens[1];
        if (external) {
          const winFeatures = `left=${external.availLeft},top=${external.availTop},width=${external.availWidth},height=${external.availHeight}`;
          const win = window.open(audienceUrl, 'audienceWindow', winFeatures);
          if (win) {
            openedOnExternal = true;
          }
        }
      }
    } catch (err) {
      console.log('Manual open screenDetails fallback:', err);
    }
  }

  // Dersom berre éin skjerm er tilkopla: opne eit eige separat vindauge (1280x720) og hald fokus på leiarvindauget
  if (!openedOnExternal) {
    const left = Math.max(0, Math.round((window.screen.availWidth - 1280) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - 720) / 2));
    const winFeatures = `width=1280,height=720,left=${left},top=${top}`;
    const audienceWin = window.open(audienceUrl, 'audienceWindow', winFeatures);

    // Kall umiddelbart window.focus() på leiarvindauget slik at det held seg fremst
    if (audienceWin) {
      setTimeout(() => {
        window.focus();
      }, 100);
    }
  }
}

