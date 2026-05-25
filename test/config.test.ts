import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_KNX_IP, DEFAULT_KNX_PORT, parseDoorbellPlatformConfig } from '../src/config.js';

describe('parseDoorbellPlatformConfig', () => {
  it('uses KNX defaults and accepts valid devices', () => {
    const result = parseDoorbellPlatformConfig({
      platform: 'knx-doorbell',
      devices: [
        {
          name: 'Front Door',
          listen_single_press: '1/2/3',
          listen_double_press: '1/2/4',
          listen_long_press: '1/2/5',
        },
      ],
    });

    assert.equal(result.config.ip, DEFAULT_KNX_IP);
    assert.equal(result.config.port, DEFAULT_KNX_PORT);
    assert.deepEqual(result.config.devices, [
      {
        name: 'Front Door',
        listen_single_press: '1/2/3',
        listen_double_press: '1/2/4',
        listen_long_press: '1/2/5',
      },
    ]);
    assert.deepEqual(result.warnings, []);
  });

  it('coerces numeric string ports and rejects invalid ports', () => {
    const numericString = parseDoorbellPlatformConfig({
      platform: 'knx-doorbell',
      port: '3672',
      devices: [],
    });
    const invalid = parseDoorbellPlatformConfig({
      platform: 'knx-doorbell',
      port: 'bad',
      devices: [],
    });

    assert.equal(numericString.config.port, 3672);
    assert.equal(invalid.config.port, DEFAULT_KNX_PORT);
    assert.deepEqual(invalid.warnings, [
      'Invalid KNX port "bad"; using default 3671.',
      'No valid doorbell devices configured.',
    ]);
  });

  it('skips invalid devices with specific warnings', () => {
    const result = parseDoorbellPlatformConfig({
      platform: 'knx-doorbell',
      devices: [
        { name: '', listen_single_press: '1/2/3' },
        { name: 'Missing Address' },
        { name: 'Bad Address', listen_single_press: 'not/a/group' },
        { name: 'Bad Main Group', listen_single_press: '32/0/0' },
        { name: 'Bad Middle Group', listen_single_press: '0/8/0' },
        { name: 'Bad Subgroup', listen_single_press: '0/0/256' },
        { name: 'Valid', listen_single_press: '1/2/3' },
      ],
    });

    assert.deepEqual(result.config.devices, [
      { name: 'Valid', listen_single_press: '1/2/3' },
    ]);
    assert.deepEqual(result.warnings, [
      'Skipping device at index 0: name must be a non-empty string.',
      'Skipping device at index 1: listen_single_press must be a KNX group address.',
      'Skipping device at index 2: listen_single_press must be a KNX group address.',
      'Skipping device at index 3: listen_single_press must be a KNX group address.',
      'Skipping device at index 4: listen_single_press must be a KNX group address.',
      'Skipping device at index 5: listen_single_press must be a KNX group address.',
    ]);
  });

  it('handles missing device arrays without throwing', () => {
    const result = parseDoorbellPlatformConfig({
      platform: 'knx-doorbell',
    });

    assert.deepEqual(result.config.devices, []);
    assert.deepEqual(result.warnings, [
      'No valid doorbell devices configured.',
    ]);
  });
});
