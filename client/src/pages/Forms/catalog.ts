/* Complete field catalog for the 11 briefing/intake forms.
   Field sets are extracted 1-to-1 from Forms.en-US.customjs.js.
   Titles + ops-team routing come from FORM_CATALOG_META in shared/constants. */

/* ── Types ─────────────────────────────────────────────── */

export type ShowIf = {
  field: string;
  is?: string;
  isNot?: string;
  checked?: boolean;
};

type ColDef = { id: string; label: string; type: 'text' | 'number' | 'date' | 'time' };

export type Field =
  | { kind: 'section'; label: string }
  | { kind: 'subsection'; label: string }
  | {
      kind: 'input';
      id: string;
      label: string;
      type:
        | 'text'
        | 'textarea'
        | 'email'
        | 'tel'
        | 'url'
        | 'number'
        | 'date'
        | 'time'
        | 'datetime-local';
      placeholder?: string;
      required?: boolean;
      readonly?: boolean;
      hint?: string;
      showIf?: ShowIf;
    }
  | {
      kind: 'choice';
      id: string;
      label: string;
      type: 'radio' | 'checkbox' | 'select';
      options: string[];
      required?: boolean;
      showIf?: ShowIf;
    }
  | { kind: 'check'; id: string; label: string; required?: boolean; showIf?: ShowIf }
  | { kind: 'table'; id: string; label: string; columns: ColDef[] }
  | {
      kind: 'onedrive-files';
      id: string;
      label: string;
      hint?: string;
      required?: boolean;
      showIf?: ShowIf;
    }
  | { kind: 'rating'; id: string; label: string; rows: string[]; cols: string[]; showIf?: ShowIf };

/* ── Field factory helpers ─────────────────────────────── */

type E = Record<string, unknown>;

const sec = (label: string): Field => ({ kind: 'section', label });
const sub = (label: string): Field => ({ kind: 'subsection', label });
const txt = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'text', ...o }) as Field;
const area = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'textarea', ...o }) as Field;
const em = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'email', ...o }) as Field;
const ph = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'tel', ...o }) as Field;
const ul = (id: string, label: string, placeholder = 'https://', o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'url', placeholder, ...o }) as Field;
const nb = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'number', ...o }) as Field;
const df = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'date', ...o }) as Field;
const tf = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'time', ...o }) as Field;
const dtl = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'input', id, label, type: 'datetime-local', ...o }) as Field;
const rad = (id: string, label: string, options: string[], o: E = {}): Field =>
  ({ kind: 'choice', id, label, type: 'radio', options, ...o }) as Field;
const cbx = (id: string, label: string, options: string[], o: E = {}): Field =>
  ({ kind: 'choice', id, label, type: 'checkbox', options, ...o }) as Field;
const chk = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'check', id, label, ...o }) as Field;
const tbl = (id: string, label: string, cols: ColDef[]): Field => ({
  kind: 'table',
  id,
  label,
  columns: cols,
});
const odf = (id: string, label: string, o: E = {}): Field =>
  ({ kind: 'onedrive-files', id, label, ...o }) as Field;
const rat = (id: string, label: string, rows: string[], cols: string[]): Field => ({
  kind: 'rating',
  id,
  label,
  rows,
  cols,
});

/* ── Assessment block builder ──────────────────────────── */

type AssessOpts = {
  hasAssessmentType?: boolean;
  hasAssessmentSource?: boolean;
  hasSimType?: boolean;
  hasOtherDesc?: boolean;
  hasMode?: boolean;
};

function assessBlock(prefix: string, title: string, opts: AssessOpts = {}): Field[] {
  const inc: ShowIf = { field: `${prefix}_include`, checked: true };
  const fields: Field[] = [sub(title), chk(`${prefix}_include`, 'Include this assessment')];
  if (opts.hasAssessmentType)
    fields.push(
      rad(`${prefix}_assType`, 'Assessment Type', ['MCQ', 'Essay', 'Both'], { showIf: inc }),
    );
  if (opts.hasAssessmentSource) {
    fields.push(
      rad(`${prefix}_source`, 'Assessment Source', ['Client-provided', 'In-house'], {
        showIf: inc,
      }),
    );
    fields.push(
      txt(`${prefix}_inhouseAss`, 'In-house Assessment to be Deployed', {
        showIf: { field: `${prefix}_source`, is: 'In-house' },
      }),
    );
  }
  if (opts.hasSimType) {
    fields.push(txt(`${prefix}_simType1`, 'Simulation Type 1', { showIf: inc }));
    fields.push(txt(`${prefix}_simType2`, 'Simulation Type 2 (optional)', { showIf: inc }));
  }
  if (opts.hasOtherDesc) fields.push(txt(`${prefix}_desc`, 'Describe the Need', { showIf: inc }));
  if (opts.hasMode) {
    fields.push(rad(`${prefix}_mode`, 'Test Mode', ['Physical', 'Online'], { showIf: inc }));
    fields.push(
      txt(`${prefix}_locations`, 'If Physical – Preferred Locations', {
        showIf: { field: `${prefix}_mode`, is: 'Physical' },
      }),
    );
  }
  fields.push(nb(`${prefix}_candidates`, 'Number of Candidates', { showIf: inc }));
  fields.push(
    txt(`${prefix}_dates`, 'Preferred Assessment Dates', {
      placeholder: 'e.g. 15 Aug 2025, 16 Aug 2025',
      showIf: inc,
    }),
  );
  fields.push(tf(`${prefix}_startTime`, 'Start Time', { showIf: inc }));
  fields.push(tf(`${prefix}_endTime`, 'End Time', { showIf: inc }));
  return fields;
}

