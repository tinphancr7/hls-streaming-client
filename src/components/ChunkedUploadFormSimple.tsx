"use client";

import {useState, useRef, FormEvent} from "react";
import {useChunkedUpload} from "@/hooks/useChunkedUpload";

interface ChunkedUploadFormSimpleProps {
	onUploadSuccess?: () => void;
}

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

export default function ChunkedUploadFormSimple({
	onUploadSuccess,
}: ChunkedUploadFormSimpleProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [uploadedBy, setUploadedBy] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const {
		uploading,
		progress,
		currentChunk,
		totalChunks,
		error,
		uploadId,
		uploadFile,
		cancelUpload,
		resetUpload,
	} = useChunkedUpload({
		chunkSize: 10 * 1024 * 1024, // 10MB chunks
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selectedFile = e.target.files[0];

			// Validate file type
			if (!selectedFile.type.startsWith("video/")) {
				alert("Please select a valid video file");
				return;
			}

			// Validate file size (max 5GB)
			if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
				alert("File size must be less than 5GB");
				return;
			}

			setFile(selectedFile);
			resetUpload();
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!file || !title.trim()) {
			alert("Please provide a title and select a video file");
			return;
		}

		try {
			await uploadFile(file, {
				title,
				description: description || undefined,
				uploadedBy: uploadedBy || undefined,
			});

			// Reset form on success
			setTitle("");
			setDescription("");
			setUploadedBy("");
			setFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}

			alert("Video uploaded successfully! It will be processed shortly.");
			if (onUploadSuccess) {
				onUploadSuccess();
			}
		} catch (err) {
			// Error is already handled by the hook
			console.error("Upload failed:", err);
		}
	};

	const getChunkSize = () => 10 * 1024 * 1024; // 10MB
	const getTotalChunksForFile = (file: File) =>
		Math.ceil(file.size / getChunkSize());

	return (
		<form
			onSubmit={handleSubmit}
			className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
		>
			<h2 className="text-2xl font-bold mb-6">
				Upload Video (Chunked - Hook Version)
			</h2>

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
								Will be split into {getTotalChunksForFile(file)} chunks of{" "}
								{formatBytes(getChunkSize())} each
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
									style={{width: `${progress.percentage}%`}}
								/>
							</div>
							<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-1">
								<span>{progress.percentage}%</span>
								<span>
									{formatBytes(progress.loaded)} / {formatBytes(progress.total)}
								</span>
							</div>
						</div>

						{/* Upload Stats */}
						<div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
							<div>
								<span className="font-medium">Speed:</span>{" "}
								{formatBytes(progress.speed)}/s
							</div>
							<div>
								<span className="font-medium">Time remaining:</span>{" "}
								{formatTime(progress.timeRemaining)}
							</div>
						</div>

						{/* Cancel Button */}
						<button
							type="button"
							onClick={cancelUpload}
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
