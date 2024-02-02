class M77RaspberryWIFI {
    #exec = null
    #debugLevel
    #device = ""
    #ready = false
    #responseNoInterface = () => { return { success: false, msg: `The "${this.#device}" interface does not exist. Please execute the listInterfaces() method to get the list of available Wifi interfaces and set in init() method.` } }

    constructor() {
        this.#exec = require('child_process').exec
    }

    #sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    #debug(text = "", extra = "") {
        if (this.#debugLevel > 0) console.warn("log:", text)
        if (this.#debugLevel > 1 && extra !== "" && extra !== null && extra !== undefined) console.warn("Extra information:", extra, "\n\n")
    }


    #validateDevice() {
        return new Promise((resolve, reject) => {
            const command = `/usr/sbin/iw dev | grep -E 'Interface ${this.#device}$'`
            this.#exec(command, (err, stdout, stderr) => {
                stdout = stdout.replace(/\t/g, '').trim().split(/\r?\n/)
                if (err !== null || stdout.length < 1) {
                    this.#debug(`The ${this.#device} interface does not exist.`, 'Please execute the listInterfaces() method to get the list of available Wifi interfaces.')
                    resolve(false)
                }
                resolve(true)
            })
        })
    }

    #signalToStrength(signal = 0) {
        return new Promise((resolve, reject) => {
            let strength = 0
            switch (true) {
                case (signal >= 80): strength = 4; break;
                case (signal >= 55): strength = 3; break;
                case (signal >= 30): strength = 2; break;
                case (signal < 30): strength = 1; break;
                default: strength = 0
            }
            resolve(strength)
        })
    }

    #channelToBand(channel = 0) {
        return new Promise((resolve, reject) => {
            let band = "2.4 GHz"
            if (channel >= 14) band = "5 GHz"
            resolve(band)
        })
    }

    #wpa(action) {
        return new Promise((resolve, reject) => {
            if (this.#ready === false) {
                this.#debug(`The ${this.#device} interface does not exist.`, 'Please execute the listInterfaces() method to get the list of available Wifi interfaces.')
                resolve(false)
            } else {
                const command = `/usr/sbin/wpa_cli -i ${this.#device} ${action}`
                this.#exec(command, (err, stdout, stderr) => {
                    if (err !== null) {
                        this.#debug(stderr)
                        resolve(false)
                    } else {
                        resolve(stdout.trim())
                    }
                })
            }
        })
    }

    #nmcli(action) {
        return new Promise((resolve, reject) => {
            if (this.#ready === false) {
                this.#debug(`The "${this.#device}" interface does not exist.`, 'Please execute the listInterfaces() method to get the list of available Wifi interfaces.')
                resolve(false)
            } else {
                const command = `sudo /usr/bin/nmcli ${action}`
                this.#exec(command, (err, stdout, stderr) => {
                    if (err !== null) {
                        this.#debug(stderr)
                        resolve(false)
                    } else {
                        resolve(stdout.trim())
                    }
                })
            }
        })
    }
 

    /*
    #removeNetwork(idNet) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const removeNetwork = await this.#wpa(`remove_network ${idNet}`)

            if (removeNetwork !== "OK") {
                resolve(false); return false
            }
            resolve(true)
        })
    }
    */


    /*
    #removeAllNetworks() {
        return new Promise(async (resolve, reject) => {
            const saved = await this.savedNetworks()

            if (saved.success === true) {
                for (let i = 0; i < saved.data.length; i++) {
                    let netRemoved = await this.#removeNetwork(saved.data[i].networkid)
                    this.#debug(`Network "${saved.data[i].ssid}" has benn removed`)
                }
                resolve(true)
            } else {
                resolve(false)
            }
        })
    }
    */



    init(config = {}) {
        return new Promise(async (resolve, reject) => {
            const configValues = { ...{ device: "wlan0", debugLevel: 2 }, ...config }

            this.#device = configValues.device.trim() === "" ? "none" : configValues.device.trim()
            this.#debugLevel = Math.abs(configValues.debugLevel) > 2 ? 2 : Math.abs(configValues.debugLevel)

            const validate = await this.#validateDevice()

            let response = { success: true, msg: `Interface "${this.#device}" has been found on the system` }
            if (!validate) {
                response = this.#responseNoInterface()
            }

            this.#ready = validate
            resolve(response)
        })
    }

    /*
    connect(config = {}) {
        const _this = this
        return new Promise(async (resolve, reject) => {
            const startTime = new Date()
            const configValues = { ...{ ssid: "", psk: "", bssid: "", removeAllNetworks: false, hidden: false }, ...config }

            _this.#debug(`Starting connection to SSID "${configValues.ssid}" with PSK "${configValues.psk}"`)
            configValues.hidden === true ? _this.#debug(`Is a hidden network`) : false

            const hasConnection = await this.hasConnection()
            if (hasConnection.success === true && hasConnection.data.has_connection === true) {
                _this.#debug(`Disconnect from current network`)
                await this.disconnect()
            }

            if (configValues.removeAllNetworks === true) {
                // remove all networks
                _this.#debug(`Delete all Wi-Fi network saved in ${_this.#device}`)
                const removeAll = await _this.#removeAllNetworks()
                if (removeAll === false) { ifError(); return false }

            } else {
                // remove network same ssid
                _this.#debug(`Search and delete Wi-Fi network with the same SSID (${configValues.ssid})`)
                const removeDuplicated = await removeDuplicateSSID()
                if (removeDuplicated === false) { ifError(); return false }
            }

            // add new network
            const idNetwork = await addNetwork()
            _this.#debug(`Create network with id ${idNetwork}`)
            if (idNetwork === false) { ifError(); return false }

            // set_network ssid
            const setSSID = await setNetwork(idNetwork, 'ssid', configValues.ssid)
            _this.#debug(`Set SSID "${configValues.ssid}"`)
            if (setSSID === false) { ifError(); return false }

            // set_network bssid
            //if (configValues.bssid.length == 17) {
            const setBSSID = await setNetwork(idNetwork, 'bssid', configValues.bssid)
            _this.#debug(`Set BSSID "${configValues.bssid}"`)
            if (setBSSID === false) { ifError(); return false }
            //}

            // set_network psk
            if (configValues.psk.length > 0) {
                const setPSK = await setNetwork(idNetwork, 'psk', configValues.psk)
                _this.#debug(`Set PSK "${configValues.psk}"`)
                if (setPSK === false) { ifError(); return false }
            } else {
                const asHidden = await setNetwork(idNetwork, 'key_mgmt', 'NONE')
                _this.#debug(`No password set as "${configValues.ssid}" is an open network`)
                if (asHidden === false) { ifError(); return false }
            }

            // set_network priority
            const setPriority = await setNetwork(idNetwork, 'priority', idNetwork)
            _this.#debug(`Set max priority`)
            if (setPriority === false) { ifError(); return false }

            // Set as hidden network
            if (configValues.hidden === true) {
                _this.#debug(`Set as hidden network`)
                const setHidden = await setNetwork(idNetwork, 'scan_ssid', '1')
                if (setHidden === false) { ifError(); return false }
            }

            // select_network
            const selectNet = await selectNetwork(idNetwork)
            _this.#debug(`Select network to try to connect`)
            if (selectNet === false) { ifError(); return false }

            // wait connection (timeout)
            _this.#debug(`Waiting for connection...`)
            const waitConnection = await _this.#waitConnection()
            _this.#debug(`Connection result: ${waitConnection}`)
            if (waitConnection === false) { ifError(); return false }

            // save_config
            const saveCnf = await saveConfig()
            _this.#debug(`Save config network`)
            if (saveCnf === false) { ifError() } else { ifSuccess() }



            function addNetwork(idNet) {
                return new Promise(async (resolve, reject) => {
                    let addNetwork = await _this.#wpa(`add_network`)
                    addNetwork = parseInt(addNetwork)
                    if (isNaN(addNetwork)) {
                        resolve(false)
                    } else {
                        resolve(addNetwork)
                    }
                })
            }

            function removeDuplicateSSID() {
                return new Promise(async (resolve, reject) => {
                    const saved = await _this.savedNetworks()

                    if (saved.success === true) {
                        let netToRemove = saved.data.filter(net => net.ssid === configValues.ssid)
                        for (let i = 0; i < netToRemove.length; i++) {
                            let netRemoved = await _this.#removeNetwork(netToRemove[i].networkid)
                            _this.#debug(`Network "${netToRemove[i].ssid}" has benn removed`)
                        }
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                })
            }

            function setNetwork(idNetwork, key = "", value = "") {
                return new Promise(async (resolve, reject) => {
                    let setValue = await _this.#wpa(`set_network ${idNetwork} ${key} ${value}`)
                    try { setValue = setValue.trim() } catch (e) { }
                    if (setValue !== false && setValue !== 'OK') {
                        setValue = await _this.#wpa(`set_network ${idNetwork} ${key} '${value}'`)
                        if (setValue.trim() !== 'OK') {
                            setValue = await _this.#wpa(`set_network ${idNetwork} ${key} '"${value}"'`)
                            if (setValue.trim() !== 'OK') { resolve(false) } else { resolve(true) }
                        }
                    } else {
                        resolve(true)
                    }
                })
            }

            function selectNetwork(idNetwork) {
                return new Promise(async (resolve, reject) => {
                    const selectNetwork = await _this.#wpa(`select_network ${idNetwork}`)
                    if (selectNetwork.trim() !== 'OK') {
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                })
            }

            function saveConfig() {
                return new Promise(async (resolve, reject) => {
                    const saveConfig = await _this.#wpa(`save_config`)
                    if (saveConfig.trim() !== 'OK') {
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                })
            }

            async function ifSuccess() {
                resolve({
                    success: true,
                    msg: `The Wi-Fi network has been successfully configured on interface ${_this.#device}`,
                    data: {
                        milliseconds: new Date - startTime,
                        connected_to: { milliseconds: new Date - startTime, ssid: configValues.ssid }
                    }
                })
                return false
            }

            function setPassphrase(idNetwork, ssid, psk) {
                return new Promise(async (resolve, reject) => {
                    const passphrase = await wpaPassphraseGen(ssid, psk)

                    const setPassphrase = await _this.#wpa(`passphrase ${idNetwork} ${passphrase.psk}`)
                    if (setPassphrase.trim() !== 'OK') {
                        resolve(false)
                    } else {
                        resolve(true)
                    }
                })
            }

            async function ifError() {
                await _this.#reconfigure()
                const reconnect = await _this.reconnect()

                resolve({
                    success: false,
                    msg: `Could not connect to SSID "${configValues.ssid}" on interface ${_this.#device}. ${reconnect.msg}`,
                    data: {
                        milliseconds: new Date - startTime,
                        connected_to: reconnect.data ? reconnect.data : { milliseconds: 0, ssid: '' }
                    }
                })
                return false
            }
        })
    }
    */


    listInterfaces() {
        return new Promise(async (resolve, reject) => {
            const command = `sudo /usr/bin/nmcli device status | awk '$2 == "wifi"'`
            this.#exec(command, (err, stdout, stderr) => {
                stdout = stdout.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)
                if (err !== null || stdout.length < 1) {
                    this.#debug('There are no Wi-Fi interfaces in the system.')
                    resolve({ success: false, msg: `There are no Wi-Fi interfaces in the system.`, data: [] })
                    return false
                }
                const result = stdout.map(row => {
                    return row.split('|')[0].trim()
                })
                resolve({ success: true, msg: `Wi-Fi interfaces found on the system`, data: result })
            })
        })
    }

    status(withConnectionInfo = false) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            let status = await this.#nmcli(`device show ${this.#device}`)
            if (status === false) { resolve({ success: false, msg: `Failed to get the status of interface "${this.#device}"`, data: {} }); return false }

            const statusArr = status.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)

            let hwaddr = statusArr.filter(data => data.includes('GENERAL.HWADDR'))[0].split('|')[1].replace("--", '').trim()
            let mtu = statusArr.filter(data => data.includes('GENERAL.MTU'))[0].split('|')[1].replace("--", '').trim()
            let state_code = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[0].trim()
            let state_str = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[1].replace(/\(([^)]+)\)/, '$1').trim()
            let ssid = statusArr.filter(data => data.includes('GENERAL.CONNECTION'))[0].split('|')[1].replace("--", '').trim()
            let ipaddres = statusArr.filter(data => data.includes('IP4.ADDRESS'))[0].split('|')[1].split("/")[0].replace("--", '').trim()
            let gateway = statusArr.filter(data => data.includes('IP4.GATEWAY'))[0].split('|')[1].replace("--", '').trim() || ''
            let dns = statusArr.filter(data => data.includes('IP4.DNS')).map(data => data.split("|")[1])

            const statusJSON = {
                device: this.#device,
                connected: state_str === "connected" ? true : false,
                state_code: parseInt(state_code),
                state_str,
                ssid,
                device_info: {
                    hwaddr,
                    mtu,
                    ipaddres,
                    gateway,
                    dns
                }
            }

            if (statusJSON.connected && withConnectionInfo) {
                const infoResponse = await this.scan()
                if (infoResponse.success) {
                    statusJSON.connection_info = infoResponse.data.filter(net => net.current)[0]
                    try {
                        delete statusJSON.connection_info.current
                    } catch (e) { }
                }
            }
            
            resolve({ success: true, msg: `Got interface status "${this.#device}"`, data: statusJSON })
        })
    }

    /*
    savedNetworks() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const saved = await this.#wpa('list_networks')

            if (saved === false) { resolve({ success: false, msg: `It was not possible to obtain the list of saved Wi-Fi networks in inteface ${this.#device}`, data: [] }); return false }


            const savedArr = saved.split(/\r?\n/)

            let headers = []
            try {
                headers = savedArr.shift().replace(/\s/g, '').split(/\//g)
            } catch (e) { }

            const result = savedArr.map(row => {
                const rowArr = row.split(/\t/g)

                const net = {}
                for (let i = 0; i < rowArr.length; i++) {
                    net[headers[i]] = rowArr[i]
                }
                return net
            })

            resolve({ success: true, msg: `List of saved Wi-Fi networks`, data: result })

        })
    }
    */

    savedNetworks() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const saved = await this.#nmcli(`-f NAME,TYPE,DEVICE,ACTIVE c | grep ' wifi '`)

            if (saved === false) { resolve({ success: false, msg: `It was not possible to obtain the list of saved Wi-Fi networks in inteface "${this.#device}"`, data: [] }); return false }

            let savedArr = saved.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)

            savedArr = savedArr.map(net => { 
                return {
                    ssid:net.trim().split("|")[0].trim(),
                    device:net.trim().split("|")[2].replace("--", '').trim(),
                    active:net.trim().split("|")[3].trim() === "yes"? true: false

                }
            })

            resolve({ success: true, msg: `List of saved Wi-Fi networks`, data: savedArr })

        })
    }


    /*
    disconnect() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const disconnect = await this.#wpa('disconnect')

            if (disconnect !== "OK") {
                resolve({ success: false, msg: `Failed to detach interface ${this.#device}` }); return false
            }
            resolve({ success: true, msg: `Interface ${this.#device} has been disconnected` })
        })
    }
    */

    /*
    reconnect() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            this.#debug(`Trying to reconnect to some non-hidden wifi network saved for interface ${this.#device}`)

            const saved = await this.savedNetworks()
            let nets = saved.data.reverse()

            const scan = await this.scan()
            if (scan.success === false) { nets = [] }

            const startTime = new Date()
            let reconnect
            let connected
            let ssid

            for (let i = 0; i < nets.length; i++) {
                ssid = saved.data[i].ssid
                let exist = scan.data.find(scan_net => scan_net.ssid === ssid)
                if (exist) {
                    this.#debug(`Try connect to ${ssid}`)
                    reconnect = await this.#wpa('select_network ' + saved.data[i].networkid)

                    connected = await this.#waitConnection()
                    if (connected) break
                }

            }

            if (reconnect !== "OK" || connected === false) {
                resolve({ success: false, msg: `Failed to reconnect interface ${this.#device}` }); return false
            } else {
                resolve({ success: true, msg: `The interface ${this.#device} has been reconnected to ssid "${ssid}" in ${new Date() - startTime} milliseconds`, data: { milliseconds: new Date() - startTime, ssid: ssid } })
            }
        })
    }
    */


    scan() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const scanned = await this.#nmcli(`dev wifi list ifname ${this.#device}`)
            if (scanned === false) { resolve({ success: false, msg: `It was not possible to obtain the list of the scanned Wi-Fi networks in inteface "${this.#device}"`, data: [] }); return false }


            let scannedArr = scanned.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)
            scannedArr.shift()

            let scannedArrOr = scannedArr.filter(net => net.includes('*'))
            scannedArrOr = [...scannedArrOr, ...scannedArr.filter(net => !net.includes('*'))]

            scannedArrOr = scannedArrOr.map((net) => {
                net = net.split('|')
                return net
            })

            for (let i = 0; i < scannedArrOr.length; i++) {
                let [current, bssid, ssid, mode, chan, rate, signal, bars, security, trash] = scannedArrOr[i]

                const strength = await this.#signalToStrength(signal)
                const band = await this.#channelToBand(chan)

                const net = {
                    current: current === "*" ? true : false,
                    bssid,
                    ssid,
                    chan,
                    band,
                    rate,
                    security,
                    strength
                }
                scannedArrOr[i] = net

            }

            //console.log(scannedArrOr)
            let scannedArrOrUnique = scannedArrOr.filter((net, index, self) =>
                index === self.findIndex((r) => r.ssid === net.ssid && r.band === net.band && net.ssid !== "--")
            )

            resolve({ success: true, msg: `List of scanned Wi-Fi networks was obtained`, data: scannedArrOrUnique })

        })
    }


    /*
    removeAllNetworks() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }
            this.#debug(`Delete all Wi-Fi network saved in ${this.#device}`)

            const remove = await this.#removeAllNetworks()
            if (remove === false) { resolve({ success: false, msg: `Could not delete saved Wi-Fi networks in ${this.#device}` }); return false }

            const saveConfig = await this.#wpa(`save_config`)
            if (saveConfig.trim() !== 'OK') {
                resolve({ success: false, msg: `Failed to save delete changes to interface configuration ${this.#device}` })
            } else {
                resolve({ success: true, msg: `Removed all Wifi network configurations for interface ${this.#device}` })
            }
        })
    }
    */
}

module.exports = M77RaspberryWIFI 