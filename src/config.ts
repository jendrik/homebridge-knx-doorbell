import type { PlatformConfig } from 'homebridge';

export const DEFAULT_KNX_IP = '224.0.23.12';
export const DEFAULT_KNX_PORT = 3671;

const GROUP_ADDRESS_PATTERN = /^[0-9]{1,4}\/[0-9]{1,4}\/[0-9]{1,4}$/;

export interface DoorbellDeviceConfig {
  name: string;
  listen_single_press: string;
  listen_double_press?: string;
  listen_long_press?: string;
}

export interface ParsedDoorbellPlatformConfig {
  ip: string;
  port: number;
  devices: DoorbellDeviceConfig[];
}

export interface ParseDoorbellPlatformConfigResult {
  config: ParsedDoorbellPlatformConfig;
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGroupAddress(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = GROUP_ADDRESS_PATTERN.exec(value.trim());

  if (match === null) {
    return false;
  }

  const [mainGroup, middleGroup, subgroup] = match[0].split('/').map(Number);

  return mainGroup >= 0
    && mainGroup <= 31
    && middleGroup >= 0
    && middleGroup <= 7
    && subgroup >= 0
    && subgroup <= 255;
}

function parseIp(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  return DEFAULT_KNX_IP;
}

function parsePort(value: unknown, warnings: string[]): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_KNX_PORT;
  }

  const port = typeof value === 'number' ? value : Number(value);

  if (Number.isInteger(port) && port > 0 && port <= 65535) {
    return port;
  }

  warnings.push(`Invalid KNX port "${String(value)}"; using default ${DEFAULT_KNX_PORT}.`);
  return DEFAULT_KNX_PORT;
}

function parseDevice(value: unknown, index: number, warnings: string[]): DoorbellDeviceConfig[] {
  if (!isRecord(value)) {
    warnings.push(`Skipping device at index ${index}: device must be an object.`);
    return [];
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    warnings.push(`Skipping device at index ${index}: name must be a non-empty string.`);
    return [];
  }

  if (!isGroupAddress(value.listen_single_press)) {
    warnings.push(`Skipping device at index ${index}: listen_single_press must be a KNX group address.`);
    return [];
  }

  const device: DoorbellDeviceConfig = {
    name: value.name.trim(),
    listen_single_press: value.listen_single_press.trim(),
  };

  if (isGroupAddress(value.listen_double_press)) {
    device.listen_double_press = value.listen_double_press.trim();
  } else if (value.listen_double_press !== undefined && value.listen_double_press !== '') {
    warnings.push(`Ignoring listen_double_press for device "${device.name}": value must be a KNX group address.`);
  }

  if (isGroupAddress(value.listen_long_press)) {
    device.listen_long_press = value.listen_long_press.trim();
  } else if (value.listen_long_press !== undefined && value.listen_long_press !== '') {
    warnings.push(`Ignoring listen_long_press for device "${device.name}": value must be a KNX group address.`);
  }

  return [device];
}

function parseDevices(value: unknown, warnings: string[]): DoorbellDeviceConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((device, index) => parseDevice(device, index, warnings));
}

export function parseDoorbellPlatformConfig(config: PlatformConfig): ParseDoorbellPlatformConfigResult {
  const warnings: string[] = [];
  const port = parsePort(config.port, warnings);
  const devices = parseDevices(config.devices, warnings);

  if (devices.length === 0) {
    warnings.push('No valid doorbell devices configured.');
  }

  return {
    config: {
      ip: parseIp(config.ip),
      port,
      devices,
    },
    warnings,
  };
}
