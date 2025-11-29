import { useState, useEffect } from "react";
import S3Uploader from "@/src/utils/file/s3Bucket.js";

const useFiles = (fileUri, s3Url, uuid) => {
  const [name, setName] = useState("");
  const [size, setSize] = useState(0);
  const [mimeType, setMimeType] = useState(undefined);
  const [state, setState] = useState("uploaded");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [uploadedSize, setUploadedSize] = useState(0);

  useEffect(() => {
    setName(`file_${uuid}`);
    setMimeType("audio/ogg");
    setSize(1024 * 1024 * 5); // 5 MB for example
    console.log("File metadata set:", { state});

    switch (state) {
      case "uploading":
        setLoading(true);
        S3Uploader.upload(s3Url, fileUri, (progress) => {
          setUploadedSize(progress.loaded);
        })
          .then(() => {
            setState("uploaded");
            setLoading(false);
          })
          .catch((err) => {
            setError(err.message);
            setLoading(false);
          });
        break;
      case "downloading":
        break;
      case "uploaded":
        setLoading(false);
        break;
      default:
        setError("Invalid state");
        setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    if (fileUri && s3Url) {
      setState("uploading");
    } else if (!fileUri && s3Url) {
      setState("downloading");
    } else if (fileUri && !s3Url) {
      setState("uploaded");
    } else {
      setError("No file URI or S3 URL provided");
    }
  }, [fileUri, s3Url]);

  return {
    name,
    size,
    mimeType,
    state,
    loading,
    error,
  };
};

export default useFiles;
