const { M77RaspberryETH } = require('./src/index')

const eth = new M77RaspberryETH()

async function init() {

    /* 
    console.log("\n\nInterfaces:")
    const interfaces = await eth.listInterfaces()
    console.log(interfaces)
    */

    console.log("\n\nInit:")
    const init = await eth.init({ device: "eth0", debugLevel: 2 })
    console.log(init)


    /*
    console.log("\n\Set connection with DHCP:")
    const connect_dhcp = await eth.setConnection({ timeout: 45 })
    console.log(connect_dhcp)
    */


    /*
    console.log("\n\Set connection with static params:")
    const connect_static = await eth.setConnection({ipaddress:"192.168.68.179", netmask:"255.255.255.0", gateway:"192.168.255.10", dns:['8.8.4.4', '8.8.8.8'], timeout: 45 })
    console.log(connect_static)
    */

    /*
    console.log("\n\nStatus:")
    const status = await eth.status()
    console.dir(status, { depth: null})
    */

}
init()