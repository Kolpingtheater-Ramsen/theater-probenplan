const berlinDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function eventDateInBerlin(startsAt) {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return null;
  return berlinDateFormatter.format(date);
}

export function isEventVisibleToMember(eventGroup, ownGroup, groupVisibility) {
  const group = eventGroup.toLocaleLowerCase('de-DE');
  const normalizedOwnGroup = ownGroup.toLocaleLowerCase('de-DE');
  if (group.includes('alle') || group.includes('creepshow')) return true;
  if (!normalizedOwnGroup) return false;
  if (
    group.includes('technik') &&
    groupVisibility.techOnly &&
    !normalizedOwnGroup.includes('technik') &&
    !group.includes(normalizedOwnGroup)
  )
    return false;
  if (
    group.includes('kostüm') &&
    groupVisibility.costumeOnly &&
    !normalizedOwnGroup.includes('kostüm')
  )
    return false;
  return group.includes(normalizedOwnGroup);
}

export function eventsCoveredByAbsence(
  events,
  from,
  to,
  ownGroup,
  groupVisibility,
) {
  return events.filter((event) => {
    const date = eventDateInBerlin(event.startsAt);
    return (
      date !== null &&
      date >= from &&
      date <= to &&
      isEventVisibleToMember(event.group, ownGroup, groupVisibility)
    );
  });
}
