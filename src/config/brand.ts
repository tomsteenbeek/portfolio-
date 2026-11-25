/**
 * Merkconfiguratie. Officieel logo en huisstijl konden niet worden
 * geverifieerd; zet NEXT_PUBLIC_BRAND_LOGO naar een goedgekeurd logobestand
 * in /public/brand/ zodra dit door Communicatie is aangeleverd.
 */
export const BRAND = {
  appName: "Digitale Informatie",
  appSubtitle: "Strategie & Portfolio",
  organisation: "Gemeente Bodegraven-Reeuwijk",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO || null,
};
