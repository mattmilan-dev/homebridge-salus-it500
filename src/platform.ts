import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SalusIT500BoilerSensor } from './accessories/BoilerSensor';
import { SalusIT500Thermostat } from './accessories/Thermostat';
export class SalusIt500Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }

  discoverDevices() {

    const devices = [
      {
        uuid: this.api.hap.uuid.generate('salusit500-thermostat'),
        name: 'SalusIT500 Thermostat',
        consoleName: 'salusit500-thermostat',
      },
      {
        uuid: this.api.hap.uuid.generate('salusit500-contactsensor'),
        name: 'SalusIT500 Heating Sensor',
        consoleName: 'salusit500-contactsensor',
      },
    ];

    for (const device of devices) {

      // register the accessory
      const foundAccessory = this.accessories.find(registeredAccessory => registeredAccessory.UUID === device.uuid);

      if (!foundAccessory) {

        // create the accessory
        const accessory = new this.api.platformAccessory(device.name, device.uuid);
        accessory.context.device = device;

        switch (device.consoleName) {
          case 'salusit500-thermostat': {
            // register the thermostat
            new SalusIT500Thermostat(this, accessory);
            break;
          }
          case 'salusit500-contactsensor': {
            // register the contact sensor
            new SalusIT500BoilerSensor(this, accessory);
            break;
          }
        }

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      } else {
        switch (device.consoleName) {
          case 'salusit500-thermostat': {
            // register the thermostat
            new SalusIT500Thermostat(this, foundAccessory);
            break;
          }
          case 'salusit500-contactsensor': {
            // register the contact sensor
            new SalusIT500BoilerSensor(this, foundAccessory);
            break;
          }
        }
      }
    }

  }
}