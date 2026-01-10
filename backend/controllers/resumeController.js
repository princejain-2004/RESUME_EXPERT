import Resume from "../models/resumeModel.js";
import fs from "fs";
import path from "path";

/* ================= CREATE RESUME ================= */
export const createResume = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Resume title is required" });
    }

    const newResume = await Resume.create({
      userId: req.user._id,
      title,

      template: {
        theme: "",
        colorPalette: [],
      },

      // REQUIRED FIELDS → must NOT be empty strings
      profileInfo: {
        profilePreviewUrl: "",
        fullName: " ",          // ✔ passes required validation
        designation: " ",       // ✔ passes required validation
        summary: "",
      },

      contactInfo: {
        email: " ",             // ✔ passes required validation
        phone: "",
        location: "",
        linkedIn: "",
        github: "",
        website: "",
      },

      workExperience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      interests: [],
    });

    res.status(201).json(newResume);
  } catch (error) {
    console.error("Create Resume Error:", error);
    res.status(500).json({
      message: "Failed to create resume",
      error: error.message,
    });
  }
};

/* ================= GET ALL USER RESUMES ================= */
export const getUserResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id }).sort({
      updatedAt: -1,
    });
    res.status(200).json(resumes);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get resumes",
      error: error.message,
    });
  }
};

/* ================= GET RESUME BY ID ================= */
export const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.status(200).json(resume);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get resume",
      error: error.message,
    });
  }
};

/* ================= UPDATE RESUME ================= */
export const updateResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res
        .status(404)
        .json({ message: "Resume not found or not authorized" });
    }

    const allowedFields = [
      "title",
      "template",
      "profileInfo",
      "contactInfo",
      "workExperience",
      "education",
      "skills",
      "projects",
      "certifications",
      "languages",
      "interests",
      "thumbnailLink",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        resume[field] = req.body[field];
      }
    });

    const savedResume = await resume.save();
    res.status(200).json(savedResume);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update resume",
      error: error.message,
    });
  }
};

/* ================= DELETE RESUME ================= */
export const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res
        .status(404)
        .json({ message: "Resume not found or not authorized" });
    }

    const uploadFolder = path.join(process.cwd(), "uploads");

    if (resume.thumbnailLink) {
      const oldThumbnail = path.join(
        uploadFolder,
        path.basename(resume.thumbnailLink)
      );
      if (fs.existsSync(oldThumbnail)) fs.unlinkSync(oldThumbnail);
    }

    if (resume.profileInfo?.profilePreviewUrl) {
      const oldProfile = path.join(
        uploadFolder,
        path.basename(resume.profileInfo.profilePreviewUrl)
      );
      if (fs.existsSync(oldProfile)) fs.unlinkSync(oldProfile);
    }

    await Resume.deleteOne({ _id: resume._id });

    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete resume",
      error: error.message,
    });
  }
};
