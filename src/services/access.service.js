'use strict'

const shopModel = require("../models/shop.model")
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const KeyTokenService = require("./keyToken.service")
const { createTokenPair } = require("../auth/authUtils")
const { getInfoData } = require('../utils/index')
const { BadRequestError, ConflictRequestError } = require("../core/error.response")

const RoleShop = {
    SHOP: 'SHOP',
    WRITER: 'WRITER',
    EDITOR: 'EDITOR',
    ADMIN: 'ADMIN'
}

class AccessService {
    
    static signUp = async ({ name, email, password}) => {
        try {
            // 1. check email exists?
            const holderShop = await shopModel.findOne({email}).lean() // lean giảm tải sign context
            if(holderShop){
                throw new BadRequestError('Error: Shop already registered!')
            }


            const passswordHash = await bcrypt.hash(password, 10)
            const newShop = await shopModel.create({
                name, email, password: passswordHash, roles: [RoleShop.SHOP]
            })

            if(newShop){
                // create privateKey, publicKey
                // const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa',{
                //     modulusLength: 4096,
                //     publicKeyEncoding:{
                //         type: 'pkcs1',
                //         format: 'pem'
                //     },
                //     privateKeyEncoding:{
                //         type: 'pkcs1',
                //         format: 'pem'
                //     }
                // })

                const privateKey = crypto.randomBytes(64).toString('hex')
                const publicKey = crypto.randomBytes(64).toString('hex')

                const keyStore = await KeyTokenService.createKeyToken({
                    userId: newShop._id,
                    publicKey,
                    privateKey
                })

                if(!keyStore){
                    return {
                        code: 'xxxx',
                        message: 'keyStore error'
                    }
                }

                // create token pair
                const tokens = await createTokenPair({userId: newShop._id, email}, publicKey, privateKey)

                return {
                    code: 201,
                    metadata:{
                        shop: getInfoData({ fields: ['_id','name','email'], object: newShop}),
                        tokens
                    }
                }
                
            }

            return {
                code: 200,
                metadata: null
            }
        } catch (error) {
            return {
                code: 'xxx', // Define trong docs mã xxx là lỗi gì 
                message: error.message, // Show lỗi ra
                status: 'error' // Status để biết request này bị lỗi
            }
        }
    }
}

module.exports = AccessService