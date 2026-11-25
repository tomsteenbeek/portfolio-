/** Dunne lijn in de vijf kleuren uit de gemeentelijke golfvormen (decoratief). */
export function BrandBar() {
  return (
    <div aria-hidden className="flex h-1 w-full">
      <span className="flex-[3] bg-brand-blue" /><span className="flex-[2] bg-brand-sky" /><span className="flex-[3] bg-brand-green" />
      <span className="flex-[2] bg-brand-lime" /><span className="flex-[2] bg-brand-yellow" />
    </div>
  );
}
