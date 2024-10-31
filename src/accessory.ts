import { AccessoryConfig, AccessoryPlugin, Service } from 'homebridge';

import { Datapoint } from 'knx';
import fakegato from 'fakegato-history';

import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings.js';
import { DoorbellPlatform } from './platform.js';

export const CONTACT_TIME_MS = 1000;


export class DoorbellAccessory implements AccessoryPlugin {
  private readonly uuid_base: string;
  private readonly name: string;
  private readonly displayName: string;
  private readonly listen_single_press: string;
  private readonly listen_double_press: string;
  private readonly listen_long_press: string;

  private readonly doorbellService: Service;
  private readonly contactSensorService: Service;
  private readonly loggingService: fakegato;
  private readonly informationService: Service;

  constructor(
    private readonly platform: DoorbellPlatform,
    private readonly config: AccessoryConfig,
  ) {

    class EveContactSensorTimesOpened extends platform.Characteristic {
      public static readonly UUID: string = 'E863F129-079E-48FF-8F27-9C2605A29F52';

      constructor() {
        super('Times Opened', EveContactSensorTimesOpened.UUID, {
          format: platform.Characteristic.Formats.UINT32,
          perms: [platform.Characteristic.Perms.READ, platform.Characteristic.Perms.NOTIFY],
        });
        this.value = this.getDefaultValue();
      }
    }

    class EveContactSensorOpenDuration extends platform.Characteristic {
      public static readonly UUID: string = 'E863F118-079E-48FF-8F27-9C2605A29F52';

      constructor() {
        super('Open Duration', EveContactSensorOpenDuration.UUID, {
          format: platform.Characteristic.Formats.UINT32,
          unit: platform.Characteristic.Units.SECONDS,
          perms: [platform.Characteristic.Perms.READ, platform.Characteristic.Perms.NOTIFY, platform.Characteristic.Perms.WRITE],
        });
        this.value = this.getDefaultValue();
      }
    }

    class EveContactSensorClosedDuration extends platform.Characteristic {
      public static readonly UUID: string = 'E863F119-079E-48FF-8F27-9C2605A29F52';

      constructor() {
        super('Closed Duration', EveContactSensorClosedDuration.UUID, {
          format: platform.Characteristic.Formats.UINT32,
          unit: platform.Characteristic.Units.SECONDS,
          perms: [platform.Characteristic.Perms.READ, platform.Characteristic.Perms.NOTIFY, platform.Characteristic.Perms.WRITE],
        });
        this.value = this.getDefaultValue();
      }
    }

    class EveContactSensorLastActivation extends platform.Characteristic {
      public static readonly UUID: string = 'E863F11A-079E-48FF-8F27-9C2605A29F52';

      constructor() {
        super('Last Activation', EveContactSensorLastActivation.UUID, {
          format: platform.Characteristic.Formats.UINT32,
          unit: platform.Characteristic.Units.SECONDS,
          perms: [platform.Characteristic.Perms.READ, platform.Characteristic.Perms.NOTIFY],
        });
        this.value = this.getDefaultValue();
      }
    }

    this.name = config.name;
    this.listen_single_press = config.listen_single_press;
    this.listen_double_press = config.listen_double_press;
    this.listen_long_press = config.listen_long_press;
    this.uuid_base = platform.uuid.generate(PLUGIN_NAME + '-' + this.name + '-' + this.listen_single_press);
    this.displayName = this.uuid_base;

    this.informationService = new platform.Service.AccessoryInformation()
      .setCharacteristic(platform.Characteristic.Name, this.name)
      .setCharacteristic(platform.Characteristic.Identify, this.name)
      .setCharacteristic(platform.Characteristic.Manufacturer, '@jendrik')
      .setCharacteristic(platform.Characteristic.Model, PLUGIN_DISPLAY_NAME)
      .setCharacteristic(platform.Characteristic.SerialNumber, this.displayName)
      .setCharacteristic(platform.Characteristic.FirmwareRevision, PLUGIN_VERSION);

    this.doorbellService = new platform.Service.Doorbell(this.name);

    this.contactSensorService = new platform.Service.ContactSensor(this.name);
    this.contactSensorService.getCharacteristic(platform.Characteristic.StatusActive)
      .updateValue(platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);

    // times opened
    this.doorbellService.addCharacteristic(EveContactSensorTimesOpened);
    this.doorbellService.getCharacteristic(EveContactSensorTimesOpened).onGet(async () => {
      let count = 0;
      let prevStatus = undefined;
      for (let i = 0; i < this.loggingService.history.length; ++i) {
        const status = this.loggingService.history[i].status;
        if (status === undefined) {
          continue;
        }
        if (status !== prevStatus && prevStatus !== true) {
          count++;
        }
        prevStatus = status;
      }
      return count;
    });

    // open duration
    this.doorbellService.addCharacteristic(EveContactSensorOpenDuration);
    this.doorbellService.getCharacteristic(EveContactSensorOpenDuration).onGet(async () => {
      let duration = 0;
      let prevStatus = undefined;
      let prevTime = undefined;
      for (let i =0; i < this.loggingService.history.length; ++i) {
        const status = this.loggingService.history[i].status;
        const time = this.loggingService.history[i].time;
        if (status === undefined || time === undefined) {
          continue;
        }
        if (prevStatus === true && prevTime !== undefined) {
          duration += time - prevTime;
        }
        prevStatus = status;
        prevTime = time;
      }

      return duration;
    });

    // closed duration
    this.doorbellService.addCharacteristic(EveContactSensorClosedDuration);
    this.doorbellService.getCharacteristic(EveContactSensorClosedDuration).onGet(async () => {
      let duration = 0;
      let prevStatus = undefined;
      let prevTime = undefined;
      for (let i =0; i < this.loggingService.history.length; ++i) {
        const status = this.loggingService.history[i].status;
        const time = this.loggingService.history[i].time;
        if (status === undefined || time === undefined) {
          continue;
        }
        if (prevStatus === false && prevTime !== undefined) {
          duration += time - prevTime;
        }
        prevStatus = status;
        prevTime = time;
      }

      return duration;
    });

    // last activation
    this.doorbellService.addCharacteristic(EveContactSensorLastActivation);
    this.doorbellService.getCharacteristic(EveContactSensorLastActivation).onGet(async () => {
      if (this.loggingService.getInitialTime() === undefined) {
        return 0;
      } else if (this.doorbellService.getCharacteristic(platform.Characteristic.ContactSensorState).value) {
        return Math.round(new Date().valueOf() / 1000) - this.loggingService.getInitialTime();
      } else {
        let lastActivation = this.loggingService.history[this.loggingService.history.length - 1].time;
        for (let i = this.loggingService.history.length - 1; i >= 0; --i) {
          if (this.loggingService.history[i].status === false) {
            lastActivation = this.loggingService.history[i].time;
          } else {
            break;
          }
        }
        return lastActivation - this.loggingService.getInitialTime();
      }
    });

    this.loggingService = new platform.fakeGatoHistoryService('door', this, { storage: 'fs', log: platform.log });

    const dp_listen_single_press = new Datapoint({
      ga: this.listen_single_press,
      dpt: 'DPT1.001',
      autoread: false,
    }, platform.connection);

    dp_listen_single_press.on('change', (oldValue: boolean, newValue: boolean) => {
      platform.log.info(`Single Press: ${newValue}`);
      if (newValue === true) {
        this.doorbellService.getCharacteristic(platform.Characteristic.ProgrammableSwitchEvent)
          .updateValue(platform.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
        this.contactSensorService.getCharacteristic(platform.Characteristic.StatusActive)
          .updateValue(platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
      } else {
        this.contactSensorService.getCharacteristic(platform.Characteristic.StatusActive)
          .updateValue(platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
      }
    });

    if (this.listen_double_press !== undefined) {
      const dp_listen_double_press = new Datapoint({
        ga: this.listen_double_press,
        dpt: 'DPT1.001',
        autoread: false,
      }, platform.connection);

      dp_listen_double_press.on('change', (oldValue: boolean, newValue: boolean) => {
        platform.log.info(`Double Press: ${newValue}`);
        if (newValue === true) {
          this.doorbellService.getCharacteristic(platform.Characteristic.ProgrammableSwitchEvent)
            .updateValue(platform.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
          this.contactSensorService.getCharacteristic(platform.Characteristic.StatusActive)
            .updateValue(platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
        } else {
          this.contactSensorService.getCharacteristic(platform.Characteristic.StatusActive)
            .updateValue(platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
      });
    }

    if (this.listen_long_press !== undefined) {
      const dp_listen_long_press = new Datapoint({
        ga: this.listen_long_press,
        dpt: 'DPT1.001',
        autoread: false,
      }, platform.connection);

      dp_listen_long_press.on('change', (oldValue: boolean, newValue: boolean) => {
        platform.log.info(`Long Press: ${newValue}`);
        if (newValue === true) {
          this.doorbellService.getCharacteristic(platform.Characteristic.ProgrammableSwitchEvent)
            .updateValue(platform.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
          this.contactSensorService.getCharacteristic(platform.Characteristic.StatusActive)
            .updateValue(platform.Characteristic.ContactSensorState.CONTACT_DETECTED);
        } else {
          this.contactSensorService.getCharacteristic(platform.Characteristic.StatusActive)
            .updateValue(platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }
      });
    }
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.doorbellService,
      this.contactSensorService,
      this.loggingService,
    ];
  }
}
