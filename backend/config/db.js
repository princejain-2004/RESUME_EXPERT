import mongoose from "mongoose";

export const connectDB = async () => {
    await mongoose.connect('mongodb+srv://pj6799033_db_user:Resume2004@cluster0.ad4x7ty.mongodb.net/RESUME')
    .then(()=> console.log("MongoDB connected"))
}