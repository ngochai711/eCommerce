'use strict'

const shopModel = require("../models/shop.model")
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const KeyTokenService = require("./keyToken.service")
const { createTokenPair } = require("../auth/authUtils")
const { getInfoData } = require('../utils/index')
const { BadRequestError, ConflictRequestError, AuthFailureError } = require("../core/error.response")
const { findByEmail } = require("./shop.service")

const RoleShop = {
    SHOP: 'SHOP',
    WRITER: 'WRITER',
    EDITOR: 'EDITOR',
    ADMIN: 'ADMIN'
}

class AccessService {

    static login = async ({ email, password, refreshToken = null}) => {
        const foundShop = await findByEmail({email})

        if(!foundShop) throw new BadRequestError('Shop not registered')

        const match = bcrypt.compare(password,foundShop.password)
        if(!match) throw new AuthFailureError('Authentication error')

        const privateKey = crypto.randomBytes(64).toString('hex')
        const publicKey = crypto.randomBytes(64).toString('hex')

        const { _id: userId } = foundShop._id
        const tokens = await createTokenPair({userId, email}, publicKey, privateKey)

        await KeyTokenService.createKeyToken({
                refreshToken: tokens.refreshToken,
                privateKey, publicKey, userId
        })
        return {
            shop: getInfoData({ fields: ['_id','name','email'], object: foundShop}),
            tokens
        }   
    }
    
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
                console.log('----------------')
                console.log(keyStore)
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