import type { API, StaticPlatformPlugin, Logger, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid } from 'homebridge';

import fakegato from 'fakegato-history';

import { Connection } from 'knx';

import { DoorbellAccessory } from './accessory.js';
import { parseDoorbellPlatformConfig } from './config.js';


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

    const parsedConfig = parseDoorbellPlatformConfig(config);

    for (const warning of parsedConfig.warnings) {
      this.log.warn(warning);
    }

    this.connection = new Connection({
      ipAddr: parsedConfig.config.ip,
      ipPort: parsedConfig.config.port,
      handlers: {
        connected: () => {
          this.log.info('KNX connected');
        },
        error: (connstatus: unknown) => {
          this.log.error(`KNX status: ${String(connstatus)}`);
        },
      },
    });

    for (const deviceConfig of parsedConfig.config.devices) {
      this.devices.push(new DoorbellAccessory(this, deviceConfig));
    }

    this.api.on('shutdown', () => {
      this.shutdownKnxConnection();
    });

    log.info('finished initializing!');
  }

  private shutdownKnxConnection(): void {
    try {
      this.connection.Disconnect(() => {
        this.log.info('KNX disconnected');
      });
    } catch (error) {
      this.log.warn(`KNX disconnect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }
}
