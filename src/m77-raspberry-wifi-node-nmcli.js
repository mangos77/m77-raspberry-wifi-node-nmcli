class M77RaspberryWIFI {
    #exec = null
    #debugLevel
    #device = ""
    #ready = false
    #responseNoInterface = () => { return { success: false, code: 2101, msg: `The interface does not exist. Please execute the listInterfaces() method to get the list of available Wifi interfaces and set in init() method`, data: { device: this.#device } } }

    #is_bussy = false

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

    #cidrToNetmask(cidr) {
        cidr = parseInt(cidr)
        if (isNaN(parseInt(cidr) || parseInt(cidr) > 32)) return false

        let binary = "1".repeat(cidr).padEnd(32, "0")

        let mask = binary.match(/.{8}/g).map(function (byte) {
            return parseInt(byte, 2)
        }).join(".")

        return mask
    }

    #netmaskToCIDR(netmask) {
        const netmaskParts = netmask.split('.').map(Number);
        const binaryNetmask = netmaskParts.map(part => part.toString(2).padStart(8, '0')).join('');

        const cidr = binaryNetmask.indexOf('0');

        return cidr === -1 ? 32 : cidr;
    }

    #nmcli(action, timeout = 120) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) {
                this.#debug(`The "${this.#device}" interface does not exist.`, 'Please execute the listInterfaces() method to get the list of available Wifi interfaces.')
                resolve(false)
            } else {
                timeout = isNaN(parseInt(timeout)) ? 60 : parseInt(timeout)

                const time_limit = new Date().getTime() + ((timeout + 1) * 1000)

                while (this.#is_bussy) {
                    if (new Date().getTime() > time_limit) {
                        this.#debug(`The "${this.#device}" is bussy, try again.`)
                        return resolve(false)
                    }
                    await this.#sleep(10)
                }
                this.#is_bussy = true

                const has_timeout = `timeout ${timeout}`
                const command = `sudo ${has_timeout} /usr/bin/nmcli ${action}`
                this.#debug(command)

                this.#exec(command, (err, stdout, stderr) => {
                    if (err !== null) {
                        this.#debug(stderr)
                        this.#is_bussy = false
                        resolve(false)
                    } else {
                        this.#is_bussy = false
                        resolve(stdout.trim())
                    }
                })
            }
        })
    }

    #getWifiConnectionValues(connection_name = "") {
        return new Promise(async (resolve, reject) => {
            const data = await this.#nmcli(`-f connection.interface-name connection show "${connection_name}" | awk '{print $2}'`) || ''
            resolve(data)
        })
    }

    removeNetwork(idNet = '') {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const removeNetwork = await this.#nmcli(`connection delete "${idNet}"`)

            if (!removeNetwork) {
                resolve({ success: false, code: 2051, msg: `Wi-Fi network is not in saved networks`, data: { ssid: idNet } }); return false
            }
            resolve({ success: true, code: 1051, msg: `Wi-Fi network has been removed on the system`, data: { ssid: idNet } })
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

            resolve({ success: true, code: 1041, msg: `All Wi-Fi networks removed`, data: deletedNets })
        })
    }

    init(config = {}) {
        return new Promise(async (resolve, reject) => {
            const configValues = { ...{ device: "wlan0", debugLevel: 2 }, ...config }

            this.#device = configValues.device.trim() === "" ? "none" : configValues.device.trim()
            this.#debugLevel = Math.abs(configValues.debugLevel) > 2 ? 2 : Math.abs(configValues.debugLevel)

            const validate = await this.#validateDevice()

            let response = { success: true, code: 1101, msg: `Interface has been found on the system`, data: { device: this.#device } }
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
                    resolve({ success: false, code: 2001, msg: `There are no Wi-Fi interfaces in the system`, data: [] })
                    return false
                }
                const result = stdout.map(row => {
                    return row.split('|')[0].trim()
                })
                resolve({ success: true, code: 1001, msg: `Wi-Fi interfaces found on the system`, data: result })
            })
        })
    }

    status(withConnectionInfo = false) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            let status = await this.#nmcli(`device show ${this.#device}`)
            if (status === false) { resolve({ success: false, code: 2013, msg: `Failed to get the status of ethernet interface`, data: { device: this.#device } }); return false }

            const statusArr = status.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)

            let hwaddr, mtu, state_code, state_str, connection_name, device_ipaddress, device_cidr, device_gateway, device_dns = ''

            try { connection_name = statusArr.filter(data => data.includes('GENERAL.CONNECTION'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { hwaddr = statusArr.filter(data => data.includes('GENERAL.HWADDR'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { mtu = statusArr.filter(data => data.includes('GENERAL.MTU'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { state_code = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[0].trim() } catch (e) { }
            try { state_str = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[1].replace("(", '').replace(")", '').trim() } catch (e) { }
            try { device_ipaddress = statusArr.filter(data => data.includes('IP4.ADDRESS'))[0].split('|')[1].split("/")[0].replace("--", '').trim() } catch (e) { }
            try { device_cidr = statusArr.filter(data => data.includes('IP4.ADDRESS'))[0].split('|')[1].split("/")[1].trim() } catch (e) { }
            try { device_gateway = statusArr.filter(data => data.includes('IP4.GATEWAY'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { device_dns = statusArr.filter(data => data.includes('IP4.DNS')).map(data => data.split("|")[1]) } catch (e) { }



            let statusConn = await this.#nmcli(`connection show "${connection_name}"`)
            let method, ipaddress, cidr, gateway, dns = '', netmask
            if (!statusConn) {
                method = "auto"
                ipaddress = ""
                cidr = ""
                gateway = ""
                netmask = ""
                dns = []
            } else {
                const statusConnArr = statusConn.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)

                try { method = statusConnArr.filter(data => data.includes('ipv4.method:'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
                try { ipaddress = statusConnArr.filter(data => data.includes('ipv4.addresses:'))[0].split('|')[1].split("/")[0].replace("--", '').trim() } catch (e) { }
                try { cidr = statusConnArr.filter(data => data.includes('ipv4.addresses:'))[0].split('|')[1].split("/")[1].trim() } catch (e) { }
                try { gateway = statusConnArr.filter(data => data.includes('ipv4.gateway:'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
                try { dns = statusConnArr.filter(data => data.includes('ipv4.dns:'))[0].split("|")[1].split(",") } catch (e) { }

                ipaddress = !ipaddress || ipaddress.trim().length < 1 ? device_ipaddress : ipaddress
                cidr = !cidr || cidr.trim().length < 1 ? device_cidr : cidr
                gateway = !gateway || gateway.trim().length < 1 ? device_gateway : gateway
                dns = !dns || dns.length < 1 || dns[0] === "--" ? device_dns : dns
                netmask = this.#cidrToNetmask(cidr)
            }

            const device_info = {
                method: method === undefined ? '' : method,
                hwaddr: hwaddr === undefined ? '' : hwaddr,
                mtu: mtu === undefined ? '' : mtu,
                ipaddress: ipaddress,
                netmask: netmask,
                gateway: gateway,
                dns: dns
            }


            const statusJSON = {
                device: this.#device,
                ssid: connection_name,
                connected: parseInt(state_code) === 100 ? true : false,
                state_code: parseInt(state_code),
                state_str,
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

            resolve({ success: true, code: 1011, msg: `Got interface status`, data: statusJSON })
        })
    }

    savedNetworks(exclude_word = []) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const saved = await this.#nmcli(`-f NAME,TYPE,DEVICE,ACTIVE c  | grep "wifi"`) || ''

            if (saved === false) { resolve({ success: false, code: 2021, msg: `It was not possible to obtain the list of saved Wi-Fi networks in inteface`, data: { device: this.#device } }); return false }

            let savedArr = saved.trim().replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)

            savedArr = savedArr.map((net) => {
                const netRow = net.trim().split("|")
                if (netRow.length >= 3) {
                    return {
                        ssid: netRow[0].trim(),
                        device: "",
                        active: netRow[3].trim() === "yes" ? true : false
                    }
                }
                return null
            })
                .filter((net) => net !== null)
                .filter(net =>
                    !exclude_word.includes(net.ssid) && !exclude_word.includes(net.device)
                )

            for (let i = 0; i < savedArr.length; i++) {
                savedArr[i].device = await this.#getWifiConnectionValues(savedArr[i].ssid)
            }
            savedArr = savedArr.filter(net => net.device === this.#device)


            resolve({ success: true, code: 1021, msg: `List of saved Wi-Fi networks`, data: savedArr })

        })
    }

    connect(config = {}) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const startTime = new Date()
            const configValues = { ...{ ssid: "", psk: "", bssid: "", hidden: false, timeout: 60, ipaddress: "", netmask: "", gateway: "", dns: [] }, ...config }
            if (!Array.isArray(configValues.dns)) configValues.dns = []

            const is_hidden = configValues.hidden ? 'wifi.hidden yes' : ''
            const with_bssid = configValues.bssid.trim().length == 17 ? `wifi.bssid ${configValues.bssid.trim()}` : ''
            const with_psk = configValues.psk.trim().length > 0 ? `wifi-sec.key-mgmt wpa-psk wifi-sec.psk "${configValues.psk}"` : ''

            const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (configValues.ipaddress.trim().length > 0 && !ipv4Regex.test(configValues.ipaddress.trim())) {
                return resolve({ success: false, code: 2062, msg: `The static ipaddress is not valid`, data: { ipaddress: configValues.ipaddress.trim() } })
            }
            if (configValues.netmask.trim().length > 0 && !ipv4Regex.test(configValues.netmask.trim())) {
                return resolve({ success: false, code: 2063, msg: `The static netmask is not valid`, data: { netmask: configValues.netmask.trim() } })
            }
            if (configValues.gateway.trim().length > 0 && !ipv4Regex.test(configValues.gateway.trim())) {
                return resolve({ success: false, code: 2064, msg: `The static gateway is not valid`, data: { gateway: configValues.gateway.trim() } })
            }

            for (let i = 0; i < configValues.dns.length; i++) {
                if (!ipv4Regex.test(configValues.dns[i].trim())) {
                    return resolve({ success: false, code: 2065, msg: `One or more static dns are not valid`, data: { dns: configValues.dns } })
                }
            }
            configValues.dns = configValues.dns.filter((dns) => ipv4Regex.test(dns.trim()))


            if ((configValues.ipaddress.trim() + configValues.netmask.trim() + configValues.gateway.trim() + configValues.dns.join()).length > 0) {
                if (configValues.ipaddress.trim().length < 1 || configValues.netmask.trim().length < 1 || configValues.gateway.trim().length < 1 || configValues.dns.length < 1) {
                    return resolve({ success: false, code: 2066, msg: `To set a custom address parameters; ipaddress, netmask, gateway and dns are required`, data: { ipaddress: configValues.ipaddress.trim(), netmask: configValues.netmask, gateway: configValues.gateway, dns: configValues.dns } })
                }
            }


            const with_static_ip = ipv4Regex.test(configValues.ipaddress.trim()) && ipv4Regex.test(configValues.netmask.trim()) ? `ipv4.method manual ipv4.address ${config.ipaddress.trim()}/${this.#netmaskToCIDR(config.netmask.trim())}` : 'ipv4.method auto ipv4.addresses ""'
            const with_static_gw = ipv4Regex.test(configValues.gateway.trim()) ? `ipv4.gateway "${config.gateway.trim()}"` : 'ipv4.gateway ""'
            const with_static_DNS = configValues.dns.length > 0 ? `ipv4.dns "${configValues.dns.join(',')}"` : `ipv4.dns ""`


            await this.removeNetwork(configValues.ssid)

            const command_add = `connection add con-name "${configValues.ssid}" type wifi ifname wlan0 ssid "${configValues.ssid}" ${with_psk} ${with_bssid} ${is_hidden}`

            const add_connection = await this.#nmcli(command_add, configValues.timeout)

            this.#sleep(100)


            const command_modify = `connection modify "${configValues.ssid}" ${with_static_ip} ${with_static_DNS} ${with_static_gw} connection.autoconnect-priority 10`
            await this.#nmcli(command_modify, configValues.timeout)


            await this.#nmcli(`connection down "${configValues.ssid}"`, configValues.timeout)
            const connect_up = await this.#nmcli(`connection up "${configValues.ssid}"`, configValues.timeout)

            if (add_connection === false || connect_up.success === false) {
                return resolve({
                    success: false,
                    code: 2061,
                    msg: `Could not connect to SSID on interface`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: configValues.ssid,
                        device: this.#device
                    }
                }
                )
            }
            resolve({
                success: true,
                code: 1061,
                msg: `The Wi-Fi network has been successfully configured on interface`,
                data: {
                    milliseconds: new Date - startTime,
                    ssid: configValues.ssid
                }
            })
        })
    }

    reconnect(config = {}) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const startTime = new Date()
            const configValues = { ...{ ssid: "", timeout: 60 }, ...config }

            let reconnect_to = false
            console.log("****** ", configValues.ssid)
            if (configValues.ssid.trim().length > 1) {
                const command_down = `connection down ifname ${this.#device}`
                await this.#nmcli(command_down, configValues.timeout)
                await this.disconnect()
                this.#sleep(300)

                const command = `connection up "${configValues.ssid}" ifname ${this.#device}`

                reconnect_to = await this.#nmcli(command, configValues.timeout)
            } else {
                reconnect_to = await this.#nmcli(`device connect ${this.#device}`, configValues.timeout)
            }

            if (reconnect_to === false) {
                resolve({
                    success: false,
                    code: 2071,
                    msg: `Could not reconnect to SSID on interface, because the Wi-Fi network is not in those previously saved in the system`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: configValues.ssid,
                        device: this.#device
                    }
                }
                )
                return false
            } else {
                const status = await this.status()
                resolve({
                    success: true,
                    code: 1071,
                    msg: `The Wi-Fi network has been successfully reconnected on interface`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: status.data.ssid
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
                    resolve({ success: false, code: 2091, msg: `There is no connection established to disconnect` }); return false
                }
                const disconnect = await this.#nmcli(`connection down id "${status.data.ssid}"`)
                if (disconnect === false) {
                    resolve({ success: false, code: 2092, msg: `It was not possible to disconnect from the network`, data: { ssid: status.data.ssid } }); return false
                } else {
                    resolve({ success: true, code: 1091, msg: `You have been disconnected from the Wi-Fi network`, data: { ssid: status.data.ssid } }); return false
                }
            } else {
                resolve({ success: false, code: 2093, msg: `An error occurred when obtaining the data of the connected Wi-Fi network to be able to disconnect` }); return false; return false
            }
        })
    }

    scan() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const scanned = await this.#nmcli(`device wifi list ifname ${this.#device} --rescan auto`)
            if (scanned === false) { resolve({ success: false, code: 2031, msg: `It was not possible to obtain the list of the scanned Wi-Fi networks in inteface`, data: { device: this.#device } }); return false }


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
                    security: security.trim() === "--" ? 'OPEN' : security.trim(),
                    strength
                }
                scannedArrOr[i] = net

            }

            let scannedArrOrUnique = scannedArrOr.filter((net, index, self) =>
                index === self.findIndex((r) => r.ssid === net.ssid && r.band === net.band && net.ssid !== "--")
            )

            resolve({ success: true, code: 1031, msg: `List of scanned Wi-Fi networks was obtained`, data: scannedArrOrUnique })

        })
    }

    turnOn() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const power = await this.#nmcli(`radio wifi on ifname ${this.#device}`)

            if (power === false) { resolve({ success: false, code: 2111, msg: `It was not possible turn on de device`, data: { device: this.#device } }); return false }

            resolve({ success: true, code: 1111, msg: `The interface has been turned on`, data: { device: this.#device } })

        })
    }

    turnOff() {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            const power = await this.#nmcli(`radio wifi off ifname ${this.#device}`)

            if (power === false) { resolve({ success: false, code: 2121, msg: `It was not possible turn off de device`, data: { device: this.#device } }); return false }

            resolve({ success: true, code: 1121, msg: `The interface has been turned off`, data: { device: this.#device } })

        })
    }

    setConnection(config = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

                const startTime = new Date()
                const configValues = { ...{ timeout: 60, ipaddress: "", netmask: "", gateway: "", dns: [] }, ...config }
                if (!Array.isArray(configValues.dns)) configValues.dns = []

                // Get connection name for ethernet device
                const status = await this.status(true)

                if (!status.data || status.data.ssid.length < 1) {
                    return resolve({
                        success: false,
                        code: 2012,
                        msg: `There is no Wi-Fi connection established`,
                        data: {
                            milliseconds: new Date - startTime,
                            device: this.#device
                        }
                    })
                }
                const connection_name = status.data.ssid

                const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                if (configValues.ipaddress.trim().length > 0 && !ipv4Regex.test(configValues.ipaddress.trim())) {
                    return resolve({ success: false, code: 2062, msg: `The static ipaddress is not valid`, data: { ipaddress: configValues.ipaddress.trim() } })
                }
                if (configValues.netmask.trim().length > 0 && !ipv4Regex.test(configValues.netmask.trim())) {
                    return resolve({ success: false, code: 2063, msg: `The static netmask is not valid`, data: { netmask: configValues.netmask.trim() } })
                }
                if (configValues.gateway.trim().length > 0 && !ipv4Regex.test(configValues.gateway.trim())) {
                    return resolve({ success: false, code: 2064, msg: `The static gateway is not valid`, data: { gateway: configValues.gateway.trim() } })
                }

                for (let i = 0; i < configValues.dns.length; i++) {
                    if (!ipv4Regex.test(configValues.dns[i].trim())) {
                        return resolve({ success: false, code: 2065, msg: `One or more static dns are not valid`, data: { dns: configValues.dns } })
                    }
                }
                configValues.dns = configValues.dns.filter((dns) => ipv4Regex.test(dns.trim()))

                if ((configValues.ipaddress.trim() + configValues.netmask.trim() + configValues.gateway.trim() + configValues.dns.join()).length > 0) {
                    if (configValues.ipaddress.trim().length < 1 || configValues.netmask.trim().length < 1 || configValues.gateway.trim().length < 1 || configValues.dns.length < 1) {
                        return resolve({ success: false, code: 2066, msg: `To set a custom address parameters; ipaddress, netmask, gateway and dns are required`, data: { ipaddress: configValues.ipaddress.trim(), netmask: configValues.netmask, gateway: configValues.gateway, dns: configValues.dns } })
                    }
                }

                const with_static_ip = ipv4Regex.test(configValues.ipaddress.trim()) && ipv4Regex.test(configValues.netmask.trim()) ? `ipv4.method manual ipv4.address ${config.ipaddress.trim()}/${this.#netmaskToCIDR(config.netmask.trim())}` : 'ipv4.method auto ipv4.addresses ""'
                const with_static_gw = ipv4Regex.test(configValues.gateway.trim()) ? `ipv4.gateway "${config.gateway.trim()}"` : 'ipv4.gateway ""'
                const with_static_DNS = configValues.dns.length > 0 ? `ipv4.dns "${configValues.dns.join(',')}"` : `ipv4.dns ""`

                await this.#nmcli(`connection down "${connection_name}"`, configValues.timeout)

                const command_modify = `connection modify "${connection_name}" ${with_static_ip} ${with_static_DNS} ${with_static_gw}`

                await this.#nmcli(command_modify, configValues.timeout)

                const connect_up = await this.#nmcli(`connection up "${connection_name}"`, configValues.timeout)


                if (command_modify === false || connect_up.success === false) {
                    return resolve({
                        success: false,
                        code: 2061,
                        msg: `Could not connect to SSID on interface`,
                        data: {
                            milliseconds: new Date - startTime,
                            ssid: connection_name,
                            device: this.#device
                        }
                    }
                    )
                }
                resolve({
                    success: true,
                    code: 1061,
                    msg: `The Wi-Fi network has been successfully configured on interface`,
                    data: {
                        milliseconds: new Date - startTime,
                        ssid: connection_name
                    }
                })

            } catch (e) {
                console.error(e)
            }

        })
    }

}

module.exports = M77RaspberryWIFI 