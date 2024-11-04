# m77-raspberry-wifi-node-nmcli (Ethernet)

> **This is the additional module to configure ethernet interfaces from nodejs**
 
___
This is a module I developed in **node.js** to configure Ethernet network on **Raspberry Pi** using **nmcli**.

___
**The implementation of this module is available to create an API with all functionalities for node.js with express.**

You can find it at [***api-m77-raspberry-wifi-node-nmcli***](https://github.com/mangos77/api-m77-raspberry-wifi-node-nmcli)

___

## Install
```
npm install m77-raspberry-wifi-node-nmcli
```

## Usage
To initialize the Ethernet module, first import it, create an instance, and initialize it **(in an asynchronous function)** with the desired configuration.
```
const M77RaspberryETH = require('m77-raspberry-wifi-node-nmcli')
const eth = new M77RaspberryETH()

async function start() {
    const init = await eth.init()
}
start()
```

## Methods
*** **Important Note: All methods are asynchronous**

### listInterfaces()
Auxiliary method to find out which ethernet interfaces are on the system.
```
const interfaces = await eth.listInterfaces()
console.log(interfaces)
```
Response:
```
{
  success: true,
  code: 1001,
  msg: 'Ethernet interfaces found on the system',
  data: [ 'wlan0' ]
}
```
Error:
```
{ success: false, code: 2001, msg: `There are no ethernet interfaces in the system.`, data: [] }
```

### init(options)
Initializes the interface and options to use other methods.
options:
- *device* - The interface to be used - default **wlan0**
- *debugLevel* - The level of debug output to console (0 - None, 1 - Basic, 2 - Full) - Default **2**

```
const init = await eth.init({ device: "wlan0", debugLevel: 0 })
console.log(init)
```

Response:
```
{ 
  success: true, 
  code: 1102, 
  msg: `Ethernet interface has been found on the system`, 
  data: { device: this.device }
}
```

Error:
```
{ 
  success: false, 
  code: 2102, 
  msg: `The ethernet interface does not exist. Please execute the listInterfaces() method to get the list of available ethernet interfaces and set in init() method`, 
  data: { device: "wlan1"} 
}
```

### status()
Displays connection status on the interface.

```
const status = await wifi.status()
console.log(status)
```

Response:
*** Without an established connection ***
```
{
  success: true,
  code: 1012,
  msg: "Got ethernet interface status",
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

*** With an established connection ***
```
{
  success: true,
  code: 1012,
  msg: 'Got ethernet interface status',
  data: {
    device: 'eth0',
    connected: true,
    state_code: 100,
    state_str: 'connected',
    device_info: {
      hwaddr: 'D8:3A:DD:97:EB:48',
      mtu: '1500',
      ipaddress: '192.168.68.201',
      netmask: '255.255.252.0',
      gateway: '192.168.68.1',
      dns: [ '8.8.8.8', '8.8.4.4' ]
    }
  }
}
```


### setConnection(configuration)
Method that tries to establish a connection with an ethernet network.
configuration:
- *ipaddress* - Set the IP address of the connection statically (*)
- *netmask* - Set the netmask statically (*)
- *gateway* - Set the gateway statically (*)
- *dns* - Set DNS for the connection statically; must be in an array (*)
- *timeout* - Maximum time in seconds to wait for connection to the network - Default **60**

```
console.log("\n\Set connection with DHCP:")
const connect_dhcp = await eth.setConnection({ timeout: 45 })
console.log(connect_dhcp)

console.log("\n\Set connection with static params:")
const connect_static = await eth.setConnection({ipaddress:"192.168.68.179", netmask:"255.255.255.0", gateway:"192.168.255.10", dns:['8.8.4.4', '8.8.8.8'], timeout: 45 })
console.log(connect_static)
```
Response:
***Connection was established***
```
{
  success: true,
  code: 1062,
  msg: 'The ethernet interface has been successfully configured',
  data: { milliseconds: 327 }
}
```

***The network cable is not plugged into the interface***
```
{
  success: false,
  code: 2067,
  msg: 'Ethernet interface cable is not plugged in',
  data: { milliseconds: 27, device: 'eth0' }
}
```

***Could not establish connection***
```
{
  success: false,
  code: 2068,
  msg: `Could not connect to ethernet interface`,
  data: {
      milliseconds: 245,
      device: 'eth0'
  }
}
```




### Response Codes

This is the list of all response codes and the functions they are associated with; if it’s an error code (in all responses, the ***success*** value indicates if it was successful or is an error).

This can help to adapt response texts as needed in developments and/or translate them in implementation.

| Código | Err | Función         | Descripción |
|:------:|:---:|:----------------|:------------|
| 1002 |   | list_interfaces     | Ethernet interfaces found on the system
| 2001 | X | list_interfaces     | There are no ethernet interfaces in the system
| 1012 |   | status              | Got ethernet interface status
| 2013 | X | status              | Failed to get the status of ethernet interface
| 1062 |   | setConnection       | The ethernet interface has been successfully configured
| 2067 | X | setConnection       | Ethernet interface cable is not plugged in
| 2068 | X | setConnection       | Could not connect to ethernet interface
| 2062 | X | setConnection       | The static ipaddress is not valid
| 2063 | X | setConnection       | The static netmask is not valid
| 2064 | X | setConnection       | The static gateway is not valid
| 2065 | X | setConnection       | One or more static dns are not valid
| 2066 | X | setConnection       | To set a custom address parameters; ipaddress, netmask, gateway and dns are required
| 1102 |   | init                | Ethernet interface has been found on the system
| 2102 | X | init                | The ethernet interface does not exist. Please execute the listInterfaces() method to get the list of available ethernet interfaces and set in init() method


> I hope you find this helpful. If you find any point for improvement or have feedback, please share it :-)
