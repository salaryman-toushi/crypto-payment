'use strict'
ons.ready(function() {
    console.log("Onsen UI is ready!");
});

if (ons.platform.isIPhoneX()) {
    document.documentElement.setAttribute('onsflag-iphonex-portrait', '');
    document.documentElement.setAttribute('onsflag-iphonex-landscape', '');
}

//nem-sdk
var nem = require("nem-sdk").default

//グローバルな変数の定義
const nodeListUrl = ""
const proxyUrl = 'https://cors-anywhere.herokuapp.com/'
const nodes = [
    "http://alice4.nem.ninja",
    "http://alice5.nem.ninja",
    "http://alice7.nem.ninja"
]
const paymentFeeRatio = 0.1 //%

//xem送金
const transferXEM = function(address, amount, message, privateKey){
    var transferTx = nem.model.objects.create("transferTransaction")(address, amount, message)
    var common = nem.model.objects.create("common")("", privateKey)
    var transactionEntity = nem.model.transactions.prepare("transferTransaction")(common, transferTx, nem.model.network.data.mainnet.id)
    var endpoint = nem.model.objects.create("endpoint")(nem.model.nodes.defaultMainnet, nem.model.nodes.defaultPort)
    console.log(endpoint)
    nem.model.transactions.send(common, transactionEntity, endpoint).then(
        function(res){
            console.log(res)
            if(res.message == "SUCCESS"){
                console.log(res.message)
                console.log("Hash: " + res.transactionHash.data)
            }else{
                console.log("ERR")
            }
        }
    )
}

//zaifのxem価格情報の取得
const getTickerInfo = (async function(){
    var zaif = new ccxt.zaif({
        apiKey: "dummy",
        secret: "dummy",
        proxy: proxyUrl,
    })
    const tickerInfo = await zaif.fetchTicker("XEM/JPY")
    console.log("tickerInfo:")
    console.log(tickerInfo)
    return tickerInfo
})

//zaifでxemを指定数量、指定価格で売却
const sellXEM = (async function(amount, unitPrice){
    var zaif = new ccxt.zaif({
        apiKey: localStorage.apiKey,
        secret: localStorage.apiSecret,
        proxy: proxyUrl,
    })
    const ceiledAmount = Math.ceil(amount * 10) / 10
    const sellResult = await zaif.createLimitSellOrder ('XEM/JPY', ceiledAmount, unitPrice)
    console.log("sellResult:")
    console.log(sellResult)
    return sellResult
})

//残オーダーある場合、オーダー情報取得
const sellRemainOrder = async function(sellResult){
    const id = sellResult.id
    const remainXEM = sellResult.info.return.remains
    if(id == 0){
        console.log("残オーダー無し")
    }else{
        const orderInfo = await fetchOrder(id, "XEM/JPY")
        console.log(orderInfo)
        const orderCancel = await cancelOrder(id, "XEM/JPY")
        console.log(orderCancel)
        const tickerInfo = await getTickerInfo()
        console.log(tickerInfo)
        const sellResult = await sellXEM(remainXEM, tickerInfo.bid)
        console.log(sellResult)
    }
}

//テスト
const test = (async function(){
    const unitPrice = await getTickerInfo()
    const sellResult = await sellXEM(10, unitPrice.bid)
    sellRemainOrder(sellResult)
})

