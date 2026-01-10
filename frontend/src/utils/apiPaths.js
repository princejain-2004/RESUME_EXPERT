export const BASE_URL = 'http://localhost:4000';

export const API_PATHS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    GET_PROFILE: '/api/auth/profile',
  },

  RESUME: {
    CREATE: '/api/resumes',
    GET_ALL: '/api/resumes',
    GET_BY_ID: (id) => `/api/resumes/${id}`,
    UPDATE: (id) => `/api/resumes/${id}`,
    DELETE: (id) => `/api/resumes/${id}`,
    UPLOAD_IMAGES: (id) => `/api/resumes/${id}/upload-images`,
  },

  IMAGE: {
    UPLOAD_IMAGE: '/api/auth/upload-image',
  },
};
