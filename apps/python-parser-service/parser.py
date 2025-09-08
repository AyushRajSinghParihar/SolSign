import fitz  # PyMuPDF
import re

def extract_structure_from_pdf(file_bytes: bytes) -> dict:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    markdown_parts = []
    placeholders = {}

    for page in doc:
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        font_size = span["size"]
                        is_bold = "bold" in span["font"].lower()

                        # Heuristic 1: Identify placeholders like {{variable}} or [Variable]
                        found_placeholders = re.findall(r"\{\{(\w+)\}\}|\[(\w+)\]", text)
                        for p in found_placeholders:
                            var_name = p[0] if p[0] else p[1]
                            placeholders[var_name] = f"Placeholder for {var_name}"

                        # Heuristic 2: Identify headings (bold and larger font)
                        if is_bold and font_size > 14:
                            markdown_parts.append(f"\n## {text}\n")
                        # Heuristic 3: Normal text
                        else:
                            markdown_parts.append(text)
    
    doc.close()
    
    return {
        "template_markdown": " ".join(markdown_parts),
        "template_schema": { "variables": placeholders }
    }