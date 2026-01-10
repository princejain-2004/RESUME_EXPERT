import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { dashboardStyles as styles } from "../assets/dummystyle";
import { useNavigate } from "react-router-dom";
import { LucideFilePlus, LucideTrash2 } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import { ResumeSummaryCard } from "../components/cards";
import toast from "react-hot-toast";
import moment from "moment";
import Modal from "../components/Modal";
import CreateResumeForm from "../components/CreateResumeForm";

const Dashboard = () => {
  const navigate = useNavigate();

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [allResume, setAllResume] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* ===================== NEW COMPLETION LOGIC (SLOW INCREASE) ===================== */

  const calculateCompletion = (resume) => {
    // weights (TOTAL 100)
    const WEIGHTS = {
      profile: 20,
      contact: 15,
      work: 25,
      education: 15,
      skills: 10,
      projects: 10,
      extra: 5, // certifications + languages + interests
    };
  
    const safeTrim = (v) => (typeof v === "string" ? v.trim() : "");
    const hasAnyValue = (obj, keys = []) =>
      keys.some((k) => safeTrim(obj?.[k]) || obj?.[k]);
  
    let score = 0;
  
    /* -------- PROFILE (20%) -------- */
    const profileTotal = 3;
    let profileDone = 0;
    if (safeTrim(resume?.profileInfo?.fullName)) profileDone++;
    if (safeTrim(resume?.profileInfo?.designation)) profileDone++;
    if (safeTrim(resume?.profileInfo?.summary)) profileDone++;
    score += (profileDone / profileTotal) * WEIGHTS.profile;
  
    /* -------- CONTACT (15%) -------- */
    const contactTotal = 2;
    let contactDone = 0;
    if (safeTrim(resume?.contactInfo?.email)) contactDone++;
    if (safeTrim(resume?.contactInfo?.phone)) contactDone++;
    score += (contactDone / contactTotal) * WEIGHTS.contact;
  
    /* -------- WORK (25%) -------- */
    const workArr = resume?.workExperience || [];
    const validWork = workArr.filter(
      (exp) =>
        hasAnyValue(exp, ["company", "role", "description"]) ||
        exp?.startDate ||
        exp?.endDate
    );
  
    if (validWork.length > 0) {
      const workFieldsTotalPerItem = 5;
      const workTotalFields = validWork.length * workFieldsTotalPerItem;
      let workFilled = 0;
  
      validWork.forEach((exp) => {
        if (safeTrim(exp?.company)) workFilled++;
        if (safeTrim(exp?.role)) workFilled++;
        if (exp?.startDate) workFilled++;
        if (exp?.endDate) workFilled++;
        if (safeTrim(exp?.description)) workFilled++;
      });
  
      score += (workFilled / workTotalFields) * WEIGHTS.work;
    }
  
    /* -------- EDUCATION (15%) -------- */
    const eduArr = resume?.education || [];
    const validEdu = eduArr.filter(
      (edu) =>
        hasAnyValue(edu, ["degree", "institution"]) ||
        edu?.startDate ||
        edu?.endDate
    );
  
    if (validEdu.length > 0) {
      const eduFieldsTotalPerItem = 4;
      const eduTotalFields = validEdu.length * eduFieldsTotalPerItem;
      let eduFilled = 0;
  
      validEdu.forEach((edu) => {
        if (safeTrim(edu?.degree)) eduFilled++;
        if (safeTrim(edu?.institution)) eduFilled++;
        if (edu?.startDate) eduFilled++;
        if (edu?.endDate) eduFilled++;
      });
  
      score += (eduFilled / eduTotalFields) * WEIGHTS.education;
    }
  
    /* -------- SKILLS (10%) -------- */
    const skillsArr = resume?.skills || [];
    const validSkills = skillsArr.filter((s) => safeTrim(s?.name));
  
    if (validSkills.length > 0) {
      const skillsFieldsTotalPerItem = 2;
      const skillsTotalFields = validSkills.length * skillsFieldsTotalPerItem;
      let skillsFilled = 0;
  
      validSkills.forEach((s) => {
        if (safeTrim(s?.name)) skillsFilled++;
        if ((s?.progress || 0) > 0) skillsFilled++;
      });
  
      score += (skillsFilled / skillsTotalFields) * WEIGHTS.skills;
    }
  
    /* -------- PROJECTS (10%) -------- */
    const projArr = resume?.projects || [];
    const validProj = projArr.filter((p) =>
      hasAnyValue(p, ["title", "description", "githubLink", "liveDemo"])
    );
  
    if (validProj.length > 0) {
      const projFieldsTotalPerItem = 4;
      const projTotalFields = validProj.length * projFieldsTotalPerItem;
      let projFilled = 0;
  
      validProj.forEach((p) => {
        if (safeTrim(p?.title)) projFilled++;
        if (safeTrim(p?.description)) projFilled++;
        if (safeTrim(p?.githubLink)) projFilled++;
        if (safeTrim(p?.liveDemo)) projFilled++;
      });
  
      score += (projFilled / projTotalFields) * WEIGHTS.projects;
    }
  
    /* -------- EXTRA (5%) -------- */
    let extraDone = 0;
    const extraTotal = 3;
  
    const certArr = resume?.certifications || [];
    const hasCert = certArr.some(
      (c) => safeTrim(c?.title) || safeTrim(c?.issuer) || c?.year
    );
    if (hasCert) extraDone++;
  
    const langArr = resume?.languages || [];
    const hasLang = langArr.some((l) => safeTrim(l?.name));
    if (hasLang) extraDone++;
  
    const interestArr = resume?.interests || [];
    const hasInterest = interestArr.some((i) => safeTrim(i));
    if (hasInterest) extraDone++;
  
    score += (extraDone / extraTotal) * WEIGHTS.extra;
  
    return Math.min(100, Math.max(0, Math.round(score)));
  };
  

  /* ===================== FETCH ===================== */

  const fetchAllResumes = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_PATHS.RESUME.GET_ALL);

      const updated = res.data.map((resume) => ({
        ...resume,
        completion: calculateCompletion(resume),
      }));

      setAllResume(updated);
    } catch (err) {
      toast.error("Failed to fetch resumes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllResumes();
  }, []);

  /* ===================== DELETE ===================== */

  const handleDeleteResume = async () => {
    if (!resumeToDelete) return;

    try {
      await axiosInstance.delete(API_PATHS.RESUME.DELETE(resumeToDelete));
      toast.success("Resume deleted successfully");
      fetchAllResumes();
    } catch {
      toast.error("Failed to delete resume");
    } finally {
      setResumeToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  /* ===================== UI ===================== */

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.headerWrapper}>
          <div>
            <h1 className={styles.headerTitle}>My Resume</h1>
            <p className={styles.headerSubtitle}>
              {allResume.length
                ? `You have ${allResume.length} resume${
                    allResume.length > 1 ? "s" : ""
                  }`
                : "Start building your professional resume"}
            </p>
          </div>

          <button
            className={styles.createButton}
            onClick={() => setOpenCreateModal(true)}
          >
            <span className={styles.createButtonContent}>
              Create Now <LucideFilePlus size={18} />
            </span>
          </button>
        </div>

        {loading && (
          <div className={styles.spinnerWrapper}>
            <div className={styles.spinner}></div>
          </div>
        )}

        {!loading && allResume.length === 0 && (
          <div className={styles.emptyStateWrapper}>
            <LucideFilePlus size={32} className="text-violet-600" />
            <h3 className={styles.emptyTitle}>No Resumes Yet</h3>
          </div>
        )}

        {!loading && allResume.length > 0 && (
          <div className={styles.grid}>
            <div
              className={styles.newResumeCard}
              onClick={() => setOpenCreateModal(true)}
            >
              <LucideFilePlus size={32} />
              <h3>Create New Resume</h3>
            </div>

            {allResume.map((resume) => (
              <ResumeSummaryCard
                key={resume._id}
                imgUrl={resume.thumbnailLink}
                title={resume.title}
                createdAt={resume.createdAt}
                updatedAt={resume.updatedAt}
                completion={resume.completion}
                isNew={moment().diff(moment(resume.createdAt), "days") < 7}
                onSelect={() => navigate(`/resumes/${resume._id}`)}
                onDelete={() => {
                  setResumeToDelete(resume._id);
                  setShowDeleteConfirm(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Resume Modal */}
      <Modal
        isOpen={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        hideHeader
      >
        <CreateResumeForm
          onSuccess={() => {
            setOpenCreateModal(false);
            fetchAllResumes();
          }}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Resume"
      >
        <div className="p-6 text-center">
          <LucideTrash2 size={32} className="text-red-500 mx-auto mb-4" />
          <p>Are you sure you want to delete this resume?</p>
          <button
            onClick={handleDeleteResume}
            className="mt-4 bg-red-600 text-white px-6 py-2 rounded-xl"
          >
            Delete
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Dashboard;
