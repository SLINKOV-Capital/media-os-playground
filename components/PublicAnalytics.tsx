"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const YANDEX_METRIKA_ID = 36623120;
const GOOGLE_TAG_MANAGER_ID = "GTM-WT7QD9X";

declare global {
  interface Window {
    ym?: (counterId: number, method: string, url?: string) => void;
  }
}

export function PublicAnalytics() {
  const pathname = usePathname();
  const previousLocation = useRef<string | null>(null);

  useEffect(() => {
    const location = pathname;
    if (previousLocation.current === null) {
      previousLocation.current = location;
      return;
    }
    if (previousLocation.current === location) return;

    previousLocation.current = location;
    if (typeof window.ym === "function") {
      window.ym(YANDEX_METRIKA_ID, "hit", location);
    }
  }, [pathname]);

  return (
    <>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');`}
      </Script>

      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,
a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${YANDEX_METRIKA_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
      </Script>

      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
        <img
          src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
          style={{ position: "absolute", left: "-9999px" }}
          alt=""
        />
      </noscript>
    </>
  );
}
