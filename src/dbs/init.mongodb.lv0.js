'use strict'

const mongoose  = require("mongoose")

const connectString = `mongodb://localhost:27017/shopDEV`

class Database {
    constructor(){
        this.connect()
    }

    //connect
    connect(type = 'mongodb'){
        mongoose.connect(connectString).then(_ => console.log(`Connected Mongodb Success`))
        .catch( err => console.log(`Error Connect!`))
    }
}
module.exports = mongoose;