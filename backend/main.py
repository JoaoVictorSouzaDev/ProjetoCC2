from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import router

app = FastAPI(title="API Estação Meteorológica IoT", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"mensagem": "API da Estação Meteorológica operacional!"}