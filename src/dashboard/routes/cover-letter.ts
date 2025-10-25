import { Request, Response } from 'express';
import { getDb } from '../../lib/db';

export async function generateCoverLetter(req: Request, res: Response) {
  try {
    const { 
      jobId, 
      jobTitle, 
      company, 
      description, 
      fitReasons, 
      mustHaves, 
      blockers, 
      categoryScores, 
      missingKeywords 
    } = req.body;

    if (!jobId || !jobTitle || !company) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user profile for personalization
    const database = getDb();
    const profile = {
      name: 'Rommel Bandeira',
      email: 'rommel.bandeira@example.com',
      phone: '(555) 123-4567',
      location: 'Your City, State',
      summary: 'Experienced software engineer with expertise in modern web technologies.',
      experience: '5+ years of software development experience',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL']
    };

    // Parse JSON fields
    const parsedFitReasons = fitReasons ? JSON.parse(fitReasons) : [];
    const parsedMustHaves = mustHaves ? JSON.parse(mustHaves) : [];
    const parsedBlockers = blockers ? JSON.parse(blockers) : [];
    const parsedCategoryScores = categoryScores ? JSON.parse(categoryScores) : {};
    const parsedMissingKeywords = missingKeywords ? JSON.parse(missingKeywords) : [];

    // Generate cover letter using AI
    const coverLetter = await generateAICoverLetter({
      jobTitle,
      company,
      description,
      fitReasons: parsedFitReasons,
      mustHaves: parsedMustHaves,
      blockers: parsedBlockers,
      categoryScores: parsedCategoryScores,
      missingKeywords: parsedMissingKeywords,
      profile
    });

    res.json({ coverLetter });
  } catch (error) {
    console.error('Error generating cover letter:', error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
}

async function generateAICoverLetter({
  jobTitle,
  company,
  description,
  fitReasons,
  mustHaves,
  blockers,
  categoryScores,
  missingKeywords,
  profile
}: {
  jobTitle: string;
  company: string;
  description?: string;
  fitReasons: string[];
  mustHaves: string[];
  blockers: string[];
  categoryScores: Record<string, number>;
  missingKeywords: string[];
  profile: any;
}) {
  // Create a realistic, professional cover letter
  const salutation = `Dear Hiring Manager,`;
  
  const opening = `I am writing to express my strong interest in the ${jobTitle} position at ${company}. After reviewing the job description, I am confident that my background and skills align well with your requirements.`;

  // Build body paragraphs based on fit reasons
  let bodyParagraphs = [];
  
  if (fitReasons.length > 0) {
    const topFitReasons = fitReasons.slice(0, 2); // Use top 2 fit reasons
    const fitParagraph = `My experience particularly aligns with your needs in ${topFitReasons.join(' and ')}. ${getExperienceDetails(topFitReasons[0])}`;
    bodyParagraphs.push(fitParagraph);
  }

  // Add paragraph about addressing must-haves
  if (mustHaves.length > 0) {
    const mustHaveParagraph = `I bring the essential qualifications you're seeking, including ${mustHaves.slice(0, 3).join(', ')}. This combination of skills positions me to contribute effectively to your team from day one.`;
    bodyParagraphs.push(mustHaveParagraph);
  }

  // Add paragraph about company interest
  const companyParagraph = `I am particularly drawn to ${company} because of ${getCompanyInterest(company)}. I am excited about the opportunity to contribute to your mission and grow with your organization.`;

  const closing = `I would welcome the opportunity to discuss how my background and enthusiasm can contribute to your team. Thank you for considering my application.

Sincerely,
${profile.name || 'Your Name'}`;

  return [salutation, opening, ...bodyParagraphs, companyParagraph, closing].join('\n\n');
}

function getExperienceDetails(fitReason: string): string {
  const experienceMap: Record<string, string> = {
    'API Development': 'I have extensive experience building RESTful APIs and microservices using modern frameworks, with a focus on scalability and performance.',
    'Backend Development': 'My background includes developing robust backend systems with strong database design and optimization skills.',
    'Frontend Development': 'I have hands-on experience creating responsive user interfaces and implementing modern frontend frameworks.',
    'Cloud Technologies': 'I have worked extensively with cloud platforms, implementing scalable solutions and managing infrastructure.',
    'DevOps': 'My experience includes CI/CD pipeline development, containerization, and infrastructure automation.',
    'Database Management': 'I have strong expertise in database design, optimization, and management across various database systems.',
    'Team Leadership': 'I have successfully led development teams, mentored junior developers, and managed complex projects.',
    'Agile Methodologies': 'I am experienced in Agile development practices and have worked effectively in cross-functional teams.'
  };

  return experienceMap[fitReason] || 'I have relevant experience in this area that would be valuable to your team.';
}

function getCompanyInterest(company: string): string {
  const companyInterests: Record<string, string> = {
    'Google': 'your innovative approach to technology and commitment to solving complex problems at scale',
    'Microsoft': 'your mission to empower every person and organization to achieve more',
    'Amazon': 'your customer-centric approach and culture of innovation',
    'Apple': 'your focus on creating products that enhance people\'s lives',
    'Meta': 'your vision of connecting people and building communities',
    'Netflix': 'your commitment to entertainment and technological innovation',
    'Tesla': 'your mission to accelerate the world\'s transition to sustainable energy',
    'SpaceX': 'your ambitious goals in space exploration and technology'
  };

  return companyInterests[company] || 'your innovative approach and commitment to excellence';
}
