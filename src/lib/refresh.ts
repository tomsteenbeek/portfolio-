/** Eenvoudige gebeurtenis om geladen schermen opnieuw op te halen na een wijziging. */
type Fn = () => void;
const listeners = new Set<Fn>();
export function refreshData() {
  listeners.forEach((f) => f());
}
export function onRefresh(f: Fn) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}
