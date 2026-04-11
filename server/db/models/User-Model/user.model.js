import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    otp:{
        type:String,
    },
    otpExpiry:{
        type:Date,
    },
    isSystemAdmin:{
        type:Boolean,
        default:false
    },

    isBlocked:{
        type:Boolean,
        default:false
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["active","inactive"],
        default:"active"
    },

    // additional details operators
    factoryLocation:{
        type:String,
        enum:["NGM","PGTL"],
        required:true
    },
    workLocation:{
        type:String,
        required:true,
        enum:["atGate","storeSite","dispatchSite","pickupSite"]
    },

    factory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Factory"
    }

}, {timestamps:true});

export default mongoose.model("User", userSchema);