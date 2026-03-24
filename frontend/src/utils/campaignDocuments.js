/**
 * campaignDocuments.js
 * Defines required documents for each campaign category.
 * Used in CreateCampaign form to show relevant document upload placeholders.
 */

export const CAMPAIGN_DOCUMENTS = {
  Education: {
    label: 'Education',
    icon: '🎓',
    color: 'purple',
    documents: [
      {
        id: 'fees_receipt',
        name: 'Fee Receipt / Admission Letter',
        description: 'Official fee receipt or admission letter from the institution',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'College fee receipt, School admission letter, Course enrollment proof',
      },
      {
        id: 'institution_id',
        name: 'Institution ID / Bonafide Certificate',
        description: 'Student ID card or bonafide certificate from your institution',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Student ID card, Bonafide certificate',
      },
      {
        id: 'marksheet',
        name: 'Previous Marksheet (Optional)',
        description: 'Latest marksheet or academic report',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: false,
        example: 'Latest semester marksheet, Progress report',
      },
    ],
  },

  Health: {
    label: 'Health',
    icon: '🏥',
    color: 'red',
    documents: [
      {
        id: 'medical_report',
        name: 'Medical Report / Diagnosis',
        description: 'Doctor\'s diagnosis report or medical certificate',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Doctor\'s prescription, Diagnosis report, Medical certificate',
      },
      {
        id: 'hospital_bill',
        name: 'Hospital Bill / Treatment Estimate',
        description: 'Hospital bill or estimated treatment cost from doctor/hospital',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Hospital bill, Treatment cost estimate, Surgery quote',
      },
      {
        id: 'patient_id',
        name: 'Patient ID / Aadhar Card',
        description: 'Patient hospital ID or government ID for identity verification',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Hospital patient ID, Aadhar card, PAN card',
      },
    ],
  },

  Technology: {
    label: 'Technology',
    icon: '💻',
    color: 'blue',
    documents: [
      {
        id: 'project_proposal',
        name: 'Project Proposal / Business Plan',
        description: 'Detailed description of the technology project or startup plan',
        accept: '.pdf,.doc,.docx',
        required: true,
        example: 'Project proposal, Pitch deck, Business plan PDF',
      },
      {
        id: 'prototype_proof',
        name: 'Prototype / Demo Proof (Optional)',
        description: 'Screenshot, video link, or document showing prototype/demo',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: false,
        example: 'App screenshots, Demo video link, MVP proof',
      },
      {
        id: 'identity_proof',
        name: 'Identity Proof',
        description: 'Aadhar card or any government ID of the campaign creator',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Aadhar card, PAN card, Passport',
      },
    ],
  },

  Environment: {
    label: 'Environment',
    icon: '🌱',
    color: 'green',
    documents: [
      {
        id: 'project_plan',
        name: 'Environmental Project Plan',
        description: 'Detailed plan of the environmental initiative',
        accept: '.pdf,.doc,.docx',
        required: true,
        example: 'Project plan, NGO registration certificate, Initiative proposal',
      },
      {
        id: 'ngo_registration',
        name: 'NGO / Organization Certificate (if applicable)',
        description: 'Registration certificate of your NGO or organization',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: false,
        example: 'NGO registration, Trust certificate, Society registration',
      },
      {
        id: 'identity_proof',
        name: 'Identity Proof',
        description: 'Government ID of campaign organizer',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Aadhar card, PAN card, Voter ID',
      },
    ],
  },

  Community: {
    label: 'Community',
    icon: '🤝',
    color: 'yellow',
    documents: [
      {
        id: 'community_proof',
        name: 'Community Need Proof',
        description: 'Document showing the community need or support letters',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Support letters, Community certificate, Local authority letter',
      },
      {
        id: 'budget_plan',
        name: 'Budget / Utilization Plan',
        description: 'How the funds will be used for the community',
        accept: '.pdf,.doc,.docx',
        required: true,
        example: 'Budget breakdown, Fund utilization plan',
      },
      {
        id: 'identity_proof',
        name: 'Identity Proof',
        description: 'Government ID of campaign organizer',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Aadhar card, PAN card, Voter ID',
      },
    ],
  },

  Arts: {
    label: 'Arts',
    icon: '🎨',
    color: 'pink',
    documents: [
      {
        id: 'portfolio',
        name: 'Portfolio / Previous Work',
        description: 'Sample of your artwork, music, film, or creative work',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
        example: 'Artwork samples, Music links, Film stills, Photography portfolio',
      },
      {
        id: 'project_description',
        name: 'Project Description Document',
        description: 'Detailed description of the artistic project',
        accept: '.pdf,.doc,.docx',
        required: true,
        example: 'Project brief, Script outline, Exhibition plan',
      },
      {
        id: 'identity_proof',
        name: 'Identity Proof',
        description: 'Government ID of campaign creator',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: false,
        example: 'Aadhar card, PAN card, Passport',
      },
    ],
  },
}

/**
 * Get document requirements for a category
 * @param {string} category
 * @returns {Object} document config
 */
export function getDocumentsForCategory(category) {
  return CAMPAIGN_DOCUMENTS[category] || null
}

/**
 * Get required documents only
 * @param {string} category
 * @returns {Array}
 */
export function getRequiredDocuments(category) {
  const config = CAMPAIGN_DOCUMENTS[category]
  if (!config) return []
  return config.documents.filter(d => d.required)
}
