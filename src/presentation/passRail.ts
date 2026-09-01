export function passRailPercent(
  activeCode: string,
  firstCode: string,
  secondCode: string,
): 0 | 100 {
  if (activeCode === secondCode) return 100
  if (activeCode === firstCode) return 0
  return 0
}
