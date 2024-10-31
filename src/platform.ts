import { API, StaticPlatformPlugin, Logger, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid } from 'homebridge';

import fakegato from 'fakegato-history';

import { Connection } from 'knx';

import { DoorbellAccessory } from './accessory.js';


export class DoorbellPlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly uuid: typeof uuid;

  public readonly fakeGatoHistoryService;

  public readonly connection: Connection;

  private readonly devices: DoorbellAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.uuid = api.hap.uuid;

    this.fakeGatoHistoryService = fakegato(this.api);

    // connect
    this.connection = new Connection({
      ipAddr: config.ip ?? '224.0.23.12',
      ipPort: config.port ?? 3671,
      handlers: {
        connected: function () {
          log.info('KNX connected');
        },
        error: function (connstatus: unknown) {
          log.error(`KNX status: ${connstatus}`);
        },
      },
    });

    // read devices
    config.devices.forEach(element => {
      if (element.name !== undefined && element.listen_single_press) {
        this.devices.push(new DoorbellAccessory(this, element));
      }
    });

    log.info('finished initializing!');
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }
}
