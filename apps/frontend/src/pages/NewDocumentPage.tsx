import { FileUpload } from "@/components/document/FileUpload";
import { trpc } from "@/lib/trpc";
import { useNavigate } from "react-router-dom";

export function NewDocumentPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const handleUploadSuccess = () => {
    // After a successful upload, invalidate the templates query
    // so the list on the dashboard will be updated.
    utils.templates.getTemplates.invalidate();
    // Navigate the user back to the dashboard to see the result.
    navigate("/");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Upload New Document</h1>
        <p className="text-muted-foreground">
          Upload a PDF document to be analyzed by the AI. A reusable template
          will be created from its structure.
        </p>
      </div>
      <FileUpload onUploadSuccess={handleUploadSuccess} />
    </div>
  );
}
