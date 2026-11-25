/**
 * Merkconfiguratie. Logo en beeldmerk zijn uitgesneden uit het officiële
 * presentatiesjabloon van de gemeente (Huisstijl_.pdf). Vervang ze door de
 * vectorbestanden van Communicatie zodra beschikbaar (zelfde bestandsnamen,
 * of zet NEXT_PUBLIC_BRAND_LOGO / NEXT_PUBLIC_BRAND_MARK).
 */
export const BRAND = {
  appName: "Digitale Informatie",
  appSubtitle: "Strategie & Portfolio",
  organisation: "Gemeente Bodegraven-Reeuwijk",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO || "/brand/logo.png",
  markUrl: process.env.NEXT_PUBLIC_BRAND_MARK || "/brand/logo-mark.png",
  wavesUrl: "/brand/waves.jpg",
};
