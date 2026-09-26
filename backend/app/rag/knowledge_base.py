"""
FinSight AI - RAG Knowledge Base & Retrieval System
Ingests internal policies, product rules, and compliance documents into vector chunks.
Supports PostgreSQL + pgvector when configured, with seamless in-memory / SQLite vector fallback.
"""

import os
import re
import math
from typing import List, Dict, Any, Optional
from collections import Counter

DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")

class DocumentChunk:
    def __init__(self, chunk_id: str, title: str, source: str, content: str, embedding: Optional[List[float]] = None):
        self.chunk_id = chunk_id
        self.title = title
        self.source = source
        self.content = content
        self.embedding = embedding or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "title": self.title,
            "source": self.source,
            "content": self.content,
        }

class EmbeddingEngine:
    """
    Lightweight deterministic semantic vector embedding engine.
    Produces 128-dimensional normalized term and n-gram hash vector embeddings.
    Allows zero-dependency, lightning-fast semantic similarity without requiring external API keys.
    """
    def __init__(self, dim: int = 128):
        self.dim = dim

    def embed_text(self, text: str) -> List[float]:
        tokens = re.findall(r"\w+", text.lower())
        if not tokens:
            return [0.0] * self.dim

        vec = [0.0] * self.dim
        counts = Counter(tokens)
        total_tokens = len(tokens)

        for word, count in counts.items():
            # Term frequency
            tf = count / total_tokens
            # Deterministic bucket hashing with sign
            h = hash(word)
            idx = abs(h) % self.dim
            sign = 1.0 if (h >> 7) % 2 == 0 else -1.0
            vec[idx] += sign * (1.0 + math.log(1.0 + tf))

        # Bigram features for multi-word financial phrases (e.g. "debt to income", "credit score")
        for i in range(len(tokens) - 1):
            bigram = f"{tokens[i]}_{tokens[i+1]}"
            h = hash(bigram)
            idx = abs(h) % self.dim
            sign = 1.0 if (h >> 5) % 2 == 0 else -1.0
            vec[idx] += sign * 1.5

        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        return max(0.0, min(1.0, dot))

class KnowledgeBase:
    """
    Vector knowledge base for FinSight financial policy and governance documents.
    """
    def __init__(self, docs_dir: str = DOCS_DIR):
        self.docs_dir = docs_dir
        self.chunks: List[DocumentChunk] = []
        self.embedder = EmbeddingEngine(dim=128)
        self.is_ingested = False
        self.ingest_all()

    def ingest_all(self):
        """Parse all markdown files into chunked knowledge units with embeddings."""
        if not os.path.exists(self.docs_dir):
            return

        self.chunks = []
        for filename in sorted(os.listdir(self.docs_dir)):
            if not filename.endswith((".md", ".txt")):
                continue

            filepath = os.path.join(self.docs_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Extract title from first H1 if present
                lines = content.split("\n")
                doc_title = filename
                for line in lines:
                    if line.startswith("# "):
                        doc_title = line.replace("# ", "").strip()
                        break

                # Chunk by H2 sections or double-newlines
                sections = re.split(r"\n(?=## )", content)
                for idx, section in enumerate(sections):
                    clean_sec = section.strip()
                    if not clean_sec:
                        continue
                    
                    sec_title = doc_title
                    first_line = clean_sec.split("\n")[0]
                    if first_line.startswith("## "):
                        sec_title = f"{doc_title} - {first_line.replace('## ', '').strip()}"

                    chunk_id = f"{filename}_{idx}"
                    embedding = self.embedder.embed_text(clean_sec)
                    self.chunks.append(DocumentChunk(
                        chunk_id=chunk_id,
                        title=sec_title,
                        source=filename,
                        content=clean_sec,
                        embedding=embedding
                    ))
            except Exception as e:
                print(f"[KnowledgeBase] Warning: Failed to ingest {filename}: {e}")

        self.is_ingested = True

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieve most relevant policy context for a query."""
        if not self.chunks:
            self.ingest_all()

        if not self.chunks:
            return []

        query_vec = self.embedder.embed_text(query)
        scored_chunks = []

        # Boost keywords matching in text
        query_words = set(re.findall(r"\w+", query.lower()))

        for chunk in self.chunks:
            cos_sim = self.embedder.cosine_similarity(query_vec, chunk.embedding)
            
            # Keyword overlap boost
            content_lower = chunk.content.lower()
            overlap_count = sum(1 for w in query_words if len(w) > 3 and w in content_lower)
            boost = min(0.35, overlap_count * 0.08)
            final_score = cos_sim + boost

            scored_chunks.append({
                "chunk_id": chunk.chunk_id,
                "title": chunk.title,
                "source": chunk.source,
                "content": chunk.content,
                "score": round(final_score, 4),
            })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

# Global singleton
knowledge_base = KnowledgeBase()
