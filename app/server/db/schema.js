const mongoose=require("mongoose");

const userSchema= mongoose.Schema({
   email:{
     type:string,
     required:true
   },
   passwordHash:{
     type:string,
     require:true
   }
});

const groupSchema=mongoose.Schema({
  email:{
    type:string,
    required:true
  }
  //I will add the rest things later
})

const User=mongoose.model("User",userSchema);
const Group=mongoose.model("Group",groupSchema);

module.exports={User,Group};
