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

    #nmcli(action, timeout = 120) {
        return new Promise((resolve, reject) => {
            if (this.#ready === false) {
                this.#debug(`The "${this.#device}" interface does not exist.`, 'Please execute the listInterfaces() method to get the list of available Wifi interfaces.')
                resolve(false)
            } else {
                timeout = isNaN(parseInt(timeout)) ? 60 : parseInt(timeout)
                const has_timeout = `timeout ${timeout}`
                const command = `sudo ${has_timeout} /usr/bin/nmcli ${action}`
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

    removeNetwork(idNet = '') {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            if (idNet === "") {
                resolve(false); return false
            }
            const removeNetwork = await this.#nmcli(`connection delete ${idNet}`)

            if (!removeNetwork) {
                resolve(false); return false
            }
            resolve(true)
        })
    }

    removeNetwork(idNet = '') {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            if (idNet === "") {
                resolve(false); return false
            }
            const removeNetwork = await this.#nmcli(`connection delete "${idNet}"`)

            if (!removeNetwork) {
                resolve({ success: false, msg: `Wi-Fi network is not in saved networks`, data: { ssid: idNet } }); return false
            }
            resolve({ success: true, msg: `Wi-Fi network has been removed on the system`, data: { ssid: idNet } })
        })
    }

    removeAllNetworks() {
        return new Promise(async (resolve, reject) => {
            const saved = await this.savedNetworks()

            if (saved.success === false) { resolve(saved); return false }

            const deletedNets = []
            for (let i = 0; i < saved.data.length; i++) {
                let deleted = await this.removeNetwork(saved.data[i].ssid)
                this.#debug(`Deleted Wi-Fi network ${saved.data[i].ssid} from saved connections`)
                deletedNets.push(saved.data[i].ssid)
            }

            resolve({ success: true, msg: `Wi-Fi networks that have been removed are`, data: deletedNets })
        })
    }

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

            let hwaddr, mtu, state_code, state_str, ssid, ipaddres, gateway, dns = ''

            try { hwaddr = statusArr.filter(data => data.includes('GENERAL.HWADDR'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { mtu = statusArr.filter(data => data.includes('GENERAL.MTU'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { state_code = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[0].trim() } catch (e) { }
            try { state_str = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[1].replace("(", '').replace(")", '').trim() } catch (e) { }
            try { ssid = statusArr.filter(data => data.includes('GENERAL.CONNECTION'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { ipaddres = statusArr.filter(data => data.includes('IP4.ADDRESS'))[0].split('|')[1].split("/")[0].replace("--", '').trim() } catch (e) { }
            try { gateway = statusArr.filter(data => data.includes('IP4.GATEWAY'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { dns = statusArr.filter(data => data.includes('IP4.DNS')).map(data => data.split("|")[1]) } catch (e) { }

            const device_info = {
                hwaddr: hwaddr === undefined ? '' : hwaddr,
                mtu: mtu === undefined ? '' : mtu,
                ipaddres: ipaddres === undefined ? '' : ipaddres,
                gateway: gateway === undefined ? '' : gateway,
                dns: dns === undefined ? '' : dns,
            }


            const statusJSON = {
                device: this.#device,
                connected: state_str === "connected" ? true : false,
                state_code: parseInt(state_code),
                state_str,
                ssid,
                device_info
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

    savedNetworks() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const saved = await this.#nmcli(`-f NAME,TYPE,DEVICE,ACTIVE c  | grep "wifi"`)

            if (saved === false) { resolve({ success: false, msg: `It was not possible to obtain the list of saved Wi-Fi networks in inteface "${this.#device}"`, data: [] }); return false }

            let savedArr = saved.trim().replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)

            savedArr = savedArr.map(net => {
                const netRow = net.trim().split("|")
                if (netRow.length >= 3) {
                    return {
                        ssid: netRow[0].trim(),
                        device: netRow[2].replace("--", '').trim(),
                        active: netRow[3].trim() === "yes" ? true : false
                    }
                }
                return null
            }).filter((net) => net !== null)


            resolve({ success: true, msg: `List of saved Wi-Fi networks`, data: savedArr })

        })
    }

    connect(config = {}) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const startTime = new Date()
            const configValues = { ...{ ssid: "", psk: "", bssid: "", hidden: false, timeout: 60 }, ...config }

            const is_hidden = configValues.hidden ? 'hidden yes' : ''
            const width_bssid = configValues.bssid.trim().length == 17 ? `bssid ${configValues.bssid.trim()}` : ''

            const deleted = await this.removeNetwork(configValues.ssid)

            const command = `device wifi connect "${configValues.ssid}" password "${configValues.psk}" ${width_bssid} ${is_hidden} ifname ${this.#device}`
            const connect_to = await this.#nmcli(command, configValues.timeout)

            if (connect_to === false) {
                const status = await this.status()
                resolve({
                    success: false,
                    msg: `Could not connect to SSID "${configValues.ssid}" on interface ${this.#device}`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: configValues.ssid
                    }
                }
                )
                return false
            } else {
                resolve({
                    success: true,
                    msg: `The Wi-Fi network has been successfully configured on interface ${this.#device}`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: configValues.ssid 
                    }
                })
            }

        })
    }

    reconnect(config = {}) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const startTime = new Date()
            const configValues = { ...{ ssid: "", timeout: 60 }, ...config }
            
            const command = `connection up "${configValues.ssid}" ifname ${this.#device}`

            const reconnect_to = await this.#nmcli(command, configValues.timeout)

            if (reconnect_to === false) {
                const status = await this.status()
                resolve({
                    success: false,
                    msg: `Could not reconnect to SSID "${configValues.ssid}" on interface ${this.#device}, because the "${configValues.ssid}" network is not in those previously saved in the system`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: configValues.ssid
                    }
                }
                )
                return false
            } else {
                resolve({
                    success: true,
                    msg: `The Wi-Fi network has been successfully reconnected on interface ${this.#device}`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: configValues.ssid 
                    }
                })
            }

        })
    }

    disconnect() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const status = await this.status()

            if (status.success) {
                if (status.data.ssid === "") {
                    resolve({ success: false, msg: `There is no connection established to disconnect from` }); return false
                }
                const disconnect = await this.#nmcli(`c down ${status.data.ssid}`)

                if (!disconnect) {
                    resolve({ success: false, msg: `It was not possible to disconnect from the "${status.data.ssid}" network` }); return false
                } else {
                    resolve({ success: true, msg: `You have been disconnected from the Wi-Fi "${status.data.ssid}" network` }); return false
                }
            } else {
                resolve({ success: false, msg: `An error occurred when obtaining the data of the connected Wi-Fi network to be able to disconnect` }); return false; return false
            }
        })
    }

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

            let scannedArrOrUnique = scannedArrOr.filter((net, index, self) =>
                index === self.findIndex((r) => r.ssid === net.ssid && r.band === net.band && net.ssid !== "--")
            )

            resolve({ success: true, msg: `List of scanned Wi-Fi networks was obtained`, data: scannedArrOrUnique })

        })
    }

    turnOn() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const power = await this.#nmcli(`radio wifi on ifname ${this.#device}`)

            if (power === false) { resolve({ success: false, msg: `It was not possible turn on de device "${this.#device}"` }); return false }

            resolve({ success: true, msg: `The "${this.#device}" interface has been turned on`, data: { device: this.#device } })

        })
    }

    turnOff() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const power = await this.#nmcli(`radio wifi off ifname ${this.#device}`)

            if (power === false) { resolve({ success: false, msg: `It was not possible turn off de device "${this.#device}"` }); return false }

            resolve({ success: true, msg: `The "${this.#device}" interface has been turned off`, data: { device: this.#device } })

        })
    }

}

module.exports = M77RaspberryWIFI 