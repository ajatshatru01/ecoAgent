from google import genai
from google.genai import types
import os

def embed_text(text: str):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY missing")

    client = genai.Client(api_key=api_key)

    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=1536)
    )

    emb = result.embeddings[0].values
    if not emb:
        raise RuntimeError("Embedding returned empty vector")

    return emb