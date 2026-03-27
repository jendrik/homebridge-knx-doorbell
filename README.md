# homebridge-knx-doorbell

A [Homebridge](https://homebridge.io) plugin that exposes KNX doorbell buttons to Apple HomeKit. It listens for KNX group address telegrams (DPT 1.001) and triggers doorbell notifications, supporting single, double, and long press events.

## Features

- Doorbell notifications in the Home app via `ProgrammableSwitchEvent`
- Single, double, and long press support (each mapped to a separate KNX group address)
- Contact sensor state tracking per doorbell
- History recording via [Eve](https://www.evehome.com/en/eve-app) (times opened, open/closed duration, last activation)
- Configurable KNX router/interface IP and port
- Multiple doorbell devices per platform instance

## Requirements

- [Homebridge](https://homebridge.io) v1.8.0 or later (including v2.0)
- Node.js v20, v22, or v24
- A KNX IP router or interface reachable on the network

## Installation

### Via Homebridge UI (recommended)

Search for `homebridge-knx-doorbell` in the Homebridge UI plugin tab and install it.

### Via npm

```sh
npm install -g @jendrik/homebridge-knx-doorbell
```

## Configuration

Add the `knx-doorbell` platform to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "knx-doorbell",
      "devices": [
        {
          "name": "Front Door",
          "listen_single_press": "1/2/3",
          "listen_double_press": "1/2/4",
          "listen_long_press": "1/2/5"
        }
      ],
      "ip": "224.0.23.12",
      "port": 3671
    }
  ]
}
```

### Platform options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | `"knx-doorbell"` | Must be `"knx-doorbell"` |
| `devices` | Yes | | Array of doorbell device configurations |
| `ip` | No | `224.0.23.12` | KNX router/interface IP address |
| `port` | No | `3671` | KNX port |

### Device options

| Option | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Display name for the doorbell in HomeKit |
| `listen_single_press` | Yes | KNX group address for single press (format: `X/X/X`) |
| `listen_double_press` | No | KNX group address for double press |
| `listen_long_press` | No | KNX group address for long press |

All group addresses expect DPT 1.001 (boolean) telegrams.

## Development

```sh
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Watch mode (builds, links, and starts Homebridge with live reload)
npm run watch
```

## License

[Apache-2.0](LICENSE)
