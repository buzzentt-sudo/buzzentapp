const refusalWords = ['no me interesa', 'no gracias', 'no quiero', 'basta', 'no contactar'];
const humanWords = ['humano', 'persona', 'asesor', 'hablar con alguien'];
const priceWords = ['precio', 'cuánto', 'cuanto', 'sale', 'costo', 'presupuesto'];
const interestWords = ['me interesa', 'quiero', 'necesito', 'contratar', 'información', 'informacion'];

export function decideNextAction({ text = '', prospect = {}, demoMode = true }) {
  const normalized = text.toLowerCase().trim();
  let type = 'WAIT';
  let message = 'Gracias por responder. ¿Qué parte de tu presencia digital te gustaría mejorar primero?';
  if (refusalWords.some(word => normalized.includes(word))) {
    type = 'DO_NOT_CONTACT';
    message = 'Entendido, gracias por avisarnos. No volveremos a contactarte.';
  } else if (humanWords.some(word => normalized.includes(word))) {
    type = 'HANDOFF';
    message = 'Claro. Voy a derivar la conversación a una persona del equipo de Buzzent.';
  } else if (priceWords.some(word => normalized.includes(word))) {
    type = 'QUALIFY';
    message = `Podemos ayudarte con ${prospect.recommendation || 'una solución web a medida'}. Para orientarte mejor, ¿qué necesitás resolver primero?`;
  } else if (interestWords.some(word => normalized.includes(word))) {
    type = 'PROPOSE';
    message = `¡Buenísimo! Podemos avanzar con ${prospect.recommendation || 'una solución digital'}. ¿Querés que te comparta una propuesta con el alcance y el precio?`;
  }
  return { type, message, mode: demoMode ? 'DEMO' : 'REAL', allowed: demoMode || type !== 'SEND_MESSAGE' };
}

export function canExecuteAction(action, { demoMode, agentPaused, status }) {
  if (agentPaused) return { allowed: false, reason: 'AGENT_PAUSED' };
  if (status === 'DO_NOT_CONTACT' || status === 'NOT_INTERESTED') return { allowed: false, reason: 'CONTACT_BLOCKED' };
  if (!demoMode && action.type === 'SEND_MESSAGE') return { allowed: false, reason: 'NO_OFFICIAL_CHANNEL' };
  return { allowed: true };
}
