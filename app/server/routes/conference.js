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


module.exports=router;
