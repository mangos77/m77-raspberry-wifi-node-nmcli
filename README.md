# m77-raspberry-wifi-node-nmcli

> **This is the new module to configure WiFi networks from nodejs**

> **In current versions of Raspberry OS wpa_cli is no longer used, instead all network configuration is done through nmcli. For this reason the package ***m77-raspberry-wifi-node**** it is no longer used*
  
___
It is a module that I have developed in **node.js** to configure the Wi-Fi network of **Raspberry Pi** that uses **nmcli**.
___
**Implementation of this module is available to create a full-featured API for node.js with express.**

You can find it at [***api-m77-raspberry-wifi-node-nmcli***](https://github.com/mangos77/api-m77-raspberry-wifi-node-nmcli)

___


### Because?

Because I have benefited a lot from the work of other people and organizations that offer development modules and I want to give something back to the community.

I have dedicated several hours to trying to provide the necessary functionalities for correct application development in node.js.

I hope you find it very useful and recommend it so that it reaches more developers :-)

## Install
```
npm install m77-raspberry-wifi-node-nmcli
```

## Use
In order to initialize the module, you must first import it, create an instance and initialize **(in an asynchronous function)** with the desired configuration
```
const M77RaspberryWIFI = require('m77-raspberry-wifi-node-nmcli')
const wifi = new M77RaspberryWIFI()

async function start() {
    const init = await wifi.init()
}
start()
```

## Methods
*** **Important note: All methods are asynchronous**

### listInterfaces()
Auxiliary method to know which are the Wi-Fi interfaces of the system
```
const interfaces = await wifi.listInterfaces()
console.log(interfaces)
```
Response:
```
{
  success: true,
  code: 1001,
  msg: 'Wi-Fi interfaces found on the system',
  data: [ 'wlan0' ]
}
```
Error:
```
{ success: false, code: 2001, msg: `There are no Wi-Fi interfaces in the system.`, data: [] }
```

### init(options)
Initialize the interface and options to be able to use the other methods
options:
- *device* - The interface to use - default **wlan0**
- *debugLevel* - The debug level displayed in the console (0 - Nothing, 1 - Basic, 2 - Full) - Default **2**
- 
```
const init = await wifi.init({ device: "wlan0", debugLevel: 0 })
console.log(init)
```

Response:
```
{ 
  success: true, 
  code: 1101, 
  msg: `Interface has been found on the system`, 
  data: { device: this.device }
}
```

Error:
```
{ 
  success: false, 
  code: 2101, 
  msg: `The interface does not exist. Please execute the listInterfaces() method to get the list of available Wifi interfaces and set in init() method`, 
  data: { device: "wlan1"} 
}
```

### status(withConnectionInfo)
Show connection status on the interface
Options:
- *withConnectionInfo* - If **true** shows additional information about the established connection - default **false**


```
const status = await wifi.status()
console.log(status)
```

Response:
***No connection established***
```
{
  success: true,
  code: 1011,
  msg: "Got interface status",
  data: {
    device: 'wlan0',
    connected: false,
    state_code: 30,
    state_str: 'disconnected',
    ssid: '',
    device_info: {
      hwaddr: 'D8:3A:DD:2D:CB:B7',
      mtu: '1500',
      ipaddress: '',
      gateway: '',
      dns: []
    }
  }
}
```
***With connection established***
```
{
  success: true,
  code: 1011,
  msg: "Got interface status",
  data: {
    device: "wlan0",
    connected: true,
    state_code: 100,
    state_str: "connected",
    ssid: "mangos77",
    device_info: {
      hwaddr: "D8:3A:DD:2D:CB:B7",
      mtu: "1500",
      ipaddress: "192.168.68.93",
      gateway: "192.168.68.1",
      dns: [
        "8.8.8.8",
        "8.8.4.4"
      ]
    }
  }
}
```
***With extra connection details***
```
{
  success: true,
  code: 1011,
  msg: "Got interface status",
  data: {
    device: "wlan0",
    connected: true,
    state_code: 100,
    state_str: "connected",
    ssid: "mangos77",
    device_info: {
      hwaddr: "D8:3A:DD:2D:CB:B7",
      mtu: "1500",
      ipaddress: "192.168.68.93",
      gateway: "192.168.68.1",
      dns: [
        "8.8.8.8",
        "8.8.4.4"
      ]
    },
    connection_info: {
      bssid: "48:22:54:9D:4A:C7",
      ssid: "mangos77",
      chan: "44",
      band: "5 GHz",
      rate: "270 Mbit/s",
      security: "WPA2",
      strength: 4
    }
  }
}
```