function sharedAssessmentFields(): Field[] {
  return [
    sec('Testing: Assessment Types & Requirements'),
    ...assessBlock('pa', 'Personality Assessment (DPI – Online Un-proctored only)'),
    ...assessBlock('sim', 'Simulation Assessment (Job Simulation Tool – Online only)', {
      hasSimType: true,
    }),
    ...assessBlock('gse', 'Graduate Standardization Examination (GSE)', { hasMode: true }),
    ...assessBlock('lgse', 'Lower GSE Assessment', { hasMode: true }),
    ...assessBlock('fsa', 'Function-Specific Assessment', {
      hasAssessmentType: true,
      hasAssessmentSource: true,
      hasMode: true,
    }),
    ...assessBlock('cca', "Client's Custom Assessment", { hasAssessmentType: true, hasMode: true }),
    ...assessBlock('gat', 'GSE Aptitude Test', { hasMode: true }),
    ...assessBlock('lrt', 'Logical Reasoning Test', { hasMode: true }),
    ...assessBlock('oth', 'Other Assessment', { hasOtherDesc: true, hasMode: true }),
    area('assessmentAdditionalInstructions', 'Additional Instructions / Accommodations'),
    rad('candidateListAttached', 'Candidate List Attached (Excel format)?', ['Yes', 'No']),
    rad('commTemplatesAttached', 'Communication Templates Attached (Word format)?', ['Yes', 'No']),
  ];
}

function sharedInterviewFields(): Field[] {
  return [
    sec('Interviews'),
    cbx('interviewPanel', 'Interview Panel Type', ['Dragnet Panel', 'Client Panel', 'Joint Panel']),
    txt('interviewDates', 'Planned Interview Schedule/Dates'),
    nb('interviewNumbers', 'Estimated Numbers'),
    txt('inviteCandidates', 'Invite Candidates (process/notes)'),
    txt('adminInterviews', 'Administer Interviews (notes)'),
    txt('interviewNoShows', 'Conditions for Treatment of No-Shows'),
  ];
}

/* ═══════════════════════════════════════════════════════════
   FORM_FIELDS — 11 forms
   ═══════════════════════════════════════════════════════════ */

