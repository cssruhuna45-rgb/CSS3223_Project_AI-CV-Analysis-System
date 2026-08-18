# 📖 API Specification & Inter-Service Endpoints

## 1. React Frontend <-> Spring Boot Backend (`http://localhost:8080`)
- `POST /api/auth/login`: Authenticate User
- `POST /api/interviews/start`: Create candidate interview session
- `POST /api/interviews/{sessionId}/respond`: Submit answer & fetch next question
- `GET /api/interviews/{sessionId}/scorecard`: Fetch evaluation scorecard

## 2. Spring Boot Backend <-> Python FastAPI AI Service (`http://localhost:8000`)
- `GET /health`: Health check & Gemini API key status
- `POST /api/v1/generate-next-question`: RAG-enhanced LLM question generation
- `POST /api/v1/evaluate-session`: LangChain multi-axis candidate evaluation
