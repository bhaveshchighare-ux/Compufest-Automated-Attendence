from typing import Dict

from app.core.logger import get_logger
from app.llm.client import LLMClient
from app.llm.prompts import REPORT_PROMPT
from langchain_core.prompts import ChatPromptTemplate

logger = get_logger(__name__)


class ScoringService:
    def __init__(self):
        self.llm = LLMClient()

    def score_interview(self, interview_session: Dict) -> Dict:
        FINAL_REPORT_PROMPT = ChatPromptTemplate.from_messages(REPORT_PROMPT)
        logger.info("Scoring interview via LLM")
        face_analysis = interview_session.get("face_analysis", {})
        return self.llm.generate_report(FINAL_REPORT_PROMPT, interview_session['role'], interview_session['data'], face_analysis)
