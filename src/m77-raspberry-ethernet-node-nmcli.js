class M77RaspberryETH {
    #exec = null
    #debugLevel
    #device = ""
    #ready = false
    #responseNoInterface = () => { return { success: false, code: 2102, msg: `The ethernet interface does not exist. Please execute the listInterfaces() method to get the list of available ethernet interfaces and set in init() method`, data: { device: this.#device } } }

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
            const command = `sudo /usr/bin/nmcli -f DEVICE,TYPE device | awk '$1 == "${this.#device}" && $2 == "ethernet"'`
            this.#exec(command, (err, stdout, stderr) => {
                stdout = stdout.replace(/\t/g, '').trim().split(/\r?\n/)
                stdout = stdout.filter(row => row.trim().length > 0)
                if (err !== null || stdout.length < 1) {
                    this.#debug(`The ${this.#device} ethernet interface does not exist.`, 'Please execute the listInterfaces() method to get the list of available ethernet interfaces.')
                    resolve(false)
                }
                resolve(true)
            })
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
                this.#debug(`The "${this.#device}" interface does not exist.`, 'Please execute the listInterfaces() method to get the list of available ethernet interfaces.')
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

    init(config = {}) {
        return new Promise(async (resolve, reject) => {
            const configValues = { ...{ device: "eth0", debugLevel: 2 }, ...config }

            this.#device = configValues.device.trim() === "" ? "none" : configValues.device.trim()
            this.#debugLevel = Math.abs(configValues.debugLevel) > 2 ? 2 : Math.abs(configValues.debugLevel)

            const validate = await this.#validateDevice()

            let response = { success: true, code: 1102, msg: `Ethernet interface has been found on the system`, data: { device: this.#device } }
            if (!validate) {
                response = this.#responseNoInterface()
            }

            this.#ready = validate
            resolve(response)
        })
    }

    listInterfaces() {
        return new Promise(async (resolve, reject) => {
            const command = `sudo /usr/bin/nmcli device status | awk '$2 == "ethernet"'`
            this.#exec(command, (err, stdout, stderr) => {
                stdout = stdout.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)
                if (err !== null || stdout.length < 1) {
                    this.#debug('There are no ethernet interfaces in the system.')
                    resolve({ success: false, code: 2001, msg: `There are no ethernet interfaces in the system`, data: [] })
                    return false
                }
                const result = stdout.map(row => {
                    return row.split('|')[0].trim()
                })
                resolve({ success: true, code: 1002, msg: `Ethernet interfaces found on the system`, data: result })
            })
        })
    }

    status(with_connection_name = false) {
        return new Promise(async (resolve, reject) => {
            if (this.#ready === false) { resolve(this.#responseNoInterface()); return false }

            let status = await this.#nmcli(`device show ${this.#device}`)
            if (status === false) { resolve({ success: false, code: 2013, msg: `Failed to get the status of ethernet interface`, data: { device: this.#device } }); return false }

            const statusArr = status.replace(/[ \t]{2,}/g, '|').trim().split(/\r?\n/)

            let hwaddr, mtu, state_code, state_str, connection_name, device_ipaddress, device_cidr, device_gateway, device_dns = '', wired

            try { connection_name = statusArr.filter(data => data.includes('GENERAL.CONNECTION'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { hwaddr = statusArr.filter(data => data.includes('GENERAL.HWADDR'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { mtu = statusArr.filter(data => data.includes('GENERAL.MTU'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { state_code = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[0].trim() } catch (e) { }
            try { state_str = statusArr.filter(data => data.includes('GENERAL.STATE'))[0].split('|')[1].split(" ")[1].replace("(", '').replace(")", '').trim() } catch (e) { }
            try { device_ipaddress = statusArr.filter(data => data.includes('IP4.ADDRESS'))[0].split('|')[1].split("/")[0].replace("--", '').trim() } catch (e) { }
            try { device_cidr = statusArr.filter(data => data.includes('IP4.ADDRESS'))[0].split('|')[1].split("/")[1].trim() } catch (e) { }
            try { device_gateway = statusArr.filter(data => data.includes('IP4.GATEWAY'))[0].split('|')[1].replace("--", '').trim() } catch (e) { }
            try { device_dns = statusArr.filter(data => data.includes('IP4.DNS')).map(data => data.split("|")[1]) } catch (e) { }
            try { wired = statusArr.filter(data => data.includes('WIRED-PROPERTIES.CARRIER')).map(data => data.split("|")[1])[0] } catch (e) { }

            
            let statusConn = await this.#nmcli(`connection show "${connection_name}"`)

            let method, ipaddress, cidr, gateway, dns = '', netmask
            if(wired === "off" || !statusConn){
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
                plugged_in: wired,
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
                connected: parseInt(state_code) === 100 ? true : false,
                state_code: parseInt(state_code),
                state_str,
                connection_name,
                device_info
            }

            try {
                if (!with_connection_name) {
                    delete statusJSON.connection_name
                }
            } catch (e) { }

            resolve({ success: true, code: 1012, msg: `Got ethernet interface status`, data: statusJSON })
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

                if (!status.data || status.data.connection_name.length < 1) {
                    return resolve({
                        success: false,
                        code: 2067,
                        msg: `Ethernet interface cable is not plugged in`,
                        data: {
                            milliseconds: new Date - startTime,
                            device: this.#device
                        }
                    })
                }
                const connection_name = status.data.connection_name

                const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                if (configValues.ipaddress.trim().length > 0 && !ipv4Regex.test(configValues.ipaddress.trim())) {
                    return resolve({ success: false, code: 2062, msg: `The static ipaddress is not valid`, data: { ipaddress: configValues.ipaddress.trim() } })
                }
                if (configValues.netmask.trim().length > 0 && !ipv4Regex.test(configValues.netmask.trim())) {
                    return resolve({ success: false, code: 2063, msg: `The static netmask is not valid`, data: { netmask: configValues.netmask.trim() } })
                }
                if (configValues.gateway.trim().length > 0 && !ipv4Regex.test(configValues.gateway.trim())) {
                    return resolve({ success: false, code: 2064, msg: `The static gateway is not valid`, data: { getaway: configValues.gateway.trim() } })
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
                        code: 2068,
                        msg: `Could not connect to ethernet interface`,
                        data: {
                            milliseconds: new Date - startTime,
                            device: this.#device
                        }
                    })
                }
                resolve({
                    success: true,
                    code: 1062,
                    msg: `The ethernet interface has been successfully configured`,
                    data: {
                        milliseconds: new Date - startTime
                    }
                })

            } catch (e) {
                console.error(e)
            }

        })
    }

}

module.exports = M77RaspberryETH 