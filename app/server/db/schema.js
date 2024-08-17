const mongoose=require("mongoose");

const userSchema= mongoose.Schema({
   email:{
     type:String,
     required:true
   },
   passwordHash:{
     type:String,
     require:true
   }
});

const conferenceSchema=mongoose.Schema({
  //conference will have list of participants
  
  participants:[{
    email:{
      type:String,
      required:true
    }
    
  }]
  //I will add the rest things later
})

const User=mongoose.model("User",userSchema);
const Conference=mongoose.model("Conference",conferenceSchema);

module.exports={User,Conference};
