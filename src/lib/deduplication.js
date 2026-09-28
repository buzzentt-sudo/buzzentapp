const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function duplicateKey(prospect) {
  return {
    phone: normalize(prospect.phone || prospect.whatsapp),
    domain: normalize(prospect.websiteUrl || prospect.website),
    instagram: normalize(prospect.instagram),
    facebook: normalize(prospect.facebook),
    nameCity: `${normalize(prospect.name)}:${normalize(prospect.city)}`,
  };
}

export function findDuplicate(candidate, prospects = []) {
  const candidateKey = duplicateKey(candidate);
  return prospects.find(existing => {
    const key = duplicateKey(existing);
    return Object.entries(candidateKey).some(([field, value]) => value && key[field] && value === key[field]);
  }) || null;
}

export function canContact(prospect) {
  const blocked = ['DO_NOT_CONTACT', 'NOT_INTERESTED', 'No interesado', 'No responde', 'Descartado'];
  if (blocked.includes(prospect.commercialStatus) || blocked.includes(prospect.status)) return { allowed: false, reason: 'CONTACT_BLOCKED' };
  if (prospect.status === 'HUMAN_HANDOFF') return { allowed: false, reason: 'HUMAN_HANDOFF' };
  return { allowed: true };
}
