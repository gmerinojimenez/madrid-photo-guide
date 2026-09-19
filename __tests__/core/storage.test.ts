import { InMemoryPreferencesStore, InMemorySavedLocationsStore } from '../../src/core/storage/in-memory.ts';
import { runPreferencesContract, runSavedLocationsContract } from './storage-contract.ts';

runSavedLocationsContract('doble en memoria', (alwaysFail) => new InMemorySavedLocationsStore(alwaysFail));
runPreferencesContract('doble en memoria', (alwaysFail) => new InMemoryPreferencesStore(alwaysFail));
