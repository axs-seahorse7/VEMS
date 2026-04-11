import momngoose from "mongoose";

const factorySchema = new momngoose.Schema({
    name:{
        type:String,
        required:true,
       
    },
    location:{
        type:String,
        required:true,
        unique:true
    },
    contactNumber:{
        type:String,
    },
    email:{
        type:String,
    },
    vans:[{
        type:momngoose.Schema.Types.ObjectId,
        ref:"Van"
    }],
    factoryGioLocation:{
        type:String,
    }
}, {timestamps:true});

export default momngoose.model("Factory", factorySchema);