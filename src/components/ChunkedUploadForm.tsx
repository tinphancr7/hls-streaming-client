"use client";

import {useState, useRef, FormEvent} from "react";

interface ChunkedUploadFormProps {
	onUploadSuccess?: () => void;
}

interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
	speed: number;
	timeRemaining: number;
}

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

export default function ChunkedUploadForm({
	onUploadSuccess,
}: ChunkedUploadFormProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [uploadedBy, setUploadedBy] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
		loaded: 0,
		total: 0,
		percentage: 0,
		speed: 0,
		timeRemaining: 0,
	});
	const [currentChunk, setCurrentChunk] = useState(0);
	const [totalChunks, setTotalChunks] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const startTimeRef = useRef<number>(0);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selectedFile = e.target.files[0];

			// Validate file type
			if (!selectedFile.type.startsWith("video/")) {
				setError("Please select a valid video file");
				return;
			}

			// Validate file size (max 2GB)
			if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
				setError("File size must be less than 2GB");
				return;
			}

			setFile(selectedFile);
			setError("");

			// Calculate total chunks
			const chunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
			setTotalChunks(chunks);
		}
	};

	const initializeUpload = async (): Promise<string> => {
		const response = await fetch(
			`${
				process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
			}/chunk-upload/initialize`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					filename: file!.name,
					totalChunks: totalChunks,
					totalSize: file!.size,
					title,
					description: description || undefined,
					uploadedBy: uploadedBy || undefined,
				}),
				signal: abortControllerRef.current?.signal,
			}
		);

		if (!response.ok) {
			throw new Error("Failed to initialize upload");
		}

		const result = await response.json();
		return result.uploadId;
	};

	const uploadChunk = async (
		chunk: Blob,
		chunkIndex: number,
		uploadId: string
	): Promise<{isComplete: boolean}> => {
		const formData = new FormData();
		formData.append("chunk", chunk);
		formData.append("uploadId", uploadId);
		formData.append("chunkIndex", chunkIndex.toString());

		const response = await fetch(
			`${
				process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
			}/chunk-upload/chunk`,
			{
				method: "POST",
				body: formData,
				signal: abortControllerRef.current?.signal,
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to upload chunk ${chunkIndex + 1}`);
		}

		const result = await response.json();
		return {isComplete: result.isComplete};
	};

	const updateProgress = (chunkIndex: number, chunkLoaded: number) => {
		const totalLoaded = chunkIndex * CHUNK_SIZE + chunkLoaded;
		const totalSize = file!.size;
		const percentage = Math.round((totalLoaded / totalSize) * 100);

		const currentTime = Date.now();
		const elapsedTime = (currentTime - startTimeRef.current) / 1000; // seconds
		const speed = totalLoaded / elapsedTime; // bytes per second
		const remainingBytes = totalSize - totalLoaded;
		const timeRemaining = remainingBytes / speed; // seconds

		setUploadProgress({
			loaded: totalLoaded,
			total: totalSize,
			percentage,
			speed,
			timeRemaining,
		});
	};

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	const formatTime = (seconds: number): string => {
		if (!isFinite(seconds)) return "calculating...";
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
		if (mins > 0) return `${mins}m ${secs}s`;
		return `${secs}s`;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!file || !title.trim()) {
			setError("Please provide a title and select a video file");
			return;
		}

		setUploading(true);
		setError("");
		setCurrentChunk(0);
		startTimeRef.current = Date.now();

		// Create abort controller for cancellation
		abortControllerRef.current = new AbortController();

		try {
			// Initialize upload session
			const uploadId = await initializeUpload();

			// Upload chunks sequentially
			for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
				const start = chunkIndex * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, file.size);
				const chunk = file.slice(start, end);

				setCurrentChunk(chunkIndex + 1);

				const result = await uploadChunk(chunk, chunkIndex, uploadId);

				// Update progress
				updateProgress(chunkIndex + 1, 0);

				// Check if upload is complete
				if (result.isComplete) {
					console.log(
						"All chunks uploaded successfully. Video is being processed..."
					);
					break;
				}
			}

			// Reset form
			setTitle("");
			setDescription("");
			setUploadedBy("");
			setFile(null);
			setCurrentChunk(0);
			setTotalChunks(0);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}

			alert("Video uploaded successfully! It will be processed shortly.");
			if (onUploadSuccess) {
				onUploadSuccess();
			}
		} catch (err: unknown) {
			if (err instanceof Error && err.name === "AbortError") {
				setError("Upload cancelled");
			} else {
				console.error("Upload error:", err);
				setError(err instanceof Error ? err.message : "Failed to upload video");
			}
		} finally {
			setUploading(false);
			setUploadProgress({
				loaded: 0,
				total: 0,
				percentage: 0,
				speed: 0,
				timeRemaining: 0,
			});
			abortControllerRef.current = null;
		}
	};

	const handleCancel = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
		>
			<h2 className="text-2xl font-bold mb-6">Upload Video (Chunked)</h2>

			{error && (
				<div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
					{error}
				</div>
			)}

			<div className="space-y-4">
				{/* File Input */}
				<div>
					<label className="block text-sm font-medium mb-2">Video File *</label>
					<input
						ref={fileInputRef}
						type="file"
						accept="video/*"
						onChange={handleFileChange}
						disabled={uploading}
						className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
					/>
					{file && (
						<div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
							<p>
								Selected: {file.name} ({formatBytes(file.size)})
							</p>
							<p>
								Will be split into {totalChunks} chunks of{" "}
								{formatBytes(CHUNK_SIZE)} each
							</p>
						</div>
					)}
				</div>

				{/* Title */}
				<div>
					<label className="block text-sm font-medium mb-2">Title *</label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={uploading}
						placeholder="Enter video title"
						className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
						required
					/>
				</div>

				{/* Description */}
				<div>
					<label className="block text-sm font-medium mb-2">Description</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						disabled={uploading}
						placeholder="Enter video description"
						rows={4}
						className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
					/>
				</div>

				{/* Uploaded By */}
				<div>
					<label className="block text-sm font-medium mb-2">Uploaded By</label>
					<input
						type="text"
						value={uploadedBy}
						onChange={(e) => setUploadedBy(e.target.value)}
						disabled={uploading}
						placeholder="Enter your name (optional)"
						className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
					/>
				</div>

				{/* Upload Progress */}
				{uploading && (
					<div className="space-y-3">
						{/* Chunk Progress */}
						<div className="text-sm text-gray-600 dark:text-gray-400">
							Uploading chunk {currentChunk} of {totalChunks}
						</div>

						{/* Progress Bar */}
						<div>
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
								<div
									className="bg-blue-600 h-3 rounded-full transition-all duration-300"
									style={{width: `${uploadProgress.percentage}%`}}
								/>
							</div>
							<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
								<span>{uploadProgress.percentage}%</span>
								<span>
									{formatBytes(uploadProgress.loaded)} /{" "}
									{formatBytes(uploadProgress.total)}
								</span>
							</div>
						</div>

						{/* Upload Stats */}
						<div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
							<div>
								<span className="font-medium">Speed:</span>{" "}
								{formatBytes(uploadProgress.speed)}/s
							</div>
							<div>
								<span className="font-medium">Time remaining:</span>{" "}
								{formatTime(uploadProgress.timeRemaining)}
							</div>
						</div>

						{/* Cancel Button */}
						<button
							type="button"
							onClick={handleCancel}
							className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
						>
							Cancel Upload
						</button>
					</div>
				)}

				{/* Submit Button */}
				{!uploading && (
					<button
						type="submit"
						disabled={!file || !title.trim()}
						className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						Start Chunked Upload
					</button>
				)}
			</div>
		</form>
	);
}
