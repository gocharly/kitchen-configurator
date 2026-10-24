export function formatKitchenCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} кухонь`;
  if (last === 1) return `${count} кухня`;
  if (last >= 2 && last <= 4) return `${count} кухни`;
  return `${count} кухонь`;
}
