import os

import json
import re
from app.core.logger import get_logger
from app.core.exceptions import ApplicationError
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

logger = get_logger(__name__)

import requests
from langchain_google_genai import ChatGoogleGenerativeAI



class LLMClient:

    def __init__(self):

        # self.llm=HuggingFaceEndpoint(
        # repo_id="mistralai/Mistral-7B-Instruct-v0.2",
        # temperature=0,
        # huggingfacehub_api_token=os.getenv('HUGGINGFACE_API_KEY')

        # )
        # self.model=ChatHuggingFace(llm=self.llm)
        self.llm = ChatGoogleGenerativeAI(
            google_api_key=(os.environ.get("GEMINI_API_KEY") or "").strip(),
            model=os.environ.get("GEMINI_MODEL") or "gemini-1.5-flash",
            temperature=0.7,
        )

        self.output_parser = StrOutputParser()

        # if not self.api_key:
        #     raise ApplicationError("HUGGINGFACE_API_KEY is not set")

        # self.client = InferenceClient(
        #     model=self.model,
        #     token=self.api_key,
        # )

        # logger.info(
        #     "LLM client initialized",
        #     extra={"model": self.model},
        # )

    def _coerce_response_text(self, response) -> str:
        if response is None:
            return ""
        if isinstance(response, str):
            return response
        if isinstance(response, dict):
            return json.dumps(response)

        # LangChain message objects usually carry `.content`.
        content = getattr(response, "content", None)
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            try:
                chunks = []
                for item in content:
                    if isinstance(item, str):
                        chunks.append(item)
                    elif isinstance(item, dict):
                        chunks.append(str(item.get("text") or item.get("content") or ""))
                    else:
                        chunks.append(str(item))
                return "\n".join([c for c in chunks if c]).strip()
            except Exception:
                pass

        text_attr = getattr(response, "text", None)
        if isinstance(text_attr, str):
            return text_attr

        return str(response)

    def _extract_json_text(self, text: str) -> str:
        if not text:
            return text

        cleaned = text.strip()
        cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.IGNORECASE).strip()

        # Fallback: if wrapper text exists, extract the first JSON object.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start : end + 1].strip()
            if candidate:
                return candidate

        return cleaned

    def generate_question(self, prompt, role, previous_interactions, resume_text) -> str:

        try:

            chain = prompt | self.llm | self.output_parser
            response = chain.invoke(
                {
                    "role": role,
                    "previous_interactions": previous_interactions,
                    "resume_text": resume_text,
                }
            )

            if not response:
                raise ApplicationError("Empty response from LLM")
            print(f"This is the response: {response}")
            try:
                # Check if response is already a dict
                if isinstance(response, dict):
                    return response.get("question", response)
                # Try to parse as JSON string
                data = json.loads(str(response))
                return data["question"]
            except (json.JSONDecodeError, KeyError, TypeError):
                # If JSON parsing fails, return the raw text when it looks like a question.
                response_text = str(response).strip()
                if response_text:
                    if "question" in response_text.lower() or response_text.endswith("?"):
                        return response_text
                    if len(response_text.split()) <= 25:
                        return response_text
                raise

        except Exception as e:
            print(f"error is :{e}")
            logger.exception(
                "LLM generation failed",
                extra={"error": str(e)},
            )
            raise ApplicationError("LLM generation failed")

    def generate_report(self, prompt, role, data, face_analysis=None) -> str:

        try:

            chain = prompt | self.llm | self.output_parser
            response = chain.invoke({"role": role, "session_data": data, "face_analysis": face_analysis or {}})

            if not response:
                raise ApplicationError("Empty response from LLM")
            response_text = self._coerce_response_text(response)
            print(f"The type of the report is :{type(response)}")
            try:
                # Check if response is already a dict
                if isinstance(response, dict):
                    print(f"the report is:{response}")
                    return response
                # Try to parse as JSON string
                json_text = self._extract_json_text(response_text)
                parsed = json.loads(json_text)
                print(f"the report is:{parsed}")
                return parsed
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.exception(
                    "Json loading error",
                    extra={"error": str(e)},
                )
                print(f"error is:{e}")
                return self._extract_json_text(response_text)

        except Exception as e:
            logger.exception(
                "LLM generation failed",
                extra={"error": str(e)},
            )
            raise ApplicationError("LLM generation failed")
