import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { skipOnboarding } from './support.ts';

function locationDouble() {
  return require('expo-location') as {
    __setLocationPermission: (state: string) => void;
    __answerNextRequestWith: (state: string) => void;
  };
}

beforeEach(() => {
  const sqlite = require('expo-sqlite') as { __resetFakeDatabases: () => void };
  sqlite.__resetFakeDatabases();
});

/** Único evento `location_permission_result` capturado en `console.log`, o `null`. */
function capturedEvent(logSpy: ReturnType<typeof jest.spyOn>): Record<string, unknown> | null {
  const call = logSpy.mock.calls.find((args: unknown[]) => args[0] === '[analytics] location_permission_result');
  return (call?.[1] as Record<string, unknown>) ?? null;
}

function assertNoLeak(event: Record<string, unknown> | null, origin: string, state: string) {
  expect(event).not.toBeNull();
  expect(Object.keys(event as object).sort()).toEqual(['name', 'origin', 'state']);
  expect(event).toMatchObject({ name: 'location_permission_result', origin, state });
  const serialized = JSON.stringify(event);
  expect(serialized).not.toMatch(/lat|lng|coords|meters|distance/i);
}

/**
 * FR-027, FR-028, SC-006 (feature 004): cada evento de permiso registrado
 * solo lleva `name`, `state` y `origin` — nunca coordenadas ni distancias,
 * sea cual sea el origen desde el que se pidió.
 */
describe('Analítica del permiso de ubicación — privacidad', () => {
  it('origen "onboarding": el evento no lleva coordenadas ni distancias', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    locationDouble().__answerNextRequestWith('granted');

    renderRouter('app', { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByText('Cómo funciona'));
    fireEvent.press(await screen.findByLabelText('Activar ubicación'));
    await screen.findByText('Empezar gratis');

    assertNoLeak(capturedEvent(logSpy), 'onboarding', 'granted');
    logSpy.mockRestore();
  });

  it('origen "contextual": el evento no lleva coordenadas ni distancias', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    locationDouble().__answerNextRequestWith('approximate');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/' });
    fireEvent.press(await screen.findByLabelText('Centrar en mi posición'));
    await waitFor(() => expect(capturedEvent(logSpy)).not.toBeNull());

    assertNoLeak(capturedEvent(logSpy), 'contextual', 'approximate');
    logSpy.mockRestore();
  });

  it('origen "profile": el evento no lleva coordenadas ni distancias', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    locationDouble().__answerNextRequestWith('denied');
    await skipOnboarding();

    renderRouter('app', { initialUrl: '/profile' });
    fireEvent.press(await screen.findByLabelText('Ubicación'));
    await waitFor(() => expect(capturedEvent(logSpy)).not.toBeNull());

    assertNoLeak(capturedEvent(logSpy), 'profile', 'denied');
    logSpy.mockRestore();
  });
});
