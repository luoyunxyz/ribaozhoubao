import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyActivity } from '../src/classifier.mjs';

test('classifyActivity maps developer tools to development', () => {
  assert.equal(classifyActivity({ appName: 'Code', windowTitle: 'project - Visual Studio Code' }), '开发');
});

test('classifyActivity maps empty activity to idle', () => {
  assert.equal(classifyActivity({ appName: '', windowTitle: '' }), '闲置');
});
