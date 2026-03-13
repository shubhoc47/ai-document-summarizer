
# 🚀 AI Document Summarizer with RAG

An end-to-end **AI-powered document intelligence system** that allows users to:

• Upload PDF documents  
• Extract text from documents  
• Generate AI summaries  
• Build a semantic vector index  
• Ask questions about documents using **Retrieval Augmented Generation (RAG)**  

The system combines **React, FastAPI, LangChain, FAISS, and Google Gemini** to create a scalable AI application deployed on **AWS infrastructure**.

---

# 🌐 Live Application

Frontend  
https://app.shubhochowdhury.com

Backend API  
https://api.shubhochowdhury.com/docs

---

# ✨ Features

### 📄 Document Processing
- Upload PDF documents
- Extract text from PDFs
- Generate AI summaries

### 🧠 AI Capabilities
- Gemini powered summarization
- Semantic document indexing
- Vector search using **FAISS**
- Question answering using **RAG**

### ⚡ Full Stack Architecture
- React frontend
- FastAPI backend
- LangChain AI orchestration
- AWS cloud deployment

### 🔐 Production Ready
- HTTPS (Let's Encrypt)
- Nginx reverse proxy
- CloudFront CDN
- Route53 DNS

---

# 🧠 RAG Pipeline

The system now follows a **Retrieval Augmented Generation architecture**.

```mermaid
flowchart TD

User[User Uploads PDF]

User --> Upload[Upload PDF]

Upload --> Extract[Extract Text]

Extract --> Index[Create Vector Index FAISS]

Index --> VectorDB[(Vector Store)]

User --> Question[User Question]

Question --> Retriever[Retriever Top K Chunks]

Retriever --> Context[Relevant Context]

Context --> Gemini[Gemini LLM]

Gemini --> Answer[Generated Answer]

Answer --> User
````

---

# 🏗 Full System Architecture

```mermaid
flowchart TD

User[User Browser]

User --> CloudFront

CloudFront --> S3[React Frontend]

User --> API[api.shubhochowdhury.com]

API --> Route53

Route53 --> EC2

EC2 --> Nginx

Nginx --> FastAPI

FastAPI --> LangChain

LangChain --> FAISS

FAISS --> VectorStore[(Vector Index)]

LangChain --> GeminiAPI[Gemini API]
```

---

# 🛠 Tech Stack

## Frontend

* React
* Vite
* TypeScript
* Fetch API

## Backend

* FastAPI
* Python
* Uvicorn
* LangChain

## AI / ML

* Google Gemini
* FAISS Vector Database
* Retrieval Augmented Generation (RAG)

## Cloud Infrastructure

* AWS EC2
* AWS S3
* AWS CloudFront
* AWS Route53
* Nginx
* Let's Encrypt

---

# 📁 Project Structure

```
ai-document-summarizer
│
├── backend
│   ├── app
│   │   ├── main.py
│   │   ├── routes
│   │   │
│   │   ├── services
│   │   │   ├── extractor.py
│   │   │   ├── summarizer.py
│   │   │   ├── rag_indexer.py
│   │   │   └── rag_qa.py
│   │
│   ├── uploads
│   ├── vector_store
│   ├── requirements.txt
│   └── .env
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── api
│   │   └── App.tsx
│   │
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

# 📡 API Endpoints

| Endpoint                     | Method | Description        |
| ---------------------------- | ------ | ------------------ |
| `/health`                    | GET    | Health check       |
| `/api/upload`                | POST   | Upload PDF         |
| `/api/extract`               | POST   | Extract text       |
| `/api/summarize`             | POST   | Generate summary   |
| `/api/index`                 | POST   | Build FAISS index  |
| `/api/ask`                   | POST   | Ask question (RAG) |
| `/api/summary/{document_id}` | GET    | Retrieve summary   |

---

# ⚙️ Environment Variables

Backend `.env`

```
GEMINI_API_KEY=your_api_key
LLM_MODEL=gemini-2.5-flash
ENVIRONMENT=production
```

Frontend `.env`

```
VITE_API_BASE_URL=https://api.shubhochowdhury.com
```

---

# 🚀 Local Development

## Clone repository

```
git clone https://github.com/yourusername/ai-document-summarizer.git
cd ai-document-summarizer
```

---

# Backend Setup

```
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

Run backend

```
uvicorn app.main:app --reload
```

API Docs

```
http://localhost:8000/docs
```

---

# Frontend Setup

```
cd frontend

npm install
npm run dev
```

App runs at

```
http://localhost:5173
```

---

# ☁️ Production Deployment

### Backend

* Hosted on AWS EC2
* Managed using **systemd**
* Reverse proxied by **Nginx**
* SSL via **Let's Encrypt**

### Frontend

* Built with Vite
* Hosted on **S3**
* Delivered via **CloudFront CDN**

---

# 🔒 Security

* HTTPS via Let's Encrypt
* Backend behind Nginx reverse proxy
* CORS restricted to frontend domain
* API keys stored in environment variables

---

# 🔮 Future Improvements

* Persistent vector database (Pinecone / Weaviate)
* Multi-document search
* User authentication
* Streaming LLM responses
* Docker containerization
* Kubernetes deployment

---

# 👨‍💻 Author

**Shubho Chowdhury**

Software Engineer | AI | Cloud

LinkedIn
[linkedin.com/in/shubhochowdhury](https://www.linkedin.com/in/shubho-chowdhury-54137218a/)

---

# ⭐ Support

If you like this project, consider giving it a **star ⭐** on GitHub.

