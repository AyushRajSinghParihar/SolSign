import markdownpdf = require('markdown-pdf')
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Converts a Markdown string into a PDF buffer.
 * @param markdownContent - The Markdown text of the contract.
 * @returns A Promise that resolves with the PDF content as a Buffer.
 */
export function generatePdfFromMarkdown(markdownContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Create a temporary file for the output
    const tempPdfPath = path.join(os.tmpdir(), `temp-${Date.now()}.pdf`)
    
    // Create markdown-pdf instance with options
    const converter = markdownpdf({
      // Optional: Configure styling or options here
      paperFormat: 'A4',
      paperOrientation: 'portait' as any, // Use any to bypass type issue
      paperBorder: '1cm'
    })
    
    // Convert markdown string to PDF file
    try {
      converter.from.string(markdownContent).to(tempPdfPath, () => {
        try {
          // Read the generated PDF file into a buffer
          const pdfBuffer = fs.readFileSync(tempPdfPath)
          
          // Clean up the temporary file
          fs.unlinkSync(tempPdfPath)
          
          resolve(pdfBuffer)
        } catch (readError) {
          // Try to clean up even if reading failed
          try {
            fs.unlinkSync(tempPdfPath)
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          reject(readError)
        }
      })
    } catch (conversionError) {
      reject(conversionError)
    }
  })
}