import test from 'node:test';
import assert from 'node:assert/strict';
import {firstUseRequest} from '../first-use.js';

test('first installation supplies the initial credential for wiring and naming', async () => {
  const port = {};
  const calls = [];
  const request = async (...args) => { calls.push(args); return {accepted: true}; };
  for (const values of [{type: 'hardware_set', hardware_profile: {board: 'n16r8'}}, {type: 'device_name_set', name: '小乐'}]) {
    assert.deepEqual(await firstUseRequest(request, port, values), {accepted: true});
    assert.deepEqual(calls.at(-1), [port, {...values, admin_password: '12345678'}]);
    assert.equal(Object.hasOwn(values, 'admin_password'), false);
  }
});

test('custom credentials stop the beginner flow without resetting or retrying', async () => {
  let calls = 0;
  await assert.rejects(firstUseRequest(async () => {
    calls++;
    throw Error('Device administrator password required');
  }, {}, {type: 'hardware_set'}), /已有自定义凭据/);
  assert.equal(calls, 1);
});

test('USB errors retain their original cause', async () => {
  const error = Error('USB disconnected');
  await assert.rejects(firstUseRequest(async () => { throw error; }, {}, {type: 'hardware_set'}), cause => cause === error);
});
