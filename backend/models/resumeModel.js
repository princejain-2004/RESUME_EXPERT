import mongoose from "mongoose";

const ResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    thumbnailLink: {
      type: String,
      default: "",
    },

    template: {
      theme: String,
      colorPalette: [String],
    },

    profileInfo: {
      profilePreviewUrl: String,
      fullName: { type: String, required: true },
      designation: { type: String, required: true },
      summary: { type: String, default: "" },
    },

    contactInfo: {
      email: { type: String, required: true },
      phone: String,
      location: String,
      linkedIn: String,
      github: String,
      website: String,
    },

    workExperience: [
      {
        company: { type: String, required: true },
        role: String,
        startDate: Date,
        endDate: Date,
        description: { type: String, default: "" },
      },
    ],

    education: [
      {
        degree: { type: String, required: true },
        institution: String,
        startDate: Date,
        endDate: Date,
      },
    ],

    skills: [
      {
        name: String,
        progress: { type: Number, min: 0, max: 100 },
      },
    ],

    projects: [
      {
        title: String,
        description: String,
        githubLink: String,
        liveDemo: String,
      },
    ],

    certifications: [
      {
        title: String,
        issuer: String,
        year: Date,
      },
    ],

    languages: [
      {
        name: String,
        progress: { type: Number, min: 0, max: 100 },
      },
    ],

    interests: [String],
  },
  { timestamps: true }
);

export default mongoose.model("Resume", ResumeSchema);
