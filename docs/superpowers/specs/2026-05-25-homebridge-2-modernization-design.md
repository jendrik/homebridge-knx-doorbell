# Homebridge 2 Modernization Design

## Scope

Modernize `@jendrik/homebridge-knx-doorbell` for Homebridge 2.0 without preserving Homebridge 1.x or Node 20 compatibility. The plugin remains HomeKit-only and continues to use the existing `knx` and `fakegato-history` libraries.

This release intentionally keeps the current `StaticPlatformPlugin` model. Homebridge 2 still exposes the static platform API, and this plugin's accessories are defined from startup configuration rather than discovered dynamically. A later dynamic-platform migration may be useful for Homebridge verified-plugin alignment, but it is not required for this compatibility update.

## Architecture

The existing file layout remains mostly intact:

- `src/index.ts` registers the platform.
- `src/platform.ts` owns Homebridge API references, config validation, KNX connection lifecycle, and accessory construction.
- `src/accessory.ts` owns HomeKit services, Eve history integration, and KNX datapoint subscriptions for a single configured doorbell.
- `src/settings.ts` keeps package-derived constants.

The platform should add typed configuration parsing and validation. Runtime code should stop depending on unchecked `any` values from `PlatformConfig`, especially for `devices`, `ip`, and `port`.

KNX behavior should be centralized enough that connection startup, error logging, and shutdown cleanup live in one platform-owned boundary. The implementation may still use `knx.Connection` directly; the goal is containment, not a driver replacement.

## Behavior And Data Flow

At startup, Homebridge loads the platform, the platform validates global settings and device entries, opens one KNX connection using configured `ip` and `port` defaults, and creates one accessory for each valid doorbell configuration.

Invalid device entries should be skipped with a precise log message. A missing, non-array, or empty `devices` value should not crash Homebridge; it should produce a clear warning and expose no accessories.

Each valid accessory continues to expose:

- `AccessoryInformation`
- `Doorbell`
- `ContactSensor`
- `fakegato-history` history service

Each configured KNX group address continues to use DPT `1.001` boolean telegrams:

- `listen_single_press: true` emits `ProgrammableSwitchEvent.SINGLE_PRESS`
- `listen_double_press: true` emits `ProgrammableSwitchEvent.DOUBLE_PRESS`
- `listen_long_press: true` emits `ProgrammableSwitchEvent.LONG_PRESS`
- `false` values return the contact sensor state to not detected

The contact sensor should update the `ContactSensorState` characteristic for detected/not-detected state. `StatusActive` should only be used as a boolean health/status characteristic if it remains in use. The current misuse of `StatusActive` with `ContactSensorState` enum values should be corrected.

## Configuration Schema

`config.schema.json` should match runtime behavior:

- `port` should be numeric, not a string.
- `devices` should be an array with standard JSON Schema `required` declarations.
- The typo in "Listen Doubel Press Address" should be corrected.
- Group address patterns should remain constrained to `X/X/X` style addresses.

The README should reflect Homebridge 2-only support and Node `^22.12.0 || ^24.0.0`.

## Error Handling And Lifecycle

Config validation should log invalid global fields and invalid devices without throwing unhandled exceptions.

KNX connection errors should log the status or error payload and should not crash the process. The platform should subscribe to Homebridge `shutdown` and close or destroy the KNX connection if the retained `knx` library exposes a usable disconnect method.

The plugin should not execute post-install scripts, require a TTY, or require non-standard Homebridge startup parameters.

## Dependencies And Tooling

Update package metadata and tooling for Homebridge 2:

- Set `engines.homebridge` to `^2.0.0`.
- Set `engines.node` to `^22.12.0 || ^24.0.0`.
- Update the `homebridge` development dependency to Homebridge 2.
- Remove Node 20 from CI and documentation.
- Keep `knx` and `fakegato-history`, updating only to compatible patch or minor versions.
- Refresh TypeScript, ESLint, and related developer dependencies only where they work cleanly with the existing ESM TypeScript setup on Node 22/24.

Any remaining production audit findings caused by retained `knx` or `fakegato-history` transitive dependencies should be documented in the release notes or final implementation summary rather than hidden.

## Testing

Add focused automated tests where they create confidence without requiring a live KNX bus or Homebridge runtime:

- Unit-test config normalization and validation, including invalid devices and default `ip`/`port` behavior.
- Unit-test press handling if it can be done with lightweight mocked Homebridge services and characteristics.

Release verification should run:

- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`

If `npm audit --omit=dev` still reports retained-library findings, the output should be summarized explicitly with the reason the dependency was retained.