export const FORM_FIELDS: Record<string, Field[]> = {
  /* ── 1. Client Onboarding Form ─────────────────────────── */
  'client-onboarding': [
    sec('1. Company Information'),
    txt('fullName', 'Full Name', { required: true }),
    em('emailAddress', 'Email Address', { required: true }),
    ph('phoneNumber', 'Phone Number'),
    txt('companyName', 'Company Name', { required: true }),
    em('companyEmail', "Company's Email Address"),
    txt('industrySector', 'Industry / Sector'),
    txt('companySize', 'Company Size (No. of Employees)'),
    txt('headOfficeLocation', 'Head Office Location'),
    ul('website', 'Website'),

    sec('2. Preferred Mode of Communication'),
    rad('communicationMode', 'Select one', ['Email', 'Phone', 'Video Call', 'In-Person Meeting']),

    sec('3. Recruitment Services'),
    cbx('recruitmentServices', 'Select all that apply', [
      'End-To-End Recruitment',
      'Graduate Trainee Recruitment',
      'Online Vacancy Management Portal',
      'In-depth Interviews',
      'Recruitment Assessment Centres',
      'Advertisement Of Vacancies',
      'Recruitment Tests and Assessments',
    ]),

    sec('4. Assessment Services'),
    cbx('assessmentServices', 'Select all that apply', [
      'Screening Using GSE Aptitude Test',
      'Screening Using DWPI (Personality) Test',
      'Screening Using HR Avatar Simulation Test',
      'Screening Using HR Avatar Pre-Hire Personality Test',
      'Screening Using HR Avatar Work Place Leadership Assessment',
      'Screening Using Case Study Assessment',
      'Screening Using MCQ Function-Specific Assessment',
      'Screening Using Client Assessment',
      'Development Of Test Items for Clients Use',
      'Screening Using Microsoft Office Proficiency Test',
      'Screening Using Essay',
    ]),

    sec('5. Assessment Centres'),
    cbx('assessmentCentres', 'Select all that apply', [
      'Group Discussion',
      'Essay',
      'E-Basket Exercise',
      'Microsoft Office Proficiency Test',
      'Presentations',
      'Interviews',
    ]),

    sec('6. Scholarship Administration Service'),
    cbx('scholarshipServices', 'Select all that apply', [
      'Deployment Of Portal to Host Scholarship Application',
      'Academic Verification',
      'Scholarship/Education Initiatives',
      'Scholars Community Management',
    ]),

    sec('7. Manpower Review Service'),
    cbx('manpowerServices', 'Select all that apply', [
      'Competency Gap Analysis',
      '360-Degree Feedback Using HR Avatar Multi Rater Tool',
    ]),

    sec('8. Background Check / Verification Services'),
    cbx('verificationServices', 'Select all that apply', [
      'Local Academic Certificate Verification',
      'Foreign Academic Certificate Verification',
      'O-Level Certificate Verification',
      'NYSC Certificate Verification',
      'Residential Address Verification',
      'Guarantor Verification',
      'Personal Reference Verification',
      'Previous Employment Verification',
      'Terrorism Check',
      'Criminal Record Check',
      'Credit Check',
      'Social Media Check',
      'Identity Verification',
      'Professional Membership/Certificate Verification',
    ]),

    sec('9. Software Development'),
    area('softwareBrief', 'Project Brief', {
      placeholder: 'Outline the objective and scope of your software development project',
    }),

    sec('10. Additional Information'),
    area('additionalInfo', 'Any additional information'),

    sec('11. Client Lead Contact (Job Coordination)'),
    txt('leadC1Name', 'Contact 1 – Name'),
    ph('leadC1GSM', 'Contact 1 – Phone'),
    em('leadC1Email', 'Contact 1 – Email'),
    txt('leadC1Designation', 'Contact 1 – Designation'),
    txt('leadC2Name', 'Contact 2 (Optional) – Name'),
    ph('leadC2GSM', 'Contact 2 (Optional) – Phone'),
    em('leadC2Email', 'Contact 2 (Optional) – Email'),

    sec('12. Client Contact for Payment / Invoice Processing'),
    txt('invC1Name', 'Contact 1 – Name'),
    ph('invC1GSM', 'Contact 1 – Phone'),
    em('invC1Email', 'Contact 1 – Email'),
    txt('invC2Name', 'Contact 2 (Optional) – Name'),
    ph('invC2GSM', 'Contact 2 (Optional) – Phone'),
    em('invC2Email', 'Contact 2 (Optional) – Email'),

    sec('13. Test Result Receiver Contact'),
    txt('testResC1Name', 'Contact 1 – Name'),
    ph('testResC1GSM', 'Contact 1 – Phone'),
    em('testResC1Email', 'Contact 1 – Email'),
    txt('testResC1Designation', 'Contact 1 – Designation'),
    txt('testResC2Name', 'Contact 2 (Optional) – Name'),
    ph('testResC2GSM', 'Contact 2 (Optional) – Phone'),
    em('testResC2Email', 'Contact 2 (Optional) – Email'),

    sec('14. Final Report Pack Receiver Contact'),
    txt('rptC1Name', 'Contact 1 – Name'),
    ph('rptC1GSM', 'Contact 1 – Phone'),
    em('rptC1Email', 'Contact 1 – Email'),
    txt('rptC1Designation', 'Contact 1 – Designation'),
    txt('rptC2Name', 'Contact 2 (Optional) – Name'),
    ph('rptC2GSM', 'Contact 2 (Optional) – Phone'),
    em('rptC2Email', 'Contact 2 (Optional) – Email'),
    df('plannedStartDate', 'Planned Project Commencement Date'),

    sec('15. Sign-Off'),
    txt('signOffName', 'Client Representative Name'),
    txt('signOffTitle', 'Title / Position'),
    df('signOffDate', 'Date'),
  ],

  /* ── 2. Client Feedback Form ───────────────────────────── */
  'client-feedback': [
    sec('A. Client Information'),
    txt('orgName', 'Name of Organization', { required: true }),
    txt('repName', 'Name of Client Representative'),
    txt('position', 'Position'),
    txt('department', 'Department'),
    em('repEmail', 'Email of Client Representative'),

    sec('B. Service Description & Ratings'),
    area('serviceDescription', 'Service Description', { required: true }),
    df('dateDelivered', 'Date Delivered'),
    txt('dragnetContact', 'Dragnet Contact'),

    sub('Satisfaction Ratings'),
    rat(
      'ratings',
      'Please rate your satisfaction',
      [
        'Sales and Onboarding Process',
        'Communication and Feedback',
        'Responsiveness',
        'Quality of Report',
        'Overall Service Delivery',
      ],
      ['Excellent', 'Good', 'Average', 'Poor'],
    ),

    area('generalFeedback', 'General Feedback or Recommendations'),
    area('upcomingProjects', 'Any upcoming projects we can assist with?'),
    area('likedMost', 'What did you like most about our service?'),
    area('improvements', 'How can we improve?'),

    sec('C. Testimonial'),
    area('testimonialLed', 'What led you to us?'),
    area('testimonialHelped', 'How did we help?'),
    chk('testimonialConsent', 'I consent to Dragnet using my testimonial for marketing purposes'),
    txt('testimonialConditions', 'Conditions (if any)'),

    sec('Referrals'),
    txt('ref1Name', 'Referral 1 – Name'),
    txt('ref1Contact', 'Referral 1 – Email / Phone'),
    txt('ref2Name', 'Referral 2 – Name'),
    txt('ref2Contact', 'Referral 2 – Email / Phone'),
    txt('ref3Name', 'Referral 3 – Name'),
    txt('ref3Contact', 'Referral 3 – Email / Phone'),
  ],

  /* ── 3. Customer Service Adhoc Briefing Form ───────────── */
  'cs-adhoc-briefing': [
    sec('Requester Information'),
    txt('requesterName', 'Name', { required: true }),
    txt('requesterDepartment', 'Department/Team'),
    em('requesterEmail', 'Email', { required: true }),
    ph('requesterPhone', 'Phone'),

    sec('Communication Type'),
    cbx('communicationType', 'Select all that apply', ['Email', 'Call', 'SMS']),

    sec('Details'),
    area('communicationPurpose', 'Purpose of Communication', {
      required: true,
      placeholder: 'Explain the context and reason for this communication',
    }),
    area('messageContent', 'Message Content', {
      placeholder: 'Enter message text or describe the content',
    }),
    rad('senderListAttached', 'Sender List Attached?', ['Yes', 'No']),
    dtl('executionDateTime', 'Preferred Execution Date & Time'),
    rad('urgencyLevel', 'Urgency Level', [
      'Normal (processed within 24 hours)',
      'Urgent (same-day processing)',
    ]),
  ],

  /* ── 4. Invoice Request Form ───────────────────────────── */
  'invoice-request': [
    df('dateOfRequest', 'Date of Request', { required: true }),

    sec('A. Client Information'),
    txt('invClientName', "Client's Name", { required: true }),
    area('invClientAddress', "Client's Address"),
    txt('invClientContact', "Client's Contact (Phone/Email)"),

    sec('B. Invoice Information'),
    df('invTransactionDate', 'Invoice Transaction Date'),
    df('invDueDate', 'Invoice Due Date'),

    sec('C. Product / Service Details'),
    tbl('invoiceLineItems', 'Line Items', [
      { id: 'description', label: 'Description', type: 'text' },
      { id: 'quantity', label: 'Qty', type: 'number' },
      { id: 'unitPrice', label: 'Unit Price', type: 'number' },
      { id: 'discount', label: 'Discount', type: 'text' },
      { id: 'tax', label: 'Tax', type: 'text' },
      { id: 'total', label: 'Total', type: 'text' },
    ]),
    txt('requestingParty', 'Name of Requesting Party'),
  ],

  /* ── 5. Client Graduate Trainee Briefing Form ──────────── */
  'graduate-trainee-briefing': [
    sec('A. Company Information'),
    txt('companyName', 'Company Name', { required: true }),
    txt('leadContact', 'Name of Lead Contact (Job Coordination)'),
    ph('phoneNumber', 'Phone Number'),
    em('email', 'Email'),
    txt('designation', 'Designation'),

    sec('B. Service Requirements'),
    sub('Services (Select all applicable)'),
    chk('svcOnlineJobHosting', 'Online Job Hosting'),
    txt('svcOnlineJobDates', 'Planned Schedule / Dates', {
      showIf: { field: 'svcOnlineJobHosting', checked: true },
    }),
    chk('svcBannerCreation', 'Banner Creation'),
    chk('svcAdverts', 'Adverts and Social Media Campaigns'),
    txt('svcAdvertsDates', 'Planned Schedule / Dates', {
      showIf: { field: 'svcAdverts', checked: true },
    }),
    chk('svcScreening', 'Screening and Shortlisting'),
    txt('svcScreeningDates', 'Planned Schedule / Dates', {
      showIf: { field: 'svcScreening', checked: true },
    }),
    nb('svcScreeningNumbers', 'Estimated Numbers', {
      showIf: { field: 'svcScreening', checked: true },
    }),

    sub('Shortlisting Criteria'),
    txt('shortlistAge', 'Age'),
    txt('shortlistCourse', 'Course of Study'),
    txt('shortlistDegree', 'Class of Degree'),
    txt('shortlistPostGrad', 'Years of Post-Graduation'),

    ...sharedAssessmentFields(),

    sec('Test Question Bank Provider'),
    rad('questionBankProvider', 'Provider', ['Dragnet', 'Client']),
    txt('questionBankDates', 'Planned Schedules / Dates'),
    nb('questionBankNumbers', 'Estimated Numbers'),
    txt('inviteCandidates', 'Invite Candidates (details)'),
    txt('administerTest', 'Administer Test (details)'),
    txt('multipleTestSequence', 'If Multiple Tests – Preferred Sequence and Dates'),
    txt('noShowConditions', 'Conditions for Treatment of No-Shows'),

    ...sharedInterviewFields(),

    sec('Assessment Centres'),
    chk('acInclude', 'Include Assessment Centres'),
    rad('acMode', 'Mode', ['Virtual', 'In-Person', 'Hybrid'], {
      showIf: { field: 'acInclude', checked: true },
    }),
    cbx(
      'acActivities',
      'Activities',
      [
        'Essays',
        'Presentations',
        'Office Tools Products',
        'E-Basket (Behavioural Simulation Assessment)',
        'Group Discussion',
      ],
      { showIf: { field: 'acInclude', checked: true } },
    ),
    rad('acInterviewPanel', 'Interview Panel', ['Dragnet Panel', 'Client Panel', 'Joint Panel'], {
      showIf: { field: 'acInclude', checked: true },
    }),
    txt('acSchedule', 'Planned Schedule/Dates', { showIf: { field: 'acInclude', checked: true } }),
    nb('acNumbers', 'Estimated Numbers', { showIf: { field: 'acInclude', checked: true } }),
    txt('acNoShows', 'Conditions for Treatment of No-Shows', {
      showIf: { field: 'acInclude', checked: true },
    }),

    sec('C. Other Information'),
    rad('portalHost', 'Portal Host', ['Dragnet', 'Client']),
    txt('periodOfPortal', 'Period of Portal Use'),
    area('treatmentOfDuplicates', 'Treatment of Duplicates'),

    sec('Sign-Off'),
    txt('signOffName', 'Client Representative Name'),
    txt('signOffTitle', 'Title / Position'),
    df('signOffDate', 'Date'),
  ],

  /* ── 6. Client Recruitment Briefing Form ───────────────── */
  'recruitment-briefing': [
    sec('1. Company Information'),
    txt('companyName', 'Company Name', { required: true }),
    txt('leadContact', 'Name of Lead Contact (Job Coordination)'),
    ph('phoneNumber', 'Phone Number'),
    em('emailAddress', 'Email Address'),
    txt('designation', 'Designation'),

    sec('2. Position Details'),
    txt('jobTitle', 'Job Title', { required: true }),
    txt('department', 'Department / Division'),
    txt('reportsTo', 'Reports To (Position Title)'),
    nb('numPositions', 'Number of Positions Available'),
    rad('vacancyReason', 'Reason for Vacancy', ['New Position', 'Replacement', 'Expansion']),
    df('expectedOfferDate', 'Expected Offer Date'),
    df('expectedStartDate', 'Expected Start Date for the Role'),
    txt('hiringTimeline', 'Hiring Timeline', { placeholder: 'e.g. 2 months, By Q3 2025, ASAP' }),

    sec('3. Job Description & Responsibilities'),
    area('jobPurpose', 'Job Purpose / Summary'),
    area('keyResponsibilities', 'Key Responsibilities & Duties'),

    sec('4. Required Qualifications & Experience'),
    area('educationRequirements', 'Education Requirements'),
    area('professionalCerts', 'Professional Certifications'),
    area('workExperience', 'Work Experience'),
    area('technicalSkills', 'Technical Skills'),
    area('softSkills', 'Soft Skills & Competencies'),

    sec('5. Compensation & Benefits'),
    txt('salaryRange', 'Salary Range (Min – Max)'),
    txt('bonusStructure', 'Commission / Bonus Structure'),
    cbx('benefitsOffered', 'Benefits Offered', [
      'Health Insurance (HMO)',
      'Retirement Plans (Pension)',
      'Paid Time Off (Leave)',
      'Professional Development (Educational Assistance)',
      'Other Perks (Gym, Company Car, Remote Stipends)',
    ]),
    txt('relocationAssistance', 'Relocation Assistance'),
    txt('travelRequirements', 'Travel Requirements'),

    sec('6. Job-Specific Requirements'),
    txt('requiredLanguages', 'Required Languages'),
    txt('proficiencyLevel', 'Proficiency Level'),
    txt('culturalExpertise', 'Cultural or Regional Expertise'),
    area('physicalReqs', 'Physical Requirements'),
    area('specialConsiderations', 'Special Considerations'),
    area('knownChallenges', 'Known Challenges of the Role'),
    area('preferredProfiles', 'Preferred Candidate Profiles'),
    area('disqualifiers', 'Disqualifiers'),

    sec('7. Work Schedule & Conditions'),
    txt('workingHours', 'Working Hours'),
    txt('flexibilityReqs', 'Flexibility Requirements'),
    rad('workOptions', 'Work Options', ['On-site', 'Remote', 'Hybrid']),
    area('workEnvironment', 'Work Environment / Conditions'),

    sec('8. Why Join Us? (Employer Value Proposition)'),
    area('greatPlaceToWork', 'What makes you a great place to work?'),
    area('lookForInCandidates', 'What we look for in candidates'),

    sec('9. Recruitment Process Details'),
    df('appDeadline', 'Application Deadline'),
    area('recruitmentStages', 'Recruitment Stages', {
      placeholder: 'No. of interviews, types, assessments/tests',
    }),
    txt('decisionTimeline', 'Decision-Making Timeline'),

    sec('10. Job Advertisement / Banner Preferences'),
    df('adDeadline', 'Application Deadline (for ad)'),
    txt('postingPlatforms', 'Job Posting Platforms', {
      placeholder: 'e.g. LinkedIn, Indeed, social media',
    }),
    txt('advertisingBudget', 'Advertising Budget'),
    rad('confidentiality', 'Withhold Company Name from Ads?', ['Yes', 'No']),
    rad('salaryDisclosure', 'Disclose Salary in Ads?', ['Yes', 'No']),
    txt('brandingGuidelines', 'Branding Guidelines'),
    txt('targetDemographics', 'Target Demographics'),
    rad('applicationMethod', 'Application Method', ['Follow Link', 'Send Email']),
    txt('applicationMethodValue', 'Application Link or Email'),
    rad('preferBarcode', 'Prefer a Barcode?', ['Yes', 'No']),
    ul('clientWebsite', "Link to Client's Website"),

    ...sharedAssessmentFields(),
    ...sharedInterviewFields(),

    sec('13. Communication Preferences'),
    txt('preferredChannels', 'Preferred Communication Channels'),
    txt('updateSchedule', 'Regular Update Schedule', { placeholder: 'e.g. Weekly, Bi-weekly' }),
    txt('candidateContact', 'Point of Contact for Candidates'),
    txt('updateFrequency', 'Frequency of Updates to Client'),

    sec('Sign-Off'),
    txt('signOffName', 'Client Representative Name'),
    txt('signOffTitle', 'Title / Position'),
    df('signOffDate', 'Date'),
  ],

  /* ── 7. Test Centre Booking Form ───────────────────────── */
  'test-centre-booking': [
    txt('testCentre', 'Test Centre', { required: true }),
    df('requestDate', 'Request Date'),
    df('latestResponseDate', 'Latest Response Date (Booking Deadline)'),
    nb('totalCandidates', 'Total Number of Candidates (Maximum)'),
    nb('totalSittingsPerDay', 'Total Number of Sittings Per Day (approx)'),
    nb('noOfSessionsPerDay', 'No. of Sessions Per Day'),
    nb('capacityPerSession', 'Capacity Per Session Per Day'),
    nb('biometricPoints', 'Biometric Points Required Per Session (min. 3)'),
    txt('datesRequired', 'Dates Required for Testing', {
      placeholder: 'e.g. 10 Aug – 14 Aug 2025',
    }),

    sec('Sessions Detail'),
    tbl('testingSessions', 'Sessions (Day / Session / Expected Candidates)', [
      { id: 'day', label: 'Day', type: 'date' },
      { id: 'sessionTime', label: 'Time of Session', type: 'time' },
      { id: 'expected', label: 'Expected Candidates', type: 'number' },
    ]),

    sec('Contact'),
    txt('contactName', 'Name'),
    ph('mobileNumber', 'Mobile Number'),
    em('emailAddress', 'Email Address'),

    sec('Comments & Notes'),
    area('dragnetComment', "Dragnet's Comment"),
    area('response', 'Response'),
    area('remarksSpecial', 'Remarks / Special Conditions'),
  ],

  /* ── 8. Verification Order Form ────────────────────────── */
  'verification-order': [
    sec('A. Customer Details'),
    txt('campaignIdField', 'Campaign ID'),
    txt('clientNameField', 'Client Name'),
    cbx(
      'verificationType',
      'Type of Verification Required (select all that apply)',
      [
        'Address Verification',
        'Guarantor Verification',
        'Academic Verification',
        'Studentship Verification',
        'Police Background Check',
        'NYSC Verification',
        'Others',
      ],
      { required: true },
    ),
    txt('otherVerificationType', 'If Others – Specify', {
      showIf: { field: 'verificationType', is: 'Others' },
    }),
    area('candidatesPerType', 'Number of Candidates per Verification Type', {
      hint: 'For each selected type, specify the number of candidates e.g. "Academic Verification: 45"',
    }),
    odf('documentLink', 'Document Folder'),
    odf('approvedReportLink', 'Approved Profitability Report'),

    sec('B. Document Requirements Reference'),
    area('additionalInstructions', 'Additional Instructions', {
      hint: 'Include any special instructions, document checklist confirmations, or bulk submission notes',
    }),

    sec('D. Data Protection & Consent'),
    chk(
      'dataConsent',
      'I confirm all submitted data complies with consent requirements, is accurate and complete, and will be used solely for verification purposes.',
      { required: true },
    ),

    sec('E. Approval'),
    txt('requestingParty', 'Name of Requesting Party'),
    df('approvalDate', 'Date'),
  ],

  /* ── 9. Test Order Form ─────────────────────────────────── */
  'test-order': [
    sec('Test Details'),
    rad('testType', 'Test Type', ['Physical', 'Online', 'Hybrid'], { required: true }),
    area('physicalLocations', 'If Physical – Specify Locations', {
      showIf: { field: 'testType', is: 'Physical' },
    }),
    rad('proctoringOption', 'If Online – Proctoring Option', ['Proctored', 'Un-proctored'], {
      showIf: { field: 'testType', is: 'Online' },
    }),
    nb('newCandidateCount', 'Number of New Candidates', { required: true }),
    chk('hasRescheduledCandidates', 'Are there any rescheduled candidates?'),
    nb('rescheduledCandidateCount', 'Number of Rescheduled Candidates', {
      required: true,
      showIf: { field: 'hasRescheduledCandidates', checked: true },
    }),
    // Auto-computed (new + rescheduled) — see the effect in Forms/index.tsx.
    // Kept as the same field id the resource-scaling check in
    // forms.service.ts already reads by name.
    nb('candidateCount', 'Total Number of Candidates', { readonly: true }),
    rad('testingPlatform', 'Testing Platform', ['FOT', 'TESTHAVEN', 'DPI', 'HR AVATAR', 'Other']),
    txt('otherPlatform', 'If Other – Specify Platform', {
      showIf: { field: 'testingPlatform', is: 'Other' },
    }),
    rad('assessmentType', 'Assessment Type', ['MCQ', 'Essay', 'Both']),
    txt('assessmentDeployed', 'Assessment to be Deployed'),
    rad('assessmentSource', 'Assessment Source', ['In-house', 'Client']),

    sec('Testing Sessions'),
    rad('testSession', 'Session Type', ['Day', 'Night']),
    tbl('testingSessions', 'Sessions', [
      { id: 'startDate', label: 'Start Date', type: 'date' },
      { id: 'endDate', label: 'End Date', type: 'date' },
      { id: 'startTime', label: 'Start Time', type: 'time' },
      { id: 'endTime', label: 'End Time', type: 'time' },
    ]),

    rad('instantResult', 'Instant Result Display', ['Enable', 'Disable']),
    rad('deploySurvey', 'Deploy Survey?', ['Yes', 'No']),
    ul('surveyLink', 'If Yes – Survey Link', 'https://', {
      showIf: { field: 'deploySurvey', is: 'Yes' },
    }),
    area('communicationTemplates', 'Communication Templates Provided'),

    sec('Additional Instructions / Requirements'),
    area('specialInstructions', 'Special Accommodations / Instructions'),

    sec('Attachments'),
    odf('invitationTemplate', 'Invitation Template', { hint: 'Word or PDF document' }),
    odf('candidateList', 'Candidate List', { hint: 'Excel or CSV file' }),
    rad('resultsAccess', 'Results Access', [
      'Downloaded by Client Engagement',
      'Downloaded by Client',
      'Sent by Testing Operations',
    ]),
  ],

  /* ── 10. Creative Asset Form ────────────────────────────── */
  'creative-asset': [
    sec('Campaign Details'),
    rad('campaignType', 'Campaign Type', [
      'Graduate Trainee Recruitment',
      'Experienced Hire Recruitment',
      'Internship Program',
      'Scholarship Program',
      'Other',
    ]),
    rad('targetAudience', 'Target Audience', [
      'University Graduates',
      'Experienced Professionals',
      'Students (Scholarship Applicants)',
      'Other',
    ]),
    df('applicationDeadline', 'Application Deadline (if applicable)'),
    ul('applicationLink', 'Application Link or QR Code'),
    area('keySellingPoints', 'Key Selling Points'),

    sec('Asset Details'),
    cbx('assetType', 'Asset Type (select all that apply)', [
      'Advert (Digital/Print)',
      'Video',
      'Text/Copywriting',
      'Social Media Content',
      'Website Banner',
      'Email Newsletter Graphic',
      'Other',
    ]),

    sec('Job Details'),
    ul('clientWebsite', "Link to Client's Website"),
    txt('jobTitle', 'Job Title'),
    txt('jobLocation', 'Job Location'),
    txt('jobType', 'Job Type'),
    area('jobDescription', 'Brief Description of Job'),
    area('keyResponsibilities', 'Key Responsibilities'),
    area('jobRequirements', 'Job Requirements'),
    rad('applicationMethod', 'Application Method', ['Follow Link', 'Send Email']),
    ul('applyLink', 'Application Link (if Follow Link)', 'https://', {
      showIf: { field: 'applicationMethod', is: 'Follow Link' },
    }),
    em('applyEmail', 'Application Email (if Send Email)', {
      showIf: { field: 'applicationMethod', is: 'Send Email' },
    }),
    rad('barcodePreference', 'Do you prefer a barcode?', ['Yes', 'No']),

    sec('Advert Purpose'),
    rad('advertPurpose', 'Select one', [
      'Recruitment',
      'Scholarship Promotion',
      'Testing/Assessments',
      'Quiz Competitions',
      'Other',
    ]),

    sec('Creative Brief'),
    area('overviewRequest', 'Overview of Request'),
    area('targetAudienceDetails', 'Target Audience Details'),
    area('keyMessages', 'Key Messages or Taglines'),
    area('toneStyle', 'Tone and Style'),
    area('preferredColors', 'Preferred Colors / Branding Guidelines'),
    area('competitorInspiration', 'Competitors or Inspiration (links)'),
    rad('callToAction', 'Call-to-Action (CTA)', [
      'Apply Now',
      'Register Here',
      'Learn More',
      'Other',
    ]),
    txt('otherCTA', 'If Other CTA – specify', { showIf: { field: 'callToAction', is: 'Other' } }),

    sec('Image / Graphic Design'),
    txt('imageDimensions', 'Dimensions / Format'),
    area('specificElements', 'Specific Elements'),
    area('imageText', 'Any Text / Copy'),

    sec('Video'),
    txt('videoLength', 'Video Length'),
    txt('videoStyle', 'Style'),
    area('keyScenes', 'Key Scenes/Shots'),
    area('voiceMusic', 'Voiceover / Music Preferences'),

    sec('Text / Copywriting'),
    txt('copyType', 'Type of Copy'),
    txt('desiredLength', 'Desired Length'),
    txt('keywords', 'Keywords / SEO'),
    txt('specificCTA', 'Specific Call-to-Action'),

    sec('Distribution Channels & Deadlines'),
    cbx('assetUsage', 'Where will the asset be used?', [
      'Website',
      'Social Media',
      'Email Campaigns',
      'Paid Ads',
      'Print',
      'Other',
    ]),
    txt('socialPlatforms', 'If Social Media – Specify Platforms', {
      showIf: { field: 'assetUsage', is: 'Social Media' },
    }),
    txt('assetTimeline', 'Asset Usage Timeline'),
    rad('adPlacement', 'Ad Placement Preferences', ['Feed', 'Stories', 'Both', 'Other']),

    sec('Budget & Additional Notes'),
    txt('budgetEstimate', 'Budget Estimate'),
    area('creativeRestrictions', 'Creative Restrictions'),
    area('additionalInfo', 'Additional Information'),
    odf('fileReferences', 'File References'),
  ],

  /* ── 11. Portal Configuration Form ─────────────────────── */
  'portal-config': [
    sec('Branding & Visual Identity'),
    odf('logoUrl', 'Logo'),
    txt('primaryBrandColor', 'Primary Brand Color', { placeholder: 'e.g. #003366' }),
    txt('secondaryBrandColor', 'Secondary Brand Color'),
    txt('accentColors', 'Accent Colors (optional)'),
    txt('fontPreference', 'Font Preference'),

    sec('Portal Functionality Requirements'),
    cbx('portalFeatures', 'Main Features Required', [
      'Job Listings',
      'Job Application Form',
      'User Registration/Login',
      'Employer/Client Dashboards',
      'Applicant Dashboard',
      'Search Functionality',
      'Resume Upload Capability',
      'Job Alerts/Notifications',
      'Job Categories/Filters',
      'Interview Scheduling',
      'Other',
    ]),
    rad('portalLayout', 'Preferred Portal Layout', [
      'Single Page',
      'Multi-Page (Tabs)',
      'Dashboard-based',
    ]),
    area('userPermissions', 'User Types & Permissions'),
    area('portalContent', 'Portal Content & Sections'),
    area('aboutClient', 'About the Client'),
    area('customSections', 'Custom Sections (optional)'),
    area('languagesRequired', 'Languages Required'),

    sec('Technical Requirements'),
    txt('preferredPlatform', 'Preferred Portal Platform'),
    area('thirdPartyIntegrations', 'Third-Party Integrations'),
    rad('hostingPreference', 'Hosting Preference', ['AWS', 'Azure', 'Custom Hosting', 'Other']),
    txt('otherHosting', 'If Other – Specify', {
      showIf: { field: 'hostingPreference', is: 'Other' },
    }),
    area('additionalNotes', 'Additional Customization & Notes'),
    area('designNotes', 'Additional Design Notes / Custom Requests'),
    df('launchDeadline', 'Deadline for Portal Launch'),
    area('specialInstructions', 'Notes or Special Instructions'),
  ],
};
