import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/config.js';
test('seven CEFR course cards in order',()=>assert.deepEqual(LEVELS.map(x=>x[0]),['A0','A1','A2','B1','B2','C1','C2']));
