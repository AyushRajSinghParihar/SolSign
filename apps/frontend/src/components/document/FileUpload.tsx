import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type FileUploadProps = {
  onUploadSuccess: () => void;
};

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Invalid File Type", {
        description: "Please upload a PDF document.",
      });
      event.target.value = ""; // Clear the input
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File Too Large", {
        description: `Please upload a file smaller than ${MAX_FILE_SIZE_MB} MB.`,
      });
      event.target.value = ""; // Clear the input
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);

    // Create an async function that returns a promise.
    const uploadFile = async () => {
      const filePath = `${user.id}/${selectedFile.name}`;
      const { error } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        // Throwing an error here will cause the toast.promise to enter the 'error' state.
        throw error;
      }

      // Returning a value will pass it to the 'success' state.
      return { success: true };
    };

    // Pass the promise returned by the async function directly to toast.promise
    toast.promise(uploadFile(), {
      loading: "Uploading document...",
      success: () => {
        onUploadSuccess();
        return "Upload successful! Your document is now being processed.";
      },
      error: (err) => `Upload failed: ${err.message}`,
      finally: () => {
        setIsUploading(false);
        // Reset the file input so the user can upload another one
        setSelectedFile(null);
        const fileInput = document.querySelector(
          'input[type="file"]',
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a PDF Document</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {/* The progress bar is less useful without a progress listener, so we can remove it for a cleaner UI */}
        <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
          {isUploading ? "Uploading..." : "Analyze Document"}
        </Button>
      </CardContent>
    </Card>
  );
}
