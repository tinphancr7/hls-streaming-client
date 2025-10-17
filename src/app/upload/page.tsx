"use client";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import UploadForm from "@/components/UploadForm";
import ChunkedUploadForm from "@/components/ChunkedUploadForm";
import ChunkedUploadFormSimple from "@/components/ChunkedUploadFormSimple";

export default function UploadPage() {
	const router = useRouter();
	const [uploadMethod, setUploadMethod] = useState<
		"standard" | "chunked" | "chunked-hook"
	>("standard");

	const handleUploadSuccess = () => {
		setTimeout(() => {
			router.push("/");
		}, 2000);
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			{/* Header */}
			<header className="bg-white dark:bg-gray-800 shadow">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<Link href="/" className="text-2xl font-bold text-blue-600">
							🎬 VideoTube
						</Link>
						<Link
							href="/"
							className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
						>
							Back to Home
						</Link>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-8 max-w-3xl">
				{/* Upload Method Toggle */}
				<div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
					<h3 className="text-lg font-semibold mb-3">Upload Method</h3>
					<div className="space-y-2">
						<label className="flex items-center">
							<input
								type="radio"
								name="uploadMethod"
								checked={uploadMethod === "standard"}
								onChange={() => setUploadMethod("standard")}
								className="mr-2"
							/>
							Standard Upload (recommended for files &lt; 100MB)
						</label>
						<label className="flex items-center">
							<input
								type="radio"
								name="uploadMethod"
								checked={uploadMethod === "chunked"}
								onChange={() => setUploadMethod("chunked")}
								className="mr-2"
							/>
							Chunked Upload - Manual Implementation
						</label>
						<label className="flex items-center">
							<input
								type="radio"
								name="uploadMethod"
								checked={uploadMethod === "chunked-hook"}
								onChange={() => setUploadMethod("chunked-hook")}
								className="mr-2"
							/>
							Chunked Upload - Custom Hook (recommended for large files)
						</label>
					</div>
				</div>

				{/* Upload Form */}
				{uploadMethod === "standard" && (
					<UploadForm onUploadSuccess={handleUploadSuccess} />
				)}
				{uploadMethod === "chunked" && (
					<ChunkedUploadForm onUploadSuccess={handleUploadSuccess} />
				)}
				{uploadMethod === "chunked-hook" && (
					<ChunkedUploadFormSimple onUploadSuccess={handleUploadSuccess} />
				)}
			</main>
		</div>
	);
}
