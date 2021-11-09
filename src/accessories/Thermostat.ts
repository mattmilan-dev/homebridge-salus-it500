import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { SalusIt500Platform } from '../platform';

import { v4 as uuid } from 'uuid';
import { SalusConnectAPI } from '../api/SalusConnect';

export class SalusIT500Thermostat {
  private service: Service;
  private salusConnectAPI: SalusConnectAPI;

  /**
   * CH1currentRoomTemp: string; CURRENT ROOM TEMP
   * CH1currentSetPoint: string; CURRENT ROOM SET TEMP
   * CH1autoOff: '1'|'0'; AUTO ON OR OFF
   * CH1heatOnOffStatus: '1'|'0'; BOILER ON OR OFF
   */
  private cacheState?: {
    CH1currentRoomTemp: string;
    CH1currentSetPoint: string;
    CH1autoOff: '1'|'0';
    CH1heatOnOffStatus: '1'|'0';
  };

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
    if (this.cacheState) {
      return this.cacheState.CH1heatOnOffStatus === '1' ? (
        this.platform.Characteristic.CurrentHeatingCoolingState.HEAT
      ) : (
        this.platform.Characteristic.CurrentHeatingCoolingState.OFF
      );
    }
    return (await this.salusConnectAPI.getBoilerOnOffState()) ? (
      this.platform.Characteristic.CurrentHeatingCoolingState.HEAT
    ) : (
      this.platform.Characteristic.CurrentHeatingCoolingState.OFF
    );
  }

  // Handle getting Target Heating/Cooling State
  async getTargetHeatingCoolingState() {
    if (this.cacheState) {
      return this.cacheState.CH1autoOff === '0' ? (
        this.platform.Characteristic.TargetHeatingCoolingState.AUTO
      ) : (
        this.platform.Characteristic.TargetHeatingCoolingState.OFF
      );
    }
    return (await this.salusConnectAPI.getAutoOnOffState()) ? (
      this.platform.Characteristic.TargetHeatingCoolingState.AUTO
    ) : (
      this.platform.Characteristic.TargetHeatingCoolingState.OFF
    );
  }

  // Handle setting Target Heating/Cooling Target
  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    this.cacheState = await this.salusConnectAPI.pingServer();
    this.cacheState.CH1autoOff = value === this.platform.Characteristic.TargetHeatingCoolingState.AUTO ? '0' : '1';

    this.salusConnectAPI
      .setAuto(value === this.platform.Characteristic.TargetHeatingCoolingState.AUTO ? 'ON' : 'OFF')
      .finally(() => {
        this.cacheState = undefined;
      });

    await new Promise(res => {
      setTimeout(res, 2500, true);
    });
  }

  // Handle getting the current temperature
  async getCurrentTemperature() {
    if (this.cacheState) {
      return parseFloat(this.cacheState.CH1currentRoomTemp).toFixed(1);
    }
    return parseFloat(await this.salusConnectAPI.getCurrentTemp() as string).toFixed(1);
  }

  // Handle getting the target temperature
  async getTargetTemperature() {
    if (this.cacheState) {
      return parseFloat(this.cacheState.CH1currentSetPoint).toFixed(1);
    }
    return parseFloat(await this.salusConnectAPI.getCurrentSetTemp() as string).toFixed(1);
  }

  // Handle setting the target temperature
  async setTargetTemperature(value: CharacteristicValue) {
    const cacheState = await this.salusConnectAPI.pingServer();
    this.cacheState = cacheState;
    this.cacheState.CH1currentSetPoint = value as string;
    this.cacheState.CH1autoOff = '0';

    if (cacheState.CH1autoOff === '1') {
      this.salusConnectAPI
        .setAuto('ON')
        .then(() => {
          return this.salusConnectAPI.setTemp(parseFloat(value as string));
        })
        .finally(() => {
          this.cacheState = undefined;
        });
    } else {
      this.salusConnectAPI
        .setTemp(parseFloat(value as string))
        .finally(() => {
          this.cacheState = undefined;
        });
    }



    await new Promise(res => {
      setTimeout(res, 2500, true);
    });
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