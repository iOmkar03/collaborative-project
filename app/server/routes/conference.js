const express=require('express');
const router=express.Router();
const {verifyUser}=require("../middleware/auth.js");



router.post('/create',verifyUser,(req,res)=>{
    console.log(req.body);
    res.send("Conference created");
});


module.exports=router;
