"use client";

import {useState, useRef, FormEvent} from "react";
import {videoApi} from "@/lib/api";

interface UploadFormProps {
	onUploadSuccess?: () => void;
}

export default function UploadForm({onUploadSuccess}: UploadFormProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [uploadedBy, setUploadedBy] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [uploadProgress, setUploadProgress] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const selectedFile = e.target.files[0];

			// Validate file type
			if (!selectedFile.type.startsWith("video/")) {
				setError("Please select a valid video file");
				return;
			}

			// Validate file size (max 500MB)
			if (selectedFile.size > 500 * 1024 * 1024) {
				setError("File size must be less than 500MB");
				return;
			}

			setFile(selectedFile);
			setError("");
		}
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

		try {
			await videoApi.uploadVideo(
				file,
				title,
				description || undefined,
				uploadedBy || undefined
			);

			// Reset form
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
		} catch (err: any) {
			console.error("Upload error:", err);
			setError(err.response?.data?.message || "Failed to upload video");
		} finally {
			setUploading(false);
			setUploadProgress(0);
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
						<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
							Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}{" "}
							MB)
						</p>
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

				{/* Tags */}
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
					<div>
						<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
							<div
								className="bg-blue-600 h-2.5 rounded-full transition-all"
								style={{width: `${uploadProgress}%`}}
							/>
						</div>
						<p className="text-sm text-center mt-2">Uploading... Please wait</p>
					</div>
				)}

				{/* Submit Button */}
				<button
					type="submit"
					disabled={uploading || !file || !title.trim()}
					className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{uploading ? "Uploading..." : "Upload Video"}
				</button>
			</div>
		</form>
	);
}
