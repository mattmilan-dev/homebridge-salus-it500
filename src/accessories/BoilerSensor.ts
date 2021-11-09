import { Service, PlatformAccessory } from 'homebridge';
import { SalusIt500Platform } from '../platform';

import { v4 as uuid } from 'uuid';
import { SalusConnectAPI } from './../api/SalusConnect';

export class SalusIT500BoilerSensor {
  private service: Service;

  constructor(
    private readonly platform: SalusIt500Platform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Salus Controls')
      .setCharacteristic(this.platform.Characteristic.Model, 'Boiler Sensor')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, uuid());

    this.service = this.accessory.getService(this.platform.Service.ContactSensor) ||
        this.accessory.addService(this.platform.Service.ContactSensor);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // get the boiler state
    this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getBoilerState.bind(this));
  }

  async getBoilerState() {
    const salusApi = new SalusConnectAPI(
      this.platform.config.username,
      this.platform.config.password,
      this.platform.config.deviceId,
    );

    const boilerOn = await salusApi.getBoilerOnOffState();

    return boilerOn ? (
      this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
    ) : (
      this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
    );
  }

}