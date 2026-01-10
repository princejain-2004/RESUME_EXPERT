import express from 'express';
import {protect} from '../middleware/authMiddleware.js';
import {createResume, getResumeById, getUserResumes, updateResume, deleteResume} from '../controllers/resumeController.js';
import {uploadResumeImage} from '../controllers/uploadImages.js';


const resumeRoutes = express.Router();
resumeRoutes.post('/', protect, createResume)
resumeRoutes.get('/', protect,getUserResumes )
resumeRoutes.get('/:id', protect, getResumeById)

resumeRoutes.put('/:id',protect, updateResume)
resumeRoutes.put('/:id/upload-images', protect, uploadResumeImage);

resumeRoutes.delete('/:id', protect, deleteResume)
export default resumeRoutes;