import os
import json
from google import genai
from google.genai import types
from app.llm.prompts import SYSTEM_QUESTION_TEMPLATE, HUMAN_QUESTION_TEMPLATE
from app.core.logger import get_logger
from app.core.config import settings

logger = get_logger(__name__)

class AIService:
    def __init__(self):
        api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        self.client = genai.Client(api_key=api_key)
        self.model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.5"))

    def generate_next_dynamic_question(self, role, resume_text, previous_interactions, level, question_no=1, total_questions=6):
        logger.info(f"Dynamic Question layer is running. Level: {level}, Question No: {question_no}/{total_questions}")

        # Normalize level
        level = level.lower()

        # Apply language rules based on candidate level
        if level == "beginner":
            language_rule = "Use VERY SIMPLE language, avoid complex technical jargon. Keep it easy to understand."
        elif level == "intermediate":
            language_rule = "Use simple and clear English, focus on practical coding applications."
        else:
            language_rule = "Use professional and technical language. Focus on system design and deep concepts."

        # Add question sequencing rules
        if question_no == 1:
            sequence_rule = "This is the FIRST question. Ask a general HR question about the candidate (e.g., 'Tell me about yourself'). DO NOT ask technical questions."
        elif question_no == 2:
            sequence_rule = "This is the SECOND question. Ask a general HR question (e.g., about their strengths or weaknesses). DO NOT ask technical questions."
        elif question_no == total_questions:
            sequence_rule = "This is the LAST question. Ask a closing HR question (e.g., 'Why should we hire you?' or 'How would you rate yourself out of 5?'). DO NOT ask technical questions."
        else:
            sequence_rule = "This is a TECHNICAL phase question. Drill down into technical skills, specific project details, and core competencies from the resume."

        # Combine the system template with your dynamic level rules
        system_prompt = SYSTEM_QUESTION_TEMPLATE + f"\n\n# LEVEL-SPECIFIC RULES:\n- Candidate Level: {level}\n- {language_rule}\n\n# INTERVIEW STAGE RULES:\n- {sequence_rule}"

        # Format the human prompt with current interview context
        human_prompt = HUMAN_QUESTION_TEMPLATE.format(
            role=role,
            previous_interactions=previous_interactions,
            resume_text=resume_text
        )

        try:
            # Call Gemini API
            response = self.client.models.generate_content(
                model=self.model,
                contents=human_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=self.temperature,
                    response_mime_type="application/json"
                )
            )

            output = response.text
            logger.info("Generated dynamic question payload", extra={"payload": output})
            return json.loads(output)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON from Gemini LLM.", extra={"error": str(e), "output": locals().get("output")})
            return {"question": "Could you elaborate more on your previous experience?"}
        except Exception as e:
            logger.exception("An unexpected error occurred during question generation.", extra={"error": str(e)})
            return {"question": "Let's switch gears. What are your long-term career goals?"}

ai_service = AIService()
