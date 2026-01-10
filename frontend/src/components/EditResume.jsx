import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import { buttonStyles, containerStyles, iconStyles, statusStyles } from "../assets/dummystyle";
import { TitleInput } from "./Inputs";
import { AlertCircle, Check, Download, Loader, Loader2, Palette, Save, Trash2 } from "lucide-react";
import { API_PATHS } from "../utils/apiPaths";
import axiosInstance from "../utils/axiosInstance";
import toast from "react-hot-toast";
import { fixTailwindColors } from "../utils/colors";

import html2pdf from 'html2pdf.js'
import { dataURLtoFile } from "../utils/helper";
import StepProgress from "./StepProgress";
import { AdditionalInfoForm, CertificationInfoForm, ContactInfoForm, EducationDetailsForm, ProfileInfoForm, ProjectDetailForm, SkillsInfoForm, WorkExperienceForm } from "./Forms";
import { ArrowLeft } from "react-feather";
import RenderResume from "./RenderResume";
import Modal from "./Modal";
import ThemeSelector from "./ThemeSelector";
import html2canvas from "html2canvas";

// resixze observer hook

const useResizeObserver = () => {
    const [size, setSize] = useState({width: 0, height: 0})
    const ref = useCallback((node) => {
        if(node){
            const resizeOberserver = new ResizeObserver((entries) => {
                const {width, height} = entries[0].contentRect;
                setSize({width, height});
            })

            resizeOberserver.observe(node)
        }
    }, [])

    return{ ...size, ref};
}

