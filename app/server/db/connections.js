
const mongoose=require('mongoose');
const env=require('dotenv');
env.config();
const connectDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGOKEY,{
            
        });
        console.log('MongoDB connection SUCCESS');
    }catch(error){
        console.error(error);
    }
}

module.exports=connectDB;
