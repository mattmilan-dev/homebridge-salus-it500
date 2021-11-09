import { Service, PlatformAccessory } from 'homebridge';
import { SalusIt500Platform } from '../platform';

import { v4 as uuid } from 'uuid';
import { SalusConnectAPI } from '../api/SalusConnect';

export class SalusIT500BoilerActive {
  private service: Service;

  constructor(
    private readonly platform: SalusIt500Platform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Salus Controls')
      .setCharacteristic(this.platform.Characteristic.Model, 'Boiler Active')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, uuid());

    this.service = this.accessory.getService(this.platform.Service.Fan) ||
        this.accessory.addService(this.platform.Service.Fan);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // get the boiler state
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getBoilerState.bind(this))
      .onSet(this.setBoilerState.bind(this));
  }

  async getBoilerState() {
    const salusApi = new SalusConnectAPI(
      this.platform.config.username,
      this.platform.config.password,
      this.platform.config.deviceId,
    );

    const boilerOn = await salusApi.getBoilerOnOffState();

    return boilerOn ? 1 : 0;
  }

  setBoilerState() {
    this.platform.log.debug('User is calling to change boiler state. NOT_SUPPORTED');
  }

}