const EditResume = () => {
  const { resumeId } = useParams();
  const navigate = useNavigate();

  const resumeDownloadRef = useRef(null);
  const thumbnailRef = useRef(null);

  const [openThemeSelector, setOpenThemeSelector] = useState(false);
  const [openPreviewModal, setOpenPreviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState("profile-info");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [progress, setProgress] = useState(0);

  const { width: previewWidth, ref: previewContainerRef } =
    useResizeObserver();

  /* ===================== RESUME STATE (MATCHES MONGO SCHEMA) ===================== */

  const [resumeData, setResumeData] = useState({
    title: "Professional Resume",
    thumbnailLink: "",

    template: {
      theme: "modern",
      colorPalette: [],
    },

    profileInfo: {
      fullName: "",
      designation: "",
      summary: "",
    },

    contactInfo: {
      email: "",
      phone: "",
      location: "",
      linkedIn: "",
      github: "",
      website: "",
    },

    workExperience: [
      {
        company: "",
        role: "",
        startDate: null,
        endDate: null,
        description: "",
      },
    ],

    education: [
      {
        degree: "",
        institution: "",
        startDate: null,
        endDate: null,
      },
    ],

    skills: [
      {
        name: "",
        progress: 0,
      },
    ],

    projects: [
      {
        title: "",
        description: "",
        githubLink: "",
        liveDemo: "",
      },
    ],

    certifications: [
      {
        title: "",
        issuer: "",
        year: null,
      },
    ],

    languages: [
      {
        name: "",
        progress: 0,
      },
    ],

    interests: [""],
  });

  /* ===================== COMPLETION CALCULATION ===================== */

  const calculateCompletion = () => {
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
    if (safeTrim(resumeData?.profileInfo?.fullName)) profileDone++;
    if (safeTrim(resumeData?.profileInfo?.designation)) profileDone++;
    if (safeTrim(resumeData?.profileInfo?.summary)) profileDone++;
    score += (profileDone / profileTotal) * WEIGHTS.profile;
  
    /* -------- CONTACT (15%) -------- */
    const contactTotal = 2;
    let contactDone = 0;
    if (safeTrim(resumeData?.contactInfo?.email)) contactDone++;
    if (safeTrim(resumeData?.contactInfo?.phone)) contactDone++;
    score += (contactDone / contactTotal) * WEIGHTS.contact;
  
    /* -------- WORK (25%) -------- */
    const workArr = resumeData?.workExperience || [];
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
    const eduArr = resumeData?.education || [];
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
    const skillsArr = resumeData?.skills || [];
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
    const projArr = resumeData?.projects || [];
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
  
    const certArr = resumeData?.certifications || [];
    const hasCert = certArr.some(
      (c) => safeTrim(c?.title) || safeTrim(c?.issuer) || c?.year
    );
    if (hasCert) extraDone++;
  
    const langArr = resumeData?.languages || [];
    const hasLang = langArr.some((l) => safeTrim(l?.name));
    if (hasLang) extraDone++;
  
    const interestArr = resumeData?.interests || [];
    const hasInterest = interestArr.some((i) => safeTrim(i));
    if (hasInterest) extraDone++;
  
    score += (extraDone / extraTotal) * WEIGHTS.extra;
  
    const percentage = Math.min(100, Math.max(0, Math.round(score)));
  
    setCompletionPercentage(percentage);
    return percentage;
  };
  
  useEffect(() => {
    calculateCompletion();
  }, [resumeData]);

  const validateAndNext = (e) => {
    const errors = []

    switch (currentPage) {
      case "profile-info":
        { const { fullName, designation, summary } = resumeData.profileInfo
        if (!fullName.trim()) errors.push("Full Name is required")
        if (!designation.trim()) errors.push("Designation is required")
        if (!summary.trim()) errors.push("Summary is required")
        break }

      case "contact-info":
        { const { email, phone } = resumeData.contactInfo
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) errors.push("Valid email is required.")
        if (!phone.trim() || !/^\d{10}$/.test(phone)) errors.push("Valid 10-digit phone number is required")
        break }

      case "work-experience":
        resumeData.workExperience.forEach(({ company, role, startDate, endDate }, index) => {
          if (!company || !company.trim()) errors.push(`Company is required in experience ${index + 1}`)
          if (!role || !role.trim()) errors.push(`Role is required in experience ${index + 1}`)
          if (!startDate || !endDate) errors.push(`Start and End dates are required in experience ${index + 1}`)
        })
        break

      case "education-info":
        resumeData.education.forEach(({ degree, institution, startDate, endDate }, index) => {
          if (!degree.trim()) errors.push(`Degree is required in education ${index + 1}`)
          if (!institution.trim()) errors.push(`Institution is required in education ${index + 1}`)
          if (!startDate || !endDate) errors.push(`Start and End dates are required in education ${index + 1}`)
        })
        break

      case "skills":
        resumeData.skills.forEach(({ name, progress }, index) => {
          if (!name.trim()) errors.push(`Skill name is required in skill ${index + 1}`)
          if (progress < 1 || progress > 100)
            errors.push(`Skill progress must be between 1 and 100 in skill ${index + 1}`)
        })
        break

      case "projects":
        resumeData.projects.forEach(({ title, description }, index) => {
          if (!title.trim()) errors.push(`Project Title is required in project ${index + 1}`)
          if (!description.trim()) errors.push(`Project description is required in project ${index + 1}`)
        })
        break

      case "certifications":
        resumeData.certifications.forEach(({ title, issuer }, index) => {
          if (!title.trim()) errors.push(`Certification Title is required in certification ${index + 1}`)
          if (!issuer.trim()) errors.push(`Issuer is required in certification ${index + 1}`)
        })
        break

      case "additionalInfo":
        if (resumeData.languages.length === 0 || !resumeData.languages[0].name?.trim()) {
          errors.push("At least one language is required")
        }
        if (resumeData.interests.length === 0 || !resumeData.interests[0]?.trim()) {
          errors.push("At least one interest is required")
        }
        break

      default:
        break
    }

    if (errors.length > 0) {
      setErrorMsg(errors.join(", "))
      return
    }

    setErrorMsg("")
    goToNextStep()
  }

  const goToNextStep = () => {
    const pages = [
      "profile-info",
      "contact-info",
      "work-experience",
      "education-info",
      "skills",
      "projects",
      "certifications",
      "additionalInfo",
    ]

    if (currentPage === "additionalInfo") setOpenPreviewModal(true)

    const currentIndex = pages.indexOf(currentPage)
    if (currentIndex !== -1 && currentIndex < pages.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentPage(pages[nextIndex])

      const percent = Math.round((nextIndex / (pages.length - 1)) * 100)
      setProgress(percent)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const goBack = () => {
    const pages = [
      "profile-info",
      "contact-info",
      "work-experience",
      "education-info",
      "skills",
      "projects",
      "certifications",
      "additionalInfo",
    ]

    if (currentPage === "profile-info") navigate("/dashboard")

    const currentIndex = pages.indexOf(currentPage)
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentPage(pages[prevIndex])

      const percent = Math.round((prevIndex / (pages.length - 1)) * 100)
      setProgress(percent)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const renderForm = () => {
    switch (currentPage) {
      case "profile-info":
        return (
          <ProfileInfoForm
            profileData={resumeData?.profileInfo}
            updateSection={(key, value) => updateSection("profileInfo", key, value)}
            onNext={validateAndNext}
          />
        )

      case "contact-info":
        return (
          <ContactInfoForm
            contactInfo={resumeData?.contactInfo}
            updateSection={(key, value) => updateSection("contactInfo", key, value)}
          />
        )

      case "work-experience":
        return (
          <WorkExperienceForm
            workExperience={resumeData?.workExperience}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("workExperience", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("workExperience", newItem)}
            removeArrayItem={(index) => removeArrayItem("workExperience", index)}
          />
        )

      case "education-info":
        return (
          <EducationDetailsForm
            educationInfo={resumeData?.education}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("education", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("education", newItem)}
            removeArrayItem={(index) => removeArrayItem("education", index)}
          />
        )

      case "skills":
        return (
          <SkillsInfoForm
            skillsInfo={resumeData?.skills}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("skills", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("skills", newItem)}
            removeArrayItem={(index) => removeArrayItem("skills", index)}
          />
        )

      case "projects":
        return (
          <ProjectDetailForm
            projectInfo={resumeData?.projects}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("projects", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("projects", newItem)}
            removeArrayItem={(index) => removeArrayItem("projects", index)}
          />
        )

      case "certifications":
        return (
          <CertificationInfoForm
            certifications={resumeData?.certifications}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("certifications", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("certifications", newItem)}
            removeArrayItem={(index) => removeArrayItem("certifications", index)}
          />
        )

      case "additionalInfo":
        return (
          <AdditionalInfoForm
            languages={resumeData.languages}
            interests={resumeData.interests}
            updateArrayItem={(section, index, key, value) => updateArrayItem(section, index, key, value)}
            addArrayItem={(section, newItem) => addArrayItem(section, newItem)}
            removeArrayItem={(section, index) => removeArrayItem(section, index)}
          />
        )

      default:
        return null
    }
  }

  const updateSection = (section, key, value) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const updateArrayItem = (section, index, key, value) => {
    setResumeData((prev) => {
      const updatedArray = [...prev[section]]

      if (key === null) {
        updatedArray[index] = value
      } else {
        updatedArray[index] = {
          ...updatedArray[index],
          [key]: value,
        }
      }

      return {
        ...prev,
        [section]: updatedArray,
      }
    })
  }

  const addArrayItem = (section, newItem) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: [...prev[section], newItem],
    }))
  }

  const removeArrayItem = (section, index) => {
    setResumeData((prev) => {
      const updatedArray = [...prev[section]]
      updatedArray.splice(index, 1)
      return {
        ...prev,
        [section]: updatedArray,
      }
    })
  }
  

  const fetchResumeDetailsById = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.RESUME.GET_BY_ID(resumeId))

      if (response.data && response.data.profileInfo) {
        const resumeInfo = response.data

        setResumeData((prevState) => ({
          ...prevState,
          title: resumeInfo?.title || "Untitled",
          template: resumeInfo?.template || prevState?.template,
          profileInfo: resumeInfo?.profileInfo || prevState?.profileInfo,
          contactInfo: resumeInfo?.contactInfo || prevState?.contactInfo,
          workExperience: resumeInfo?.workExperience || prevState?.workExperience,
          education: resumeInfo?.education || prevState?.education,
          skills: resumeInfo?.skills || prevState?.skills,
          projects: resumeInfo?.projects || prevState?.projects,
          certifications: resumeInfo?.certifications || prevState?.certifications,
          languages: resumeInfo?.languages || prevState?.languages,
          interests: resumeInfo?.interests || prevState?.interests,
        }))
      }
    } catch (error) {
      console.error("Error fetching resume:", error)
      toast.error("Failed to load resume data")
    }
  }

  const uploadResumeImages = async () => {
    try {
      setIsLoading(true);
  
      const el = thumbnailRef.current;
      if (!el) throw new Error("Thumbnail element not found");
  
      const fixedThumbnail = fixTailwindColors(el);
  
      const canvas = await html2canvas(fixedThumbnail, {
        scale: 0.7,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
  
      document.body.removeChild(fixedThumbnail);
  
      let blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png", 1.0)
      );
  
      if (!blob) {
        const dataUrl = canvas.toDataURL("image/png");
        blob = dataURLtoFile(dataUrl, `thumbnail-${resumeId}.png`);
      }
  
      const formData = new FormData();
      formData.append("thumbnail", blob);
  
      const uploadResponse = await axiosInstance.put(
        API_PATHS.RESUME.UPLOAD_IMAGES(resumeId),
        formData
      );
  
      const { thumbnailLink } = uploadResponse.data;
  
      await updateResumeDetails(thumbnailLink);
  
      toast.success("Resume Updated Successfully");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error Uploading Images:", error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const updateResumeDetails = async (thumbnailLink) => {
    try {
      setIsLoading(true);
  
      const safeTrim = (v) => (typeof v === "string" ? v.trim() : v);
  
      // ✅ sanitize resume before sending to backend
      const payload = {
        ...resumeData,
  
        thumbnailLink: thumbnailLink || resumeData.thumbnailLink || "",
  
        template: {
          theme: resumeData?.template?.theme || "modern",
          colorPalette: resumeData?.template?.colorPalette || [],
        },
  
        profileInfo: {
          ...resumeData.profileInfo,
          fullName: safeTrim(resumeData.profileInfo.fullName),
          designation: safeTrim(resumeData.profileInfo.designation),
          summary: safeTrim(resumeData.profileInfo.summary),
        },
  
        contactInfo: {
          ...resumeData.contactInfo,
          email: safeTrim(resumeData.contactInfo.email),
          phone: safeTrim(resumeData.contactInfo.phone),
          location: safeTrim(resumeData.contactInfo.location),
          linkedIn: safeTrim(resumeData.contactInfo.linkedIn),
          github: safeTrim(resumeData.contactInfo.github),
          website: safeTrim(resumeData.contactInfo.website),
        },
  
        // ✅ remove empty objects from arrays (only send filled entries)
        workExperience: (resumeData.workExperience || []).filter((exp) =>
          safeTrim(exp.company) ||
          safeTrim(exp.role) ||
          exp.startDate ||
          exp.endDate ||
          safeTrim(exp.description)
        ),
  
        education: (resumeData.education || []).filter((edu) =>
          safeTrim(edu.degree) ||
          safeTrim(edu.institution) ||
          edu.startDate ||
          edu.endDate
        ),
  
        skills: (resumeData.skills || []).filter((s) => safeTrim(s.name)),
  
        projects: (resumeData.projects || []).filter((p) =>
          safeTrim(p.title) ||
          safeTrim(p.description) ||
          safeTrim(p.githubLink) ||
          safeTrim(p.liveDemo)
        ),
  
        certifications: (resumeData.certifications || []).filter((c) =>
          safeTrim(c.title) || safeTrim(c.issuer) || c.year
        ),
  
        languages: (resumeData.languages || []).filter((l) => safeTrim(l.name)),
  
        interests: (resumeData.interests || []).filter((i) => safeTrim(i)),
  
        // ✅ completion safe number
        completion: Number(completionPercentage || 0),
      };
  
      await axiosInstance.put(API_PATHS.RESUME.UPDATE(resumeId), payload);
  
      toast.success("Resume Updated Successfully ✅");
    } catch (err) {
      console.error("Error updating resume:", err);
      toast.error(err?.response?.data?.message || "Failed to update resume details");
    } finally {
      setIsLoading(false);
    }
  };
  

  const downloadPDF = async () => {
    const element = resumeDownloadRef.current;
    if (!element) {
      toast.error("Failed to generate PDF. Please try again.");
      return;
    }
  
    setIsDownloading(true);
    setDownloadSuccess(false);
    const toastId = toast.loading("Generating PDFâ€¦");
  
    const override = document.createElement("style");
    override.id = "__pdf_color_override__";
    override.textContent = `
      * {
        color: #000 !important;
        background-color: #fff !important;
        border-color: #000 !important;
      }
    `;
    document.head.appendChild(override);
  
    try {
      await html2pdf()
        .set({
          margin:       0,
          filename:     `${resumeData.title.replace(/[^a-z0-9]/gi, "_")}.pdf`,
          image:        { type: "png", quality: 1.0 },
          html2canvas:  {
            scale:           2,
            useCORS:         true,
            backgroundColor: "#FFFFFF",
            logging:         false,
            windowWidth:     element.scrollWidth,
          },
          jsPDF:        {
            unit:       "mm",
            format:     "a4",
            orientation:"portrait",
          },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy']
          }
        })
        .from(element)
        .save();
  
      toast.success("PDF downloaded successfully!", { id: toastId });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
  
    } catch (err) {
      console.error("PDF error:", err);
      toast.error(`Failed to generate PDF: ${err.message}`, { id: toastId });
  
    } finally {
      document.getElementById("__pdf_color_override__")?.remove();
      setIsDownloading(false);
    }
  };

  const updateTheme = (theme) => {
    setResumeData(prev => ({
      ...prev,
      template: {
        theme: theme,
        colorPalette: []
      }
    }));
  }

  useEffect(() => {
    if (resumeId) {
      fetchResumeDetailsById()
    }
  }, [resumeId])

  // delete function to delete resume
  const handleDeleteResume = async () => {
    try {
      setIsLoading(true)
      await axiosInstance.delete(API_PATHS.RESUME.DELETE(resumeId))
      toast.success("Resume deleted successfully")
      navigate("/dashboard")
    } catch (error) {
      console.error("Error deleting resume:", error)
      toast.error("Failed to delete resume")
    } finally {
      setIsLoading(false)
    }
  }

  /* ===================== UI ===================== */

  return (
    <DashboardLayout>
      <div className={containerStyles.main}>
        <div className={containerStyles.header}>
           <TitleInput title={resumeData.title}
           setTitle={(value) => setResumeData((prev) => ({
            ...prev,
            title : value,
           }))}/>

           <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setOpenThemeSelector(true)} className={buttonStyles.theme}>
                <Palette size={16}/>
                <span className="text-sm">Theme</span>
            </button>

            <button onClick={handleDeleteResume} className={buttonStyles.delete} disabled={isLoading}>
                <Trash2 size={16}/>
                <span className="text-sm">Delete</span>
            </button>

            <button onClick={() => setOpenPreviewModal(true)} className={buttonStyles.download}>
                <Download size={16}/>
                <span className="text-sm">Priview</span>
            </button>
           </div>
        </div>

        {/* step progess */}

        <div className={containerStyles.grid}>
           <div className={containerStyles.formContainer}>
              <StepProgress progress={progress} />
              {renderForm()}
              <div className="p-4 sm:p-6">
                {
                  errorMsg && (
                    <div className={statusStyles.error}>
                    <AlertCircle size={16}/>
                    {errorMsg}
                    </div>
                  )
                }

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button className={buttonStyles.back} onClick={goBack} disabled={isLoading}>
                    <ArrowLeft size={16}/>
                    Back
                  </button>

                  <button className={buttonStyles.save} onClick={uploadResumeImages} disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="animate-spin"/>
                    : <Save size={16}/> }
                    {isLoading ? "Saving..." : "Save & Exit"}

                  </button>


                  <button className={buttonStyles.next} onClick={validateAndNext} disabled={isLoading}>
                    {currentPage === 'additionalInfo' && <Download size={16}/>}
                    {currentPage === 'additionalInfo' ? "Preview & Download" : "Next"}
                    {currentPage === 'additionalInfo' && <ArrowLeft size={16} className="rotate-180"/>}


                  </button>
                </div>
              </div>
           </div>

           <div className="hidden lg:block">
              <div className={containerStyles.previewContainer}>
                <div className="text-center mb-4">
                    <div className={statusStyles.completionBadge}>
                      <div className={iconStyles.pulseDot}>
                      </div>
                      <span>Preview - {completionPercentage}% Complete </span>
                    </div>
                </div>

                <div className="preview-container relative" ref={previewContainerRef}>
                  <div className={containerStyles.previewInner}>
                    <RenderResume key={`preview-${resumeData.template?.theme}`}
                    templateId={resumeData?.template?.theme || ""}
                    resumeData={resumeData}
                    containerWidth={previewWidth}/>
                  </div>

                </div>
              </div>
           </div>
        </div>
      </div>


      {/* Model data here */}
      <Modal isOpen={openThemeSelector} onClose={() => setOpenThemeSelector(false)}
      title="Change Title">
        <div className={containerStyles.modalContent}>
            <ThemeSelector selectedTheme={resumeData?.template.theme}
            setSelectedTheme={updateTheme} onClose={()=> setOpenThemeSelector(false)} />
        </div>  
      </Modal>

      <Modal isOpen={openPreviewModal} onClose={() => setOpenPreviewModal(false)}
        title={resumeData.title}
        showActionBtn
        actionBtnText={isDownloading ? "Generating..."
          : downloadSuccess ? "Downloaded!" : "Download PDF"
        }
        actionBtnIcon={
          isDownloading ? (
            <Loader2 size={16} className="animate-spin"/>
          ) : 
            downloadSuccess ? (
              <Check size={16} className="text-white"/>
            ) : (
              <Download size={16}/>
            )
        }

        onActionClick={downloadPDF}
        >

          <div className="relative">
            <div className="text-center mb-4">
              <div className={statusStyles.modalBadge}>
                  <div className={iconStyles.pulseDot}></div>
                  <span>
                    Completion: {completionPercentage}%
                  </span>
              </div>

              <div className={containerStyles.pdfPreview}>
                <div ref={resumeDownloadRef} className="a4-wrapper">
                  <div className="w-full h-full">
                    <RenderResume key={`pdf-${resumeData?.template?.theme}`}
                    templateId={resumeData?.template?.theme || ""}
                    resumeData={resumeData}
                    containerWidth={null}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

      </Modal>


      <div className="absolute -left-[9999px] top-0 opacity-100">
        <div ref={thumbnailRef} className={containerStyles.hiddenThumbnail}>
          <RenderResume key={`thumb-${resumeData?.template?.theme}`}
          templateId={resumeData?.template?.theme || ""}
          resumeData={resumeData}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditResume;
