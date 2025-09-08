from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from parser import extract_structure_from_pdf

class TemplateSchema(BaseModel):
    variables: Dict[str, str]

class ProcessedDocument(BaseModel):
    template_markdown: str
    template_schema: TemplateSchema

app = FastAPI()

@app.get("/healthcheck")
def read_root():
    return {"status": "ok"}

@app.post("/process-pdf", response_model=ProcessedDocument)
async def process_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are accepted.")
    
    try:
        file_bytes = await file.read()
        processed_data = extract_structure_from_pdf(file_bytes)
        return processed_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
