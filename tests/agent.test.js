import test from 'node:test';
import assert from 'node:assert/strict';
import { canExecuteAction, decideNextAction } from '../src/lib/agent.js';

test('rechazo produce DO_NOT_CONTACT', () => assert.equal(decideNextAction({ text: 'No me interesa, gracias' }).type, 'DO_NOT_CONTACT'));
test('pedido de humano produce HANDOFF', () => assert.equal(decideNextAction({ text: 'Quiero hablar con una persona' }).type, 'HANDOFF'));
test('consulta de precio produce QUALIFY sin inventar precio', () => {
  const result = decideNextAction({ text: '¿Cuánto sale?', prospect: { recommendation: 'Landing + turnos' } });
  assert.equal(result.type, 'QUALIFY');
  assert.match(result.message, /Landing \+ turnos/);
  assert.doesNotMatch(result.message, /30\.000|16\.000/);
});
test('modo DEMO permite simular sin envío real', () => assert.equal(canExecuteAction({ type: 'SEND_MESSAGE' }, { demoMode: true, agentPaused: false, status: 'CONTACTED' }).allowed, true));
test('agente pausado bloquea acciones', () => assert.deepEqual(canExecuteAction({ type: 'SEND_MESSAGE' }, { demoMode: true, agentPaused: true, status: 'CONTACTED' }), { allowed: false, reason: 'AGENT_PAUSED' }));
test('DO_NOT_CONTACT bloquea acciones posteriores', () => assert.deepEqual(canExecuteAction({ type: 'FOLLOW_UP' }, { demoMode: true, agentPaused: false, status: 'DO_NOT_CONTACT' }), { allowed: false, reason: 'CONTACT_BLOCKED' }));
