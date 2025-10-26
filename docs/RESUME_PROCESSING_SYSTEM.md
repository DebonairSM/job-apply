# Resume Content Processing System

## Overview

The system now intelligently processes your resume content to generate personalized form responses. Here's how it works:

## How It Works

### 1. Resume Parsing
- **Input**: DOCX files in the `resumes/` folder
- **Process**: Extracts text using mammoth library, then uses AI to parse structured sections
- **Output**: Organized sections (experience, skills, projects, education, summary)

### 2. Content Integration
- **Job-Specific Analysis**: AI finds relevant resume content for each job application
- **Enhanced Responses**: "Why fit" answers incorporate specific achievements and experience
- **Resume Selection**: AI chooses the best resume variant for each role

### 3. Form Filling
- **Personal Info**: Still uses `.env` file for basic details (name, email, phone, etc.)
- **Experience Details**: Now pulls from parsed resume content
- **Job-Specific Responses**: Tailored based on job requirements and your background

## Example Flow

1. **Job Application**: "Senior Azure Developer at Microsoft"
2. **Resume Analysis**: Finds relevant Azure experience, .NET projects, leadership roles
3. **Enhanced Response**: "I have 5+ years of Azure experience, led microservices migration at [Company], and have expertise in Azure Functions, Service Bus, and API Management..."
4. **Resume Selection**: Chooses "Senior Developer" variant over "Junior Developer" variant

## Benefits

- **Personalized Applications**: Each response is tailored to your actual experience
- **Better Fit Matching**: AI understands your background and matches it to job requirements
- **Consistent Quality**: Professional responses that highlight relevant achievements
- **Time Savings**: No more generic responses - everything is customized automatically

## Setup

1. **Add Resume Files**: Place your DOCX resume files in the `resumes/` folder
2. **Configure Variants**: Update `RESUME_VARIANTS` in your `.env` file
3. **Run Applications**: The system automatically uses resume content for all form responses

## File Structure

```
resumes/
├── Senior-Developer.docx
├── API-Engineer.docx
└── Full-Stack.docx
```

The system will automatically:
- Parse each resume's content
- Extract structured sections (experience, skills, projects)
- Use AI to find relevant content for each job
- Generate personalized "why fit" responses
- Select the most appropriate resume variant

## Technical Details

- **Parsing**: Uses mammoth library for DOCX text extraction
- **AI Processing**: Local LLM (Ollama) for content analysis and enhancement
- **Caching**: Parsed resumes are cached to avoid re-processing
- **Fallback**: If AI parsing fails, uses pattern-based fallback parsing
- **Error Handling**: Graceful degradation if resume processing fails

