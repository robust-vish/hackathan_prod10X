from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import analyze, create_ticket

app = FastAPI(
    title="RCA + A/B + Ticket Agent API",
    description="AI-powered ticket analysis and creation for IndiaMART OpenProject",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(create_ticket.router, prefix="/api", tags=["Ticket Creation"])


@app.get("/")
def root():
    return {"status": "running", "message": "RCA+A/B+Ticket Agent API is live"}


@app.get("/health")
def health():
    return {"status": "healthy"}