### savedNetworks()
Provides a list of all Wi-Fi networks saved in the interface that can be connected to
```
const saved = await wifi.savedNetworks()
console.log(saved)
```

Response:
```
{
  success: true,
  code: 1021,
  msg: 'List of saved Wi-Fi networks',
  data: [ 
    { ssid: 'mangos77', device: 'wlan0', active: true },
    ...
  ]
}
```

### removeNetwork(ssid)
Delete a saved connection
```
const remove = await wifi.removeNetwork('mangos77')
console.log(remove)
```

Response:
```
{
  success: true,
  code: 1051,
  msg: "Wi-Fi network has been removed on the system",
  data: { ssid: 'mangos77' }
}
```

Error:
```
{
  success: false,
  code: 2051,
  msg: "Wi-Fi network is not in saved networks",
  data: { ssid: 'mangos77' }
}
```

### removeAllNetworks()
Delete all saved Wi-Fi networks. If there is any connection established, it will close it.
```
const removeAllNetworks = await wifi.removeAllNetworks()
console.log(removeAllNetworks)
```

Response:
```
{
  success: true,
  code: 1041,
  msg: "All Wi-Fi networks removed",
  data: [ 'mangos77' ]
}
```


### scan()
Provides results of all Wi-Fi networks available to connect, ordered from the most recent saved connection to the oldest.

Data is added to the response in each of the detected networks:
- **band** - (2.4 GHz or 5 GHz)
- **strength** - [1 (weak) to 4 (Very strong)]
```
const scan = await wifi.scan()
console.log(scan)
```
Response:
```
{
  success: true,
  code: 1031,
  msg: "List of scanned Wi-Fi networks was obtained",
  data: [
    {
      current: false,
      bssid: '60:C5:B2:75:E2:BE',
      ssid: 'SG-B19****0487',
      chan: '3',
      band: '5 GHz',
      rate: '270 Mbit/s',
      security: 'WPA2',
      strength: 4
    },
    ...
  ]
}
```


### connect(config)
Method that attempts to establish a connection with a Wi-Fi network, this can be secure, hidden, open networks or combinations.
If the connection could not be made, an attempt is made to connect to one of the Wi-Fi networks saved in the system that are available.
**This action can take a long time per connection attempt, the maximum timeout for each connection attempt is defined in init() with the *connect_timeout* configuration parameter **
setting:
- *ssid* - Name of the Wi-Fi network to connect
- *psk* - Wifi network password - **Leave empty in case of open network**
- *bssid* - Use the bssid in case you want to fix the connection, *or in case the ssid uses two bands and you need to connect to a specific band* - By default ''
- *ipaddress* - Statically set the IP address of the connection (*)
- *netmask* - Statically set the netmask (*)
- *gateway* - Statically establish the gateway (*)
- *dns* - Statically establish the DNS of the connection, these must be in an array (*)
- *hidden* - [true | false] To indicate whether or not it is a hidden network - By default **false**
- *timeout* - Maximum time in seconds to wait for network connection - Default **60**
```
const connect = await wifi.connect({ ssid: "mangos77", psk: "ABCDE12345", bssid: "4E:22:54:9D:4A:C6", hidden: false, timeout: 45 })
console.log(connect)
```
Response:
***Connection could be established***
```
{
  success: true,
  code: 1061,
  msg: "The Wi-Fi network has been successfully configured on interface",
  data: { 
    milliseconds: 3273, 
    ssid: 'mangos77' 
  }
}
```

