'use strict'
//nem-sdk
var nem = require("nem-sdk").default
//グローバルな変数の定義
let password
const nodeListUrl = "https://s3-ap-northeast-1.amazonaws.com/xembook.net/data/v4/node.json"
const proxyUrl = 'https://cors-anywhere.herokuapp.com/'
const nodes = [
    "http://alice4.nem.ninja",
    "http://alice5.nem.ninja",
    "http://alice7.nem.ninja"
]
const exchangeTickerList = {
    "zaif": [
        {"ticker": "Select currency.", "minOrderAmount": 0, "divisibility": 0, "available": true}, 
        {"ticker": "XEM", "minOrderAmount": 0.1, "divisibility": 6, "available": true}, 
        {"ticker": "ETH", "minOrderAmount": 0.001, "divisibility": 18, "available": false}, 
        {"ticker": "MONA", "minOrderAmount": 1, "divisibility": 8, "available": false}
    ],
    "bitbank": [
        {"ticker": "Select currency.", "minOrderAmount": 0, "divisibility": 0, "available": true}, 
        {"ticker": "XRP", "minOrderAmount": 0.0001, "divisibility": 6, "available": false}, 
        {"ticker": "MONA", "minOrderAmount": 0.0001, "divisibility": 8, "available": false}
    ],
    "liquid": [
        {"ticker": "Select currency.", "minOrderAmount": 0, "divisibility": 0, "available": true}, 
        {"ticker": "XRP", "minOrderAmount": 0.1, "divisibility": 6, "available": false}, 
        {"ticker": "ETH", "minOrderAmount": 0.001, "divisibility": 18, "available": false}
    ],
    "Select exchange.": [
        {"ticker": "Select currency.", "minOrderAmount": 0, "divisibility": 0, "available": true}
    ]
}
const cryptPaymentTemplateData = {"api": {}, "deposit": {}}
const googleQrUrl = "http://chart.apis.google.com/chart?cht=qr&chs=240x240&chl="
const passwordRegistration = function(){
    ons.notification.prompt({
        title: "Password Registration",
        messageHTML: "Input New Password.",
        buttonLabel: "Register Password",
        animation: "default",
        callback: function(str) {
            password = str
        }
    })
}
const passwordInput = function(){
    ons.notification.prompt({
        title: "Password Check",
        messageHTML: "Input Password.",
        buttonLabel: "OK",
        animation: "default",
        callback: function(str) {
            password = str
        }
    })
}
const initialProcedure = function(){
    if(localStorage.cryptPaymentData == undefined){
        passwordRegistration()
    }else if(localStorage.cryptPaymentData == null){
        passwordRegistration()
    }else{
        passwordInput()
    }
}
//ons ready
ons.ready(function () {
    console.log("Onsen UI is ready!")
    initialProcedure()
})
//AESで暗号化
function encrypt(message, key){
    const encryptedMessage = CryptoJS.AES.encrypt(message, key).toString()
    return encryptedMessage
}
//AESで復号
function decrypt(encryptedMessage, key){
    const decryptedMessage = CryptoJS.AES.decrypt(encryptedMessage, key).toString(CryptoJS.enc.Utf8)
    return decryptedMessage
}
//API情報の動作検証
const testAndSaveApi = (async function(){
    let exchange = document.getElementById("apiExchange").value
    let apiKey = document.getElementById("apiKey").value
    let apiSecret = document.getElementById("apiSecret").value
    let flagApi = true
    let flagSave = true
    if(exchange == "Select exchange."){
        ons.notification.alert("Error!\nYou need to select Exchange!")
        flagApi = false
    }else{
        if(apiKey == ""){
            ons.notification.alert("Error!\nYou need to input API Key!")
            flagApi = false
        }else{
            if(apiSecret == ""){
                ons.notification.alert("Error!\nYou need to input API Secret!")
                flagApi = false
            }else{
                var exchangeObject = new ccxt[exchange]({
                    apiKey: apiKey,
                    secret: apiSecret,
                    proxy: proxyUrl,
                })
                const balance = await exchangeObject.fetchBalance().catch((err)=>{
                    flagApi = false
                    console.log(err)
                    ons.notification.alert("Error!\nWrong API Key or API Secret or Exchange Server is in trouble.\nCheck API Key and API Secret and Try again.\n" + err)
                })
                if(flagApi = true){
                    console.log("Saving API Info to localStorage.")
                    console.log(balance)
                    saveApi(exchange, apiKey, apiSecret).catch((err)=>{
                        flagSave = false
                        console.log(err)
                        ons.notification.alert("Error!\nFailed to write API info to localStorage.")
                    })
                    if(flagSave = true){
                        document.getElementById("apiKey").value = ""
                        document.getElementById("apiSecret").value = ""
                        ons.notification.alert("Congratulations!\nYou successfully saved your API Info.")
                    }
                }
            }
        }
    }
    exchange = "Select exchange."
    apiKey = ""
    apiSecret = ""
})
//API情報のlocalStorgeへの保存
const saveApi = (async function (exchange, apiKey, apiSecret) {
    let encryptedApiKey = encrypt(apiKey, password)
    let encryptedApiSecret = encrypt(apiSecret, password)
    let saveApiData = {exchange: {"apiKey": encryptedApiKey, "apiSecret": encryptedApiSecret}}
    let cryptPaymentData
    if(localStorage.cryptPaymentData == undefined){
        cryptPaymentData = cryptPaymentTemplateData
    }else if(localStorage.cryptPaymentData == null){
        cryptPaymentData = cryptPaymentTemplateData
    }else{
        cryptPaymentData = JSON.parse(localStorage.cryptPaymentData)
    }
    cryptPaymentData.api[exchange] = {"apiKey": encryptedApiKey, "apiSecret": encryptedApiSecret}
    localStorage.cryptPaymentData = JSON.stringify(cryptPaymentData)
    console.log(localStorage.cryptPaymentData)
    encryptedApiKey = ""
    encryptedApiSecret = ""
    saveApiData = ""
    cryptPaymentData = ""
})
//取引所への入金アドレス、メッセージのチェック(と保存)
const checkAndSaveDepositAddress = function () {
    const exchange = document.getElementById("apiExchange").value
    console.log(exchange)
    const ticker = document.getElementById("depositTicker").value
    console.log(ticker)
    let depositAddress
    let depositMessage
    let flagAddress = false
    let flagMessage = false
    if(ticker == "XEM"){
        const rawDepositAddress = document.getElementById("depositAddress").value
        console.log(rawDepositAddress)
        depositAddress = rawDepositAddress.replace(/-/g, "")
        console.log(depositAddress)
        depositMessage = document.getElementById("depositMessage").value
        console.log(depositMessage)
        if (depositAddress.length >= 40) {
            const isValidDepositAddress = nem.model.address.isValid(depositAddress)
            if (isValidDepositAddress) {
                flagAddress = true
                if (depositMessage == "") {
                    ons.notification.alert("Error!\nMessage is not input!\nYou need to input deposit message.")
                } else {
                    flagMessage = true
                }
            } else {
                ons.notification.alert("Error!\nAddress is not valid NEM Address!\nYou need to input NEM Address.")
            }
        } else {
            ons.notification.alert("Error!\nAddress must be more than 40 length!\nYou need to input correct NEM Address.")
        }
    }
    if(flagAddress == true){
        if(flagMessage == true){
            console.log(exchange)
            console.log(ticker)
            console.log(depositAddress)
            console.log(depositMessage)
            saveDepositAddress(exchange, ticker, depositAddress, depositMessage)
        }
    }
}
//取引所への入金情報をlocalStorageへ保存
const saveDepositAddress = (async function (exchange, ticker, depositAddress, depositMessage) {
    let saveDepositAddressData = {}
    saveDepositAddressData[ticker] = {"depositAddress": depositAddress, "depositMessage": depositMessage}
    console.log(saveDepositAddressData)
    let cryptPaymentData
    if(localStorage.cryptPaymentData == undefined){
        cryptPaymentData = cryptPaymentTemplateData
    }else if(localStorage.cryptPaymentData == null){
        cryptPaymentData = cryptPaymentTemplateData
    }else{
        cryptPaymentData = JSON.parse(localStorage.cryptPaymentData)
    }
    cryptPaymentData.deposit[exchange] = saveDepositAddressData
    localStorage.cryptPaymentData = JSON.stringify(cryptPaymentData)
    console.log(localStorage.cryptPaymentData)
    ons.notification.alert("Congratulations! You succesfully save your deposit Address and Message.")
    document.getElementById("depositAddress").value = ""
    document.getElementById("depositMessage").value = ""
})
//取引所選択によって通貨リストへ銘柄を反映(請求画面)
function selectExchange(){
    $(function () {
        $("#ticker").children().remove()
        var exchange = $("#exchange").val()
        console.log(exchange)
        var tickerList = exchangeTickerList[exchange]
        console.log(tickerList)
        tickerList.forEach(element => {
            if(element.available == true){
                $("#ticker").append(function () {
                    return $("<option>").val(element.ticker).text(element.ticker)
                })
            }
        })
    })
}
//取引所選択によって通貨リストへ銘柄を反映(設定画面)
function selectApiExchange(){
    $(function () {
        $("#depositTicker").children().remove()
        var exchange = $("#apiExchange").val()
        console.log(exchange)
        var tickerList = exchangeTickerList[exchange]
        console.log(tickerList)
        tickerList.forEach(element => {
            if(element.available == true){
                $("#depositTicker").append(function () {
                    return $("<option>").val(element.ticker).text(element.ticker)
                })
            }
        })
    })
}
//通貨選択によって通貨単位の表示箇所へ通貨を反映
function selectTicker(){
    $(function () {
        var ticker = $("#ticker").val()
        console.log(ticker)
        $("#tickerCopy1").text(ticker)
        $("#tickerCopy2").text(ticker)
        $("#tickerCopy3").text(ticker)
    })
}
//指定取引所での指定通貨の価格取得の関数定義
const getTickerInfo = (async function(exchange, ticker){
    var exchangeObject = new ccxt[exchange]({
        apiKey: "dummy",
        secret: "dummy",
        proxy: proxyUrl,
    })
    var pair = ticker + "/JPY"
    const tickerInfo = await exchangeObject.fetchTicker(pair)
    console.log("tickerInfo:")
    console.log(tickerInfo)
    return tickerInfo
})
//指定取引所で全残高を取得する関数定義
const getBalance = (async function(exchange){
    let encryptedApiKey = JSON.parse(localStorage.cryptPaymentData).api[exchange].apiKey
    let encryptedApiSecret = JSON.parse(localStorage.cryptPaymentData).api[exchange].apiSecret
    let decryptedApiKey = decrypt(encryptedApiKey, password)
    let decryptedApiSecret = decrypt(encryptedApiSecret, password)
    var exchangeObject = new ccxt[exchange]({
        apiKey: decryptedApiKey,
        secret: decryptedApiSecret,
        proxy: proxyUrl,
    })
    const balance = await exchangeObject.fetchBalance()
    console.log(balance)
    encryptedApiKey = ""
    encryptedApiSecret = ""
    decryptedApiKey = ""
    decryptedApiSecret = ""
    return balance
})
//指定取引所で指定通貨を指定数量、指値で売却する関数定義
const sell = (async function (exchange, ticker, amount, bid) {
    let encryptedApiKey = JSON.parse(localStorage.cryptPaymentData).api[exchange].apiKey
    let encryptedApiSecret = JSON.parse(localStorage.cryptPaymentData).api[exchange].apiSecret
    let decryptedApiKey = decrypt(encryptedApiKey, password)
    let decryptedApiSecret = decrypt(encryptedApiSecret, password)
    var exchangeObject = new ccxt[exchange]({
        apiKey: decryptedApiKey,
        secret: decryptedApiSecret,
        proxy: proxyUrl,
    })
    console.log(exchangeObject)
    const pair = ticker + "/JPY"
    const sellResult = await exchangeObject.createLimitSellOrder(pair, amount, bid)
    console.log("sellResult:")
    console.log(sellResult)
    encryptedApiKey = ""
    encryptedApiSecret = ""
    decryptedApiKey = ""
    decryptedApiSecret = ""
    return sellResult
})
//paymentクラスの定義
class payment {
    constructor(){
        this.date = new Date()
        this.exchange = document.getElementById("exchange").value
        this.ticker = document.getElementById("ticker").value
        this.minOrderAmount
        this.divisibility
        this.tickerInfo
        this.last
        this.price = document.getElementById("price").value
        this.sellResult
        this.originalAmount
        this.intOriginalAmount
        this.intFloorAmount
        this.floorAmount
        this.intFee
        this.fee
        this.totalAmount
        this.totalPrice
        this.depositAddress
        this.depositMessage
        this.unconfirmedTxHash
        this.unconfirmedTxTimestamp
        this.recipientAddress
        this.senderPublicKey
        this.senderAddress
        if (this.exchange == "Select exchange.") {
            ons.notification.alert({message: "Select exchange!", title: "Error"})
        } else {
            if (this.ticker == "Select currency.") {
                ons.notification.alert("Select currency!")
            } else {
                var tempTicker = this.ticker
                var tempMinOrderAmount
                var tempDivisibility
                exchangeTickerList[this.exchange].forEach(function(element){
                    if(element.ticker == tempTicker){
                        tempMinOrderAmount = element.minOrderAmount
                        tempDivisibility = element.divisibility
                    }
                })
                this.minOrderAmount = tempMinOrderAmount
                this.divisibility = tempDivisibility
                console.log("New payment is stand by.")
            }
        }
    }
    showLoadingImage(){
        document.getElementById("qr").innerHTML = "<img src='712.gif'>"
    }
    async getExchangeData(){
        this.tickerInfo = await getTickerInfo(this.exchange, this.ticker)
        this.last = this.tickerInfo.last
        this.bid = this.tickerInfo.bid
    }
    showExchangeData(){
        if(this.exchange == "zaif"){
            if(this.ticker == "XEM"){
                if(this.sellResult.id == 0){
                    document.getElementById("exchangeStatus").innerText = "Complete."
                }else{
                    document.getElementById("exchangeStatus").innerText = "Now Exchanging."
                }                
                document.getElementById("receivedJPY").innerText = this.sellResult.info.return.received
                document.getElementById("remainsAmount").innerText = this.sellResult.info.return.remains
            }
        }
    }
    calculateAmount(){
        this.originalAmount = this.price / this.last
        if(this.exchange == "zaif"){
            if(this.ticker = "XEM"){
                this.intOriginalAmount = Math.round(this.originalAmount * 1000000)
                this.intFloorAmount = Math.floor(this.intOriginalAmount / 100000) * 100000
                this.floorAmount = this.intFloorAmount / 1000000
                this.intFee = Math.min(Math.ceil(this.intFloorAmount / 10000000000) * 50000, 1250000) + 50000
                this.fee = this.intFee / 1000000
                this.totalAmount = (this.intFloorAmount + this.intFee) / 1000000
                this.totalPrice = this.last * this.totalAmount
            }else if(this.ticker = "ETH"){
                //
            }
        }else if(this.exchange == "bitbank"){
            //
        }else if(this.exchange == "liquid"){
            //
        }
    }
    showPriceData(){
        document.getElementById("last").innerText = this.last
        document.getElementById("amount").innerText = this.floorAmount
        document.getElementById("fee").innerText = this.fee
        document.getElementById("totalAmount").innerText = this.totalAmount
        document.getElementById("totalPrice").innerText = this.totalPrice
    }
    showQrCode(){
        this.depositAddress = JSON.parse(localStorage.cryptPaymentData).deposit[this.exchange][this.ticker].depositAddress
        this.depositMessage = JSON.parse(localStorage.cryptPaymentData).deposit[this.exchange][this.ticker].depositMessage
        if(this.exchange == "zaif"){
            if(this.ticker == "XEM"){
                this.qrContent = "{%22v%22:2,%22type%22:2,%22data%22:{%22addr%22:%22" + this.depositAddress + "%22,%22amount%22:" + this.intFloorAmount + ",%22msg%22:%22" + this.depositMessage + "%22,%22name%22:%22XEM%20invoice%22}}"
                this.qrUrl = googleQrUrl + this.qrContent
            }else if(this.ticker == "ETH"){
                //
            }
        }else if(this.exchange == "bitbank"){
            //
        }else if(this.exchange == "liquid"){
            //
        }
        document.getElementById("qr").innerHTML = "<img src=" + this.qrUrl + ">"
    }
    monitorUnconfirmedTx(){
        var nodeUrl = nodes[Math.floor(Math.random() * nodes.length)]
        console.log(nodeUrl)
        var endpoint = nem.model.objects.create("endpoint")(nodeUrl, nem.model.nodes.websocketPort)
        console.log(endpoint)
        var connector = nem.com.websockets.connector.create(endpoint, this.depositAddress)
        console.log(connector)
        connector.connect().then(() => {
            console.log("Connected")
            nem.com.websockets.subscribe.errors(connector, res => console.log("errors", res))
            nem.com.websockets.requests.account.data(connector)
            nem.com.websockets.requests.account.transactions.recent(connector)
            nem.com.websockets.subscribe.account.transactions.recent(connector,  res => console.log("subscribeRecent", res))
            nem.com.websockets.subscribe.account.transactions.unconfirmed(connector, res => {
                console.log("unconfirmed", res)
                if(res.transaction.recipient == this.depositAddress){
                    if(res.transaction.message = this.depositMessage){
                        if(res.transaction.amount == this.intFloorAmount){
                            this.unconfirmedTxHash = res.meta.hash.data
                            this.unconfirmedTxTimestamp = res.transaction.timestamp
                            this.recipientAddress = res.transaction.recipient
                            this.senderPublicKey = res.transaction.signer
                            this.senderAddress = nem.model.address.toAddress(this.senderPublicKey, 104)
                            connector.close()
                            console.log("Payment Confirmation! (unconfirmed Tx.)")
                            this.unconfirmedSoundPlay()
                            this.showUnconfirmedData()
                            monitorConfirmedTx(this.depositAddress, this.unconfirmedTxHash)
                        }
                    }
                }
            })
        }, err => {
            console.log(err)
            this.monitorUnconfirmedTx()
        })
    }
    unconfirmedSoundPlay(){
        const targetSound = document.getElementById("soundUnconfirmed")
        targetSound.play()
    }
    showUnconfirmedData(){
        ons.notification.alert({
            message: "Unconfirmed Tx Hash:\n" + this.unconfirmedTxHash +"\nSender Address:\n" + this.senderAddress,
            title: "Tx Unconfirmed!"
        })
        document.getElementById("hash").innerText = this.unconfirmedTxHash
        document.getElementById("txStatus").innerText = "Unconfirmed."
        const nembexHashUrl = "http://explorer.nemtool.com/#/s_tx?hash=" + this.unconfirmedTxHash
        document.getElementById("txDetailLink").innerHTML = "<a href=" + nembexHashUrl + ">Link</a>"
    }
}
//QRボタンクリックで実行される関数の定義
const executePayment = (async function(mode){
    var newPayment = new payment
    console.log(newPayment)
    newPayment.showLoadingImage()
    await newPayment.getExchangeData().then(async function(){
        console.log(newPayment)
        newPayment.calculateAmount()
        console.log(newPayment)
        if(mode == 'qrAndExchange'){
            newPayment.sellResult = await sell(newPayment.exchange, newPayment.ticker, newPayment.floorAmount, newPayment.bid).catch((err)=>{
                ons.notification.alert("Error!\nFailed to Sell!\n" + err)
            })
            newPayment.showExchangeData()
            newPayment.showPriceData()
            newPayment.showQrCode()
            await newPayment.monitorUnconfirmedTx()
        }
    }).catch((err)=>{
        ons.notification.alert("Error!\nFailed to get Exchange Data!\n" + err)
    })
})

