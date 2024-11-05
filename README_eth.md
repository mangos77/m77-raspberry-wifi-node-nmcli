# m77-raspberry-wifi-node-nmcli (Ethernet)

> **Este es el módulo adicional para configurar interfaces ethernet desde nodejs**
 
___
Es un módulo que he desarrollado en **node.js** para configurar red ethernet de **Raspberry Pi** que usa **nmcli**.

___
**Está dispponible la implementación de este módulo para crear una API con todas las funcionalidades para node.js con express.**

La puedes encontrar en [***api-m77-raspberry-wifi-node-nmcli***](https://github.com/mangos77/api-m77-raspberry-wifi-node-nmcli)

___

## Instalar
```
npm install m77-raspberry-wifi-node-nmcli
```

## Uso
Para poder inicializar el módulo para ethernet, primero se debe de importar, crear una instancia e inicializar **(en una función asíncrona)** con la configuración deseada
```
const M77RaspberryETH = require('m77-raspberry-wifi-node-nmcli')
const eth = new M77RaspberryETH()

async function start() {
    const init = await eth.init()
}
start()
```

## Métodos
*** **Nota importante: Todos los métodos son asíncronos**

### listInterfaces()
Método auxiliar para conocer cuáles son las interfaces ethernet del sistema
```
const interfaces = await eth.listInterfaces()
console.log(interfaces)
```
Respuesta:
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
{ success: false, code: 2002, msg: `There are no ethernet interfaces in the system.`, data: [] }
```

### init(opciones)
Inicializa la interfaz y opciones para poder usar los demás métodos
opciones:
- *device* - La interfaz que se usará - por defecto **wlan0**
- *debugLevel* - El nivel de debug que se muestra en consola (0 - Nada, 1 - Básico, 2 - Completo) - Por defecto **2**

```
const init = await eth.init({ device: "wlan0", debugLevel: 0 })
console.log(init)
```

Respuesta:
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

### status(withConnectionInfo)
Muestra el estatus de conexión en la interfaz
Opciones:
- *withConnectionInfo* - Si **true** muestra información adicional sobre la conexión establecida - por defecto **false**



```
const status = await wifi.status()
console.log(status)
```

Respuesta:
*** Sin conexión establecida***
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
*** Con conexión establecida***
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


### setConnection(configuración)
Método que intenta establecer conexión con una red ethernet.
configuración:
- *ipaddress* - Establecer de forma estática la dirección ip de la conexión (*)
- *netmask* - Establecer de forma estática la máscara de red (*)
- *gateway* - Establecer de forma estática la pasarela (*)
- *dns* - Establecer de forma estática los DNS de la conexión, estas deben estar en un arreglo (*)
- *timeout* - Tiempo máximo en segundos para esperar la conexión a la red - Por defecto **60**

```
console.log("\n\Set connection with DHCP:")
const connect_dhcp = await eth.setConnection({ timeout: 45 })
console.log(connect_dhcp)

console.log("\n\Set connection with static params:")
const connect_static = await eth.setConnection({ipaddress:"192.168.68.179", netmask:"255.255.255.0", gateway:"192.168.255.10", dns:['8.8.4.4', '8.8.8.8'], timeout: 45 })
console.log(connect_static)
```
Respuesta:
***Se pudo establecer la conexión***
```
{
  success: true,
  code: 1062,
  msg: 'The ethernet interface has been successfully configured',
  data: { milliseconds: 327 }
}
```

***El cable de red no está conectado a la interfaz***
```
{
  success: false,
  code: 2067,
  msg: 'Ethernet interface cable is not plugged in',
  data: { milliseconds: 27, device: 'eth0' }
}
```

***No fue posible establecer la conexión***
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




### Códigos de respuesta

Esta es la lista de todos los códigos de respuesta y a qué función están asociados, si es un código de error (de cualquier forma en las respuestas el valor de ***success*** indica si fue satisfactoria o es un error).

Esto puede servir para poder adaptar los textos de respuesta como se requiera en desarrollos y/o traducirlos en la implementación.

| Código | Err | Función         | Descripción |
|:------:|:---:|:----------------|:------------|
| 1002 |   | list_interfaces     | Ethernet interfaces found on the system
| 2002 | X | list_interfaces     | There are no ethernet interfaces in the system
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


> Espero les sea de utilidad, si encuentras algún punto de mejora o comentario, por favor hazlo :-)