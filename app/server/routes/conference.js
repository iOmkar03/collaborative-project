const express=require('express');
const router=express.Router();
const {verifyUser}=require("../middleware/auth.js");
const {Conference}=require("../db/schema.js");
const {User}=require("../db/schema.js");

router.post('/create',verifyUser,async (req,res)=>{
    try {
       //console.log(req.body);
       const {name,participants}=req.body;
       //console.log(name,participants);
        const newConference=new Conference({
            name:name,
            participants:participants
        });
        const addedmeet=await newConference.save();
        const meetId=addedmeet._id.toString();
        //console.log(req.user);
        
        for(let participant of participants){
            const creator=await User.findOne({email:participant});
            //console.log(creator);
            creator.conferences.push({
              conferenceId:meetId,
              conferenceName:name,
              timestamp:new Date()
            });
            await creator.save();
        }
        res.status(200).json(
          {
            message:"Meet Created",
          }          
        );
    } catch (error) {
      console.log(error);
    }
});

router.get('/ofuser',verifyUser,async(req,res)=>{
  try{
    
    const email=req.user;
    //console.log(email);
    const user=await User.findOne({email:email});  
    //console.log(user);
    const conferences=user.conferences;
    //console.log(conferences);
    res.status(200).json(
      {
        conferences:conferences
      }
    );
  }catch(error){
    console.log(error);
  }
})

router.get('/access',verifyUser,async(req,res)=>{
  try{
    
    const email=req.user;
    const conferenceId=req.headers.conferenceid;
    //console.log(email);
    //console.log(conferenceId);
    const conference= await Conference.findOne({_id:conferenceId});
    //console.log(conference);
    const participants=conference.participants;
    const size=participants.length;

    if(participants.includes(email)){
      res.status(200).json(
        {
          message:"Authorized",
          size:size,
          email:email
        }
      );
    }
    else{
      res.status(401).json(
        {
          message:"Unauthorized"
        }
      );
    }
    
  }catch(error){
    res.status(401).json(
      {
        message:"Unauthorized",
        error:error
      }
    );
  }
})


module.exports=router;
