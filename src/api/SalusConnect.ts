import fetch, { Response } from 'node-fetch';
import { URLSearchParams } from 'url';

export class SalusConnectAPI {

  private uris = {
    login: 'https://salus-it500.com/public/login.php?lang=en',
    devices: 'https://salus-it500.com/public/devices.php',
    ping: 'https://salus-it500.com/public/ajax_device_values.php',
    control: 'https://salus-it500.com/includes/set.php',
  };

  private devId!: number;
  private username!: string;
  private password!: string;

  constructor(
    email: string,
    password: string,
    deviceId: number,
  ) {
    this.devId = deviceId;
    this.username = email;
    this.password = password;
  }

  // the main function to make a request to Salus
  private async makeRequest(url: 'ping'|'control', data: object) {
    try {
      // get the cookie to set for all the following requests.
      const cookieRequest = await fetch(this.uris.login);
      const cookie = `${cookieRequest.headers.get('set-cookie')?.split(';')[0] as string}`;

      // log in the account
      await fetch(this.uris.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          cookie,
        },
        body: new URLSearchParams({
          'IDemail': this.username,
          'password': this.password,
          'login': 'Login',
          // 'keep_logged_in': "0"
        }),
      });

      // get the token
      const tokenRegex = /name="token" type="hidden" value="(.*)" \/>/;
      const tokenRequest = await fetch(this.uris.devices, {
        headers: {
          cookie,
        },
      });
      const tokenRequestBody = await tokenRequest.text();
      const tokenMatch = tokenRequestBody.match(tokenRegex);

      if (!tokenMatch) {
        throw new TypeError('Something went wrong when trying to get a device token');
      }
      const [, token] = tokenMatch;

      // make the final request
      let finalRequest!: Response;
      switch(url) {
        case 'ping': {
          finalRequest = await fetch(`${this.uris.ping}?devId=${this.devId}&token=${token as string}`, {
            headers: {
              cookie,
            },
          });
          break;
        }
        case 'control': {
          finalRequest = await fetch(`${this.uris.control}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              cookie,
            },
            body: new URLSearchParams({
              token: token as string,
              ...data,
            }),
          });
          break;
        }
      }

      return await finalRequest.json();

    } catch (err) {
      return null;
    }
  }

  async pingServer() {
    return await this.makeRequest('ping', {}) as {
      CH1currentRoomTemp: string;
      CH1currentSetPoint: string;
      CH1autoOff: '1'|'0';
      CH1heatOnOffStatus: '0'|'1';
    };
  }

  async getCurrentTemp() {
    try {
      const { CH1currentRoomTemp } = await this.pingServer();
      return CH1currentRoomTemp;
    } catch (err) {
      return null;
    }
  }

  async getCurrentSetTemp() {
    try {
      const { CH1currentSetPoint } = await this.pingServer();
      return CH1currentSetPoint;
    } catch (err) {
      return null;
    }
  }

  async getBoilerOnOffState() {
    try {
      const { CH1heatOnOffStatus } = await this.pingServer();
      return CH1heatOnOffStatus === '1'; // true is on, false is off
    } catch (err) {
      return null;
    }
  }

  async getAutoOnOffState() {
    try {
      const { CH1autoOff } = await this.pingServer();
      return CH1autoOff === '0'; // true is on, false is off
    } catch (err) {
      return null;
    }
  }

  async setAuto(status: 'ON'|'OFF') {
    try {
      const res = await this.makeRequest('control', {
        auto: status === 'ON' ? 0 : 1,
        devId: this.devId,
        auto_setZ1: 1,
      });
      return res === '1';
    } catch {
      return null;
    }
  }

  async setTemp(temperatureToSet: number) {
    try {
      const res = await this.makeRequest('control', {
        tempUnit: 0,
        devId: this.devId,
        current_tempZ1_set: 1,
        current_tempZ1: temperatureToSet,
      }) as {
        retCode: '0';
        updTime: string;
      };
      return res;
    } catch (err) {
      return null;
    }
  }
}