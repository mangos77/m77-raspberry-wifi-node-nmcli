const M77RaspberryWIFI = require('./src/m77-raspberry-wifi-node-nmcli')

const wifi = new M77RaspberryWIFI()

async function init() {
    /*
    console.log("\n\nInterfaces:")
    const interfaces = await wifi.listInterfaces()
    console.log(interfaces)
    */

    
    console.log("\n\nInit:")
    const init = await wifi.init({ device: "wlan0", debugLevel: 2 })
    console.log(init)
    
    /*
    console.log("\n\nStatus:")
    const status = await wifi.status()
    console.log(status)
    */

    /*
    console.log("\n\nStatus with connection info:")
    const statusCI = await wifi.status(true)
    console.log(statusCI)
    */

    /*
    console.log("\n\nSaved Networks:")
    const saved = await wifi.savedNetworks()
    console.log(saved)
    */

    /*
    console.log("\n\Turn off:")
    const turn_off = await wifi.turnOff()
    console.log(turn_off)
    */

    /*
    console.log("\n\Turn on:")
    const turn_on = await wifi.turnOn()
    console.log(turn_on)
    */

    /*
    console.log("\n\nScan:")
    const available = await wifi.scan()
    console.log(available)
    */

    /*
    console.log("\n\nRemove one network")
    const remove = await wifi.removeNetwork('')
    console.log(remove)
    */

    /*
    console.log("\n\Remove all networks:")
    const removeAllNetworks = await wifi.removeAllNetworks()
    console.log(removeAllNetworks)
    */

    /*
    console.log("\n\Connect:")
    const connect = await wifi.connect({ ssid: "mangos77", psk: "ABCDE12345", bssid: "48:22:54:9D:4A:C7", hidden: false, timeout: 45 })
    console.log(connect)
    */
    
    /*
    console.log("\n\Reonnect:")
    const reconnect = await wifi.reconnect({ ssid: "mangos77_inv", timeout: 30 })
    console.log(reconnect)
    */
   
    /*
    console.log("\n\nDisconnect:")
    const disconnect = await wifi.disconnect()
    console.log(disconnect)
    */

}
init()