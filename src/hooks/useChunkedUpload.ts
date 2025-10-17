import {useState, useRef, useCallback} from "react";

interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
	speed: number;
	timeRemaining: number;
}

interface ChunkUploadOptions {
	chunkSize?: number;
	apiUrl?: string;
}

interface UseChunkedUploadReturn {
	uploading: boolean;
	progress: UploadProgress;
	currentChunk: number;
	totalChunks: number;
	error: string | null;
	uploadId: string | null;
	uploadFile: (
		file: File,
		metadata: {
			title: string;
			description?: string;
			uploadedBy?: string;
		}
	) => Promise<void>;
	cancelUpload: () => void;
	resetUpload: () => void;
	retryUpload: (uploadId: string) => Promise<number[]>;
	getStatus: (uploadId: string) => Promise<unknown>;
}

export const useChunkedUpload = (
	options: ChunkUploadOptions = {}
): UseChunkedUploadReturn => {
	const {
		chunkSize = 10 * 1024 * 1024, // 10MB default
		apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
	} = options;

	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<UploadProgress>({
		loaded: 0,
		total: 0,
		percentage: 0,
		speed: 0,
		timeRemaining: 0,
	});
	const [currentChunk, setCurrentChunk] = useState(0);
	const [totalChunks, setTotalChunks] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [uploadId, setUploadId] = useState<string | null>(null);

	const abortControllerRef = useRef<AbortController | null>(null);
	const startTimeRef = useRef<number>(0);

	const updateProgress = useCallback(
		(chunkIndex: number, chunkLoaded: number, fileSize: number) => {
			const totalLoaded = chunkIndex * chunkSize + chunkLoaded;
			const percentage = Math.round((totalLoaded / fileSize) * 100);

			const currentTime = Date.now();
			const elapsedTime = (currentTime - startTimeRef.current) / 1000;
			const speed = totalLoaded / elapsedTime;
			const remainingBytes = fileSize - totalLoaded;
			const timeRemaining = remainingBytes / speed;

			setProgress({
				loaded: totalLoaded,
				total: fileSize,
				percentage,
				speed,
				timeRemaining,
			});
		},
		[chunkSize]
	);

	const initializeUpload = useCallback(
		async (
			file: File,
			metadata: {
				title: string;
				description?: string;
				uploadedBy?: string;
			}
		): Promise<string> => {
			const response = await fetch(`${apiUrl}/chunk-upload/initialize`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					filename: file.name,
					totalChunks: Math.ceil(file.size / chunkSize),
					totalSize: file.size,
					title: metadata.title,
					description: metadata.description,
					uploadedBy: metadata.uploadedBy,
				}),
				signal: abortControllerRef.current?.signal,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to initialize upload");
			}

			const result = await response.json();
			return result.uploadId;
		},
		[apiUrl, chunkSize]
	);

	const uploadChunk = useCallback(
		async (
			chunk: Blob,
			chunkIndex: number,
			uploadId: string
		): Promise<{isComplete: boolean; uploadedChunks: number[]}> => {
			const formData = new FormData();
			formData.append("chunk", chunk);
			formData.append("uploadId", uploadId);
			formData.append("chunkIndex", chunkIndex.toString());

			const response = await fetch(`${apiUrl}/chunk-upload/chunk`, {
				method: "POST",
				body: formData,
				signal: abortControllerRef.current?.signal,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.message || `Failed to upload chunk ${chunkIndex + 1}`
				);
			}

			const result = await response.json();
			return {
				isComplete: result.isComplete,
				uploadedChunks: result.uploadedChunks,
			};
		},
		[apiUrl]
	);

	const getUploadStatus = useCallback(
		async (uploadId: string) => {
			const response = await fetch(
				`${apiUrl}/chunk-upload/status/${uploadId}`,
				{
					method: "GET",
					signal: abortControllerRef.current?.signal,
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to get upload status");
			}

			return response.json();
		},
		[apiUrl]
	);

	const cancelUploadOnServer = useCallback(
		async (uploadId: string) => {
			try {
				await fetch(`${apiUrl}/chunk-upload/cancel/${uploadId}`, {
					method: "DELETE",
				});
			} catch (error) {
				console.warn("Failed to cancel upload on server:", error);
			}
		},
		[apiUrl]
	);

	const uploadFile = useCallback(
		async (
			file: File,
			metadata: {
				title: string;
				description?: string;
				uploadedBy?: string;
			}
		): Promise<void> => {
			if (!file) {
				throw new Error("No file provided");
			}

			setUploading(true);
			setError(null);
			setCurrentChunk(0);
			startTimeRef.current = Date.now();

			// Calculate total chunks
			const chunks = Math.ceil(file.size / chunkSize);
			setTotalChunks(chunks);

			// Create abort controller
			abortControllerRef.current = new AbortController();

			try {
				// Initialize upload session
				const newUploadId = await initializeUpload(file, metadata);
				setUploadId(newUploadId);

				// Upload chunks sequentially
				for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
					const start = chunkIndex * chunkSize;
					const end = Math.min(start + chunkSize, file.size);
					const chunk = file.slice(start, end);

					setCurrentChunk(chunkIndex + 1);

					const result = await uploadChunk(chunk, chunkIndex, newUploadId);

					// Update progress
					updateProgress(chunkIndex + 1, 0, file.size);

					// Check if upload is complete
					if (result.isComplete) {
						console.log(
							"All chunks uploaded successfully. Video is being processed..."
						);
						break;
					}
				}
			} catch (err: unknown) {
				if (err instanceof Error && err.name === "AbortError") {
					setError("Upload cancelled");
				} else {
					const errorMessage =
						err instanceof Error ? err.message : "Failed to upload file";
					setError(errorMessage);

					// Try to cancel upload on server if we have an uploadId
					if (uploadId) {
						await cancelUploadOnServer(uploadId);
					}

					throw err;
				}
			} finally {
				setUploading(false);
				abortControllerRef.current = null;
			}
		},
		[
			chunkSize,
			uploadChunk,
			updateProgress,
			initializeUpload,
			cancelUploadOnServer,
		]
	);

	const cancelUpload = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
	}, []);

	const retryUpload = useCallback(
		async (retryUploadId: string): Promise<number[]> => {
			const response = await fetch(
				`${apiUrl}/chunk-upload/retry/${retryUploadId}`,
				{
					method: "POST",
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Failed to retry upload");
			}

			const result = await response.json();
			return result.missingChunks;
		},
		[apiUrl]
	);

	const getStatus = useCallback(
		async (statusUploadId: string): Promise<unknown> => {
			return getUploadStatus(statusUploadId);
		},
		[getUploadStatus]
	);

	const resetUpload = useCallback(() => {
		setUploading(false);
		setProgress({
			loaded: 0,
			total: 0,
			percentage: 0,
			speed: 0,
			timeRemaining: 0,
		});
		setCurrentChunk(0);
		setTotalChunks(0);
		setError(null);
		setUploadId(null);
		abortControllerRef.current = null;
	}, []);

	return {
		uploading,
		progress,
		currentChunk,
		totalChunks,
		error,
		uploadId,
		uploadFile,
		cancelUpload,
		resetUpload,
		retryUpload,
		getStatus,
	};
};
