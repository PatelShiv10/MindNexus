from langchain_neo4j import Neo4jGraph
from core.config import settings

graph: Neo4jGraph | None = None

try:
    graph = Neo4jGraph(
        url=settings.NEO4J_URL,
        username=settings.NEO4J_USERNAME,
        password=settings.NEO4J_PASSWORD,
    )
    print("INFO: Neo4j connected successfully.")
except Exception as e:
    print(f"WARNING: Neo4j connection failed — graph features disabled. Error: {e}")
    graph = None
