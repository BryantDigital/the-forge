export function isFirstTimeAtEvent(
  eventStartsAt: number,
  priorCheckedInEventStarts: number[],
) {
  return !priorCheckedInEventStarts.some(
    (priorStartsAt) => priorStartsAt < eventStartsAt,
  );
}