class payment{
    constructor(){
        this.price = 0
        this.unitPriceLast = 0
        this.intOriginalAmount = 0
        this.intFee = 0
        this.intAmount = 0
        this.intPaymentFee = 0
        this.intFeePaymentFee = 0
        this.intOriginalDepositAmount = 0
        this.intDepositFee = 0
        this.intDepositAmount = 0
        this.originalAmount = 0
        this.fee = 0
        this.amount = 0
        this.paymentFee = 0
        this.feePaymentFee = 0
        this.originalDepositAmount = 0
        this.depositFee = 0
        this.depositAmount = 0
        this.urlQR = ""
        this.intUnconfirmedTxAmount = 0
        this.intUnconfirmedTxFee = 0
        this.unconfirmedTxHash = ""
        this.unconfirmedTxTimestamp = 0
        this.unconfirmedTxAmount = 0
        this.unconfirmedTxFee = 0
        this.bid = 0
        this.recipientAddress = ""
        this.senderPublicKey = ""
        this.senderAddress = ""
        this.confirmedTxHash = ""
        this.initialExchangedJPY = 0
        this.exchangeStatus = ""
        this.remainsAmount = 0
        this.remainsOrderId = 0
        this.totalFeeRatio = 0
        this.finalExchangedJPY = 0
    }
    showLoadingImage(){
        document.getElementById("qr").innerHTML = "<img src=" + "gif-load.gif" + ">"
    }
    getPrice(){
        const price = document.getElementById("price").value
        console.log("price: " + price)
        if(price.search(/^[0-9]+$/)==0){
            if(price > 0){
                this.price = price
                return price
            }else{
                alert("金額欄にゼロ以下の数値が入力されています。正の整数を入力してください。")
            }
        }else{
            alert("金額欄に整数以外が入力されています。正の整数を入力してください。")
        }
    }
    async getTickerInfo(){
        var zaif = new ccxt.zaif({
            apiKey: "dummy",
            secret: "dummy",
            proxy: proxyUrl,
        })
        console.log("tickerInfo: ")
        const tickerInfo = await zaif.fetchTicker("XEM/JPY")
        console.log(tickerInfo)
        const unitPriceLast = tickerInfo.last
        console.log("unitPriceLast: " + unitPriceLast)
        this.unitPriceLast = unitPriceLast
        const bid = tickerInfo.bid
        console.log("bid: " + bid)
        this.bid = bid
    }
    calculatePayment(){
        this.intOriginalAmount = Math.floor(this.price / this.unitPriceLast * 1000000)
        console.log("intOriginalAmount: " + this.intOriginalAmount)
        this.intFee = Math.min(1250000, Math.ceil(this.intOriginalAmount / (1000000 * 10000)) * 50000)
        console.log("intFee: " + this.intFee)
        this.intAmount = this.intOriginalAmount - this.intFee
        console.log("intAmount: " + this.intAmount)
        this.intPaymentFee = Math.floor(this.intOriginalAmount * paymentFeeRatio / 100)
        console.log("intPaymentFee: " + this.intPaymentFee)
        this.intFeePaymentFee = Math.min(1250000, Math.ceil(this.intPaymentFee / (1000000 * 10000)) * 50000)
        console.log("intFeePaymentFee: " + this.intFeePaymentFee)
        this.intOriginalDepositAmount = this.intAmount - this.intPaymentFee - this.intFeePaymentFee
        console.log("intOriginalDepositAmount: " + this.intOriginalDepositAmount)
        this.intDepositFee = Math.min(1250000, Math.ceil(this.intOriginalDepositAmount / (1000000 * 10000)) * 50000) + 50000
        console.log("intDepositFee: " + this.intDepositFee)
        this.intDepositAmount = this.intOriginalDepositAmount - this.intDepositFee
        console.log("intDepositAmount: " + this.intDepositAmount)
        this.originalAmount = this.intOriginalAmount / 1000000
        console.log("originalAmount: " + this.originalAmount)
        this.fee = this.intFee / 1000000
        console.log("fee: " + this.fee)
        this.amount = this.intAmount / 1000000
        console.log("amount: " + this.amount)
        this.paymentFee = this.intPaymentFee / 1000000
        console.log("paymentFee: " + this.paymentFee)
        this.feePaymentFee = this.intFeePaymentFee / 1000000
        console.log("feePaymentFee: " + this.feePaymentFee)
        this.originalDepositAmount = this.intOriginalDepositAmount / 1000000
        console.log("originalDepositAmount: " + this.originalDepositAmount)
        this.depositFee = this.intDepositFee / 1000000
        console.log("depositFee: " + this.depositFee)
        this.depositAmount = this.intDepositAmount / 1000000
        console.log("depositAmount: " + this.depositAmount)
    }
    async sellXEM(amount){
        var zaif = new ccxt.zaif({
            apiKey: localStorage.apiKey,
            secret: localStorage.apiSecret,
            proxy: proxyUrl,
        })
        const ceiledAmount = Math.ceil(amount * 10) / 10
        const sellInfo = await zaif.createLimitSellOrder ('XEM/JPY', ceiledAmount, this.bid)
        console.log(sellInfo)
        this.initialExchangedJPY = sellInfo.info.return.received
        if(sellInfo.info.return.remains == 0){
            this.exchangeStatus = "Completed"
            this.finalExchangedJPY = this.initialExchangedJPY
            this.totalFeeRatio = (1 - this.finalExchangedJPY / this.price) * 100
        }else{
            //一度で売却終えられなかった場合
            this.exchangeStatus = "Now Exchanging"
            this.remainsAmount = sellInfo.info.return.remains
            this.remainsOrderId = sellInfo.info.return.order_id
            console.log(this.remainsOrderId)
        }
        console.log(this.exchangeStatus)
        console.log(this.remainsAmount)
    }
    showExchangeData(){
        document.getElementById("exchangeStatus").innerHTML = this.exchangeStatus
        document.getElementById("remainsAmount").innerHTML = this.remainsAmount
        document.getElementById("received").innerHTML = this.initialExchangedJPY
        if(this.totalFeeRatio >= 0){
            document.getElementById("totalFeeRatio").innerHTML = this.totalFeeRatio
        }
    }
    showInvoiceData(){
        document.getElementById("amount").innerHTML = this.amount
        document.getElementById("fee").innerHTML = this.fee
        document.getElementById("unitPriceLast").innerHTML = this.unitPriceLast
        document.getElementById("computedPrice").innerHTML = (this.amount + this.fee) * this.unitPriceLast
    }
    showQRCode(){
        this.urlQR = "http://chart.apis.google.com/chart?cht=qr&chs=200x200&chl={%22v%22:2,%22type%22:2,%22data%22:{%22addr%22:%22" + localStorage.address + "%22,%22amount%22:" + this.intAmount + ",%22msg%22:%22%22,%22name%22:%22XEM%20invoice%22}}"
        document.getElementById("qr").innerHTML = "<img src=" + this.urlQR + ">"
    }
    monitorUnconfirmedTx(){
        var nodeUrl = nodes[Math.floor(Math.random() * nodes.length)]
        console.log(nodeUrl)
        var endpoint = nem.model.objects.create("endpoint")(nodeUrl, nem.model.nodes.websocketPort)
        console.log(endpoint)
        var connector = nem.com.websockets.connector.create(endpoint, localStorage.address)
        console.log(connector)
        connector.connect().then(() => {
            console.log("Connected")
            nem.com.websockets.subscribe.errors(connector, res => console.log("errors", res))
            nem.com.websockets.requests.account.data(connector)
            nem.com.websockets.requests.account.transactions.recent(connector)
            nem.com.websockets.subscribe.account.transactions.recent(connector,  res => console.log("subscribeRecent", res))
            nem.com.websockets.subscribe.account.transactions.unconfirmed(connector, res => {
                console.log("unconfirmed", res)
                if(res.transaction.recipient == localStorage.address){
                    if(res.transaction.amount == this.intAmount){
                        this.intUnconfirmedTxAmount = res.transaction.amount
                        this.intUnconfirmedTxFee = res.transaction.fee
                        this.unconfirmedTxHash = res.meta.hash.data
                        this.unconfirmedTxTimestamp = res.transaction.timestamp
                        this.recipientAddress = res.transaction.recipient
                        this.senderPublicKey = res.transaction.signer
                        this.senderAddress = nem.model.address.toAddress(this.senderPublicKey, 104)
                        connector.close()
                        console.log("請求額の着金を確認(unconfirmed)")
                        this.unconfirmedSoundPlay()
                        this.showUnconfirmedData()
                        this.monitorConfirmedTx()
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
        document.getElementById("unconfirmedTxHash").innerHTML = this.unconfirmedTxHash
        document.getElementById("senderAddress").innerHTML = this.senderAddress
        document.getElementById("unconfirmedAmount").innerHTML = this.intUnconfirmedTxAmount / 1000000
        document.getElementById("txStatus").innerHTML = "Unconfirmed"
    }
    monitorConfirmedTx(){
        var nodeUrl = nodes[Math.floor(Math.random() * nodes.length)]
        console.log(nodeUrl)
        var endpoint = nem.model.objects.create("endpoint")(nodeUrl, nem.model.nodes.websocketPort)
        console.log(endpoint)
        var connector = nem.com.websockets.connector.create(endpoint, localStorage.address)
        console.log(connector)
        connector.connect().then(() => {
            console.log("Connected")
            nem.com.websockets.subscribe.errors(connector, res => console.log("errors", res))
            nem.com.websockets.requests.account.data(connector)
            nem.com.websockets.requests.account.transactions.recent(connector)
            nem.com.websockets.subscribe.account.transactions.recent(connector,  res => console.log("subscribeRecent", res))
            nem.com.websockets.subscribe.account.transactions.confirmed(connector, res => {
                console.log("confirmed", res)
                if(res.meta.hash.data == this.unconfirmedTxHash){
                    this.confirmedTxHash = res.meta.hash.data
                    connector.close()
                    console.log("請求額の着金を確認(confirmed)")
                    this.confirmedSoundPlay()
                    this.showConfirmedData()
                }
            })
        }, err => {
            console.log(err)
            this.monitorConfirmedTx()
        })
    }
    confirmedSoundPlay(){
        const targetSound = document.getElementById("soundConfirmed")
        targetSound.play()
    }
    showConfirmedData(){
        document.getElementById("txStatus").innerHTML = "Confirmed"
    }
    showDepositData(){
        //今のところここでは何もするつもり無し
    }
}

const executePayment = (async function(){
    var transaction = new payment
    console.log(transaction)
    transaction.showLoadingImage()
    transaction.getPrice()
    console.log(transaction)
    await transaction.getTickerInfo()
    console.log(transaction)
    transaction.calculatePayment()
    console.log(transaction)
    await transaction.sellXEM(transaction.depositAmount)
    transaction.showInvoiceData()
    transaction.monitorUnconfirmedTx()
    transaction.showQRCode()
    console.log(transaction)
    transaction.showExchangeData()
    await transferXEM(localStorage.depositAddress, transaction.depositAmount, localStorage.depositMessage, localStorage.privateKey)
    transferXEM("NBMY547XK2JDXBX3GZJQCWPTHXJXV3XA6DJWNKF5", transaction.paymentFee, "", localStorage.privateKey)
})

const clearShowData = function(){
    document.getElementById("price").value = ""
    document.getElementById("amount").innerHTML = "NONE"
    document.getElementById("fee").innerHTML = "NONE"
    document.getElementById("unitPriceLast").innerHTML = "NONE"
    document.getElementById("computedPrice").innerHTML = "NONE"
    document.getElementById("qr").innerHTML = ""
    document.getElementById("unconfirmedTxHash").innerHTML = "NONE"
    document.getElementById("senderAddress").innerHTML = "NONE"
    document.getElementById("unconfirmedAmount").innerHTML = "NONE"
    document.getElementById("txStatus").innerHTML = "NONE"
    document.getElementById("exchangeStatus").innerHTML = "NONE"
    document.getElementById("received").innerHTML = "NONE"
    document.getElementById("remainsAmount").innerHTML = "NONE"
    document.getElementById("totalFeeRatio").innerHTML = "NONE"
}

//アドレス、秘密鍵保存
const saveAddress = function(){
    const rawAddress = document.getElementById("address").value
    const address = rawAddress.replace(/-/g, "")
    const privateKey = document.getElementById("privateKey").value
    if(address.length >= 40){
        if(privateKey == ""){
            alert("秘密鍵が入力されていません")
        }else{
            const isValidAddress = nem.model.address.isValid(address)
            const keyPair = nem.crypto.keyPair.create(privateKey)
            const publicKey = keyPair.publicKey.toString()
            const validatedAddress = nem.model.address.toAddress(publicKey, 104)
            if(isValidAddress){
                if(address == validatedAddress){
                    alert("アドレス\n" + address + "\n" + "秘密鍵\n" + privateKey + "\n" + "を保存しました。")
                    localStorage.privateKey = privateKey;
                    localStorage.publicKey = publicKey;
                    localStorage.address = address;
                }else{
                    alert("異なるアドレスの秘密鍵が入力されています。")
                }
            }else{
                alert("入力された値はNEMの有効なアドレスではありません。正しいアドレスを入力してください。")
            }
        }
    }else{
        alert("入力されたアドレスは40文字以下のため正しくありません。")
    }
}

//API情報保存
const saveAPI = (async function(){
    const exchange = "zaif"
    const apiKey = document.getElementById("apiKey").value
    const apiSecret = document.getElementById("apiSecret").value
    var zaif = new ccxt.zaif({
        apiKey: apiKey,
        secret: apiSecret,
        proxy: proxyUrl,
    })
    const tickerInfo = await zaif.fetchTicker("XEM/JPY")
    console.log(tickerInfo)
    if(tickerInfo.last >= 0){
        alert("API情報の登録とチェックが完了しました。New Economy Movementの世界へさらに足を踏み入れることができました！")
        localStorage.apiKey = apiKey
        localStorage.apiSecret = apiSecret
    }else{
        alert("API KeyかAPI Secretの入力に誤りがあるか、取引所のサービスが停止していると思われます。入力内容を再確認の上、しばらくしてから再度お試しください。")
    }
})

//取引所入金用アドレス保存
const saveDepositAddress = function(){
    const rawDepositAddress = document.getElementById("depositAddress").value
    console.log(rawDepositAddress)
    const depositAddress = rawDepositAddress.replace(/-/g, "")
    console.log(depositAddress)
    const depositMessage = document.getElementById("depositMessage").value
    if(depositAddress.length >= 40){
        const isValidDepositAddress = nem.model.address.isValid(depositAddress)
        if(isValidDepositAddress){
            if(depositMessage == ""){
                alert("メッセージが入力されていません。取引所はこのメッセージによって、どのユーザーからの入金か判別しているため、取引所から指定された正しいメッセージを必ず使用してください。")
            }else{
                alert("New Economy Movementの世界を楽しむ準備が整いました！")
                localStorage.depositAddress = depositAddress
                localStorage.depositMessage = depositMessage
            }
        }else{
            alert("入力された値はNEMの有効なアドレスではありません。正しいアドレスを入力してください。")
        }
    }else{
        alert("入力されたアドレスは40文字以下のため正しくありません。")
    }
}