const clearShowData = function(){
    document.getElementById("price").value = ""
    document.getElementById("qr").innerHTML = ""
    document.getElementById("last").innerText = ""
    document.getElementById("amount").innerText = ""
    document.getElementById("fee").innerText = ""
    document.getElementById("totalAmount").innerText = ""
    document.getElementById("totalPrice").innerText = ""
    document.getElementById("hash").innerText = ""
    document.getElementById("txStatus").innerText = ""
    document.getElementById("txDetailLink").innerHTML = ""
    document.getElementById("exchangeStatus").innerText = ""
    document.getElementById("receivedJPY").innerText = ""
    document.getElementById("remainsAmount").innerText = ""
}
//
const monitorConfirmedTx = function(address, txHash){
    var nodeUrl = nodes[Math.floor(Math.random() * nodes.length)]
    console.log(nodeUrl)
    var endpoint = nem.model.objects.create("endpoint")(nodeUrl, nem.model.nodes.websocketPort)
    console.log(endpoint)
    var connector = nem.com.websockets.connector.create(endpoint, address)
    console.log(connector)
    connector.connect().then(() => {
        console.log("Connected")
        nem.com.websockets.subscribe.errors(connector, res => console.log("errors", res))
        nem.com.websockets.requests.account.data(connector)
        nem.com.websockets.requests.account.transactions.recent(connector)
        nem.com.websockets.subscribe.account.transactions.recent(connector,  res => console.log("subscribeRecent", res))
        nem.com.websockets.subscribe.account.transactions.confirmed(connector, res => {
            console.log("confirmed", res)
            if(res.meta.hash.data == txHash){
                //txStatusConfirmed()
                connector.close()
                console.log("Payment Confirmed! (Tx also confirmed!)")
                //confirmedSoundPlay()
                //showConfirmedData()
            }
        })
    }, err => {
        console.log(err)
        this.monitorConfirmedTx()
    })
}
const confirmedSoundPlay = function(){
    const targetSound = document.getElementById("soundConfirmed")
    targetSound.play()
}