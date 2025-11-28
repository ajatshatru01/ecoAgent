from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
load_dotenv()

#Database connection import
from database import lifespan

#Different api endpoints
from routers.session_router import router as session_router
from routers.chat_router import router as chat_router
from routers.summary_router import router as summary_router
from routers.emissions_router import router as emissions_router
from routers.confidence_router import router as confidence_router
from routers.results_router import router as results_router

app = FastAPI(title="ecoAgent API", lifespan=lifespan)

origins = [ os.getenv("FRONTEND_URL") ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session_router, prefix="/session", tags=["Session"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(summary_router, prefix="/summary", tags=["Summary"])
app.include_router(emissions_router, prefix="/emissions", tags=["Emissions"])
app.include_router(results_router, prefix="/results", tags=["Results"])
app.include_router(confidence_router, prefix="/confidence", tags=["Confidence"])

@app.get("/")
def root():
    return {"message": "ecoAgent Backend", "status": "running"}