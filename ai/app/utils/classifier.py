import os
from groq import Groq
from app.core.logger import get_logger

logger = get_logger(__name__)

def classify_candidate(resume_text: str) -> str:
    """
    Classifies a candidate's experience level based on their resume text.

    Args:
        resume_text: The text content of the candidate's resume.

    Returns:
        A string indicating the level: 'beginner', 'intermediate', or 'advanced'.
    """
    prompt = f"""
Analyze the following resume text and classify the candidate's experience level.
Your response must be one of these three words ONLY: 'beginner', 'intermediate', 'advanced'.

- 'beginner': 0-2 years of experience, familiar with concepts but limited practical application.
- 'intermediate': 2-5 years of experience, solid practical skills, has worked on multiple projects.
- 'advanced': 5+ years of experience, deep expertise, leadership, or architectural skills.

Do not provide any explanation or other text.

Resume Text:
---
{resume_text}
---

Classification:"""

    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY is not configured. Falling back to intermediate level.")
            return "intermediate"

        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        level = response.choices[0].message.content.strip().lower().replace("'", "")
        return level if level in ['beginner', 'intermediate', 'advanced'] else 'intermediate'
    except Exception as e:
        logger.error("Error during candidate classification", extra={"error": str(e)})
        return 'intermediate'
