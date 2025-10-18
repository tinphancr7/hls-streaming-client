"use client";

import {useState, useRef, FormEvent} from "react";

interface UploadFormProps {
	onUploadSuccess?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

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

export default function UploadForm({onUploadSuccess}: UploadFormProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [uploadProgress, setUploadProgress] = useState(0);
	const [currentChunk, setCurrentChunk] = useState(0);
	const [totalChunks, setTotalChunks] = useState(0);
	const [uploadSpeed, setUploadSpeed] = useState(0);
	const [timeRemaining, setTimeRemaining] = useState(0);
	const [uploadId, setUploadId] = useState<string | null>(null);
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

			// Validate file size (max 5GB)
			if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
				setError("File size must be less than 5GB");
				return;
			}

			setFile(selectedFile);
			setError("");
		}
	};

	const uploadChunk = async (
		chunk: Blob,
		chunkIndex: number,
		file: File,
		totalChunksParam: number
	): Promise<{
		success: boolean;
		uploadId: string;
		videoId?: string;
		uploadedChunks: number[];
		isComplete: boolean;
		message: string;
	}> => {
		const formData = new FormData();
		formData.append("chunk", chunk);
		formData.append("chunkIndex", chunkIndex.toString());
		formData.append("filename", file.name);
		formData.append("totalChunks", totalChunksParam.toString());
		formData.append("totalSize", file.size.toString());
		formData.append("title", title);
		if (description) {
			formData.append("description", description);
		}

		const response = await fetch(`${API_URL}/videos/upload`, {
			method: "POST",
			body: formData,
			signal: abortControllerRef.current?.signal,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				(errorData as {message?: string}).message ||
					`Failed to upload chunk ${chunkIndex + 1}`
			);
		}

		return response.json();
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!file || !title.trim()) {
			setError("Please provide a title and select a video file");
			return;
		}

		setUploading(true);
		setError("");
		setUploadProgress(0);
		setCurrentChunk(0);
		startTimeRef.current = Date.now();

		// Calculate total chunks
		const chunks = Math.ceil(file.size / CHUNK_SIZE);

		setTotalChunks(chunks);

		// Create abort controller for cancellation
		abortControllerRef.current = new AbortController();

		try {
			// Upload chunks sequentially
			for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
				const start = chunkIndex * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, file.size);
				const chunk = file.slice(start, end);

				setCurrentChunk(chunkIndex + 1);

				const result = await uploadChunk(chunk, chunkIndex, file, chunks);

				// Store upload ID from first chunk
				if (chunkIndex === 0) {
					setUploadId(result.uploadId);
				}

				// Update progress
				const totalLoaded = (chunkIndex + 1) * CHUNK_SIZE;
				const percentage = Math.min(
					Math.round((totalLoaded / file.size) * 100),
					100
				);
				setUploadProgress(percentage);

				// Calculate speed and time remaining
				const currentTime = Date.now();
				const elapsedTime = (currentTime - startTimeRef.current) / 1000;
				const speed = totalLoaded / elapsedTime;
				const remainingBytes = file.size - totalLoaded;
				const timeRem = remainingBytes / speed;

				setUploadSpeed(speed);
				setTimeRemaining(timeRem);

				// Check if upload is complete
				if (result.isComplete) {
					console.log(
						"All chunks uploaded successfully. Video is being processed..."
					);
					break;
				}
			}

			// Reset form on success
			setTitle("");
			setDescription("");
			setFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}

			alert("Video uploaded successfully! It will be processed shortly.");
			if (onUploadSuccess) {
				onUploadSuccess();
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") {
				setError("Upload cancelled");
			} else {
				console.error("Upload error:", err);
				const errorMessage =
					err instanceof Error ? err.message : "Failed to upload video";
				setError(errorMessage);
			}
		} finally {
			setUploading(false);
			setUploadProgress(0);
			setCurrentChunk(0);
			setTotalChunks(0);
			setUploadSpeed(0);
			setTimeRemaining(0);
			setUploadId(null);
			abortControllerRef.current = null;
		}
	};

	const handleCancelUpload = () => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
		>
			<h2 className="text-2xl font-bold mb-6">Upload Video</h2>

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
								Will be split into {Math.ceil(file.size / CHUNK_SIZE)} chunks of{" "}
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

				{/* Upload Progress */}
				{uploading && (
					<div className="space-y-3">
						{/* Upload ID */}
						{uploadId && (
							<div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
								Upload ID: {uploadId}
							</div>
						)}

						{/* Chunk Progress */}
						<div className="text-sm text-gray-600 dark:text-gray-400">
							Uploading chunk {currentChunk} of {totalChunks}
						</div>

						{/* Progress Bar */}
						<div>
							<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
								<div
									className="bg-blue-600 h-3 rounded-full transition-all duration-300"
									style={{width: `${uploadProgress}%`}}
								/>
							</div>
							<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
								<span>{uploadProgress}%</span>
								<span>
									{formatBytes((uploadProgress / 100) * (file?.size || 0))} /{" "}
									{formatBytes(file?.size || 0)}
								</span>
							</div>
						</div>

						{/* Upload Stats */}
						<div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
							<div>
								<span className="font-medium">Speed:</span>{" "}
								{formatBytes(uploadSpeed)}/s
							</div>
							<div>
								<span className="font-medium">Time remaining:</span>{" "}
								{formatTime(timeRemaining)}
							</div>
						</div>

						{/* Cancel Button */}
						<button
							type="button"
							onClick={handleCancelUpload}
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