***The connection could not be established***
```
{
  success: false,
  code: 2061,
  msg: "Could not connect to SSID on interface",
  data: { 
    milliseconds: 25831, 
    ssid: 'mangos77',
    device: "wlan0" 
  }
}
```

### reconnect(config)
Method that attempts to reconnect with a previously saved Wi-Fi network.

setting:
- *ssid* - Name of the Wi-Fi network to connect
- *timeout* - Maximum time in seconds to wait for network reconnection - Default **60**

```
const reconnect = await wifi.reconnect({ ssid: "mangos77", timeout: 30 })
console.log(reconnect)
```

Response:
***Reconnection could be established***
```
{
  success: true,
  code: 1071,
  msg: "The Wi-Fi network has been successfully reconnected on interface",
  data: { 
    milliseconds: 8531, 
    ssid: 'mangos77' 
  }
}
```

***Reconnection could not be established***
```
{
  success: false,
  code: 2071,
  msg: "Could not reconnect to SSID on interface, because the Wi-Fi network is not in those previously saved in the system",
  data: { 
    milliseconds: 146, 
    ssid: 'other_net',
    device: "wlan0" 
  }
}
```

### disconnect()
Method to disconnect the current Wifi from the interface
```
const disconnect = await wifi.disconnect()
console.log(disconnect)
```
Response:
```
{ 
  success: true, 
  code: 1091,
  msg: "You have been disconnected from the Wi-Fi network",
}
```

### Response codes

This is the list of all the response codes and what function they are associated with, if it is an error code (either in the responses the value of ***success*** indicates whether it was successful or an error).

This can be used to adapt the response texts as required in developments and/or translate them in the implementation.

|  Code  | Err | Function           | Description |
|:------:|:---:|:-------------------|:------------|
| 1001 |   | list_interfaces     | Wi-Fi interfaces found on the system
| 2001 | X | list_interfaces     | There are no Wi-Fi interfaces in the system
| 1011 |   | status              | Got interface status
| 2011 | X | status              | Failed to get the status of interface
| 1021 |   | saved_networks      | List of saved Wi-Fi networks
| 2021 | X | saved_networks      | It was not possible to obtain the list of saved Wi-Fi networks in inteface
| 1031 |   | scan                | List of scanned Wi-Fi networks was obtained
| 2031 | X | scan                | It was not possible to obtain the list of the scanned Wi-Fi networks in inteface
| 1041 |   | remove_all_networks | All Wi-Fi networks removed
| 1051 |   | remove_network      | Wi-Fi network has been removed on the system
| 2051 | X | remove_network      | Wi-Fi network is not in saved networks
| 1061 |   | connect             | The Wi-Fi network has been successfully configured on interface
| 2061 | X | connect             | Could not connect to SSID on interface
| 2062 | X | connect             | The static ipaddress is not valid
| 2063 | X | connect             | The static netmask is not valid
| 2064 | X | connect             | The static gateway is not valid
| 2065 | X | connect             | One or more static dns are not valid
| 2066 | X | connect             | To set a custom address parameters; ipaddress, netmask, gateway and dns are required
| 1071 |   | reconnect           | The Wi-Fi network has been successfully reconnected on interface
| 2071 | X | reconnect           | Could not reconnect to SSID on interface, because the Wi-Fi network is not in those previously saved in the system
| 1091 |   | disconnect          | You have been disconnected from the Wi-Fi network
| 2091 | X | disconnect          | There is no connection established to disconnect
| 2092 | X | disconnect          | It was not possible to disconnect from the network
| 2093 | X | disconnect          | An error occurred when obtaining the data of the connected Wi-Fi network to be able to disconnect
| 1101 |   | init                | Interface has been found on the system
| 2101 | X | init                | The interface does not exist. Please execute the listInterfaces() method to get the list of available Wifi interfaces and set in init() method


> I hope it is useful to you, if you find any point of improvement or comment, please do so :-)