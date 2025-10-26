-- Job Application Database Export
-- Generated on: 2025-10-26T00:04:11.991Z

CREATE TABLE answers (
      job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
      json TEXT NOT NULL,
      resume_variant TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );


CREATE TABLE jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      easy_apply INTEGER NOT NULL,
      rank REAL,
      status TEXT DEFAULT 'queued',
      applied_method TEXT,
      rejection_reason TEXT,
      fit_reasons TEXT,
      must_haves TEXT,
      blockers TEXT,
      category_scores TEXT,
      missing_keywords TEXT,
      posted_date TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status_updated_at TEXT
    );

INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('7b58e4617b8049f3ea3f461a39e4de19', 'Senior Software Developer (Remote)', 'ExecutivePlacements.com', 'https://www.linkedin.com/jobs/view/4331646181', 0, 100, 'queued', NULL, NULL, '["Good fit"]', '["Strong .NET development skills","Experience with ASP.NET, MVC, and Web Forms"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":60,"performance":70,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":50,"legacyModernization":20}', '["Azure expertise"]', '13 hours ago', 'About the job

Join to apply for the Senior Software Developer (Remote)  role at Avalign Technologies 

Join to apply for the Senior Software Developer (Remote)  role at Avalign Technologies 

Avalign produces innovative, high-performance, and cost-effective medical devices with a particular focus on high growth and ingenuity. Our team is growing quickly and proud of the fact that our custom-made devices continue to make a huge difference in the lives of medical professionals and their patients. Our employees are actively involved in the design, engineering and manufacture of technologically advanced medical devices that ensure that we meet our customers quality specifications for each product we produce.

Avalign Technologies is looking for a Senior Software Developer to join our growing IT team. This hands-on leadership role combines technical expertise with strategic vision, providing you the opportunity to architect, develop, and enhance enterprise applications while mentoring a small team of developers. Youll work closely with cross-functional business partners to deliver secure, scalable, and high-performing solutions that advance Avaligns mission and operational goals.

This position will be a remote work-from-home role with minimal travel required.

What You''ll Do


Lead and mentor a team of 13 developers, providing technical guidance, conducting code reviews, and promoting skill development. 
Design, build, test, and deploy both custom and third-party software solutions in alignment with SDLC best practices. 
Provide advanced (Level 2 & 3) application support including troubleshooting, root cause analysis, and performance tuning. 
Translate business requirements into scalable technical designs in close partnership with stakeholders. 
Manage team workload and project timelines to ensure on-time delivery. 
Support strategic IT initiatives such as cloud migration, system integration, and application modernization. 
Contribute to technology evaluations and build-vs-buy decisions. 
Maintain thorough and accurate documentation, including system architecture and configuration standards. 
Ensure compliance with IT governance, security policies, and industry regulations. 
Escalate issues with clear resolution options when necessary. 
Occasional travel (up to 10%) may be required for team collaboration or project execution.


What You''ll Need:


Bachelors degree in Computer Science, Information Systems, or a related field. 
6+ years of full-stack application development experience. 
2+ years in a technical leadership or mentorship role. 
Experience in regulated industries (medical device, pharma, etc.) is a plus. 
Familiarity with manufacturing environments is beneficial.


Technical Skills


Proven experience designing scalable, enterprise-level systems. 
Expert knowledge of Microsoft tech stack: .NET Core, C#, ASP.NET MVC, Entity Framework. 
Strong background in SQL Server and database architecture. 
Experience with RESTful APIs, SOAP services, and enterprise integrations. 
Familiar with CI/CD pipelines, Git, and cloud platforms (Azure, AWS). 
Proficiency in reporting tools such as SSRS, Power BI, or equivalent. 
Strong understanding of Agile methodologies, DevOps practices, and the full software development lifecycle. 
Solid testing skills across unit, integration, and regression testing.


Leadership & Soft Skills


Strong problem-solving and analytical abilities. 
Clear, effective communication skills, with the ability to explain technical concepts to non-technical audiences. 
Highly organized, detail-oriented, and able to manage multiple priorities in a dynamic environment. 
Committed to continuous learning and professional growth. 
Demonstrated ability to foster collaboration and coach junior developers.


What You Wont Do:


Feel stuck we offer great opportunities to advance and learn 
Get bored we make a high variety of products, so no day is the same 
Feel like a number were a close-knit bunch and always have each others backs


Who You Are:


A self-starter who thrives in a fast-paced environment 
A quick learner who is always ready to gain depth of knowledge in manufacturing processes 
A reliable individual who knows the importance of showing up when it counts 
Someone who accept assignments with an open, cooperative, positive and team-oriented approach 
Someone who is able to plan and execute plans across teams 
An effective communicator, both written and verbal


What Youll Enjoy:


Competitive compensation and benefits package 
Comprehensive medical, dental, and vision insurance 
Paid vacation and 10 observed paid holidays per year 
Employer funded Basic Life and AD&D insurance 
Employer funded STD and LTD insurance 
Tuition reimbursement 
Great 401(k) with company match 
Generous employee referral bonus program 
Working for a thriving, performance-based company that values promoting from within and career advancement 
Temperature controlled environment 
Community involvement investing and giving back to the community 
Additional free resources such as travel assistance, EAP, etc.


Avalign conducts a comprehensive background, drug testing, highest level of education completion verification, and reference checks.

We are an equal opportunity employer and value diversity at our company. We do not discriminate on the basis of race, religion, national origin, gender identity, sexual orientation, age, marital status, veteran status, or disability status. We are an employer that participates in E-Verify and will provide the federal government with your Form I-9 information to confirm that you are authorized to work in the U.S. 

Seniority level


Seniority level Mid-Senior level 


Employment type


Employment type Full-time 


Job function


Job function Engineering and Information Technology 
Industries Medical Equipment Manufacturing 


Referrals increase your chances of interviewing at Avalign Technologies by 2x

Sign in to set job alerts for Senior Software Engineer roles.

Software Engineer Project Lead - React / Node

Lead Software Engineer, Rocket Travel by Agoda

Chicago, IL $148,949.00-$220,000.00 2 weeks ago

Chicago, IL $170,000.00-$190,000.00 5 months ago

Chicago, IL $170,000.00-$190,000.00 5 months ago

Senior Software Engineer, Backend - Fintech

Chicago, IL $150,000.00-$350,000.00 2 weeks ago

Chicago, IL $185,000.00-$235,000.00 1 hour ago

Senior Software Engineer (Remote) - React, Node

Chicago, IL $180,000.00-$220,000.00 3 days ago

Northbrook, IL $105,800.00-$132,250.00 1 week ago

Hammond, IN $130,000.00-$175,000.00 2 weeks ago

Chicago, IL $80,000.00-$140,000.00 8 months ago

Chicago, IL $170,000.00-$200,000.00 4 months ago

Chicago, IL $105,000.00-$215,000.00 3 hours ago

Senior Software Developer (Full Stack & AI Focus)

Senior Full Stack Software Engineer - Remote Latin America / Europe

Chicago, IL $110,000.00-$140,000.00 1 week ago

Senior Cloud & Back-End Software Engineer

United States $145,000.00-$160,000.00 1 month ago

Senior Software Engineer, Vendor Experience (remote)

Chicago, IL $91,700.00-$137,500.00 3 days ago

Chicago, IL $125,000.00-$150, hours ago

Senior Staff Software Engineer, Time Engineering

Greater Chicago Area $191,000.00-$279,000.00 1 week ago

Chicago, IL $110,000.00-$140,000.00 1 week ago

Senior Lead Software Engineer - Analytics Products (Remote)

Chicago, IL $140,000.00-$250,000.00 3 days ago

Chicago, IL $200,000.00-$250,000.00 9 hours ago

Chicago, IL $145,000.00-$160,000.00 2 weeks ago

Senior Staff Software Engineer, Payments

Greater Chicago Area $191,000.00-$265,000.00 3 weeks ago

Sr. Full Stack Engineer (.Net/React) (Remote)

Oak Brook, IL $106,000.00-$134,000.00 1 week ago

Greater Chicago Area $147,500.00-$195,000.00 1 week ago

Senior Backend Engineer (Content, Security & Trust)

Chicago, IL $147,700.00-$191,580.00 2 weeks ago

Greater Chicago Area $175,000.00-$200,000.00 1 week ago

Lead Quality Assurance Software Developer

Chicago, IL $135,000.00-$150,000.00 1 day ago

Were unlocking community knowledge in a new way. Experts add insights directly into each article, started with the help of AI.

#J-18808-Ljbffr', '2025-10-25T23:56:58.577Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('9a83da98e4197299ed4f89299a153ef9', 'Software Developer (Remote, C#/.Net)', 'Alluvial Concepts (Macro Pros)', 'https://www.linkedin.com/jobs/view/4289561654', 0, 84, 'queued', NULL, NULL, '["Strong match"]', '["Required skill"]', '[]', '{"coreAzure":0,"security":30,"eventDriven":20,"performance":20,"devops":0,"seniority":80,"coreNet":100,"frontendFrameworks":50,"legacyModernization":10}', '[]', '13 hours ago', 'About the job

Macro Pros has an immediate opening for a .Net/C# Software Developer. This is a permanent position offering a competitive salary with benefits, and 100% remote (must live in one of the states listed below). To be considered you must be a US Citizen (no exceptions) and able to pass a standard background check and obtain a Public Trust Clearance.

Work Authorization: US Citizen only (can not accept Green Card, EAD, H1B, etc.)

Location: Remote (Must currently live in one of the approved states)

Schedule: Monday - Friday, 8:00 AM - 5:00 PM EST

Type: Full-Time (Salaried with Benefits)

Salary Range: $80,000 to $90,000

Experience Required: 3+ years

Background Process: Below is a list of general guidelines the perspective candidate must meet to obtain Public Trust Clearance.

Educational and Professional Experience Requirements: 2-year degree in a related field and 3-years of professional experience

Job Requirements


Minimum of 3 years of experience in C# and the .NET framework.
Good understanding of Object Oriented Programming.
Knowledge of .Net design patterns.
Experience with Microsoft SQL Server.
Good understanding of databases, schemas, indexes, SQL, and medium level T-SQL.
Good level knowledge of the Visual Studio development environment.
Knowledge of Microsoft SSIS.
Knowledge of Microsoft Azure App Services is a plus.
Knowledge of Microsoft DevOps is a plus.
Experience with scrum is a plus.
Good communication and written skills
Ability to translate business requirements into an implementation plan at the task level
Ability to maintain a positive work atmosphere by behaving and communicating in a manner so that you get along with customers, clients, co-workers and management.
Awareness of agile project management principles, practices, techniques and tools.


Duties And Responsibilities


Create or modify Web and console applications using C#.
Develop native cloud applications on Microsoft Azure.
Create or modify Microsoft SQL Server SSIS packages.
Submit your work to the QA team, review/analyze/fix filed defects.
Be involved with requirements gathering and documentation to ensure they are adequately detailed enough to be broken into tasks.
Work with the Product Owner during initial scoping efforts.
Communicate with appropriate people on status of projects.
Follow software design guidelines and principles.
Translate requirements into tasks and estimate the size of those tasks.
Document software systems and environments in both technical and non-technical formats and communicate with both technical and non-technical users to describe and explain the systems and environments.


Approved States


Alabama
Arkansas
Florida
Georgia
Kentucky
Louisiana
Maine
Nebraska
New Hampshire
New Mexico
New York
Ohio
Pennsylvania
South Carolina
Tennessee
Texas
Utah


Security Clearance Rejection Guidelines


Defaulted student loans.
Domestic violence or violence against a family member.
Previous felon
Record of fraud
Record of forgery.
Excessive amount of debt in collections totaling over $10k but could be more depending based on the type of debt. 
Failure to file taxes (state and federal), and those that are pending a criminal case that are awaiting outcome/trail. 


#Dice', '2025-10-25T23:57:20.590Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('29768ba6a4c688ae7452abfbe2efef04', '.NET Azure Developer (AI-First Modernization)', 'Euna Solutions', 'https://www.linkedin.com/jobs/view/4278653667', 0, 100, 'queued', NULL, NULL, '["Strong match","Good fit"]', '["Required skill"]', '[]', '{"coreAzure":90,"security":85,"eventDriven":80,"performance":85,"devops":85,"seniority":70,"coreNet":95,"frontendFrameworks":60,"legacyModernization":80}', '[]', '14 hours ago', 'About the job

The Opportunity

We are seeking a talented .NET Azure Enterprise Developer to join a new team we are building alongside the core development team. In this role, you will be instrumental in transforming our existing application, focusing on scalability, performance, and maintainability. You''ll work with a modern tech stack, embracing AI-powered development tools to drive efficiency and innovation. This isn''t about building machine learning models, but rather expertly utilizing AI code generation and agentic tools to accelerate the development process.

What You''ll Do


Design and Code Modernization Efforts: Modernizing our single-tenant .NET SaaS application hosted on Azure
Design & Implement Scalable Solutions: Design and implement robust, scalable, and secure solutions on Azure, ensuring the application can grow with our customer base and converge to a single version, ideally multi-tenant product.
Embrace AI-First Development: Proactively integrate and maximize the use of AI code generation tools (e.g., GitHub Copilot) and agentic tools (e.g., Warp) to accelerate development, improve code quality, and increase efficiency.
Develop High-Quality Code: Write clean, efficient, testable, and well-documented code in C# and .NET, adhering to best practices.
Develop High Quality Automated Test Suites
Optimize Performance: Identify and resolve performance bottlenecks, ensuring optimal application responsiveness and resource utilization.
Collaborate & Mentor: Work closely with a small, dedicated team, contributing to architectural discussions, code reviews, and mentoring less experienced developers in adopting AI-first practices.
Ensure Operational Excellence: Participate in setting up and improving CI/CD pipelines, monitoring, and troubleshooting within the Azure environment.
Stay Current: Continuously research and evaluate new Azure services, .NET technologies, and AI development tools to propose improvements and innovations.


What You Bring


4-6 years of professional software development experience with a strong focus on the Microsoft .NET ecosystem (C#, ASP.NET Core).
Proven expertise in Microsoft Azure PaaS services, particularly Azure App Services, Azure SQL Database, Azure Storage, Azure Monitor, and Azure DevOps.
Solid understanding of single-tenant and multi- tenant SaaS architecture and pros and cons of each and the challenges and best practices for scaling, security, and maintenance in a cloud environment.
Experience or strong enthusiasm for leveraging AI-powered development tools such as GitHub Copilot, Warp, or similar code generation/agentic tools to enhance productivity and code quality.
Proficiency in modern web development principles and experience with front-end frameworks (e.g., React, Angular, Vue.js) is a plus.
Strong understanding of database design and experience with SQL Server.
Experience with Git and Azure DevOps for version control, CI/CD, and project management.
Excellent problem-solving, analytical, and debugging skills.
Ability to work independently and as part of a small, collaborative team.
Strong communication skills, both written and verbal, with the ability to articulate technical concepts clearly.


Must have


AI-First Mindset: You see AI as an enabler, not a threat.
Problem Solver: You’re proactive, resourceful, and solution-oriented.


Why Join Us


Be part of a dynamic and innovative team at the forefront of AI-powered software development.
Work on a critical, high-impact application with direct visibility to business outcomes.
Opportunity to influence architectural decisions and shape the future of our product.
Located in the vibrant tech hub of Atlanta.


Location: This role is hybrid 3x a week in our Atlanta office (1155 Perimeter Center W)

What It''s Like to Work at Euna Solutions 

At Euna Solutions, we carefully foster a work environment where employees have a safe space for creative and intellectual freedom, and the opportunity to work cross-functionally. We offer a dynamic environment with considerable opportunity for professional growth and advancement. 

Here are some of the perks that Euna employees enjoy: 

💵 Competitive wages 

We pay competitive wages and salaries, and we only expect an honest 40-hour week for it. 

🧘‍♀️ Wellness days 

What’s better than a long weekend?  An extra-long weekend! Twice a year, Euna employees enjoy an extra day on top of the long weekend! An extra day to decompress and spend time doing the things you love. 

🙌 Community Engagement Committee 

At Euna, we know how important it is to give back. Our community engagement committee looks for ways to give back to our local communities through time, gifts and skills. 

🕰 Flexible work day

We understand that what a workday looks like differs by employee and the role requirements. Through our interview process we’ll work with you to ensure it’s a fit for you and the specific role you’re interested in. 

💰 Benefits 

Ask us for a copy of our health and dental benefits! 

🎉 Culture committee 

Celebrate at every occasion with the culture team! They make sure that our team’s culture is bustling with frequent fun events for holidays and special occasions, as well as for miscellaneous fun. 

About Euna Solutions 

Euna Solutions® is a leading provider of purpose-built, cloud-based software that helps public sector and government organizations streamline procurement, budgeting, payments, grants management, and special education administration. Designed to enhance efficiency, collaboration, and compliance, Euna Solutions supports more than 3,400 organizations across North America in building trust, enabling transparency, and driving community impact. Recognized on Government Technology’s GovTech 100 list, Euna Solutions is committed to advancing public sector progress through innovative SaaS solutions. To learn more, visit www.eunasolutions.com.

Please visit our website: https://eunasolutions.com/careers/ and check out our LinkedIn Pages https://www.linkedin.com/company/eunasolutions/

We believe in embracing new perspectives and optimizing impact. If you have relatable experience and relevant transferrable skills but feel you may be missing a few of the requirements, we encourage you to apply!  We recognize that people have unique career journeys and if you''re excited about this role and know you can bring something great to the team, then we want to hear from you. Please know Euna Solutions is committed to providing a comfortable and accessible interview process for every candidate. If there are any accommodations our team can make throughout our hiring process (big or small), please let us know.

For any inquiries or requests regarding accessibility at Euna Solutions, please email recruiting@eunasolutions.com or call our office at 1.877.707.7755. Upon request, appropriate accessible formats or arrangements will be provided as soon as practicable.', '2025-10-25T23:57:35.499Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('1c1106a81d3471985b206ab2c699e4f6', 'Senior API Software Engineer', 'PrePass', 'https://www.linkedin.com/jobs/view/4308848856', 1, 100, 'queued', NULL, NULL, '["No mention of Azure, but strong security and performance requirements","Event-driven patterns not explicitly mentioned, but API development implies some level of event-driven architecture","Performance optimization and caching not explicitly mentioned, but API development requires some level of performance consideration"]', '["API security, authentication, and governance capabilities",".NET Core technologies experience"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":70,"performance":60,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":30}', '["Azure platform services","Cloud-native development skills","Event-driven patterns"]', '13 hours ago', 'About the job

About PrePass®

PrePass® is North America''s most trusted weigh station bypass and toll management platform. We''re transforming how the transportation industry operates—creating solutions that keep trucks moving safely, efficiently, and compliantly. This means making bold decisions and building systems that support not only fleets but the broader economy. It all starts with enabling commercial vehicles to keep rolling with seamless toll management, weigh station bypass, and safety solutions. It''s what we do best, and we do it to meet the demands of the road every day.

That''s why people join us: our solutions are implemented in real-time, on highways and interstates across the nation, helping fleets go farther, faster. This work challenges and rewards, presenting complex problems that need ambitious answers. We hire bold thinkers with a heart for impact, a passion for progress, and the optimism to shape the future of transportation.

About The Role

We''re looking for a Senior API Software Engineer to lead the design and development of scalable, cloud-native services that power our industry-leading toll and bypass platform. In this role, you''ll architect and build distributed systems using .NET and Azure, mentor junior engineers, and collaborate across teams to deliver high-impact solutions. You''ll work closely with product managers, architects, and DevOps engineers. This is a hybrid position based out of our Phoenix, AZ office.

Essential Responsibilities


Cloud-Native Architecture & Development 


Design, develop, and maintain .NET-based APIs and services using C# and .NET 8. 
Build scalable, event-driven systems using Azure Functions, Service Bus, Event Grid, and other PaaS offerings. 
Implement RESTful APIs and asynchronous communication patterns. 



DevOps & CI/CD 


Design and maintain CI/CD pipelines using Azure DevOps and GitHub Actions. 
Ensure secure, reliable deployments through automation and infrastructure best practices. 
Manage secrets and configurations using Azure Key Vault. 



Software Engineering Excellence 


Apply SOLID principles, domain-driven design (DDD), and clean architecture. 
Conduct code reviews, architecture reviews, and technical deep-dives. 
Champion best practices in software development and system design. 



Cross-Functional Collaboration & Mentorship 


Partner with product managers, architects, and QA to deliver high-quality features. 
Mentor junior developers and foster a culture of continuous improvement. 
Participate in Agile ceremonies and contribute to team planning and retrospectives. 



Requirements


Must-Have: 


6+ years of experience in software development with .NET (C#). 
3+ years designing and implementing Service-Oriented Architecture (SOA). 
5+ years working with SQL Server and Cosmos DB. 
Strong experience with Azure PaaS (App Services, Functions, API Management, Event Grid, Service Bus). 
Proficiency in microservices, messaging patterns, and distributed systems. 
Experience with CI/CD pipelines (preferably GitHub Actions). 
Deep understanding of RESTful APIs and asynchronous communication. 
Strong grasp of software engineering principles and clean architecture. 
Experience working in Agile environments with a DevOps mindset. 



Bonus Points For: 


Experience with Infrastructure as Code (Bicep, ARM templates, Terraform). 
Familiarity with containerization and Kubernetes (AKS). 
Exposure to DDD, CQRS, and Event Sourcing. 
Experience with NServiceBus and RabbitMQ. 
Azure certifications (e.g., Azure Developer Associate, Solutions Architect). 
Experience with observability tools (Azure Monitor, Application Insights, Log Analytics). 



Desired Characteristics 


Strategic thinker with a proactive, problem-solving mindset. 
Comfortable navigating ambiguity and fast-paced environments. 
Strong interpersonal and mentoring skills. 
High degree of ownership, accountability, and initiative. 
Ability to communicate complex technical concepts clearly. 
Collaborative and team-oriented with a passion for clean code. 



Benefits

How We Will Take Care of You


Robust benefit package that includes medical, dental, and vision that start on date of hire
Paid Time Off, to include vacation, sick, holidays, and floating holidays
401(k) plan with employer match
Company-funded "lifestyle account" upon date of hire for you to apply toward your physical and mental well-being (i.e., ski passes, retreats, gym memberships)
Tuition Reimbursement Program
Voluntary benefits, to include but not limited to Legal and Pet Discounts
Employee Assistance Program (available at no cost to you)
Company-sponsored and funded "Culture Team" that focuses on the Physical, Mental, and Professional well-being of employees
Community Give-Back initiatives
Culture that focuses on employee development initiatives


Join Us

At PrePass, our mission drives us.

We invest in relationships. We challenge ourselves to innovate and improve. We win together. Simply put, we live our Core Values.

Ready to help move the transportation industry forward? Join us and let''s drive progress—together.', '2025-10-25T23:57:51.120Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('7d5bb61826af72c451c89c0dec72771d', 'Full Stack Developer', 'Hallmark - Healthcare Workforce Technology', 'https://www.linkedin.com/jobs/view/4331622850', 0, 100, 'queued', NULL, NULL, '["No mention of Azure, but good match for security and performance"]', '["Strong .NET skills required","Experience with ASP.NET, MVC, Web Forms, and modern .NET Core technologies"]', '[]', '{"coreAzure":0,"security":85,"eventDriven":80,"performance":80,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":70,"legacyModernization":50}', '["Azure","Cloud-native development"]', '13 hours ago', 'About the job

About Hallmark Healthcare Workforce Technology

At Hallmark Healthcare Workforce Technology, the two aspects — what we do and how we do it — are tightly interwoven. In our products and our people alike, we put a relentless focus on truth, trust, transparency, respect and service.

Hallmark Healthcare Workforce Technology is led by passionate experts with an average of 20+ years’ experience in IT, nursing, process engineering, finance, and healthcare. We are committed to strengthening communities by producing technologies, support services, and thought leadership that tangibly improve patient care and community health outcomes.

We are looking for a Full Stack Developer to produce scalable software solutions for our Heisenberg II /Provider Compensation product. You’ll be part of a cross-functional team that’s responsible for the full software development life cycle, from conception to deployment.

As a Full Stack Developer for our SaaS products, you should be comfortable around both front-end and back-end coding languages, development frameworks and third-party libraries. You should also be a team player with a knack for visual design and utility.

Responsibilities Include


Work with development teams and program managers to ideate software solutions
Do it all: define, design, code, build and debug complex service oriented multi-tier distributed SaaS application
Design, develop and maintain web-based applications to enhance the performance and reliability of our current applications, as well as participate in the development of new industry-leading products, leveraging technologies such as C#, ASP.NET Core, JavaScript/JQuery/Angular/HTML5/CSS/ and SQL Server.
Build the front-end of applications through appealing visual design
Develop and manage well-functioning databases and applications
Write effective RESTful APIs
Test software to ensure responsiveness and efficiency
Troubleshoot, debug and upgrade software
Create security and data protection settings
Build features and applications with a mobile responsive design
Write technical documentation
Work with program managers and business analysts to improve software


Requirements


Minimum 5 years of experience in scalable & highly transactional web application development as a Full Stack Developer
Experience working with .NET Core to build applications
Experience using a Code First Approach and worked with EF Core to design and manage databases in .NET Core applications
Experience with processing and analyzing large datasets in .NET Core applications
Knowledge of multiple front-end languages and libraries (e.g. HTML/ CSS, Angular, JavaScript, XML, jQuery)
Knowledge of multiple back-end languages (e.g. C#) and JavaScript frameworks (e.g. Angular, React, Node.js)
Experience with Azure SQL Server
Experience with Azure DevOps, Azure App Service, Azure API management 
Experience working with Angular for building dynamic web applications
Experience building reusable components in Angular to improve code maintainability
Experience using containerized technologies like Docker to package and deploy applications
Experience with Kubernetes for orchestrating containerized applications in a cloud environment
Experience with test-driven, agile development and a continuous integration build environment
Responsive design and cross-browsers compatibility experience
Familiarity with SaaS multi-tenant Cloud application development with Azure
Familiarity with common stacks
Degree in Computer Science, Statistics or relevant field preferred


Benefits


Health Insurance with an H.S.A option (Company contribution to H.S.A.)
Dental Insurance
Vision Insurance
Unlimited Paid Time Off
401k


Base salary range: $120k-135k, 5% bonus target

Location: Remote in Central and Northeastern New Jersey, Philadelphia, PA metro area or hybrid in Dallas, TX or Atlanta, GA.

Hallmark Healthcare Workforce Technology is an Equal Opportunity Employer. All employment decisions are based on business needs, job requirements and individual qualifications, without regard to race, color, religion or belief, national, social or ethnic origin, sex, age, physical, mental or sensory disability, sexual orientation, gender identity and/or expression, marital, civil union or domestic partnership status, past or present military service, family medical history or genetic information, family or parental status, or any other status protected by the laws or regulations in the locations where we operate. Hallmark Healthcare Workforce Technology reserves the right to amend the job description, duties, or qualifications based on company needs.', '2025-10-25T23:58:06.249Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('036b60a12303f5d07894012fe0f2349d', 'Sr. Software Engineer', 'WellSky', 'https://www.linkedin.com/jobs/view/4299416426', 0, 100, 'queued', NULL, NULL, '["Good fit"]', '[]', '[]', '{"coreAzure":0,"security":80,"eventDriven":60,"performance":70,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":20}', '[]', '15 hours ago', 'About the job

The Sr Software Engineer is responsible for all stages of the software development lifecycle using a variety of technologies and tools to build impactful software solutions. The scope of this job includes building and optimizing comprehensive solutions that prioritize end-user efficiency and experience.

Key Responsibilities:


Lead the design of complex software development features and ensure solutions are scalable, effective, and maintainable.
Collaborate with solution managers, designers, and other teams to gather requirements, translate them into technical specifications, and ensure alignment with priorities and project goals.
Analyze and solve complex technical problems, identify bottlenecks, and prepare technical documentation to optimize system performance.
Facilitate code reviews, provide constructive feedback, and lead by example in code quality, development best practices, and problem-solving approaches.
Ensure code meets functional and performance requirements, and advocate for high-quality software and ensure rigorous testing processes, including automated unit tests, integration tests, and other testing frameworks.
Leverage common GenAI tools for AI assisted development and understand the basics of prompt engineering.
Perform other job duties as assigned.


Required Qualifications: 


Bachelor''s degree in a related field or equivalent work experience
At least 4-6 years of related work experience
Proficient in C#.Net and PostgreSQL or SQL
Proficient in Cloud technologies (preferably GCP)


 

Preferred Qualifications: 


Healthcare financial industry experience
Solid understanding of Azure CI/CD and Terraform
Experience with Monitoring tools (preferably Newrelic)


Job Expectations:


Willing to work additional or irregular hours as needed
Must work in accordance with applicable security policies and procedures to safeguard company and client information
Must be able to sit and view a computer screen for extended periods of time


WellSky is where independent thinking and collaboration come together to create an authentic culture. We thrive on innovation, inclusiveness, and cohesive perspectives. At WellSky you can make a difference.

WellSky provides equal employment opportunities to all people without regard to race, color, national origin, ancestry, citizenship, age, religion, gender, sex, sexual orientation, gender identity, gender expression, marital status, pregnancy, physical or mental disability, protected medical condition, genetic information, military service, veteran status, or any other status or characteristic protected by law. WellSky is proud to be a drug-free workplace.

Applicants for U.S.-based positions with WellSky must be legally authorized to work in the United States. Verification of employment eligibility will be required at the time of hire. Certain client-facing positions may be required to comply with applicable requirements, such as immunizations and occupational health mandates.

Here are some of the exciting benefits full-time teammates are eligible to receive at WellSky:


Excellent medical, dental, and vision benefits
Mental health benefits through TelaDoc
Prescription drug coverage
Generous paid time off, plus 13 paid holidays
Paid parental leave
100% vested 401(K) retirement plans
Educational assistance up to $2500 per year', '2025-10-25T23:58:21.680Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('2ab4d25d39263ec8d85764be7930a6f4', 'Senior Software Engineer', 'ELLKAY', 'https://www.linkedin.com/jobs/view/4300069752', 0, 100, 'queued', NULL, NULL, '["No mention of Azure platform services or cloud-native development skills","Good match for security, authentication, and governance capabilities","Fair match for event-driven patterns and integration architecture","Fair match for performance optimization, caching, and observability","Strong match for software development with devops practices and ci/cd","Excellent match for required seniority level and fully remote position","Excellent match for traditional .NET development skills including ASP.NET, MVC, Web Forms, and modern .NET Core technologies","Poor match for preferred frontend frameworks with strong emphasis on Blazor and React over Angular","Fair match for legacy system modernization and migration capabilities"]', '["Strong experience in .NET development","Familiarity with ASP.NET, MVC, Web Forms, and modern .NET Core technologies"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":70,"performance":60,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":50,"legacyModernization":40}', '["Azure","cloud-native development"]', '14 hours ago', 'About the job

ELLKAY started out providing connectivity solutions to laboratories and within a few years, grew to also provide data management solutions to ambulatory organizations. ELLKAY is now a trusted data management partner in five healthcare segments. ELLKAY’s solutions continue to serve laboratories and ambulatory practices and have expanded to empower hospitals and health systems, healthcare IT vendors, ambulatory practices, health plans, and other healthcare organizations with cutting-edge technologies and solutions that drive their growth and interoperability strategies.

Today, ELLKAY remains true to our core values, building strong partner relationships and offering unparalleled service and support while providing innovative, scalable solutions to the challenges our customers face in today’s data-rich world.

ELLKAY''s experience, customer-focused approach, and reputation for innovation, speed, and accuracy differentiate ELLKAY as a premier partner for your interoperability needs and data management strategy.

Job Description

ELLKAY is seeking a Senior Software Engineer to play a crucial role in advancing our core healthcare IT systems through the development of scalable and secure software solutions. As a senior individual contributor, this position involves working closely with other engineering team leaders to architect robust backend systems, guide technical direction, and enhance software delivery processes.

Essential Duties & Responsibilities


Take a technical leadership role in building and scaling national-scale healthcare data exchange systems
Deliver extremely reliable, scalable, and observable software capable of supporting massive transaction volumes
Lead architecture and implementation of highly scalable, API-driven systems powering healthcare data exchange at scale
Provide practical, balanced technical guidance—considering both engineering best practices and business priorities
Guide design decisions on fault tolerance, throughput optimization, and system resilience
Contribute to CI/CD pipeline improvements to maintain quality while accelerating delivery
Collaborate with product and implementation teams to shape technical execution
Document technical designs, workflows, and release notes for cross-team and customer consumption
Participate in and lead design and code reviews
Mentor engineers through pairing, design discussions, and pull request feedback


Qualifications


10+ years of software engineering experience, with a focus on building large-scale, high-throughput distributed systems
Have a balanced, pragmatic approach—able to apply the right level of engineering rigor to meet business needs
Experience designing and scaling API-driven systems with extreme reliability and throughput requirements
Experience with event-driven, queue-backed, and asynchronous processing architectures
Skilled in observability practices including distributed tracing, metrics, and log aggregation
Strong background in Microsoft SQL Server and experience optimizing relational data access
Familiar with other database technologies (NoSQL, distributed databases)
Deep experience with the .NET ecosystem, with exposure to other technical stacks as a plus
Familiar with containerization, cloud-native architectures, and Kubernetes deployment patterns
Strong architectural skills with a focus on reliability, scalability, and performance
Proven ability to lead architecture across multiple systems and teams
Experience writing and optimizing parallel and asynchronous code
Strong knowledge of IHE profiles, FHIR, and other healthcare data exchange standards is a significant plus
Front-end development experience with modern JavaScript/TypeScript frameworks is a plus but not required
Bachelor’s degree or equivalent experience in a technical field


Benefits

ELLKAY offers a comprehensive and competitive benefit package that starts day one! 

Including


Medical, Dental, and Vision benefits
Employer-paid Life and LTD
401k w/ matching – once eligibility is met
Work/life balance
Paid Volunteer Program 
Flexible working hours
Unlimited PTO
Remote work options
Employee Discounts
Parental Leave


Our Awesome Culture Includes


Working with talented, collaborative, and friendly people who love what they do
Professional growth within
Innovation environment
On site in HQ Free daily lunches 


Additional Information

At ELLKAY, we are committed to operating as a hybrid workplace, offering employees flexibility in how they structure their time between in-office and remote work. We recognize the significance of fostering connections, collaboration, and creativity within our office culture and its positive impact on our business. Our philosophy of operating as a hybrid workplace underscores our dedication to enabling employees to tailor work-life balance to their individual preferences. For those who do not live within 40 miles of one of our offices, we are open to considering remote work for candidates whose skills and experience strongly align with the role. While we prioritize a hybrid work environment for most roles, we understand the importance of flexibility and are open to remote work for specific positions and specialized skill sets.

For more information on our company, visit www.ELLKAY.com.

ELLKAY LLC is a Smoke-Free Workplace.

ELLKAY, LLC provides equal employment opportunities to all employees and applicants for employment and prohibits discrimination and harassment of any type without regard to race, color, religion, age, sex, national origin, disability status, genetics, protected veteran status, sexual orientation, gender identity or expression, or any other characteristic protected by federal, state or local laws.', '2025-10-25T23:58:37.603Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('e9b98f19f2a3311305675013d72e1b3e', 'Senior Agile Software Engineer (.NET/IoT/Azure)', 'Copeland', 'https://www.linkedin.com/jobs/view/4236020027', 0, 100, 'queued', NULL, NULL, '["Strong match","Good fit"]', '["Required skill"]', '[]', '{"coreAzure":90,"security":80,"eventDriven":85,"performance":80,"devops":85,"seniority":95,"coreNet":100,"frontendFrameworks":70,"legacyModernization":60}', '[]', '13 hours ago', 'About the job

About Us

We are a global climate technologies company engineered for sustainability. We create sustainable and efficient residential, commercial and industrial spaces through HVACR technologies. We protect temperature-sensitive goods throughout the cold chain. And we bring comfort to people globally. Best-in-class engineering, design and manufacturing combined with category-leading brands in compression, controls, software and monitoring solutions result in next-generation climate technology that is built for the needs of the world ahead. 

Whether you are a professional looking for a career change, an undergraduate student exploring your first opportunity, or recent graduate with an advanced degree, we have opportunities that will allow you to innovate, be challenged and make an impact. Join our team and start your journey today!

Description

If you are a Software Engineering professional with experience in cloud native and mobile development for the IoT space looking for an opportunity to grow, Copeland has an exciting opportunity for you! Based in our Kennesaw, GA location, you will dive into infrastructure as necessary and have responsibility for the entire software lifecycle. The Senior Agile Software Engineer is someone who is passionate and enjoys developing code.

Copeland offers an excellent compensation package with competitive salary, comprehensive healthcare package, 401k (75% company match up to 5%), quarterly company funded retirement plan with an additional contribution of 2.5%, tuition assistance, flexible work schedule, paid time off (3 weeks + paid holidays) and ongoing Copeland-led training.

As a Senior Software Engineer, You Will


Understand high level business requirements and produce technical specifications, designs, and architectures
Develop accurate estimates for work assignments
Design, develop, and deliver production quality applications
Participate in product requirement and design reviews
Ability to effectively work remotely as part of a distributed team


Required Education, Experience & Skills


5+ years experience with Microsoft .NET development using C# with ASP.NET, REST/SOAP Web Services, Windows Services.
5+ years experience with SQL. 
IoT experience
B.S. in Computer Science, Engineering, or equivalent education and experience 
Experience with Azure Cloud Services experience designing, developing, hosting, scaling, and supporting cloud native solutions. 
Excellent knowledge of object-oriented design principles 
Experience working with global teams
Ability to multitask and prioritize while dealing with multiple projects
Ability to work independently or on a project team
Excellent verbal and written communication skills
Excellent problem solving and critical thinking skills
Must be able to travel to Kennesaw, GA or West Palm Beach, FL for up to one (1) week per quarter
Legal authorization to work in the United States - Sponsorship will not be provided for this position.


Preferred, Experience & Skills


10+ years experience with Microsoft .NET development using C# with ASP.NET, REST/SOAP web services, windows services.
10+ years experience with web technologies such as HTML, CSS, JavaScript, jQuery. Experience with Angular 2+ a plus.
2+ years of experience Angular, WPF, Winforms, etc. 
Xamarin experience 
Google/Bing Maps API experience
Socket Programming experience 
DDD and micro-service experience 
On-prem to cloud migration experience


Pay Transparency

Our compensation philosophy is simple: we pay a competitive base salary, within the local market in which we operate, and reward performance during our annual merit review process. In accordance with Colorado EPEWA, the salary/pay range for this role is $136,045 - $166,281 annually, commensurate with the skills, talent, capabilities, and experience each candidate brings to a role.

Flexible Work Schedule – Remote Work Option and Core Hours

This role has the flexibility of remote work and a core hour schedule. You can choose to flex your start and stop times given you are working during the core hours of 9:00am - 3:00pm (based on team headquarters time zone). Our teams work together to ensure our chosen work schedules enable our creativity and productivity as we serve the needs of our customers. This role also has a travel requirement of up to 1 week per quarter to one of our business locations, predetermined by leadership in advance.

Why Work Remote?

Our remote roles are conveniently located in the comfort of your own home. Working remotely has many benefits such as no commute, schedule flexibility, more time with family, and increased productivity. By working remote, you will have open communication with your coworkers both onsite and offsite.

About Our Software Solutions Organization

Electronics & Controls, a business unit of Copeland, is headquartered in St. Louis, MO and is an industry leader in home energy management and comfort control. Our products monitor and control appliances that account for approximately 60% of the energy consumed in the average US household. By networking our products to the cloud, we are discovering new ways to help our customers reduce energy consumption, save money, and maintain comfort. And because our technology touches so much of the residential energy profile, our solutions are positioned to make a significant impact on our nation’s carbon footprint.

If you want to be part of a collaborative, high energy, fast paced team, where your contributions can make a real impact on the world – you have just found the place!

Our Commitment to Our People

Across the globe, we are united by a singular Purpose: Sustainability is no small ambition. That’s why everything we do is geared toward a sustainable future—for our generation and all those to come. Through groundbreaking innovations, HVACR technology and cold chain solutions, we are reducing carbon emissions and improving energy efficiency in spaces of all sizes, from residential to commercial to industrial.

Our employees are our greatest strength. We believe that our culture of passion, openness, and collaboration empowers us to work toward the same goal - to make the world a better place. We invest in the end-to-end development of our people, beginning at onboarding and through senior leadership, so they can thrive personally and professionally.

Flexible and competitive benefits plans offer the right options to meet your individual/family needs: medical insurance plans, dental and vision coverage, 401(k) and more. We provide employees with flexible time off plans, including paid parental leave, vacation and holiday leave. 

Together, we have the opportunity – and the power – to continue to revolutionize the technology behind air conditioning, heating and refrigeration, and cultivate a better future. Learn more about us and how you can join our team!

Our Commitment to Inclusion & Belonging

At Copeland, we cultivate a strong sense of inclusion and belonging where individuals of all backgrounds, and with diverse perspectives, are embraced and treated fairly to enable a stronger workforce. Our employee resource groups play an important role in culture and community building at Copeland.

Work Authorization

Copeland will only employ those who are legally authorized to work in the United States. This is not a position for which sponsorship will be provided. Individuals with temporary visas such as E, F-1 with OPT or CPT, H-1, H-2, L-1, B, J or TN, or who need sponsorship for work authorization now or in the future, are not eligible for hire.

Equal Opportunity Employer

Copeland is an Equal Opportunity/Affirmative Action employer. All qualified applicants will receive consideration for employment without regard to sex, race, color, religion, national origin, age, marital status, political affiliation, sexual orientation, gender identity, genetic information, disability or protected veteran status. We are committed to providing a workplace free of any discrimination or harassment.

If you have a disability and are having difficulty accessing or using this website to apply for a position, please contact: copeland.careers@copeland.com', '2025-10-25T23:58:51.585Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('63ce57806d03c9c5596545eda5597f22', 'Senior Software Engineer 1', 'Sage', 'https://www.linkedin.com/jobs/view/4308829909', 0, 100, 'queued', NULL, NULL, '["No mention of Azure, but good match for security and performance"]', '["Sitefinity CMS experience",".NET development skills"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":60,"performance":70,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":20}', '["Azure","event-driven patterns"]', '10 hours ago', 'About the job

We are looking for a Senior Software Engineer 1 to design and develop sophisticated publishing solutions that support critical business objectives. This role involves designing, building, and improving systems and capabilities such as content delivery websites, content management, publishing tools and controls. The Senior Software Engineer 1 will play a pivotal role in driving the technical direction and architecture of our solutions across team and multi-team environments.

Key Accountabilities


Develop and maintain web applications using Sitefinity CMS including configuration, customization, and content management. 
Customize Sitefinity features, including modules, widgets, and APIs. 
Set up and manage tracking campaigns using Sitefinity Insights to monitor user engagement and site performance. 
Manage CMS-specific features including multisite configuration, localization, caching strategies, and role-based content management to ensure scalable and personalized digital experiences. 
Implement integrations with external systems (e.g. CRM). 
Be a key contributor in an Agile teams focusing on developing features and capabilities desired by the business
Build and cultivate positive relationships with team members and other collaborators to cultivate a cooperative development environment. 
Positively impact the whole team, influence peers, proactively share knowledge and support and mentor junior team members to be more successful. 
Identify and resolve problems independently while helping others in resolving theirs. 
Work optimally in a remote capacity. Attend in-person meetings and events few times a year, in one of SAGE’s international offices or other locations as deemed appropriate. 


Skills, Qualifications & Experience


Proficient in C#, ASP.NET MVC, .NET Core/.NET 6+, REST APIs, and JSON with a strong understanding of object-oriented principles and design patterns. 
3+ years of hands-on experience with Sitefinity CMS (MVC, ASP.Net Core). 
Experience developing web applications using HTML5, CSS3, JavaScript (React/Angular is a plus)
Solid foundation in SQL and experience working with relational databases. 
Significant platform development and solution management experience in a cloud environment (preferably Microsoft Azure). 
Proficient in standard methodologies for software development, such as version control (e.g., Git), testing (unit and integration), and code review. 
Proven track record to work both independently and as part of a remote Agile team. 
Strong analytical and problem-solving skills, with a high level of attention to detail and an ability to prioritize tasks. 
Excellent communication skills and the ability to establish and maintain effective relationships with peers. 
Experience in leading project segments and mentoring junior engineers. 
Recognized as a go-to person for specific technologies and encouraged to learn new skills. 


If you have a disability and you need any support during the application process, please contact hr.resume@sagepub.com All qualified applicants are encouraged to apply.

Pay Transparency & Benefits Package

Sage Publishing is committed to being an inclusive employer where all individuals are treated with fairness and respect. Sage is proud to be an equal opportunity workplace and is an affirmative action employer.

Compensation at Sage is influenced by several factors, including but not limited to skill set, nature and level of experience, qualifications, and other relevant considerations. Please note that the compensation details listed in U.S. role postings reflect the base salary only and do not include bonuses or benefits. Your recruiter can share more about the specific salary range and additional aspects of the compensation/benefits package for this position during the hiring process. If your desired salary falls outside of this range, we hope you''ll still apply as there may be other positions that better align.

In addition to compensation, Sage offers a highly competitive and comprehensive PPO medical, dental, and vision care benefits package with SAGE covering most of the premium costs. Unique program benefits that support a healthy life, a company-sponsored anniversary trip every 5 years, a 401(k)-matching program of 100% up to 5% of pay, and other significant meaningful benefits. In alignment with our value for education, Sage offers financial support for bachelor''s and graduate-level degree programs as well as learning for personal interest.

Sage offers freedom and autonomy in your day-to-day with hybrid or remote work, depending on the role. Join the nearly 2,000 Sage employees worldwide who deliver products and services that serve to fulfill our noble goal of education and dissemination of knowledge globally. We’d love to meet you!

Diversity, Equity, and Inclusion

Sage Publishing is committed to being an inclusive employer where all individuals are treated with fairness and respect, regardless of age, disability, gender identity, marriage and partnership status, pregnancy and parental responsibilities, race, religion and belief, sex, or sexual orientation.

We believe that diversity is a cornerstone of a vibrant culture. We want Sage to be an organization where the most talented staff and high-potential staff are recruited, have the opportunity to grow, and want to work. We strive to achieve a better representation of diverse talent at all levels, including leadership, across our workforce.

Sage is a global academic publisher of books, journals, and library resources with a growing range of technologies to enable discovery, access, and engagement. Our mission is building bridges to knowledge — supporting the development of ideas through the research process to scholarship that is certified, taught, and applied.

Learn about Sage | About our companies | Open editor positions

Sage is committed to the full inclusion of all qualified applicants. Accommodations will be made for any part of the interview process.', '2025-10-25T23:59:07.853Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('ae5f1cda272ae2d033d0bb7098f3933b', 'Senior Agile Software Engineer (.NET/IoT/Azure)', 'Copeland', 'https://www.linkedin.com/jobs/view/4236016672', 0, 100, 'queued', NULL, NULL, '["Strong match","Good fit"]', '["Required skill"]', '[]', '{"coreAzure":90,"security":80,"eventDriven":85,"performance":80,"devops":85,"seniority":95,"coreNet":100,"frontendFrameworks":70,"legacyModernization":60}', '[]', '14 hours ago', 'About the job

About Us

We are a global climate technologies company engineered for sustainability. We create sustainable and efficient residential, commercial and industrial spaces through HVACR technologies. We protect temperature-sensitive goods throughout the cold chain. And we bring comfort to people globally. Best-in-class engineering, design and manufacturing combined with category-leading brands in compression, controls, software and monitoring solutions result in next-generation climate technology that is built for the needs of the world ahead. 

Whether you are a professional looking for a career change, an undergraduate student exploring your first opportunity, or recent graduate with an advanced degree, we have opportunities that will allow you to innovate, be challenged and make an impact. Join our team and start your journey today!

Description

If you are a Software Engineering professional with experience in cloud native and mobile development for the IoT space looking for an opportunity to grow, Copeland has an exciting opportunity for you! Based in our Kennesaw, GA location, you will dive into infrastructure as necessary and have responsibility for the entire software lifecycle. The Senior Agile Software Engineer is someone who is passionate and enjoys developing code.

Copeland offers an excellent compensation package with competitive salary, comprehensive healthcare package, 401k (75% company match up to 5%), quarterly company funded retirement plan with an additional contribution of 2.5%, tuition assistance, flexible work schedule, paid time off (3 weeks + paid holidays) and ongoing Copeland-led training.

As a Senior Software Engineer, You Will


Understand high level business requirements and produce technical specifications, designs, and architectures
Develop accurate estimates for work assignments
Design, develop, and deliver production quality applications
Participate in product requirement and design reviews
Ability to effectively work remotely as part of a distributed team


Required Education, Experience & Skills


5+ years experience with Microsoft .NET development using C# with ASP.NET, REST/SOAP Web Services, Windows Services.
5+ years experience with SQL. 
IoT experience
B.S. in Computer Science, Engineering, or equivalent education and experience 
Experience with Azure Cloud Services experience designing, developing, hosting, scaling, and supporting cloud native solutions. 
Excellent knowledge of object-oriented design principles 
Experience working with global teams
Ability to multitask and prioritize while dealing with multiple projects
Ability to work independently or on a project team
Excellent verbal and written communication skills
Excellent problem solving and critical thinking skills
Must be able to travel to Kennesaw, GA or West Palm Beach, FL for up to one (1) week per quarter
Legal authorization to work in the United States - Sponsorship will not be provided for this position.


Preferred, Experience & Skills


10+ years experience with Microsoft .NET development using C# with ASP.NET, REST/SOAP web services, windows services.
10+ years experience with web technologies such as HTML, CSS, JavaScript, jQuery. Experience with Angular 2+ a plus.
2+ years of experience Angular, WPF, Winforms, etc. 
Xamarin experience 
Google/Bing Maps API experience
Socket Programming experience 
DDD and micro-service experience 
On-prem to cloud migration experience


Pay Transparency

Our compensation philosophy is simple: we pay a competitive base salary, within the local market in which we operate, and reward performance during our annual merit review process. In accordance with Colorado EPEWA, the salary/pay range for this role is $136,045 - $166,281 annually, commensurate with the skills, talent, capabilities, and experience each candidate brings to a role.

Flexible Work Schedule – Remote Work Option and Core Hours

This role has the flexibility of remote work and a core hour schedule. You can choose to flex your start and stop times given you are working during the core hours of 9:00am - 3:00pm (based on team headquarters time zone). Our teams work together to ensure our chosen work schedules enable our creativity and productivity as we serve the needs of our customers. This role also has a travel requirement of up to 1 week per quarter to one of our business locations, predetermined by leadership in advance.

Why Work Remote?

Our remote roles are conveniently located in the comfort of your own home. Working remotely has many benefits such as no commute, schedule flexibility, more time with family, and increased productivity. By working remote, you will have open communication with your coworkers both onsite and offsite.

About Our Software Solutions Organization

Electronics & Controls, a business unit of Copeland, is headquartered in St. Louis, MO and is an industry leader in home energy management and comfort control. Our products monitor and control appliances that account for approximately 60% of the energy consumed in the average US household. By networking our products to the cloud, we are discovering new ways to help our customers reduce energy consumption, save money, and maintain comfort. And because our technology touches so much of the residential energy profile, our solutions are positioned to make a significant impact on our nation’s carbon footprint.

If you want to be part of a collaborative, high energy, fast paced team, where your contributions can make a real impact on the world – you have just found the place!

Our Commitment to Our People

Across the globe, we are united by a singular Purpose: Sustainability is no small ambition. That’s why everything we do is geared toward a sustainable future—for our generation and all those to come. Through groundbreaking innovations, HVACR technology and cold chain solutions, we are reducing carbon emissions and improving energy efficiency in spaces of all sizes, from residential to commercial to industrial.

Our employees are our greatest strength. We believe that our culture of passion, openness, and collaboration empowers us to work toward the same goal - to make the world a better place. We invest in the end-to-end development of our people, beginning at onboarding and through senior leadership, so they can thrive personally and professionally.

Flexible and competitive benefits plans offer the right options to meet your individual/family needs: medical insurance plans, dental and vision coverage, 401(k) and more. We provide employees with flexible time off plans, including paid parental leave, vacation and holiday leave. 

Together, we have the opportunity – and the power – to continue to revolutionize the technology behind air conditioning, heating and refrigeration, and cultivate a better future. Learn more about us and how you can join our team!

Our Commitment to Inclusion & Belonging

At Copeland, we cultivate a strong sense of inclusion and belonging where individuals of all backgrounds, and with diverse perspectives, are embraced and treated fairly to enable a stronger workforce. Our employee resource groups play an important role in culture and community building at Copeland.

Work Authorization

Copeland will only employ those who are legally authorized to work in the United States. This is not a position for which sponsorship will be provided. Individuals with temporary visas such as E, F-1 with OPT or CPT, H-1, H-2, L-1, B, J or TN, or who need sponsorship for work authorization now or in the future, are not eligible for hire.

Equal Opportunity Employer

Copeland is an Equal Opportunity/Affirmative Action employer. All qualified applicants will receive consideration for employment without regard to sex, race, color, religion, national origin, age, marital status, political affiliation, sexual orientation, gender identity, genetic information, disability or protected veteran status. We are committed to providing a workplace free of any discrimination or harassment.

If you have a disability and are having difficulty accessing or using this website to apply for a position, please contact: copeland.careers@copeland.com', '2025-10-25T23:59:23.672Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('2bd7d38cf65c80c91068a4df147e168e', 'Senior Software Engineer -.NET (Hybrid)', 'Broadridge', 'https://www.linkedin.com/jobs/view/4263767488', 1, 100, 'queued', NULL, NULL, '["Strong match"]', '["Required skill"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":70,"performance":60,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":50,"legacyModernization":40}', '[]', '9 hours ago', 'About the job

At Broadridge, we''ve built a culture where the highest goal is to empower others to accomplish more. If you’re passionate about developing your career, while helping others along the way, come join the Broadridge team.

We are seeking a knowledgeable and collaborative Senior Software Engineer specializing in .Net development to join our Asset Management software team. In this role, you’ll collaborate closely with engineering peers, product managers, and QA specialists to develop, enhance, and maintain our industry-leading solutions. Your expertise will extend to guiding fellow developers, contributing to technical designs, and ensuring the robust, secure operation of products that thousands of financial professionals rely on.

Responsibilities:


Design, develop, test, debug, and implement code for both existing and new business applications in a .Net environment using C#, Microservices, and SQL Server
Analyze business and functional requirements in close partnership with Product Management, translating them into technical solutions
Author and review technical documentation, participating actively in design discussions to shape new enhancements or solutions
Provide technical expertise, mentorship, and guidance to software development team members; lead by example in code quality and architecture decisions
Conduct frequent code reviews, offering constructive feedback to maintain and elevate code standards across the team
Collaborate in Agile sprints, contributing to task definition, estimation, and delivery within an SDLC framework (Scrum/Agile)
Rigorously ensure all deliverables follow best practices in security, performance, and are unit/integration tested
Partner with QA to build comprehensive test cases and provide rapid solutions to any defects or bugs arising during implementations.


Qualifications:


9+ years of professional experience in software development with the following technologies:
C#, .Net 6.0/.Net Core/.Net Frameworks
Microservices architectures
Database development using MS SQL Server
Bachelor’s or Master’s degree in Computer Science or related field, or equivalent professional experience
Deep hands-on understanding of software engineering best practices across the full software development life cycle (coding standards, code reviews, version control, builds, testing)
Demonstrated leadership in mentoring or managing development teams, with strong communication and consensus-building abilities
Experience working in Agile/Scrum environments using tools like Jira
Proficiency in Object-Oriented Design and familiarity with APIs, messaging software, and interoperability standards
Knowledge of application security and performance optimization
Proven ability to design and deliver scalable, high-performance systems
Excellent organizational skills and attention to detail, with a sharp focus on client satisfaction and meeting critical deadlines


Preferred:


Experience with Cloud Technologies (especially AWS)
Professional background in the financial services industry.


Compensation Range: The salary range for this position is between $130,000.00 - $150,000.00. Broadridge considers various factors when evaluating a candidate''s final salary including, but not limited to, relevant experience, skills, and education.

Bonus Eligibility: Bonus Eligible

Benefits Information: Please visit www.broadridgebenefits.com for information on our comprehensive benefit offerings for this role. All Colorado employees receive paid sick leave in compliance with the Colorado Healthy Families and Workplaces Act and other legally required benefits, as applicable.

Apply by clicking the application link and submitting your information. The deadline to apply for this role is December 15th, 2025. 

We are dedicated to fostering a collaborative, engaging, and inclusive environment and are committed to providing a workplace that empowers associates to be authentic and bring their best to work. We believe that associates do their best when they feel safe, understood, and valued, and we work diligently and collaboratively to ensure Broadridge is a company—and ultimately a community—that recognizes and celebrates everyone’s unique perspective.

Use of AI in Hiring 

As part of the recruiting process, Broadridge may use technology, including artificial intelligence (AI)-based tools, to help review and evaluate applications. These tools are used only to support our recruiters and hiring managers, and all employment decisions include human review to ensure fairness, accuracy, and compliance with applicable laws. Please note that honesty and transparency are critical to our hiring process. Any attempt to falsify, misrepresent, or disguise information in an application, resume, assessment, or interview will result in disqualification from consideration.

US applicants: Click here to view the EEOC "Know Your Rights" poster.

Disability Assistance

We recognize that ensuring our long-term success means creating an environment where everyone is welcome, where everyone''s strengths are valued, and where everyone can perform at their best. Broadridge provides equal employment opportunities to all associates and applicants for employment without regard to race, color, religion, sex (including sexual orientation, gender identity or expression, and pregnancy), marital status, national origin, ethnic origin, age, disability, genetic information, military or veteran status, and other protected characteristics protected by applicable federal, state, or local laws.

If you need assistance or would like to request reasonable accommodations during the application and/or hiring process, please contact us at 888-237-7769 or by sending an email to BRcareers@broadridge.com.', '2025-10-25T23:59:45.436Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('3866070ef7ea0271bc2d36ea594ee599', 'Application Developer', 'Best Job Tool', 'https://www.linkedin.com/jobs/view/4331686114', 0, 100, 'queued', NULL, NULL, '["No match for Azure platform services","Good fit for security and authentication capabilities","Some match for event-driven patterns, but not a strong focus","Some match for performance optimization, but not a strong focus","Strong match for devops practices","Highly matches required seniority level with fully remote position","Very strong match for traditional .net development skills","Weak match for preferred frontend frameworks","No match for legacy system modernization and migration capabilities"]', '["C# experience",".NET Core expertise"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":60,"performance":70,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":20}', '["Azure DevOps","Cloud Native Development"]', '9 hours ago', 'About the job

About The Company

Pure Power Engineering Inc. is a leading engineering firm specializing in the design and development of large-scale, high-profile Solar Photovoltaic (PV) systems. With a focus on delivering innovative and sustainable energy solutions, the company provides comprehensive electrical and structural drawings, calculation packages for bidding, permits, and construction, as well as interconnection support and feasibility studies. Over the past decade, Pure Power has built a stellar reputation for excellence, reliability, and industry leadership, making it a trusted partner in the renewable energy sector.

About The Role

Pure Power is seeking a talented and motivated Senior Applications Developer to join our dynamic team. The successful candidate will be responsible for maintaining and enhancing our suite of C# add-on applications that seamlessly integrate with AutoCAD and Microsoft Office products. This role requires an individual with advanced technical expertise in AutoCAD automation, strong foundation in object-oriented analysis and design principles, and a passion for solving complex engineering software challenges. The ideal candidate will be a skilled developer, researcher, and communicator, capable of delivering reliable, well-structured solutions that support our engineering workflows. Self-motivation, organizational skills, and attention to detail are essential for success in this position.

Qualifications


Minimum of 5+ years of experience developing C# or C++ applications for AutoCAD environments.
Bachelor’s degree in computer science, electrical engineering, mathematics, or a related technical field.
Strong proficiency in C#, LINQ, WinForms, and WPF frameworks.
Familiarity with C++ and ObjectARX is preferred, along with experience in AutoCAD automation.
Solid understanding of object-oriented analysis and design principles, design patterns, and algorithms.
Excellent problem-solving skills with keen attention to detail.
Effective communication skills and ability to work collaboratively within a team.
Ability to independently manage multiple tasks and prioritize effectively.
Experience with Azure DevOps, Git, and version control practices.
Knowledge of AutoCAD, Azure DevOps, and Git is preferred but not mandatory.


Responsibilities


Collaborate with cross-functional teams to gather requirements and design effective software solutions.
Develop, test, and maintain AutoCAD add-on applications using Visual Studio and C#.
Utilize Azure DevOps and Git for source control, backlog management, and continuous integration.
Perform unit testing and integration testing to ensure application performance and stability.
Implement best coding practices and adhere to established standards for software development.
Identify, troubleshoot, and resolve software defects and issues promptly.
Document software designs, code, and processes to facilitate maintenance and future enhancements.
Participate in code reviews, providing constructive feedback and sharing best practices with peers.
Apply object-oriented analysis and design principles to improve code architecture, readability, and reusability.
Recommend and implement improvements to DevOps processes and practices.
Stay abreast of industry trends, emerging technologies, and advancements in AutoCAD automation, DevOps, AI, and engineering software.
Perform other duties as assigned to support project and organizational goals.


Benefits

Pure Power offers a competitive salary range of $130,000 to $150,000, commensurate with experience. We cover 100% of employee medical, dental, and vision insurance costs, ensuring comprehensive health benefits. Our benefits package also includes paid leave, 401(k) matching contributions, commuter benefits, sick leave, paid time off, and access to internal and external professional development opportunities. The company promotes a healthy work-life balance and fosters a collaborative, innovative work environment. Our location in downtown Hoboken, NJ provides easy access to public transportation from NYC and Northern NJ, with parking options and travel reimbursement for employees commuting via public transit.

Equal Opportunity

Pure Power Engineering Inc. is an Equal Opportunity Employer (EOE) committed to fostering a diverse and inclusive workforce. We do not discriminate against any individual on the basis of race, color, religion, sex, age, national origin, veteran status, disability, sexual orientation, gender identity, marital status, organ donation, height, weight, or hair length. Our company believes that diversity and inclusion are vital to our success and innovation, and we are dedicated to providing equal opportunities for all employees and applicants.



Desired Skills and Experience

AutoCAD, C#, DevOps, Software Development, Object-Oriented Programming, Version Control', '2025-10-26T00:00:00.547Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('1b59f042f24ebc59f9704bcdb7d523fd', 'Senior Software Development Engineer', 'Solventum', 'https://www.linkedin.com/jobs/view/4289733297', 0, 100, 'queued', NULL, NULL, '["No mention of Azure platform services","Good fit for security and authentication capabilities","Some match with event-driven patterns, but unclear","Some match with performance optimization, but unclear","High score due to overlap with other categories","Fully remote position matches seniority level","Strong match with traditional .NET development skills","No strong emphasis on preferred frontend frameworks","No mention of legacy system modernization"]', '["API security, authentication, and governance capabilities"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":60,"performance":70,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":20}', '["Azure platform services","Event-driven patterns and integration architecture"]', '4 hours ago', 'About the job

Thank you for your interest in joining Solventum. Solventum is a new healthcare company with a long legacy of solving big challenges that improve lives and help healthcare professionals perform at their best. At Solventum, people are at the heart of every innovation we pursue. Guided by empathy, insight, and clinical intelligence, we collaborate with the best minds in healthcare to address our customers’ toughest challenges. While we continue updating the Solventum Careers Page and applicant materials, some documents may still reflect legacy branding. Please note that all listed roles are Solventum positions, and our Privacy Policy: https://www.solventum.com/en-us/home/legal/website-privacy-statement/applicant-privacy/ applies to any personal information you submit. As it was with 3M, at Solventum all qualified applicants will receive consideration for employment without regard to their race, color, religion, sex, sexual orientation, gender identity, national origin, disability, or status as a protected veteran.

Job Description

Senior Software Development Engineer, Solventum Health Information Systems, Inc., Pittsburgh, Pennsylvania (remote): Write and enhance code for complex large-scale, front-end speech recognition workflow products using .NET and JavaScript. Runs pre-deployment builds, documents process and features, and develops and performs unit tests, integration tests, and pair tests. Master''s in Computer Science or Information Science required. Must have five years of experience: (i) Developing healthcare software; (ii) With radiology system integrations; and (iii) Working with complex JavaScript, writing Structured Query Language (SQL) packages for SQL Server, and programming in C# .NET. Experience may be gained concurrently. Position eligible for telecommuting from any location in the United States. Apply at: solventum.com/en-us/home/our-company/careers/.

Pay: $140,754

Onboarding Requirement: To improve the onboarding experience, you will have an opportunity to meet with your manager and other new employees as part of the Solventum new employee orientation. As a result, new employees hired for this position will be required to travel to a designated company location for on-site onboarding during their initial days of employment. Travel arrangements and related expenses will be coordinated and paid for by the company in accordance with its travel policy. Applies to new hires with a start date of October 1st 2025 or later.

Applicable to US Applicants Only:The expected compensation range for this position is $119,076 - $145,537, which includes base pay plus variable incentive pay, if eligible. This range represents a good faith estimate for this position. The specific compensation offered to a candidate may vary based on factors including, but not limited to, the candidate’s relevant knowledge, training, skills, work location, and/or experience. In addition, this position may be eligible for a range of benefits (e.g., Medical, Dental & Vision, Health Savings Accounts, Health Care & Dependent Care Flexible Spending Accounts, Disability Benefits, Life Insurance, Voluntary Benefits, Paid Absences and Retirement Benefits, etc.). Additional information is available at: https://www.solventum.com/en-us/home/our-company/careers/#Total-Rewards

Responsibilities of this position include that corporate policies, procedures and security standards are complied with while performing assigned duties.

Solventum is committed to maintaining the highest standards of integrity and professionalism in our recruitment process. Applicants must remain alert to fraudulent job postings and recruitment schemes that falsely claim to represent Solventum and seek to exploit job seekers.

Please note that all email communications from Solventum regarding job opportunities with the company will be from an email with a domain of @solventum.com. Be wary of unsolicited emails or messages regarding Solventum job opportunities from emails with other email domains.

Please note, Solventum does not expect candidates in this position to perform work in the unincorporated areas of Los Angeles County.

Solventum is an equal opportunity employer. Solventum will not discriminate against any applicant for employment on the basis of race, color, religion, sex, sexual orientation, gender identity, national origin, age, disability, or veteran status.

Please note: your application may not be considered if you do not provide your education and work history, either by: 1) uploading a resume, or 2) entering the information into the application fields directly.

Solventum Global Terms of Use and Privacy Statement

Carefully read these Terms of Use before using this website. Your access to and use of this website and application for a job at Solventum are conditioned on your acceptance and compliance with these terms.

Please access the linked document by clicking here, select the country where you are applying for employment, and review. Before submitting your application you will be asked to confirm your agreement with the

terms.', '2025-10-26T00:00:14.255Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('cc22ddbd6f682b9c8ad0e3179515b449', 'Senior Microsoft Application Engineer', 'HCA Healthcare', 'https://www.linkedin.com/jobs/view/4300000341', 0, 100, 'queued', NULL, NULL, '["Good fit"]', '["Required skill: .NET Core, ASP.NET, MVC, Web Forms"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":70,"performance":85,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":60,"legacyModernization":50}', '["Azure, DevOps"]', '10 hours ago', 'About the job

Description

Introduction

Experience the HCA Healthcare difference where colleagues are trusted, valued members of our healthcare team. Grow your career with an organization committed to delivering respectful, compassionate care, and where the unique and intrinsic worth of each individual is recognized. Submit your application for the opportunity below: Senior Application Engineer HCA Healthcare

Benefits

HCA Healthcare, offers a total rewards package that supports the health, life, career and retirement of our colleagues. The available plans and programs include:


Comprehensive medical coverage that covers many common services at no cost or for a low copay. Plans include prescription drug and behavioral health coverage as well as free telemedicine services and free AirMed medical transportation. 
Additional options for dental and vision benefits, life and disability coverage, flexible spending accounts, supplemental health protection plans (accident, critical illness, hospital indemnity), auto and home insurance, identity theft protection, legal counseling, long-term care coverage, moving assistance, pet insurance and more. 
Free counseling services and resources for emotional, physical and financial wellbeing 
401(k) Plan with a 100% match on 3% to 9% of pay (based on years of service) 
Employee Stock Purchase Plan with 10% off HCA Healthcare stock 
Family support through fertility and family building benefits with Progyny and adoption assistance. 
Referral services for child, elder and pet care, home and auto repair, event planning and more 
Consumer discounts through Abenity and Consumer Discounts 
Retirement readiness, rollover assistance services and preferred banking partnerships 
Education assistance (tuition, student loan, certification support, dependent scholarships) 
Colleague recognition program 
Time Away From Work Program (paid time off, paid family leave, long- and short-term disability coverage and leaves of absence) 
Employee Health Assistance Fund that offers free employee-only coverage to full-time and part-time colleagues based on income. 


Learn More About Employee Benefits

Note: Eligibility for benefits may vary by location.

We are seeking a(an) Senior Application Engineer for our team to ensure that we continue to provide all patients with high quality, efficient care. Did you get into our industry for these reasons? We are an amazing team that works hard to support each other and are seeking a phenomenal addition like you who feels patient care is as meaningful as we do. We want you to apply!

Job Summary

Job Summary and Qualifications

This position is a senior .NET developer position who will report directly to the Manager of Software Engineering at HealthTrust. The candidate will be experienced in either front-end or back-end development, and comfortable with full-stack development.

A successful candidate will demonstrate an understanding of software patterns, secure programming principles, test-driven development or another unit testing methodology, and code standards compliance. In addition, this candidate will have a history of increasing responsibility in a small multi-role team. This position requires a candidate who can analyze business requirements, perform design tasks, construct, test, and implement solutions with minimal supervision.

This candidate will have a track record of participation in successful projects in a matrixed team environment. In addition, the applicant must be willing to mentor other developers to prepare them for assuming the responsibilities of a Senior Software Engineer.

The Senior Software Engineer will be required to learn about existing legacy systems and provide on-going technical support for both existing and new applications. The applicant will provide second-level support for existing applications within a group.

The Senior Software Engineer must be a highly motivated self-starter, an enthusiastic learner, and must be committed to delivering high quality solutions within scheduled timelines.

General Responsibilities


Closely collaborates with team members to successfully execute development initiatives using Agile practices and principles 
Leads efforts to design, develop, deploy, and support software systems
Integrates new/existing software with existing systems
Collaborates with business analysts, project leads, management and customers on requirements
Designs fit-for-purpose products to ensure products align to the customer''s strategic plans and technology road maps
Demonstrates and coaches value based decision making and Agile principles across teams
Coaches team on existing system structure, constraints and deficiencies with product 
Shares knowledge and experience to contribute to growth of overall team capabilities
Focuses on customer satisfaction
Designs, constructs, and delivers solutions with minimal team interaction
Act as a leader to the team’s continuous integration and continuous delivery automation pipeline


Relevant Work Experience


5+ years


EDUCATION


Bachelor’s Degree Preferred
Technical Training


Other/Special Qualifications


Willingness to learn our business domain required
Experience with C#, SQL, JavaScript Framework (i.e. Angular), CSS, HTML, RESTful Services (i.e. ASP.NET Web API) required
3+ years of engineering, delivering and supporting production software products required
2+ years working with object-oriented design, SQL, and web programming required
Delivery of past software systems with documented value required
Strong focus on delivering customer value required
Excellent troubleshooting, analysis, and problem-solving abilities required
Ability to engineer and build software through multiple languages and tools required
Strong verbal and written communication with the ability to work with staff and business required
Experience with Kanban and Scrum preferred
Experience with continuous integration and continuous deployment preferred


PHYSICAL DEMANDS/WORKING CONDITIONS


Prolonged sitting at a desk (6-7 hrs./day)
Some after-hours work may be required


HCA Healthcare has been recognized as one of the World''s Most Ethical Companies® by the Ethisphere Institute more than ten times. In recent years, HCA Healthcare spent an estimated $3.7 billion in cost for the delivery of charitable care, uninsured discounts, and other uncompensated expenses.

"There is so much good to do in the world and so many different ways to do it."- Dr. Thomas Frist, Sr.

HCA Healthcare Co-Founder

If you find this opportunity compelling, we encourage you to apply for our Senior Application Engineer opening. We promptly review all applications. Highly qualified candidates will be directly contacted by a member of our team. We are interviewing apply today!

We are an equal opportunity employer. We do not discriminate on the basis of race, religion, color, national origin, gender, sexual orientation, age, marital status, veteran status, or disability status.', '2025-10-26T00:00:29.386Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('ef81cbf4bdeaff8e8cb9afc3d8000598', 'Technology, Senior Software Developer', 'BTIG', 'https://www.linkedin.com/jobs/view/4265032616', 0, 100, 'queued', NULL, NULL, '["No mention of Azure, but strong emphasis on .NET development"]', '["Strong skills in software development, communication, and systems design",".NET development experience"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":60,"performance":70,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":20}', '["Azure","cloud-native development"]', '9 hours ago', 'About the job

Job Purpose

BTIG is seeking an experienced and motivated Senior Software Developer to join the Technology department’s Application Development group. Our team is dedicated to building high-quality, scalable, and secure software solutions that drive our business forward. The ideal candidate will possess strong skills in software development, communication, and systems design.

As a Senior Software Developer, you will play a key role in developing and supporting software systems, gathering requirements, participating in code reviews, mentoring team members, and ensuring the successful delivery of projects. You will also contribute to the architecture and design of new systems, improve existing systems for performance and maintainability, and stay updated with the latest industry trends and technologies.

This role focuses on end-to-end application development using modern cloud technologies, driving efficient workflows and automation throughout the software delivery lifecycle. Key responsibilities include developing and maintaining applications, implementing continuous integration pipelines, containerizing solutions, and ensuring robust testing and monitoring. You will collaborate closely with other technical teams to adopt new cloud-based technologies, streamline deployments, and deliver high-quality, reliable software that supports our organization’s needs. The ideal candidate is passionate about building modern, efficient cloud applications and committed to operational excellence.

As a dynamic team, we offer flexible remote work options that enable effective collaboration.

Duties & Responsibilities


Design, develop, and deploy software solutions and systems.
Ensure code quality and maintainability through code reviews, testing, and adherence to best practices.
Support DevOps practices by implementing CI/CD pipelines, managing infrastructure as code, and monitoring deployments for reliability.
Oversee the maintenance and support of existing software systems, ensuring they remain efficient, reliable, and secure.
Mentor other members of the team, fostering a collaborative and productive work environment.
Collaborate with cross-functional teams to define project requirements, scope, and deliverables.
Quickly troubleshoot and resolve technical issues within necessary timelines.
Participate in architectural discussions and contribute to the overall technical strategy.
Develop and enforce best practices for system security, data protection, and software performance.
Stay updated with the latest industry trends and technologies to drive innovation within the team.


Requirements & Qualifications


Bachelor’s degree or higher in a relevant field.
Strong problem-solving skills and the ability to troubleshoot complex issues.
Excellent communication and interpersonal skills.
Experience in maintaining and supporting software systems post-deployment.
Excellent understanding of software development methodologies, tools, and processes.
Strong proficiency with C# and .NET Core.
Extensive experience with SQL databases, particularly with SQL Server or PostgreSQL preferred.


Important Notes


Must be authorized to work full time in the U.S., BTIG does not offer sponsorship for work visas of any type
No phone calls please, the applicant will be contacted within two weeks if successful


About BTIG

BTIG is a global financial services firm specializing in institutional trading, investment banking, research and related brokerage services. With an extensive global footprint and more than 700 employees, BTIG, LLC and its affiliates operate out of 20 cities throughout the U.S., and in Europe, Asia and Australia. BTIG offers execution, expertise and insights for equities, equity derivatives, ETFs and fixed income, currency and commodities. The firm’s core capabilities include global execution, portfolio, electronic and outsource trading, investment banking, prime brokerage, capital introduction, corporate access, research and strategy, commission management and more.

All qualified applicants will receive consideration for employment without regard to race, color, religion, sex, sexual orientation, gender identity, national origin, protected veteran status, or disability status. BTIG is an equal opportunity employer Minorities/Females/People with Disabilities/Protected Veterans/Sexual Orientation/Gender Identity.

Compensation


BTIG offers a competitive compensation and benefits package. Salary range is based on a variety of factors including, but not limited to, location, years of applicable experience, skills, qualifications, licensure and certifications, and other business and organization needs.
The current estimated base salary range for this role is $160,000.00 - $190,000.00 per year. Please note that certain positions are eligible for additional forms of compensation such as discretionary bonus or overtime. 


Disclaimer: https://www.btig.com/disclaimer.aspx.', '2025-10-26T00:00:43.576Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('5e8ec89ca429279626e64e6dbaddb98c', 'Full Stack .NET Developer', 'Walz Tetrick Advertising', 'https://www.linkedin.com/jobs/view/4310423619', 0, 100, 'queued', NULL, NULL, '["Good fit"]', '["Required skill: .NET Core, ASP.NET, MVC, Web Forms"]', '[]', '{"coreAzure":0,"security":80,"eventDriven":60,"performance":70,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":20}', '["Azure, Event-driven patterns, DevOps practices"]', '10 hours ago', 'About the job

If you thrive in a collaborative environment working with a small team that makes magic happen, this may be the perfect opportunity for you! This team is responsible for a variety of on-going maintenance and new build efforts for websites and data integrations.

Note - this position is fully remote, but required to be within close driving distance of either Kansas City or Chattanooga, TN. 

Responsibilities:


Implement a design into efficient, maintainable code
Test (unit and integration testing, regression testing, compliance testing)
Monitor error logs, perform Troubleshooting, root cause analysis, remediation proposal & execution
Maintain best practices (data, development, SEO, ADA Compliance)
Perform security audits & remediation
Participate in collaborative solutioning


Requirements:


Work well independently in a collaborative environment
Motivated learner who keeps up on current industry tools and trends
Experience with ecommerce or marketing
Experience with mobile app development/maintenance using .NET Android/.Net IOS (formerly known as Xamarin)
Content Management System experience


Experience with the following programming languages/frameworks:


HTML
CSS
Object Oriented Programming
.NET (Framework & Core) --> ASP.NET (Razor, MVC), C# Language, Data Access Frameworks (Entity Framework Core, PetaPoco, ADO.NET)
Working knowledge around building and consuming APIs from .NET (RESTful APIs, SOAP services)
Javascript (JQuery, AJAX, Knockout, Angular, Vue or React)
Bootstrap
JSON
Powershell and Batch scripting
PHP (Wordpress)


Database knowledge:


Experience with database and table creation, maintenance, normalization, optimization, indexing, security, stored procedures, SQL queries, etc.
Microsoft SQL Server
MySQL


Experience using the below tools:


Visual Studio 2022
Postman
SQL Server Management Studio
Microsoft Tools
WinSCP, FileZilla (FTP, SFTP)


Bonus experience:


Code Source Repo Setup and management (TFS -Azure DevOps)
Server Knowledge --> Windows Server 2019 (Windows Firewall, Windows task scheduler, Windows event viewer for troubleshooting, User administration, SMTP), Plesk (used primarily for domain and FTP administration), Domain and DNS administration, WinAcme (for setting up and renewing SSL certificates), Cloudflare
Orkestra Composite C1 (.NET)
Umbraco (.NET)
WordPress (PHP)
Product data management


About Walz Tetrick Advertising

Walz Tetrick is a full-service marketing, creative and media agency in Kansas City. The Greater Kansas City Chamber of Commerce named Walz Tetrick one of its Top 10 Small Businesses, honoring our resilience, innovation and values. Though we’ve been around since 1967, we approach every opportunity with the same zeal we did when we were just getting started. We look for associates, partners and clients who share that enthusiasm and appreciate our all-in approach to brand activation. With each day, we harness more tools and information to illuminate our way.

Walz Tetrick offers an office culture like no other. CEO Charlie Tetrick values his employees and creates a uniquely positive and supportive culture. We work and play as a family. Our current work hours are “in office” Monday through Thursday with an option to “work from anywhere” on Friday.

We’re proud of our strong benefits package that includes a 401(k) with an employer match, long-term disability and dental insurance. We offer excellent health insurance, and the agency pays 90 percent of the employees’ premiums with an option to add a spouse and family. We have a generous paid time off policy that includes days to volunteer at a charity of your choice.

If you’re passionate, strategic, collaborative and kind, with a dose of scrappy thrown in, we want to meet you.

Some job search engines, like Indeed, assign salaries to these postings arbitrarily, and cannot be confirmed as accurate.', '2025-10-26T00:01:27.980Z', NULL);
INSERT INTO jobs (id, title, company, url, easy_apply, rank, status, applied_method, rejection_reason, fit_reasons, must_haves, blockers, category_scores, missing_keywords, posted_date, description, created_at, status_updated_at) VALUES ('be1b0dc29718b4afb6cb4654b091fa88', 'Convera USA LLC. in Denver, CO has opening for Senior Software Engineer.', 'Convera', 'https://www.linkedin.com/jobs/view/4224573101', 0, 100, 'queued', NULL, NULL, '["Good fit"]', '["Required skill: .NET Core and C# Web API, Angular, AWS Cloud environment"]', '[]', '{"coreAzure":60,"security":80,"eventDriven":70,"performance":85,"devops":85,"seniority":90,"coreNet":95,"frontendFrameworks":40,"legacyModernization":0}', '["Azure platform services"]', '10 hours ago', 'About the job

Job Description: Full Stack Developer with a strong background in building scalable, high-quality, and high-performance web applications on the Microsoft technology stack and AWS Cloud environment. Develop front-end interfaces using Angular, while also building and maintaining the technology that powers our suite of microservices utilizing .NET Core and C# Web API. Deploy and manage our applications and infrastructure. Additionally, design and implement our backend systems and databases. This role is crucial in driving the success of our products and services, requiring a balanced mastery of front-end, middleware and back-end technologies, along with an understanding of cloud-based solutions. The candidate must ensure software quality with a focus on code optimization and organization. Must be able to troubleshoot application issues and coordinate issue resolution with operations, functional, and technical teams. Position allows for partial remote work. Must live within reasonable commuting distance. Reports to company office in Denver, CO.

Job Requirements: Requires a Bachelor''s degree of Science in Applied Computer Science, Software Engineering, or related field. Requires 5 years of progressive, post-Bachelor''s experience. Must have some experience in each of the following skills: Design and develop scalable and robust Microservices using Dot Net Core and C# Web API. Design, implement, and maintain both RDBMS and NoSQL databases. Web application development using HTML5, CSS3, SCSS, and JavaScript. Web front end / single page application development using Typescript and Angular v10.0 or higher. AWS technologies such as S3, EC2, and Lambda. Agile software development and Scrum ceremonies. Monitoring tools such as Splunk or Datadog to maintain and support production applications.

Salary range: $161,886.00 to $199,000.00 per year.', '2025-10-26T00:01:42.212Z', NULL);

CREATE TABLE label_map (
      label TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      locator TEXT,
      confidence REAL NOT NULL,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      field_type TEXT,
      input_strategy TEXT,
      last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
    );


CREATE TABLE rejection_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      pattern_value TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      last_seen TEXT DEFAULT CURRENT_TIMESTAMP,
      weight_adjustment REAL DEFAULT 0,
      profile_category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );


CREATE TABLE runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      step TEXT,
      ok INTEGER,
      log TEXT,
      screenshot_path TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT
    );

INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (1, '7b58e4617b8049f3ea3f461a39e4de19', 'ollama_json_parse', 0, 'Failed to get valid JSON from Ollama after 4 attempts: fetch failed', NULL, '2025-10-25 23:52:07', '2025-10-25T23:52:07.027Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (2, '7b58e4617b8049f3ea3f461a39e4de19', 'job_processing', 0, 'Failed to get valid JSON from Ollama after 4 attempts: fetch failed', NULL, '2025-10-25 23:52:07', '2025-10-25T23:52:07.029Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (3, 'cc22ddbd6f682b9c8ad0e3179515b449', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:52:25', '2025-10-25T23:52:25.030Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (4, '9a83da98e4197299ed4f89299a153ef9', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:52:39', '2025-10-25T23:52:39.417Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (5, '29768ba6a4c688ae7452abfbe2efef04', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:52:53', '2025-10-25T23:52:53.295Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (6, '1c1106a81d3471985b206ab2c699e4f6', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:53:08', '2025-10-25T23:53:08.942Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (7, 'ae5f1cda272ae2d033d0bb7098f3933b', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  },
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "undefined",
    "path": [
      "categoryScores",
      "devops"
    ],
    "message": "Required"
  }
]', NULL, '2025-10-25 23:53:23', '2025-10-25T23:53:23.248Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (8, '7d5bb61826af72c451c89c0dec72771d', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:53:36', '2025-10-25T23:53:36.808Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (9, 'e9b98f19f2a3311305675013d72e1b3e', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  },
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "undefined",
    "path": [
      "categoryScores",
      "devops"
    ],
    "message": "Required"
  }
]', NULL, '2025-10-25 23:53:49', '2025-10-25T23:53:49.948Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (10, '036b60a12303f5d07894012fe0f2349d', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:54:03', '2025-10-25T23:54:03.867Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (11, '2ab4d25d39263ec8d85764be7930a6f4', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:54:18', '2025-10-25T23:54:18.291Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (12, '63ce57806d03c9c5596545eda5597f22', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:54:32', '2025-10-25T23:54:32.365Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (13, '2bd7d38cf65c80c91068a4df147e168e', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:54:46', '2025-10-25T23:54:46.912Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (14, '3866070ef7ea0271bc2d36ea594ee599', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:55:00', '2025-10-25T23:55:00.903Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (15, '1b59f042f24ebc59f9704bcdb7d523fd', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:55:15', '2025-10-25T23:55:15.025Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (16, '1054d6672a0f52eb997e3f66f4349db4', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  },
  {
    "code": "invalid_type",
    "expected": "number",
    "received": "undefined",
    "path": [
      "categoryScores",
      "devops"
    ],
    "message": "Required"
  }
]', NULL, '2025-10-25 23:55:28', '2025-10-25T23:55:28.669Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (17, 'ef81cbf4bdeaff8e8cb9afc3d8000598', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:55:43', '2025-10-25T23:55:43.210Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (18, '426c4abbfcb340ad34b4c216f28c7b71', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:55:58', '2025-10-25T23:55:58.101Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (19, '5e8ec89ca429279626e64e6dbaddb98c', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:56:12', '2025-10-25T23:56:12.666Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (20, 'be1b0dc29718b4afb6cb4654b091fa88', 'job_processing', 0, '[
  {
    "code": "too_big",
    "maximum": 100,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 100",
    "path": [
      "fitScore"
    ]
  }
]', NULL, '2025-10-25 23:56:25', '2025-10-25T23:56:25.453Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (21, '426c4abbfcb340ad34b4c216f28c7b71', 'ollama_json_parse', 0, 'Failed to get valid JSON from Ollama after 4 attempts: Expected double-quoted property name in JSON at position 145 (line 8 column 22)', NULL, '2025-10-26 00:01:13', '2025-10-26T00:01:13.998Z');
INSERT INTO runs (id, job_id, step, ok, log, screenshot_path, started_at, ended_at) VALUES (22, '426c4abbfcb340ad34b4c216f28c7b71', 'job_processing', 0, 'Failed to get valid JSON from Ollama after 4 attempts: Expected double-quoted property name in JSON at position 145 (line 8 column 22)', NULL, '2025-10-26 00:01:14', '2025-10-26T00:01:14.000Z');

CREATE TABLE weight_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_category TEXT NOT NULL,
      old_weight REAL NOT NULL,
      new_weight REAL NOT NULL,
      reason TEXT NOT NULL,
      rejection_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );


