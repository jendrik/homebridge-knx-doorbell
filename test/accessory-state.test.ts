import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contactStateForPressValue, programmableSwitchEventForPressType } from '../src/accessory.js';

describe('accessory press helpers', () => {
  it('maps KNX true and false values to contact sensor state values', () => {
    const Characteristic = {
      ContactSensorState: {
        CONTACT_DETECTED: 0,
        CONTACT_NOT_DETECTED: 1,
      },
    };

    assert.equal(contactStateForPressValue(true, Characteristic), 0);
    assert.equal(contactStateForPressValue(false, Characteristic), 1);
  });

  it('maps configured press types to programmable switch events', () => {
    const Characteristic = {
      ProgrammableSwitchEvent: {
        SINGLE_PRESS: 0,
        DOUBLE_PRESS: 1,
        LONG_PRESS: 2,
      },
    };

    assert.equal(programmableSwitchEventForPressType('single', Characteristic), 0);
    assert.equal(programmableSwitchEventForPressType('double', Characteristic), 1);
    assert.equal(programmableSwitchEventForPressType('long', Characteristic), 2);
  });
});
