import { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { supabase } from '@/lib/supabase'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Point to the worker provided by react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

type DocumentViewerProps = {
  storagePath: string
}

export function DocumentViewer({ storagePath }: DocumentViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>()

  useEffect(() => {
    const downloadFile = async () => {
      // Create a signed URL to access the private file in the bucket
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 60) // The URL is valid for 60 seconds

      if (error) {
        console.error('Error creating signed URL for PDF:', error)
        return
      }
      setFileUrl(data.signedUrl)
    }
    downloadFile()
  }, [storagePath])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages)
  }

  if (!fileUrl) {
    return <div>Loading document preview...</div>
  }

  return (
    <div className="h-full overflow-y-auto border rounded-lg">
      <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from(new Array(numPages), (el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} />
        ))}
      </Document>
    </div>
  )
}