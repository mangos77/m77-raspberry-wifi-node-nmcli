# m77-raspberry-wifi-node-nmcli

> **Este es el nuevo módulo para configurar redes WiFi desde nodejs**

> **En versiones actuales de Raspberry OS ya no se usa wpa_cli, en cambio toda la configuración de red es por nmcli. Por esto el paquete ***m77-raspberry-wifi-node**** ya no es utilizado*
  
___
Es un módulo que he desarrollado en **node.js** para configurar red Wi-Fi de **Raspberry Pi** que usa **nmcli**.

___
**Está dispponible la implementación de este módulo para crear una API con todas las funcionalidades para node.js con express.**

La puedes encontrar en [***api-m77-raspberry-wifi-node-nmcli***](https://github.com/mangos77/api-m77-raspberry-wifi-node-nmcli)

___

> **Adicional:** Se agrega un módulo para conexiones ethernet

___

### ¿Por qué?

Porque me he beneficiado mucho del trabajo de otras personas y organizaciones que ofrecen módulos de desarrollo y quiero regresar algo a la comunidad.

Le he dedicado varias horas para intentar dar las funcionalidades necesarias para un correcto desarrollo de aplicaciones en node.js.

Espero que les sea de gran utilidad y la recomienden para que llegue a más desarrolladores :-)

## Instalar
```
npm install m77-raspberry-wifi-node-nmcli
```

## Uso
Para poder inicializar el módulo, primero se debe de importar, crear una instancia e inicializar **(en una función asíncrona)** con la configuración deseada
```
const M77RaspberryWIFI = require('m77-raspberry-wifi-node-nmcli')
const wifi = new M77RaspberryWIFI()

async function start() {
    const init = await wifi.init()
}
start()
```

## Métodos
*** **Nota importante: Todos los métodos son asíncronos**

### listInterfaces()
Método auxiliar para conocer cuáles son las interfaces Wifi del sistema
```
const interfaces = await wifi.listInterfaces()
console.log(interfaces)
```
Respuesta:
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

### init(opciones)
Inicializa la interfaz y opciones para poder usar los demás métodos
opciones:
- *device* - La interfaz que se usará - por defecto **wlan0**
- *debugLevel* - El nivel de debug que se muestra en consola (0 - Nada, 1 - Básico, 2 - Completo) - Por defecto **2**

```
const init = await wifi.init({ device: "wlan0", debugLevel: 0 })
console.log(init)
```

Respuesta:
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
*** Con conexión establecida***
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
*** Con detalles extra de conexión***
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
Entrega listado de todas las redes Wifi guardadas en la interfaz a las que se puede conectar
```
const saved = await wifi.savedNetworks()
console.log(saved)
```

Respuesta:
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
Elimina una conexión guardada
```
const remove = await wifi.removeNetwork('mangos77')
console.log(remove)
```

Respuesta:
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
Elimina todas  las redes Wifi guardadas. Si existe alguna conexión establecida la cerrará.
```
const removeAllNetworks = await wifi.removeAllNetworks()
console.log(removeAllNetworks)
```

Respuesta:
```
{
  success: true,
  code: 1041,
  msg: "All Wi-Fi networks removed",
  data: [ 'mangos77' ]
}
```


### scan()
Entrega resultado de todas las redes Wifi disponibles para conectarse ordenadas desde la conexión guardada más reciente a la más antigua.

Se agregan datos en la respuesta en cada una de las redes detectadas: 
- **band** - (2.4 GHz o 5 GHz)
- **strength** - [1 (débil) a 4 (Muy fuerte)]
```
const scan = await wifi.scan()
console.log(scan)
```
Respuesta:
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


### connect(configuración)
Método que intenta establecer conexión con una red Wifi, esto puede ser redes seguras, ocultas, abiertas o combinaciones.
Si la conexión no pudo realizarse se intenta conectar a alguna de las redes Wifi guardadas en el sistema que estén disponibles.
**Esta acción puede llevar mucho tiempo por el intento de conexión, el tiempo máximo de espera de cada intento de conexión está definido en init() con el parámetro de configuración *connect_timeout* **
configuración:
- *ssid* - Nombre de la red Wifi a conectarse
- *psk* - Contraseña de la red Wifi - **Dejar vacío en caso de red abierta**
- *bssid* - Usar el bssid en caso que se deseara fijar la conexión, *o en el caso que el ssid use dos bandas y se necsite conectar a una banda determinada* - Por defecto '' 
- *ipaddress* - Establecer de forma estática la dirección ip de la conexión (*)
- *netmask* - Establecer de forma estática la máscara de red (*)
- *gateway* - Establecer de forma estática la pasarela (*)
- *dns* - Establecer de forma estática los DNS de la conexión, estas deben estar en un arreglo (*)
- *hidden* - [true | false] Para indicar si se trata o no de una red oculta - Por defecto **false**
- *timeout* - Tiempo máximo en segundos para esperar la conexión a la red - Por defecto **60**

```
const connect = await wifi.connect({ ssid: "mangos77", psk: "ABCDE12345", bssid: "48:22:54:9D:4A:C7", ipaddress:"192.168.68.179", netmask:"255.255.252.0", gateway:"192.168.255.1", dns:['8.8.8.8', '8.8.4.4'], hidden: false, timeout: 45 })
console.log(connect)
```
Respuesta:
***Se pudo establecer la conexión***
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

***No fue posible establecer la conexión***
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

### reconnect(configuración)
Método que intenta reconectar con una red Wifi guardada anteriormente.

configuración:
- *ssid* - Nombre de la red Wifi a conectarse
- *timeout* - Tiempo máximo en segundos para esperar la reconexión a la red - Por defecto **60**

```
const reconnect = await wifi.reconnect({ ssid: "mangos77", timeout: 30 })
console.log(reconnect)
```
Respuesta:
***Se pudo establecer la reconexión***
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

***No fue posible establecer la reconexión***
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
Método para desconectar la Wifi actual de la interfaz
```
const disconnect = await wifi.disconnect()
console.log(disconnect)
```
Respuesta:
```
{ 
  success: true, 
  code: 1091,
  msg: "You have been disconnected from the Wi-Fi network",
}
```


### Códigos de respuesta

Esta es la lista de todos los códigos de respuesta y a qué función están asociados, si es un código de error (de cualquier forma en las respuestas el valor de ***success*** indica si fue satisfactoria o es un error).

Esto puede servir para poder adaptar los textos de respuesta como se requiera en desarrollos y/o traducirlos en la implementación.

|  Código  | Err | Función           | Descripción |
|:------:|:---:|:-------------------|:------------|
| 1001 |   | list_interfaces     | Wi-Fi interfaces found on the system
| 2001 | X | list_interfaces     | There are no Wi-Fi interfaces in the system
| 1011 |   | status              | Got interface status
| 2011 | X | status              | Failed to get the status of interface
| 2012 | X | status              | There is no Wi-Fi connection established
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


> Espero les sea de utilidad, si encuentras algún punto de mejora o comentario, por favor hazlo :-)