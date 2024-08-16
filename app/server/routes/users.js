const express = require("express");
const router = express.Router();
const { User } = require("../db/schema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const e = require("express");
const zod = require("zod");
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const saltRounds = parseInt(process.env.SALT_ROUNDS);
const salt = bcrypt.genSaltSync(saltRounds);



//data validation schema
const signupSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(4).max(50),
});

const signinSchema = zod.object({
    email:zod.string().email(),
    password:zod.string().min(4).max(50)
})

//signup route

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);

  // Validate the data
  try {
    const validatedData = signupSchema.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: "Invalid data" });
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ email: email });
  
  if (existingUser) {
    console.log("User already exists");
    return res.status(400).json({ error: "User already exists" });
  }

  // Hash the password
  const hashedPassword = bcrypt.hashSync(password, salt);

  // Create a new user
  const newUser = new User({
    email: email,
    passwordHash: hashedPassword,
  });

  // Save the user to the database
  try {
    const savedUser = await newUser.save();
    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


//signin route

router.post("/signin",async(req,res)=>{

    const {email,password}=req.body;
    const validatedData=signinSchema.parse(req.body);
    if(validatedData){
        try {

            //check if the user exists
            const user=await User.findOne({email:email});
            if(!user){
                return res.status(400).json({error:"User does not exist"});
            }

            //check if the password is correct
            const isPasswordCorrect=bcrypt.compareSync(password,user.passwordHash);
            if(!isPasswordCorrect){
                return res.status(400).json({error:"Password is incorrect"});
            }

            //sign the token
            const token=jwt.sign({id:user._id,email:email},JWT_SECRET);
            res.json({token:token});
            
            
        } catch (error) {
            res.status(500).json({error:"Internal server error"});
            
        }
    }else{
        res.status(400).json({error:"Invalid data"});
    }


})

module.exports = router;
