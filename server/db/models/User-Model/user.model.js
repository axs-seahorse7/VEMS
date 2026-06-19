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
    role:{
        type:String,
        enum:["admin","user"],
        default:"user"
    },
    phone:{
        type:String,
        unique:true
    },
    otp:{
        type:String,
    },
    otpExpiry:{
        type:Date,
    },

    notifications:[{
        header:String,
        message:String,
        isRead:{
            type:Boolean,
            default:false
        },
        createdAt:{
            type:Date,
            default:Date.now
        }
    }],
    
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

    workLocation: {
        type: String,
        enum: ["atGate", "storeSite", "dispatchSite", "pickupSite"],
        default: function () {
            return this.role !== "admin" ? "atGate" : undefined;
        },
        required: function () {
            return this.role !== "admin";
        }
    },

    location: {
        type: String,
        default: "supa"
    },

    factory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Factory"
    }

}, {timestamps:true});


export default mongoose.model("User", userSchema);