import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SalusIt500Platform } from '../platform';

import { v4 as uuid } from 'uuid';
import { SalusConnectAPI } from '../api/SalusConnect';

export class SalusIT500Thermostat {
  private service: Service;
  private salusConnectAPI: SalusConnectAPI;

  constructor(
    private readonly platform: SalusIt500Platform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.salusConnectAPI = new SalusConnectAPI(
      this.platform.config.username,
      this.platform.config.password,
      this.platform.config.deviceId,
    );

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Salus Controls')
      .setCharacteristic(this.platform.Characteristic.Model, 'IT500')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, uuid());

    this.service = this.accessory.getService(this.platform.Service.Thermostat) ||
        this.accessory.addService(this.platform.Service.Thermostat);

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: [
          this.platform.Characteristic.TargetHeatingCoolingState.AUTO,
          this.platform.Characteristic.TargetHeatingCoolingState.OFF,
        ],
      })
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({
        minValue: 5,
        maxValue: 35,
      })
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.getTemperatureDisplayUnits.bind(this))
      .onSet(this.setTemperatureDisplayUnits.bind(this));

  }

  // Handle getting Current Heating/Cooling State
  async getCurrentHeatingCoolingState() {
    return (await this.salusConnectAPI.getBoilerOnOffState()) ? (
      this.platform.Characteristic.CurrentHeatingCoolingState.HEAT
    ) : (
      this.platform.Characteristic.CurrentHeatingCoolingState.OFF
    );
  }

  // Handle getting Target Heating/Cooling State
  async getTargetHeatingCoolingState() {
    return (await this.salusConnectAPI.getAutoOnOffState()) ? (
      this.platform.Characteristic.TargetHeatingCoolingState.AUTO
    ) : (
      this.platform.Characteristic.TargetHeatingCoolingState.OFF
    );
  }

  // Handle setting Target Heating/Cooling Target
  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    await Promise.race([
      this.salusConnectAPI[value === this.platform.Characteristic.TargetHeatingCoolingState.AUTO ? 'setAutoOn' : 'setAutoOff'](),
      new Promise(res => {
        setTimeout(res, 5000, true);
      }),
    ]);
  }

  // Handle getting the current temperature
  async getCurrentTemperature() {
    return parseFloat(await this.salusConnectAPI.getCurrentTemp() as string).toFixed(1);
  }

  // Handle getting the target temperature
  async getTargetTemperature() {
    return parseFloat(await this.salusConnectAPI.getCurrentSetTemp() as string).toFixed(1);
  }

  // Handle setting the target temperature
  async setTargetTemperature(value: CharacteristicValue) {
    await Promise.race([
      this.salusConnectAPI.setTemp(parseFloat(value as string)),
      new Promise(res => {
        setTimeout(res, 5000, true);
      }),
    ]);
  }

  // Handle getting temp display (force as celsius)
  getTemperatureDisplayUnits() {
    return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
  }

  // Handle setting temp display
  setTemperatureDisplayUnits(value: CharacteristicValue) {
    this.platform.log.debug('Attempted to change temperature units to:', value);
  }

}